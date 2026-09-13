from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from eth_account import Account
from eth_account.messages import encode_defunct
import asyncio
import os
import re
import time
import uuid
import secrets
import httpx
import jwt

router = APIRouter(prefix='/api')
db = None  # injected from server.py

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
X_RE = re.compile(r'^[A-Za-z0-9_]{1,15}$')
WALLET_RE = re.compile(r'^0x[a-fA-F0-9]{40}$')
CORE_TASKS = ('follow', 'rt', 'quote')
TIERS = ('bronze', 'silver', 'gold', 'platinum')
ETHERSCAN_URL = 'https://api.etherscan.io/v2/api'
VIP_CHAINS = [(1, 'Ethereum', 'ETH'), (42161, 'Arbitrum', 'ETH'), (137, 'Polygon', 'POL'), (59144, 'Linea', 'ETH'),
              (81457, 'Blast', 'ETH'), (100, 'Gnosis', 'xDAI'), (5000, 'Mantle', 'MNT'), (130, 'Unichain', 'ETH')]
VIP_TX_LIMIT = 100
VIP_COOLDOWN_MIN = 10

DEFAULT_SETTINGS = {
    'follow_url': 'https://x.com/goalhoodz',
    'follow_points': 50,
    'rt_url': 'https://x.com/goalhoodz',
    'rt_points': 50,
    'quote_text': 'I just secured my Early Access ticket for GoalHoodz - 1-bit head soccer on Robinhood Chain.',
    'quote_url': 'https://x.com/goalhoodz',
    'quote_points': 100,
    'referrer_points': 50,
    'referred_points': 25,
    'bronze_min': 100, 'silver_min': 1000, 'gold_min': 10000, 'platinum_min': 50000,
    'bronze_points': 25, 'silver_points': 75, 'gold_points': 200, 'platinum_points': 500,
}


def now():
    return datetime.now(timezone.utc)


def aware(dt):
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def locked(attempt: Optional[dict]) -> bool:
    return bool(attempt and attempt.get('count', 0) >= 5 and attempt.get('locked_until') and aware(attempt['locked_until']) > now())


def today():
    return now().strftime('%Y-%m-%d')


def make_token(sub: str, role: str, hours: int, **extra) -> str:
    return jwt.encode({'sub': sub, 'role': role, 'exp': now() + timedelta(hours=hours), **extra}, JWT_SECRET, algorithm='HS256')


def decode(authorization: Optional[str], role: str) -> dict:
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(401, 'Not authenticated')
    try:
        payload = jwt.decode(authorization.split(' ', 1)[1], JWT_SECRET, algorithms=['HS256'])
    except jwt.PyJWTError:
        raise HTTPException(401, 'Invalid or expired token')
    if payload.get('role') != role:
        raise HTTPException(403, 'Forbidden')
    return payload


async def admin_guard(authorization: Optional[str] = Header(None)):
    return decode(authorization, 'admin')


async def current_participant(authorization: Optional[str] = Header(None)) -> dict:
    payload = decode(authorization, 'early')
    p = await db.early_participants.find_one({'id': payload['sub']})
    if not p:
        raise HTTPException(401, 'Participant not found')
    return p


async def get_settings() -> dict:
    s = await db.early_settings.find_one({'key': 'main'}, {'_id': 0, 'key': 0})
    return {**DEFAULT_SETTINGS, **(s or {})}


def task_points(s: dict, task: str) -> int:
    return int(s.get(f'{task}_points', 0))


def participant_view(p: dict) -> dict:
    tasks = p.get('tasks', {})
    return {
        'id': p['id'],
        'ticket_no': p['ticket_no'],
        'x_username': p['x_username'],
        'wallet': p['wallet'],
        'wallet_short': p['wallet'][:6] + '...' + p['wallet'][-4:],
        'points': p.get('points', 0),
        'tasks': {t: bool(tasks.get(t)) for t in CORE_TASKS},
        'completed': all(tasks.get(t) for t in CORE_TASKS),
        'completed_at': p['completed_at'].isoformat() if p.get('completed_at') else None,
        'daily_done': p.get('daily_done', {}),
        'referred_by': p.get('referred_by_username'),
        'referrals': p.get('referrals', 0),
        'referral_points': p.get('referral_points', 0),
        'tier': p.get('tier'),
        'volume_usd': p.get('volume_usd'),
        'vip_wallet': p.get('vip_wallet'),
        'vip_chains': p.get('vip_chains', []),
        'vip_checked_at': p['vip_checked_at'].isoformat() if p.get('vip_checked_at') else None,
        'created_at': p['created_at'].isoformat(),
    }


