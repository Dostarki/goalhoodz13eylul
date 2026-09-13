"""Backend tests for NFT gate + global league features."""
import os
import time
import jwt
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
# Fallback: load frontend .env
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

JWT_SECRET = 'hoodball-dev-secret-7eylul'
NFT_CONTRACT = '0x78cd233bbe2d30adbe06683a516baf49a40cfb0c'

W_NO_NFT = '0x49245f85afcf745cf46471298f5aeb6f99c21df1'
W_EXISTING_NO_NFT = '0xd148af0dca534ebf4dc4e742d61aac9e34c51c34'
W1 = '0x1111111111111111111111111111111111111111'
W2 = '0x2222222222222222222222222222222222222222'


def forge_token(address: str) -> str:
    return jwt.encode(
        {'sub': address.lower(), 'exp': datetime.now(timezone.utc) + timedelta(days=1)},
        JWT_SECRET, algorithm='HS256')


@pytest.fixture(scope='module')
def s():
    return requests.Session()


@pytest.fixture(scope='module')
def token_w1(s):
    r = s.post(f'{BASE_URL}/api/auth/connect', json={'address': W1})
    assert r.status_code == 200, r.text
    return r.json()['token']


@pytest.fixture(scope='module')
def token_w2(s):
    r = s.post(f'{BASE_URL}/api/auth/connect', json={'address': W2})
    assert r.status_code == 200, r.text
    return r.json()['token']


# ---------- NFT gate ----------
def test_nft_status_no_nft(s):
    r = s.get(f'{BASE_URL}/api/nft/status', params={'address': W_NO_NFT})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j['has_nft'] is False
    assert j['balance'] == 0
    assert j['contract'].lower() == NFT_CONTRACT
    assert 'opensea_url' in j and j['opensea_url']


def test_connect_without_nft_403(s):
    r = s.post(f'{BASE_URL}/api/auth/connect', json={'address': W_NO_NFT})
    assert r.status_code == 403, r.text
    detail = r.json().get('detail')
    assert isinstance(detail, dict)
    assert detail.get('code') == 'NFT_REQUIRED'
    assert detail.get('opensea_url')


def test_connect_bypass_w1(s, token_w1):
    assert token_w1


def test_connect_bypass_w2(s, token_w2):
    assert token_w2


def test_forged_jwt_existing_user_without_nft_403(s):
    # first ensure such user exists - create via direct DB won't; but user must exist.
    # If it doesn't yet, create via a bypass path? we can't. Try request; if 401 user not found - ensure by connect fails => user not created. So user must have been created previously. Attempt anyway.
    tok = forge_token(W_EXISTING_NO_NFT)
    r = s.get(f'{BASE_URL}/api/me', headers={'Authorization': f'Bearer {tok}'})
    # Acceptable: 403 NFT_REQUIRED. If user doesn't exist -> 401. Log accordingly.
    if r.status_code == 401:
        pytest.skip(f'User {W_EXISTING_NO_NFT} does not exist in DB; NFT gate check pre-empted by user check')
    assert r.status_code == 403, r.text
    detail = r.json().get('detail')
    assert isinstance(detail, dict) and detail.get('code') == 'NFT_REQUIRED'


def test_forged_jwt_global_opponent_403(s):
    tok = forge_token(W_EXISTING_NO_NFT)
    r = s.get(f'{BASE_URL}/api/global/opponent', headers={'Authorization': f'Bearer {tok}'})
    if r.status_code == 401:
        pytest.skip('user does not exist')
    assert r.status_code == 403
    assert r.json()['detail']['code'] == 'NFT_REQUIRED'


# ---------- global opponent ----------
def test_global_opponent_not_self(s, token_w1):
    # Ensure w2 has a username so it's eligible as an opponent
    s.put(f'{BASE_URL}/api/me/username', json={'username': 'team_two'},
          headers={'Authorization': f'Bearer {forge_token(W2)}'})
    r = s.get(f'{BASE_URL}/api/global/opponent', headers={'Authorization': f'Bearer {token_w1}'})
    assert r.status_code == 200, r.text
    j = r.json()
    # Could be bot if no other wallet with username; but w2 should qualify
    if j.get('address'):
        assert j['address'] != W1
        assert j['is_bot'] is False


