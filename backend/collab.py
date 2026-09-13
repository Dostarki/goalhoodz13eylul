from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import timedelta
import re
import uuid
import secrets
import bcrypt

from early import now, make_token, decode, admin_guard, locked, WALLET_RE, X_RE

router = APIRouter(prefix='/api')
db = None  # injected from server.py

CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
LOOKUP_LEN = 8
SECRET_LEN = 24
SPOT_TYPES = ('gtd', 'fcfs')
TWEET_RE = re.compile(r'^https?://(www\.)?(x|twitter)\.com/[A-Za-z0-9_]{1,15}/status/(\d+)', re.I)


def gen_code() -> str:
    return 'GH-' + ''.join(secrets.choice(CODE_ALPHABET) for _ in range(LOOKUP_LEN + SECRET_LEN))


def hash_code(code: str) -> str:
    return bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()


def check_code(code: str, hashed: str) -> bool:
    return bcrypt.checkpw(code.encode(), hashed.encode())


def norm_code(raw: str) -> str:
    s = re.sub(r'[\s\-]', '', raw.strip().upper())
    return s[2:] if s.startswith('GH') and len(s) == 2 + LOOKUP_LEN + SECRET_LEN else s


def clean_tweet(url: Optional[str]) -> str:
    u = (url or '').strip()
    if u and not TWEET_RE.match(u):
        raise HTTPException(400, 'Post link must look like https://x.com/user/status/123')
    return u


def clean_x(x: str) -> str:
    x = x.strip().lstrip('@')
    if not X_RE.match(x):
        raise HTTPException(400, 'Owner X username must be 1-15 chars: letters, numbers, underscore')
    return x


async def usage(collab_id: str) -> dict:
    out = {t: 0 for t in SPOT_TYPES}
    async for r in db.collab_wallets.aggregate([{'$match': {'collab_id': collab_id}}, {'$group': {'_id': '$type', 'n': {'$sum': 1}}}]):
        out[r['_id']] = r['n']
    return out


async def collab_view(c: dict, admin: bool = False) -> dict:
    used = await usage(c['id'])
    v = {
        'id': c['id'], 'name': c['name'], 'owner_x': c['owner_x'],
        'gtd_spots': c['gtd_spots'], 'fcfs_spots': c['fcfs_spots'],
        'gtd_used': used['gtd'], 'fcfs_used': used['fcfs'],
        'gtd_remaining': max(0, c['gtd_spots'] - used['gtd']), 'fcfs_remaining': max(0, c['fcfs_spots'] - used['fcfs']),
        'allocated': used['gtd'] + used['fcfs'],
        'tweet_url': c.get('tweet_url', ''), 'created_at': c['created_at'].isoformat(),
    }
    if admin:
        v['code_hint'] = c['code_hint']
        v['code_rotated_at'] = c['code_rotated_at'].isoformat() if c.get('code_rotated_at') else None
    return v


def wallet_view(w: dict) -> dict:
    return {'id': w['id'], 'wallet': w['wallet'], 'type': w['type'], 'added_at': w['added_at'].isoformat()}


async def current_collab(authorization: Optional[str] = Header(None)) -> dict:
    payload = decode(authorization, 'collab')
    c = await db.collabs.find_one({'id': payload['sub']})
    if not c or c.get('code_version', 0) != payload.get('ver', 0):
        raise HTTPException(401, 'Collab code was rotated or removed. Enter the new code')
    return c