def tier_for(volume: float, s: dict) -> Optional[str]:
    tier = None
    for t in TIERS:
        if volume >= float(s.get(f'{t}_min', 10**12)):
            tier = t
    return tier


async def credit_referral(p: dict, s: dict) -> dict:
    """Both sides get a bonus once the referred participant finishes all tasks."""
    if not p.get('referred_by') or p.get('referral_credited'):
        return {}
    ref = await db.early_participants.find_one({'id': p['referred_by']})
    if not ref:
        return {}
    await db.early_participants.update_one(
        {'id': ref['id']}, {'$inc': {'points': int(s['referrer_points']), 'referrals': 1, 'referral_points': int(s['referrer_points'])}})
    return {'$inc': {'points': int(s['referred_points']), 'referral_points': int(s['referred_points'])}, '$set': {'referral_credited': True}}


class Throttle:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.last = 0.0

    async def wait(self):
        async with self.lock:
            delay = 0.5 - (time.monotonic() - self.last)
            if delay > 0:
                await asyncio.sleep(delay)
            self.last = time.monotonic()


throttle = Throttle()
price_cache: dict = {}


async def etherscan(client: httpx.AsyncClient, params: dict, retry: int = 2):
    await throttle.wait()
    r = await client.get(ETHERSCAN_URL, params={**params, 'apikey': os.environ.get('ETHERSCAN_API_KEY', '')})
    r.raise_for_status()
    data = r.json()
    if str(data.get('status')) != '1':
        detail = str(data.get('result') or data.get('message') or 'Etherscan error')
        if 'No transactions found' in detail:
            return []
        if 'rate limit' in detail.lower() and retry > 0:
            await asyncio.sleep(1.1)
            return await etherscan(client, params, retry - 1)
        raise RuntimeError(detail)
    return data['result']


async def chain_volume(client, address: str, chain_id: int, name: str, symbol: str) -> dict:
    try:
        txs = await etherscan(client, {'chainid': chain_id, 'module': 'account', 'action': 'txlist',
                                       'address': address, 'page': 1, 'offset': VIP_TX_LIMIT, 'sort': 'desc'})
        cached = price_cache.get(chain_id)
        if cached and time.time() - cached[1] < 600:
            price = cached[0]
        else:
            pr = await etherscan(client, {'chainid': chain_id, 'module': 'stats', 'action': 'ethprice'})
            price = Decimal(str(pr.get('ethusd', '0')))
            price_cache[chain_id] = (price, time.time())
        me = address.lower()
        wei = Decimal(0)
        n = 0
        for t in txs if isinstance(txs, list) else []:
            if str(t.get('isError', '0')) != '0':
                continue
            if t.get('from', '').lower() == me or t.get('to', '').lower() == me:
                wei += Decimal(str(t.get('value') or '0'))
                n += 1
        native = wei / Decimal(10 ** 18)
        return {'chain_id': chain_id, 'chain': name, 'symbol': symbol, 'tx_count': n,
                'native': float(native), 'usd': float(native * price), 'error': None}
    except Exception as e:  # noqa: BLE001
        msg = str(e)
        return {'chain_id': chain_id, 'chain': name, 'symbol': symbol, 'tx_count': 0, 'native': 0.0, 'usd': 0.0,
                'error': 'Not available on free plan' if 'Free API' in msg else msg[:120]}


async def wallet_volume(address: str) -> dict:
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
        chains = [await chain_volume(client, address, *c) for c in VIP_CHAINS]
    return {'total_usd': round(sum(c['usd'] for c in chains), 2), 'chains': chains}


REGISTER_COOLDOWN_SEC = 60


def client_ip(request: Request) -> str:
    fwd = request.headers.get('x-forwarded-for', '')
    return fwd.split(',')[0].strip() if fwd else (request.client.host if request.client else 'unknown')


