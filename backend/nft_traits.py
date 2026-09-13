import asyncio
import csv
import os
import time
import httpx
from pathlib import Path
from fastapi import HTTPException

RPC_URL = os.environ['RPC_URL']
NFT_CONTRACT = os.environ['NFT_CONTRACT_ADDRESS'].lower()
TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
CACHE_TTL = 120
_owned_cache: dict = {}

CATEGORIES = [('background', 'Background'), ('base', 'Base'), ('laces', 'Laces'), ('subs', 'Heel')]

# category -> trait value (lowercase) -> (stat, pct, rarity)
BONUS = {
    'background': {
        'changingroom': ('Stamina', 7, 'Common'), 'goldenhour': ('Attack', 8, 'Common'), 'stadium': ('Defense', 9, 'Common'),
        'street': ('Dribbling', 8, 'Common'), 'tunnel': ('Defense', 7, 'Common'), 'ancient': ('Attack', 14, 'Rare'),
    },
    'base': {
        'blue': ('Passing', 7, 'Common'), 'blue2': ('Passing', 8, 'Common'), 'darkblue': ('Defense', 7, 'Common'),
        'darkgreen': ('Stamina', 8, 'Common'), 'green': ('Stamina', 7, 'Common'), 'pink': ('Dribbling', 9, 'Common'),
        'purple': ('Dribbling', 8, 'Common'), 'red': ('Shooting', 9, 'Common'), 'gold': ('Shooting', 15, 'Rare'),
    },
    'laces': {
        'blue': ('Defense', 6, 'Common'), 'green': ('Stamina', 7, 'Common'), 'pink': ('Agility', 8, 'Common'),
        'purple': ('Shooting', 7, 'Common'), 'red': ('Speed', 8, 'Common'), 'white': ('Passing', 6, 'Common'),
        'white-blue': ('Passing', 7, 'Common'), 'white-pink': ('Agility', 8, 'Common'), 'white-purple': ('Passing', 7, 'Common'),
        'white-red': ('Speed', 8, 'Common'), 'yellow': ('Agility', 7, 'Common'), 'gold': ('Shooting', 14, 'Rare'), 'diamond': ('Speed', 15, 'Rare'),
    },
    'subs': {
        'black': ('Physical', 7, 'Common'), 'blue': ('Defense', 6, 'Common'), 'green': ('Agility', 8, 'Common'),
        'purple': ('Agility', 7, 'Common'), 'red': ('Physical', 8, 'Common'), 'white': ('Defense', 6, 'Common'),
        'gold': ('Speed', 13, 'Rare'), 'diamond': ('Agility', 15, 'Rare'),
    },
}


def _load_traits() -> dict:
    out = {}
    with open(Path(__file__).parent / 'data' / 'goalhoodz_traits.csv', newline='') as f:
        for r in csv.DictReader(f):
            out[int(r['token_id'])] = {k: r[k] for k, _ in CATEGORIES}
    return out


TRAITS = _load_traits()


def token_bonus(token_id: int) -> dict | None:
    t = TRAITS.get(token_id)
    if not t:
        return None
    traits, stats = [], {}
    for key, label in CATEGORIES:
        value = t[key]
        stat, pct, rarity = BONUS[key].get(value.lower(), (None, 0, 'Common'))
        traits.append({'category': label, 'value': value, 'rarity': rarity, 'stat': stat, 'pct': pct})
        if stat:
            stats[stat] = stats.get(stat, 0) + pct
    return {'token_id': token_id, 'name': f'Goalhoodz #{token_id}', 'traits': traits, 'stats': stats, 'total': sum(stats.values())}


async def _rpc(client: httpx.AsyncClient, payload):
    for attempt in range(4):
        r = await client.post(RPC_URL, json=payload)
        data = r.json() if r.status_code in (200, 429) else None
        rate_limited = r.status_code == 429 or (isinstance(data, dict) and data.get('error', {}).get('code') == 429)
        if not rate_limited:
            r.raise_for_status()
            return data
        await asyncio.sleep(0.6 * (2 ** attempt))
    raise ValueError('rpc rate limited')


async def _transfer_logs(client, topics):
    res = await _rpc(client, {'jsonrpc': '2.0', 'id': 1, 'method': 'eth_getLogs', 'params': [
        {'fromBlock': '0x0', 'toBlock': 'latest', 'address': NFT_CONTRACT, 'topics': topics}]})
    if 'error' in res:
        raise ValueError(res['error'])
    return [l for l in res.get('result', []) if len(l.get('topics', [])) > 3]


async def owned_tokens(address: str) -> list[int]:
    """Current holdings derived purely from Transfer logs (in minus out), 2 RPC calls, no per-token ownerOf."""
    address = address.lower()
    hit = _owned_cache.get(address)
    if hit and hit[0] > time.time():
        return hit[1]
    topic_addr = '0x' + address[2:].rjust(64, '0')
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            incoming = await _transfer_logs(c, [TRANSFER_TOPIC, None, topic_addr])
            outgoing = await _transfer_logs(c, [TRANSFER_TOPIC, topic_addr])
    except Exception:
        raise HTTPException(503, 'NFT lookup is temporarily unavailable. Try again shortly.')
    latest: dict[int, tuple] = {}
    for direction, logs in ((0, outgoing), (1, incoming)):
        for l in logs:
            tid = int(l['topics'][3], 16)
            key = (int(l['blockNumber'], 16), int(l['logIndex'], 16), direction)
            if tid not in latest or key > latest[tid]:
                latest[tid] = key
    owned = sorted(tid for tid, k in latest.items() if k[2] == 1)
    _owned_cache[address] = (time.time() + CACHE_TTL, owned)
    return owned


def invalidate(address: str):
    _owned_cache.pop(address.lower(), None)
