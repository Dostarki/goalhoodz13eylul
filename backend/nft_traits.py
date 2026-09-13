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

CATEGORIES = [('background', 'Background'), ('base', 'Base'), ('laces', 'Laces'), ('subs', 'Subs')]

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
    r = await client.post(RPC_URL, json=payload)
    r.raise_for_status()
    return r.json()


async def owned_tokens(address: str) -> list[int]:
    address = address.lower()
    hit = _owned_cache.get(address)
    if hit and hit[0] > time.time():
        return hit[1]
    topic_addr = '0x' + address[2:].rjust(64, '0')
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            logs = await _rpc(c, {'jsonrpc': '2.0', 'id': 1, 'method': 'eth_getLogs', 'params': [
                {'fromBlock': '0x0', 'toBlock': 'latest', 'address': NFT_CONTRACT, 'topics': [TRANSFER_TOPIC, None, topic_addr]}]})
            if 'error' in logs:
                raise ValueError(logs['error'])
            candidates = sorted({int(l['topics'][3], 16) for l in logs.get('result', []) if len(l.get('topics', [])) > 3})[:200]
            owned = []
            if candidates:
                batch = [{'jsonrpc': '2.0', 'id': tid, 'method': 'eth_call', 'params': [
                    {'to': NFT_CONTRACT, 'data': '0x6352211e' + hex(tid)[2:].rjust(64, '0')}, 'latest']} for tid in candidates]
                res = await _rpc(c, batch)
                for item in res if isinstance(res, list) else []:
                    result = item.get('result')
                    if result and len(result) >= 66 and '0x' + result[-40:] == address:
                        owned.append(int(item['id']))
    except Exception:
        raise HTTPException(503, 'NFT lookup is temporarily unavailable. Try again shortly.')
    owned.sort()
    _owned_cache[address] = (time.time() + CACHE_TTL, owned)
    return owned


def invalidate(address: str):
    _owned_cache.pop(address.lower(), None)