async def register_rate_limit(request: Request, client_id: Optional[str]):
    keys = [f'ip:{client_ip(request)}']
    if client_id and 8 <= len(client_id) <= 64:
        keys.append(f'cid:{client_id}')
    hit = await db.rate_limits.find_one({'key': {'$in': keys}, 'expires_at': {'$gt': now()}}, sort=[('expires_at', -1)])
    if hit:
        exp = hit['expires_at'] if hit['expires_at'].tzinfo else hit['expires_at'].replace(tzinfo=timezone.utc)
        wait = max(1, int((exp - now()).total_seconds()) + 1)
        raise HTTPException(429, f'Too many submissions. Try again in {wait} seconds')
    exp = now() + timedelta(seconds=REGISTER_COOLDOWN_SEC)
    for k in keys:
        await db.rate_limits.update_one({'key': k}, {'$set': {'expires_at': exp}}, upsert=True)


def daily_view(t: dict) -> dict:
    return {
        'id': t['id'], 'title': t['title'], 'url': t.get('url', ''), 'points': t['points'],
        'active': t.get('active', True), 'created_at': t['created_at'].isoformat(),
    }


# ---------- models ----------
class RegisterBody(BaseModel):
    x_username: str
    wallet: str
    ref: Optional[str] = None


class VipCheckBody(BaseModel):
    address: str
    message: str
    signature: str


class AdminLoginBody(BaseModel):
    password: str


class SettingsBody(BaseModel):
    follow_url: str
    follow_points: int = Field(ge=0, le=100000)
    rt_url: str
    rt_points: int = Field(ge=0, le=100000)
    quote_text: str = Field(max_length=240)
    quote_url: str
    quote_points: int = Field(ge=0, le=100000)
    referrer_points: int = Field(default=50, ge=0, le=100000)
    referred_points: int = Field(default=25, ge=0, le=100000)
    bronze_min: float = Field(default=100, ge=0)
    silver_min: float = Field(default=1000, ge=0)
    gold_min: float = Field(default=10000, ge=0)
    platinum_min: float = Field(default=50000, ge=0)
    bronze_points: int = Field(default=25, ge=0, le=100000)
    silver_points: int = Field(default=75, ge=0, le=100000)
    gold_points: int = Field(default=200, ge=0, le=100000)
    platinum_points: int = Field(default=500, ge=0, le=100000)


