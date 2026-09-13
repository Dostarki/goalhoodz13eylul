import os
import time
import httpx
from fastapi import HTTPException

NFT_CONTRACT = os.environ['NFT_CONTRACT_ADDRESS'].lower()
RPC_URL = os.environ['RPC_URL']
OPENSEA_URL = os.environ['OPENSEA_URL']
BYPASS = {a.strip().lower() for a in os.environ.get('NFT_GATE_BYPASS_ADDRESSES', '').split(',') if a.strip()}
CACHE_TTL = 120
_cache: dict = {}


def gate_info() -> dict:
    return {'contract': NFT_CONTRACT, 'opensea_url': OPENSEA_URL, 'chain_id': int(os.environ.get('CHAIN_ID', '4663'))}


def nft_required_error() -> HTTPException:
    return HTTPException(403, {'code': 'NFT_REQUIRED', 'message': 'A GoalHoodz NFT is required to play.', **gate_info()})


async def nft_balance(address: str) -> int:
    address = address.lower()
    if address in BYPASS:
        return 1
    hit = _cache.get(address)
    if hit and hit[0] > time.time():
        return hit[1]
    data = '0x70a08231' + address[2:].rjust(64, '0')
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'eth_call', 'params': [{'to': NFT_CONTRACT, 'data': data}, 'latest']}
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(RPC_URL, json=payload)
            r.raise_for_status()
            body = r.json()
        result = body.get('result')
        if not result or 'error' in body:
            raise ValueError(body.get('error') or 'empty result')
        bal = int(result, 16)
    except Exception:
        raise HTTPException(503, 'NFT ownership check is temporarily unavailable. Try again shortly.')
    _cache[address] = (time.time() + CACHE_TTL, bal)
    return bal


async def require_nft(address: str) -> int:
    bal = await nft_balance(address)
    if bal <= 0:
        raise nft_required_error()
    return bal