# ---------- models ----------
class CollabBody(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    owner_x: str
    gtd_spots: int = Field(ge=0, le=100000)
    fcfs_spots: int = Field(ge=0, le=100000)
    tweet_url: Optional[str] = ''


class CollabLoginBody(BaseModel):
    code: str


class WalletBody(BaseModel):
    type: str
    wallet: str


class TweetBody(BaseModel):
    tweet_url: str = ''


class ApplyBody(BaseModel):
    x_username: str
    project_name: str = Field(default='', max_length=60)
    gtd_requested: int = Field(ge=0, le=100000)
    fcfs_requested: int = Field(ge=0, le=100000)
    note: str = Field(default='', max_length=500)


class ApproveBody(BaseModel):
    name: Optional[str] = None
    gtd_spots: Optional[int] = Field(default=None, ge=0, le=100000)
    fcfs_spots: Optional[int] = Field(default=None, ge=0, le=100000)


def application_view(a: dict) -> dict:
    return {
        'id': a['id'], 'x_username': a['x_username'], 'project_name': a.get('project_name', ''),
        'gtd_requested': a['gtd_requested'], 'fcfs_requested': a['fcfs_requested'], 'note': a.get('note', ''),
        'status': a['status'], 'created_at': a['created_at'].isoformat(), 'collab_id': a.get('collab_id'),
    }


# ---------- applications ----------
@router.post('/collab/apply')
async def collab_apply(body: ApplyBody, request: Request):
    x = clean_x(body.x_username)
    if body.gtd_requested + body.fcfs_requested < 1:
        raise HTTPException(400, 'Request at least one GTD or FCFS spot')
    if await db.collab_applications.find_one({'x_username_lc': x.lower(), 'status': 'pending'}):
        raise HTTPException(409, 'A pending application already exists for this X account')
    ip = request.headers.get('x-forwarded-for', '').split(',')[0].strip() or (request.client.host if request.client else 'unknown')
    recent = await db.collab_applications.count_documents({'ip': ip, 'created_at': {'$gt': now() - timedelta(hours=1)}})
    if recent >= 3:
        raise HTTPException(429, 'Too many applications from this network. Try again later')
    a = {
        'id': str(uuid.uuid4()), 'x_username': x, 'x_username_lc': x.lower(), 'project_name': body.project_name.strip(),
        'gtd_requested': body.gtd_requested, 'fcfs_requested': body.fcfs_requested, 'note': body.note.strip(),
        'status': 'pending', 'ip': ip, 'created_at': now(),
    }
    await db.collab_applications.insert_one(a)
    return application_view(a)


@router.get('/admin/collab-applications')
async def admin_applications(status: str = 'pending', _=Depends(admin_guard)):
    flt = {} if status == 'all' else {'status': status}
    rows = await db.collab_applications.find(flt).sort('created_at', -1).to_list(500)
    return [application_view(a) for a in rows]


@router.post('/admin/collab-applications/{aid}/approve')
async def admin_approve_application(aid: str, body: ApproveBody, _=Depends(admin_guard)):
    a = await db.collab_applications.find_one({'id': aid})
    if not a:
        raise HTTPException(404, 'Application not found')
    if a['status'] != 'pending':
        raise HTTPException(409, f"Application already {a['status']}")
    name = (body.name or a.get('project_name') or a['x_username']).strip()
    if len(name) < 2:
        raise HTTPException(400, 'Collab name must be at least 2 chars')
    code = gen_code()
    c = {
        'id': str(uuid.uuid4()), 'name': name, 'owner_x': a['x_username'],
        'gtd_spots': a['gtd_requested'] if body.gtd_spots is None else body.gtd_spots,
        'fcfs_spots': a['fcfs_requested'] if body.fcfs_spots is None else body.fcfs_spots, 'tweet_url': '',
        'code_lookup': code[3:3 + LOOKUP_LEN], 'code_hash': hash_code(code), 'code_hint': code[:7] + '…',
        'code_version': 1, 'created_at': now(), 'code_rotated_at': None, 'application_id': aid,
    }
    await db.collabs.insert_one(c)
    await db.collab_applications.update_one({'id': aid}, {'$set': {'status': 'approved', 'collab_id': c['id'], 'decided_at': now()}})
    return {'collab': await collab_view(c, admin=True), 'code': code}


@router.post('/admin/collab-applications/{aid}/reject')
async def admin_reject_application(aid: str, _=Depends(admin_guard)):
    r = await db.collab_applications.update_one({'id': aid, 'status': 'pending'}, {'$set': {'status': 'rejected', 'decided_at': now()}})
    if not r.matched_count:
        raise HTTPException(404, 'Pending application not found')
    return {'ok': True}


@router.delete('/admin/collab-applications/{aid}')
async def admin_delete_application(aid: str, _=Depends(admin_guard)):
    r = await db.collab_applications.delete_one({'id': aid})
    if not r.deleted_count:
        raise HTTPException(404, 'Application not found')
    return {'ok': True}


# ---------- admin ----------
@router.post('/admin/collabs')
async def admin_create_collab(body: CollabBody, _=Depends(admin_guard)):
    code = gen_code()
    c = {
        'id': str(uuid.uuid4()), 'name': body.name.strip(), 'owner_x': clean_x(body.owner_x),
        'gtd_spots': body.gtd_spots, 'fcfs_spots': body.fcfs_spots, 'tweet_url': clean_tweet(body.tweet_url),
        'code_lookup': code[3:3 + LOOKUP_LEN], 'code_hash': hash_code(code), 'code_hint': code[:3 + 4] + '…',
        'code_version': 1, 'created_at': now(), 'code_rotated_at': None,
    }
    await db.collabs.insert_one(c)
    return {'collab': await collab_view(c, admin=True), 'code': code}


@router.get('/admin/collabs')
async def admin_list_collabs(_=Depends(admin_guard)):
    rows = await db.collabs.find().sort('created_at', -1).to_list(500)
    return [await collab_view(c, admin=True) for c in rows]


@router.put('/admin/collabs/{cid}')
async def admin_update_collab(cid: str, body: CollabBody, _=Depends(admin_guard)):
    c = await db.collabs.find_one({'id': cid})
    if not c:
        raise HTTPException(404, 'Collab not found')
    used = await usage(cid)
    if body.gtd_spots < used['gtd'] or body.fcfs_spots < used['fcfs']:
        raise HTTPException(400, f"Spots can't go below allocated wallets (GTD {used['gtd']}, FCFS {used['fcfs']})")
    await db.collabs.update_one({'id': cid}, {'$set': {
        'name': body.name.strip(), 'owner_x': clean_x(body.owner_x), 'gtd_spots': body.gtd_spots,
        'fcfs_spots': body.fcfs_spots, 'tweet_url': clean_tweet(body.tweet_url), 'updated_at': now()}})
    return await collab_view(await db.collabs.find_one({'id': cid}), admin=True)


@router.post('/admin/collabs/{cid}/rotate')
async def admin_rotate_code(cid: str, _=Depends(admin_guard)):
    c = await db.collabs.find_one({'id': cid})
    if not c:
        raise HTTPException(404, 'Collab not found')
    code = gen_code()
    await db.collabs.update_one({'id': cid}, {'$set': {
        'code_lookup': code[3:3 + LOOKUP_LEN], 'code_hash': hash_code(code), 'code_hint': code[:7] + '…',
        'code_rotated_at': now()}, '$inc': {'code_version': 1}})
    return {'collab': await collab_view(await db.collabs.find_one({'id': cid}), admin=True), 'code': code}


@router.delete('/admin/collabs/{cid}')
async def admin_delete_collab(cid: str, _=Depends(admin_guard)):
    r = await db.collabs.delete_one({'id': cid})
    if not r.deleted_count:
        raise HTTPException(404, 'Collab not found')
    await db.collab_wallets.delete_many({'collab_id': cid})
    return {'ok': True}


@router.get('/admin/collabs/{cid}/wallets')
async def admin_collab_wallets(cid: str, _=Depends(admin_guard)):
    if not await db.collabs.find_one({'id': cid}):
        raise HTTPException(404, 'Collab not found')
    rows = await db.collab_wallets.find({'collab_id': cid}).sort('added_at', 1).to_list(5000)
    return [wallet_view(w) for w in rows]


# ---------- partner ----------
@router.post('/collab/login')
async def collab_login(body: CollabLoginBody, request: Request):
    ip = request.headers.get('x-forwarded-for', '').split(',')[0].strip() or (request.client.host if request.client else 'unknown')
    ident = f'collab:{ip}'
    attempt = await db.login_attempts.find_one({'identifier': ident})
    if locked(attempt):
        raise HTTPException(429, 'Too many attempts. Try again in 15 minutes')
    code = 'GH-' + norm_code(body.code)
    c = await db.collabs.find_one({'code_lookup': code[3:3 + LOOKUP_LEN]}) if len(code) == 3 + LOOKUP_LEN + SECRET_LEN else None
    if not c or not check_code(code, c['code_hash']):
        await db.login_attempts.update_one({'identifier': ident}, {'$inc': {'count': 1}, '$set': {'locked_until': now() + timedelta(minutes=15)}}, upsert=True)
        raise HTTPException(401, 'Invalid collab code')
    await db.login_attempts.delete_one({'identifier': ident})
    return {'token': make_token(c['id'], 'collab', 12, ver=c.get('code_version', 0)), 'collab': await collab_view(c)}


@router.get('/collab/me')
async def collab_me(c=Depends(current_collab)):
    rows = await db.collab_wallets.find({'collab_id': c['id']}).sort('added_at', 1).to_list(5000)
    return {**await collab_view(c), 'wallets': [wallet_view(w) for w in rows]}


@router.post('/collab/wallets')
async def collab_add_wallet(body: WalletBody, c=Depends(current_collab)):
    t = body.type.lower().strip()
    if t not in SPOT_TYPES:
        raise HTTPException(400, 'Spot type must be GTD or FCFS')
    w = body.wallet.strip()
    if not WALLET_RE.match(w):
        raise HTTPException(400, 'Wallet must be a valid 0x address (42 chars)')
    w = w.lower()
    if await db.collab_wallets.find_one({'collab_id': c['id'], 'wallet': w}):
        raise HTTPException(409, 'This wallet is already on your roster')
    used = await usage(c['id'])
    if used[t] >= c[f'{t}_spots']:
        raise HTTPException(409, f'No {t.upper()} spots remaining')
    doc = {'id': str(uuid.uuid4()), 'collab_id': c['id'], 'wallet': w, 'type': t, 'added_at': now()}
    await db.collab_wallets.insert_one(doc)
    return wallet_view(doc)


@router.delete('/collab/wallets/{wid}')
async def collab_remove_wallet(wid: str, c=Depends(current_collab)):
    r = await db.collab_wallets.delete_one({'id': wid, 'collab_id': c['id']})
    if not r.deleted_count:
        raise HTTPException(404, 'Wallet not found')
    return {'ok': True}


@router.put('/collab/tweet')
async def collab_set_tweet(body: TweetBody, c=Depends(current_collab)):
    await db.collabs.update_one({'id': c['id']}, {'$set': {'tweet_url': clean_tweet(body.tweet_url), 'updated_at': now()}})
    return await collab_view(await db.collabs.find_one({'id': c['id']}))


# ---------- public ----------
@router.get('/collab/ledger')
async def collab_ledger():
    rows = await db.collabs.find().sort('created_at', -1).to_list(500)
    return [await collab_view(c) for c in rows]


async def ensure_indexes():
    await db.collabs.create_index('id', unique=True)
    await db.collabs.create_index('code_lookup', unique=True)
    await db.collab_wallets.create_index([('collab_id', 1), ('wallet', 1)], unique=True)
    await db.collab_wallets.create_index('id', unique=True)
    await db.collab_applications.create_index('id', unique=True)
    await db.collab_applications.create_index([('status', 1), ('created_at', -1)])