class DailyTaskBody(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    url: str = ''
    points: int = Field(ge=0, le=100000)
    active: bool = True


class PointsBody(BaseModel):
    points: int = Field(ge=0, le=10_000_000)


class BulkDeleteBody(BaseModel):
    ids: Optional[list[str]] = None
    q: str = ''
    status: str = 'all'
    mode: str = 'contains'
    confirm: str = ''


# ---------- public ----------
@router.get('/early/config')
async def early_config():
    s = await get_settings()
    tasks = await db.early_daily_tasks.find({'active': True}).sort('created_at', -1).to_list(100)
    return {'settings': s, 'daily_tasks': [daily_view(t) for t in tasks], 'today': today()}


@router.post('/early/register')
async def early_register(body: RegisterBody, request: Request, x_client_id: Optional[str] = Header(None)):
    x = body.x_username.strip().lstrip('@')
    if not X_RE.match(x):
        raise HTTPException(400, 'X username must be 1-15 chars: letters, numbers, underscore')
    if not WALLET_RE.match(body.wallet.strip()):
        raise HTTPException(400, 'Wallet must be a valid 0x address (42 chars)')
    await register_rate_limit(request, x_client_id)
    wallet = body.wallet.strip().lower()
    p = await db.early_participants.find_one({'wallet': wallet})
    if p:
        if p['x_username_lc'] != x.lower():
            raise HTTPException(409, f'This wallet is already registered as @{p["x_username"]}')
    else:
        taken = await db.early_participants.find_one({'x_username_lc': x.lower()})
        if taken:
            raise HTTPException(409, 'This X username is already registered with another wallet')
        c = await db.counters.find_one_and_update({'key': 'ticket'}, {'$inc': {'seq': 1}}, upsert=True, return_document=True)
        referrer = None
        if body.ref and body.ref.strip().lstrip('@').lower() != x.lower():
            referrer = await db.early_participants.find_one({'x_username_lc': body.ref.strip().lstrip('@').lower()})
        p = {
            'id': str(uuid.uuid4()), 'ticket_no': c['seq'], 'x_username': x, 'x_username_lc': x.lower(),
            'wallet': wallet, 'points': 0, 'tasks': {}, 'daily_done': {}, 'completed_at': None, 'created_at': now(),
            'referred_by': referrer['id'] if referrer else None,
            'referred_by_username': referrer['x_username'] if referrer else None,
            'referral_credited': False, 'referrals': 0, 'referral_points': 0,
        }
        await db.early_participants.insert_one(p)
    return {'token': make_token(p['id'], 'early', 24 * 30), 'participant': participant_view(p)}


@router.get('/early/me')
async def early_me(p=Depends(current_participant)):
    return participant_view(p)


@router.post('/early/tasks/{task}/complete')
async def early_complete(task: str, p=Depends(current_participant)):
    if task not in CORE_TASKS:
        raise HTTPException(400, 'Unknown task')
    if p.get('tasks', {}).get(task):
        return participant_view(p)
    s = await get_settings()
    update = {'$set': {f'tasks.{task}': True}, '$inc': {'points': task_points(s, task)}}
    done = {**p.get('tasks', {}), task: True}
    if all(done.get(t) for t in CORE_TASKS):
        update['$set']['completed_at'] = now()
        bonus = await credit_referral(p, s)
        if bonus:
            update['$inc']['points'] += bonus['$inc']['points']
            update['$inc']['referral_points'] = bonus['$inc']['referral_points']
            update['$set']['referral_credited'] = True
    await db.early_participants.update_one({'id': p['id']}, update)
    return participant_view(await db.early_participants.find_one({'id': p['id']}))


@router.get('/early/vip/nonce')
async def vip_nonce(p=Depends(current_participant)):
    nonce = secrets.token_hex(8)
    message = (f"Futbot League VIP ticket check\n\nTicket: #{p['ticket_no']:04d}\nX: @{p['x_username']}\n"
               f"Nonce: {nonce}\nIssued At: {now().replace(microsecond=0).isoformat()}")
    await db.nonces.insert_one({'nonce': nonce, 'participant_id': p['id'], 'message': message, 'expires_at': now() + timedelta(minutes=5)})
    return {'message': message}


@router.post('/early/vip/check')
async def vip_check(body: VipCheckBody, p=Depends(current_participant)):
    if not p.get('completed_at'):
        raise HTTPException(400, 'Finish the X tasks and get your ticket first')
    if not WALLET_RE.match(body.address):
        raise HTTPException(400, 'Invalid address')
    if not os.environ.get('ETHERSCAN_API_KEY'):
        raise HTTPException(503, 'Volume check is not configured')
    last = p.get('vip_checked_at')
    if last and last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    if last and now() - last < timedelta(minutes=VIP_COOLDOWN_MIN):
        wait = VIP_COOLDOWN_MIN - int((now() - last).total_seconds() // 60)
        raise HTTPException(429, f'Already checked recently. Try again in {wait} min')
    pending = await db.nonces.find_one({'participant_id': p['id'], 'message': body.message, 'expires_at': {'$gt': now()}})
    if not pending:
        raise HTTPException(401, 'Unknown or expired signing request')
    try:
        recovered = Account.recover_message(encode_defunct(text=body.message), signature=body.signature)
    except Exception:
        raise HTTPException(401, 'Invalid signature')
    if recovered.lower() != body.address.lower():
        raise HTTPException(401, 'Signer does not match the connected wallet')
    await db.nonces.delete_one({'_id': pending['_id']})

    s = await get_settings()
    vol = await wallet_volume(body.address)
    new_tier = tier_for(vol['total_usd'], s)
    rank = {t: i + 1 for i, t in enumerate(TIERS)}
    old_tier = p.get('tier')
    best = new_tier if rank.get(new_tier, 0) >= rank.get(old_tier, 0) else old_tier
    credited = int(p.get('vip_points_credited', 0))
    target = int(s.get(f'{best}_points', 0)) if best else 0
    gain = max(0, target - credited)
    await db.early_participants.update_one({'id': p['id']}, {
        '$set': {'tier': best, 'volume_usd': vol['total_usd'], 'vip_wallet': body.address.lower(),
                 'vip_chains': vol['chains'], 'vip_checked_at': now(), 'vip_points_credited': credited + gain},
        '$inc': {'points': gain},
    })
    return {'participant': participant_view(await db.early_participants.find_one({'id': p['id']})),
            'volume_usd': vol['total_usd'], 'tier': best, 'bonus_points': gain, 'chains': vol['chains']}


@router.post('/early/daily/{task_id}/complete')
async def early_daily_complete(task_id: str, p=Depends(current_participant)):
    t = await db.early_daily_tasks.find_one({'id': task_id, 'active': True})
    if not t:
        raise HTTPException(404, 'Task not found')
    if p.get('daily_done', {}).get(task_id) == today():
        raise HTTPException(409, 'Already completed today')
    await db.early_participants.update_one({'id': p['id']}, {'$set': {f'daily_done.{task_id}': today()}, '$inc': {'points': int(t['points'])}})
    return participant_view(await db.early_participants.find_one({'id': p['id']}))


@router.get('/early/list')
async def early_list(limit: int = 200):
    limit = max(1, min(limit, 500))
    rows = await db.early_participants.find({'completed_at': {'$ne': None}}).sort([('points', -1), ('completed_at', 1)]).to_list(limit)
    total = await db.early_participants.count_documents({'completed_at': {'$ne': None}})
    out = []
    for i, p in enumerate(rows):
        v = participant_view(p)
        for k in ('wallet', 'daily_done', 'vip_wallet', 'vip_chains', 'volume_usd', 'referred_by'):
            v.pop(k, None)
        v['rank'] = i + 1
        out.append(v)
    return {'total': total, 'rows': out}


# ---------- admin ----------
@router.post('/admin/login')
async def admin_login(body: AdminLoginBody, request: Request):
    ip = request.client.host if request.client else 'unknown'
    attempt = await db.login_attempts.find_one({'identifier': f'admin:{ip}'})
    if locked(attempt):
        raise HTTPException(429, 'Too many attempts. Try again in 15 minutes')
    expected = os.environ.get('ADMIN_PASSWORD', '')
    if not expected or not secrets.compare_digest(body.password, expected):
        await db.login_attempts.update_one(
            {'identifier': f'admin:{ip}'},
            {'$inc': {'count': 1}, '$set': {'locked_until': now() + timedelta(minutes=15)}}, upsert=True)
        raise HTTPException(401, 'Wrong password')
    await db.login_attempts.delete_one({'identifier': f'admin:{ip}'})
    return {'token': make_token('admin', 'admin', 12)}


@router.get('/admin/me')
async def admin_me(_=Depends(admin_guard)):
    return {'role': 'admin'}


@router.get('/admin/settings')
async def admin_get_settings(_=Depends(admin_guard)):
    return await get_settings()


@router.put('/admin/settings')
async def admin_put_settings(body: SettingsBody, _=Depends(admin_guard)):
    await db.early_settings.update_one({'key': 'main'}, {'$set': body.model_dump()}, upsert=True)
    return await get_settings()


@router.get('/admin/daily-tasks')
async def admin_daily_list(_=Depends(admin_guard)):
    rows = await db.early_daily_tasks.find().sort('created_at', -1).to_list(200)
    return [daily_view(t) for t in rows]


@router.post('/admin/daily-tasks')
async def admin_daily_create(body: DailyTaskBody, _=Depends(admin_guard)):
    t = {'id': str(uuid.uuid4()), **body.model_dump(), 'created_at': now()}
    await db.early_daily_tasks.insert_one(t)
    return daily_view(t)


@router.put('/admin/daily-tasks/{task_id}')
async def admin_daily_update(task_id: str, body: DailyTaskBody, _=Depends(admin_guard)):
    r = await db.early_daily_tasks.update_one({'id': task_id}, {'$set': body.model_dump()})
    if not r.matched_count:
        raise HTTPException(404, 'Task not found')
    return daily_view(await db.early_daily_tasks.find_one({'id': task_id}))


@router.delete('/admin/daily-tasks/{task_id}')
async def admin_daily_delete(task_id: str, _=Depends(admin_guard)):
    r = await db.early_daily_tasks.delete_one({'id': task_id})
    if not r.deleted_count:
        raise HTTPException(404, 'Task not found')
    return {'ok': True}


def participants_filter(q: str, status: str, mode: str) -> dict:
    flt: dict = {}
    s = q.strip().lstrip('@#').lower()
    if s:
        pat = re.escape(s)
        rx = {'$regex': f'^{pat}' if mode == 'prefix' else pat, '$options': 'i'}
        ors = [{'x_username_lc': rx}, {'wallet': rx}]
        if s.isdigit():
            ors.append({'ticket_no': int(s)})
        flt = {'$or': ors}
    if status == 'completed':
        flt['completed_at'] = {'$ne': None}
    elif status == 'pending':
        flt['completed_at'] = None
    return flt


@router.get('/admin/participants')
async def admin_participants(q: str = '', sort: str = 'points', status: str = 'all', mode: str = 'contains', limit: int = 300, _=Depends(admin_guard)):
    limit = max(1, min(limit, 1000))
    flt = participants_filter(q, status, mode)
    order = [('points', -1), ('completed_at', 1), ('created_at', 1)] if sort == 'points' else [('created_at', -1)]
    rows = await db.early_participants.find(flt).sort(order).to_list(limit)
    total = await db.early_participants.count_documents({})
    matched = await db.early_participants.count_documents(flt)
    completed_q = {'completed_at': {'$ne': None}}
    completed = await db.early_participants.count_documents(completed_q)
    out = []
    for p in rows:
        v = participant_view(p)
        v['rank'] = None
        if p.get('completed_at'):
            v['rank'] = await db.early_participants.count_documents({
                **completed_q,
                '$or': [{'points': {'$gt': p.get('points', 0)}},
                        {'points': p.get('points', 0), 'completed_at': {'$lt': p['completed_at']}}],
            }) + 1
        out.append(v)
    return {'total': total, 'completed': completed, 'matched': matched, 'rows': out}


@router.put('/admin/participants/{pid}/points')
async def admin_set_points(pid: str, body: PointsBody, _=Depends(admin_guard)):
    p = await db.early_participants.find_one({'id': pid})
    if not p:
        raise HTTPException(404, 'Participant not found')
    await db.early_participants.update_one({'id': pid}, {'$set': {'points': body.points, 'points_edited_at': now()}})
    return participant_view(await db.early_participants.find_one({'id': pid}))


@router.delete('/admin/participants/{pid}')
async def admin_delete_participant(pid: str, _=Depends(admin_guard)):
    r = await db.early_participants.delete_one({'id': pid})
    if not r.deleted_count:
        raise HTTPException(404, 'Participant not found')
    await db.nonces.delete_many({'participant_id': pid})
    return {'ok': True}


@router.post('/admin/participants/bulk-delete')
async def admin_bulk_delete(body: BulkDeleteBody, _=Depends(admin_guard)):
    if body.ids is not None:
        if not body.ids:
            raise HTTPException(400, 'No participants selected')
        flt = {'id': {'$in': body.ids[:1000]}}
    else:
        q = body.q.strip()
        if not q.lstrip('@#'):
            raise HTTPException(400, 'Search text is required for bulk delete')
        if body.confirm.strip() != q:
            raise HTTPException(400, 'Confirmation text does not match')
        flt = participants_filter(q, body.status, body.mode)
    ids = [p['id'] async for p in db.early_participants.find(flt, {'id': 1})]
    if not ids:
        return {'deleted': 0}
    r = await db.early_participants.delete_many({'id': {'$in': ids}})
    await db.nonces.delete_many({'participant_id': {'$in': ids}})
    return {'deleted': r.deleted_count}


async def ensure_indexes():
    await db.early_participants.create_index('wallet', unique=True)
    await db.early_participants.create_index('x_username_lc', unique=True)
    await db.early_participants.create_index([('points', -1), ('completed_at', 1)])
    await db.early_daily_tasks.create_index('id', unique=True)
    await db.login_attempts.create_index('identifier')
    await db.rate_limits.create_index('key', unique=True)
    await db.rate_limits.create_index('expires_at', expireAfterSeconds=0)
