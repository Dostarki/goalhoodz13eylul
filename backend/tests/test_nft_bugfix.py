"""Tests for NFT lookup bug fix (eth_getLogs based, no per-token ownerOf)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # fallback: parse frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

WALLET = '0xbd1901f366Ee37d6EfA1B9F9148B8542B29a9cAE'
ADMIN_PW = 'KRALAMKBABA'


@pytest.fixture(scope='module')
def session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='module')
def auth(session):
    r = session.post(f'{BASE_URL}/api/auth/connect', json={'address': WALLET}, timeout=60)
    assert r.status_code == 200, f'connect failed: {r.status_code} {r.text}'
    data = r.json()
    assert 'token' in data and 'user' in data
    return data


def test_connect_returns_user_with_nft(auth):
    u = auth['user']
    assert isinstance(u.get('nft_token_id'), int), f'nft_token_id not int: {u.get("nft_token_id")}'
    b = u.get('nft_bonus')
    assert b, 'nft_bonus missing'
    assert 'name' in b and 'stats' in b and 'total' in b
    cats = [t['category'] for t in b['traits']]
    assert cats == ['Background', 'Base', 'Laces', 'Heel'], cats


def test_nft_mine_returns_75(session, auth):
    session.headers.update({'Authorization': f"Bearer {auth['token']}"})
    t0 = time.time()
    r = session.get(f'{BASE_URL}/api/nft/mine', timeout=60)
    dt1 = time.time() - t0
    assert r.status_code == 200, f'{r.status_code} {r.text}'
    data = r.json()
    tokens = data['tokens']
    # Wallet held 75 at time of bug report; on-chain holdings may drift. Verify >=75 and includes 1..75
    assert len(tokens) >= 75, f'expected >=75 got {len(tokens)}'
    ids = set(t['token_id'] for t in tokens)
    missing = [i for i in range(1, 76) if i not in ids]
    assert not missing, f'missing ids from 1..75: {missing}'
    assert data.get('active_token_id') is not None
    for t in tokens[:3]:
        assert 'traits' in t and 'stats' in t and 'total' in t
    # Second call - cache hit
    t0 = time.time()
    r2 = session.get(f'{BASE_URL}/api/nft/mine', timeout=60)
    dt2 = time.time() - t0
    assert r2.status_code == 200
    print(f'nft/mine first={dt1:.2f}s second={dt2:.2f}s')
    assert dt2 < dt1 + 1  # cache should be faster or comparable


def test_set_active_36(session, auth):
    session.headers.update({'Authorization': f"Bearer {auth['token']}"})
    r = session.post(f'{BASE_URL}/api/nft/active', json={'token_id': 36}, timeout=60)
    assert r.status_code == 200, f'{r.status_code} {r.text}'
    u = r.json()
    assert u['nft_token_id'] == 36
    b = u['nft_bonus']
    assert b['stats'] == {'Dribbling': 17, 'Speed': 15, 'Agility': 7}, b['stats']
    cats = [t['category'] for t in b['traits']]
    assert cats == ['Background', 'Base', 'Laces', 'Heel']
    laces = next(t for t in b['traits'] if t['category'] == 'Laces')
    assert laces['rarity'] == 'Rare'
    assert laces['value'].lower() == 'diamond', laces


def test_set_active_not_owned(session, auth):
    session.headers.update({'Authorization': f"Bearer {auth['token']}"})
    r = session.post(f'{BASE_URL}/api/nft/active', json={'token_id': 500}, timeout=60)
    assert r.status_code == 403, f'{r.status_code} {r.text}'


def test_set_active_zero_422(session, auth):
    session.headers.update({'Authorization': f"Bearer {auth['token']}"})
    r = session.post(f'{BASE_URL}/api/nft/active', json={'token_id': 0}, timeout=60)
    assert r.status_code == 422, f'{r.status_code} {r.text}'


def test_bonus_public_36():
    r = requests.get(f'{BASE_URL}/api/nft/bonus/36', timeout=30)
    assert r.status_code == 200
    b = r.json()
    cats = [t['category'] for t in b['traits']]
    assert 'Heel' in cats and 'Subs' not in cats, cats


def test_bonus_unknown_404():
    r = requests.get(f'{BASE_URL}/api/nft/bonus/9999', timeout=30)
    assert r.status_code == 404


def test_me_reflects_active(session, auth):
    session.headers.update({'Authorization': f"Bearer {auth['token']}"})
    r = session.get(f'{BASE_URL}/api/me', timeout=30)
    assert r.status_code == 200
    assert r.json()['nft_token_id'] == 36


def test_leaderboard_public():
    r = requests.get(f'{BASE_URL}/api/leaderboard', timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_login():
    r = requests.post(f'{BASE_URL}/api/admin/login', json={'password': ADMIN_PW}, timeout=30)
    assert r.status_code == 200, f'{r.status_code} {r.text}'