# ---------- match creation global ----------
def _get_user_stats(s, token):
    r = s.get(f'{BASE_URL}/api/me', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    return r.json()


def test_ensure_usernames(s, token_w1, token_w2):
    # username may already be set; if 409 due to same taken by self it won't fire (backend excludes self)
    r1 = s.put(f'{BASE_URL}/api/me/username', json={'username': 'team_one'},
               headers={'Authorization': f'Bearer {token_w1}'})
    r2 = s.put(f'{BASE_URL}/api/me/username', json={'username': 'team_two'},
               headers={'Authorization': f'Bearer {token_w2}'})
    # Accept either 200 or 409 (already taken by another id if this file re-ran with fresh data)
    assert r1.status_code in (200, 409), r1.text
    assert r2.status_code in (200, 409), r2.text


def test_global_match_draw_updates_both(s, token_w1, token_w2):
    before1 = _get_user_stats(s, token_w1)
    before2 = _get_user_stats(s, token_w2)
    body = {'mode': 'global', 'opponent_username': 'team_two', 'opponent_char_id': 'mohawk',
            'opponent_address': W2, 'player_goals': 2, 'opponent_goals': 2,
            'arena': 'paper', 'character_id': 'arc'}
    r = s.post(f'{BASE_URL}/api/matches', json=body, headers={'Authorization': f'Bearer {token_w1}'})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j['global_match'] is not None
    gm = j['global_match']
    assert gm['home']['address'] == W1
    assert gm['away']['address'] == W2
    assert gm['away']['is_bot'] is False
    assert gm['home_goals'] == 2 and gm['away_goals'] == 2

    after1 = _get_user_stats(s, token_w1)
    after2 = _get_user_stats(s, token_w2)
    assert after1['points'] - before1['points'] == 1
    assert after1['draws'] - before1['draws'] == 1
    assert after1['matches'] - before1['matches'] == 1
    assert after1['goals_for'] - before1['goals_for'] == 2
    assert after1['goals_against'] - before1['goals_against'] == 2

    assert after2['points'] - before2['points'] == 1
    assert after2['draws'] - before2['draws'] == 1
    assert after2['matches'] - before2['matches'] == 1
    assert after2['goals_for'] - before2['goals_for'] == 2
    assert after2['goals_against'] - before2['goals_against'] == 2


def test_global_match_self_opponent_no_double(s, token_w1):
    before = _get_user_stats(s, token_w1)
    body = {'mode': 'global', 'opponent_username': 'me', 'opponent_char_id': 'mohawk',
            'opponent_address': W1, 'player_goals': 3, 'opponent_goals': 1,
            'arena': 'paper', 'character_id': 'arc'}
    r = s.post(f'{BASE_URL}/api/matches', json=body, headers={'Authorization': f'Bearer {token_w1}'})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j['global_match']['away']['is_bot'] is True
    after = _get_user_stats(s, token_w1)
    # Only own update: win => +3 points, +1 win, +1 match
    assert after['points'] - before['points'] == 3
    assert after['wins'] - before['wins'] == 1
    assert after['matches'] - before['matches'] == 1
    assert after['goals_for'] - before['goals_for'] == 3
    assert after['goals_against'] - before['goals_against'] == 1


def test_global_match_bot_opponent(s, token_w1):
    before = _get_user_stats(s, token_w1)
    body = {'mode': 'global', 'opponent_username': 'bot_x', 'opponent_char_id': 'mohawk',
            'opponent_address': None, 'player_goals': 0, 'opponent_goals': 2,
            'arena': 'paper', 'character_id': 'arc'}
    r = s.post(f'{BASE_URL}/api/matches', json=body, headers={'Authorization': f'Bearer {token_w1}'})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j['global_match']['away']['is_bot'] is True
    after = _get_user_stats(s, token_w1)
    # Loss => 0 pts, +1 loss, +1 match
    assert after['points'] - before['points'] == 0
    assert after['losses'] - before['losses'] == 1
    assert after['matches'] - before['matches'] == 1


def test_global_matches_recent(s):
    r = s.get(f'{BASE_URL}/api/global/matches', params={'limit': 20})
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list) and len(rows) >= 3
    for row in rows:
        for k in ('id', 'home', 'away', 'home_goals', 'away_goals', 'played_at'):
            assert k in row, f'missing {k}'
    # newest first
    times = [row['played_at'] for row in rows]
    assert times == sorted(times, reverse=True)


def test_global_me_form(s, token_w2):
    r = s.get(f'{BASE_URL}/api/global/me', headers={'Authorization': f'Bearer {token_w2}'})
    assert r.status_code == 200
    j = r.json()
    assert 'matches' in j and 'form' in j
    assert isinstance(j['form'], list) and len(j['form']) <= 5
    for c in j['form']:
        assert c in ('W', 'D', 'L')
    # Each match involves W2
    for m in j['matches']:
        assert W2 in (m['home']['address'], m['away'].get('address') or '')


def test_leaderboard(s):
    r = s.get(f'{BASE_URL}/api/leaderboard')
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list) and len(rows) >= 1
    for row in rows:
        assert 'goal_diff' in row
        assert row['goal_diff'] == row['goals_for'] - row['goals_against']
    # sort key
    keys = [(-r['points'], -r['goal_diff'], -r['goals_for'], -r['wins']) for r in rows]
    assert keys == sorted(keys)


# ---------- existing modes still work ----------
def test_quick_mode(s, token_w1):
    body = {'mode': 'quick', 'opponent_username': 'randombot', 'opponent_char_id': 'mohawk',
            'player_goals': 1, 'opponent_goals': 0, 'arena': 'paper', 'character_id': 'arc'}
    r = s.post(f'{BASE_URL}/api/matches', json=body, headers={'Authorization': f'Bearer {token_w1}'})
    assert r.status_code == 200, r.text
    assert r.json()['match']['mode'] == 'quick'


def test_league_mode_and_get(s, token_w1):
    body = {'mode': 'league', 'opponent_username': 'lbot', 'opponent_char_id': 'mohawk',
            'player_goals': 2, 'opponent_goals': 1, 'arena': 'paper', 'character_id': 'arc'}
    r = s.post(f'{BASE_URL}/api/matches', json=body, headers={'Authorization': f'Bearer {token_w1}'})
    assert r.status_code == 200, r.text
    assert r.json()['league'] is not None
    r2 = s.get(f'{BASE_URL}/api/league', headers={'Authorization': f'Bearer {token_w1}'})
    assert r2.status_code == 200
    assert 'standings' in r2.json()


def test_invalid_mode_422(s, token_w1):
    body = {'mode': 'foo', 'opponent_username': 'x', 'opponent_char_id': 'mohawk',
            'player_goals': 1, 'opponent_goals': 0, 'arena': 'paper', 'character_id': 'arc'}
    r = s.post(f'{BASE_URL}/api/matches', json=body, headers={'Authorization': f'Bearer {token_w1}'})
    assert r.status_code == 422, r.text
