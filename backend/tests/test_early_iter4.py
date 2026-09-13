"""Backend tests for Iteration 4: register rate-limit, admin/participants shape,
delete-participant, filters/search. Uses localhost:8001 so we can vary
X-Forwarded-For / X-Client-Id headers (public ingress collapses them)."""
import os
import time
import uuid
import pytest
import requests

LOCAL = 'http://localhost:8001'
PUBLIC = (os.environ.get('REACT_APP_BACKEND_URL') or '').rstrip('/')
API = f'{LOCAL}/api'
API_PUB = f'{PUBLIC}/api'
ADMIN_PASSWORD = 'admin123'


def rand_wallet():
    return '0x' + (uuid.uuid4().hex + uuid.uuid4().hex)[:40]


def rand_x():
    return ('t' + uuid.uuid4().hex)[:15]


def rand_ip():
    import random
    return f'10.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}'


def rand_cid():
    return uuid.uuid4().hex  # 32 chars, within 8..64


@pytest.fixture(scope='module')
def s():
    return requests.Session()


@pytest.fixture(scope='module')
def admin_token(s):
    r = s.post(f'{API}/admin/login', json={'password': ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()['token']


@pytest.fixture(scope='module')
def admin_h(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


def register(s, x=None, w=None, ip=None, cid=None, ref=None):
    headers = {'Content-Type': 'application/json',
               'X-Forwarded-For': ip or rand_ip(),
               'X-Client-Id': cid or rand_cid()}
    body = {'x_username': x or rand_x(), 'wallet': w or rand_wallet()}
    if ref:
        body['ref'] = ref
    return s.post(f'{API}/early/register', json=body, headers=headers)


# ---------- Rate limit ----------
class TestRateLimit:
    def test_valid_register_succeeds(self, s):
        r = register(s)
        assert r.status_code == 200, r.text
        assert 'participant' in r.json()

    def test_same_ip_different_cid_blocked(self, s):
        ip = rand_ip()
        r1 = register(s, ip=ip, cid=rand_cid())
        assert r1.status_code == 200, r1.text
        r2 = register(s, ip=ip, cid=rand_cid())
        assert r2.status_code == 429
        assert 'Try again in' in r2.json()['detail']

    def test_same_cid_different_ip_blocked(self, s):
        cid = rand_cid()
        r1 = register(s, ip=rand_ip(), cid=cid)
        assert r1.status_code == 200, r1.text
        r2 = register(s, ip=rand_ip(), cid=cid)
        assert r2.status_code == 429
        assert 'seconds' in r2.json()['detail']

    def test_invalid_wallet_does_not_consume_limit(self, s):
        ip = rand_ip()
        cid = rand_cid()
        # bad wallet -> 400, should NOT set rate-limit
        headers = {'X-Forwarded-For': ip, 'X-Client-Id': cid}
        bad = s.post(f'{API}/early/register',
                     json={'x_username': rand_x(), 'wallet': '0xNOPE'}, headers=headers)
        assert bad.status_code == 400
        # follow-up valid register on same ip/cid must succeed
        r = register(s, ip=ip, cid=cid)
        assert r.status_code == 200, r.text

    def test_invalid_x_does_not_consume_limit(self, s):
        ip = rand_ip()
        cid = rand_cid()
        headers = {'X-Forwarded-For': ip, 'X-Client-Id': cid}
        bad = s.post(f'{API}/early/register',
                     json={'x_username': 'has space', 'wallet': rand_wallet()}, headers=headers)
        assert bad.status_code == 400
        r = register(s, ip=ip, cid=cid)
        assert r.status_code == 200


# ---------- Admin participants ----------
class TestAdminParticipants:
    @pytest.fixture(scope='class')
    def seeded(self, s, admin_h):
        """Create 3 completed + 1 pending participant we own, return them."""
        made = []
        for i in range(4):
            r = register(s)
            assert r.status_code == 200
            j = r.json()
            made.append(j)
            if i < 3:  # complete tasks -> completed_at set
                h = {'Authorization': f"Bearer {j['token']}"}
                for t in ('follow', 'rt', 'quote'):
                    s.post(f'{API}/early/tasks/{t}/complete', headers=h)
        yield made
        # Cleanup
        for j in made:
            s.delete(f"{API}/admin/participants/{j['participant']['id']}", headers=admin_h)

    def test_shape_and_sort(self, s, admin_h, seeded):
        r = s.get(f'{API}/admin/participants', headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        for k in ('total', 'completed', 'matched', 'rows'):
            assert k in j, f'missing key: {k}'
        assert isinstance(j['rows'], list)
        assert j['matched'] == len(j['rows'])
        # completed rows have numeric rank; pending have null
        completed_rows = [r for r in j['rows'] if r['completed']]
        pending_rows = [r for r in j['rows'] if not r['completed']]
        for row in completed_rows:
            assert isinstance(row['rank'], int) and row['rank'] >= 1
        for row in pending_rows:
            assert row['rank'] is None
        # sort points desc among completed rows
        pts = [r['points'] for r in completed_rows]
        assert pts == sorted(pts, reverse=True)

    def test_filter_completed(self, s, admin_h, seeded):
        r = s.get(f'{API}/admin/participants', headers=admin_h, params={'status': 'completed'})
        assert r.status_code == 200
        for row in r.json()['rows']:
            assert row['completed'] is True

    def test_filter_pending(self, s, admin_h, seeded):
        r = s.get(f'{API}/admin/participants', headers=admin_h, params={'status': 'pending'})
        assert r.status_code == 200
        for row in r.json()['rows']:
            assert row['completed'] is False

    def test_search_by_xusername(self, s, admin_h, seeded):
        target = seeded[0]['participant']['x_username']
        r = s.get(f'{API}/admin/participants', headers=admin_h, params={'q': target})
        assert r.status_code == 200
        rows = r.json()['rows']
        assert any(row['x_username'] == target for row in rows)

    def test_search_by_wallet_fragment(self, s, admin_h, seeded):
        wallet = seeded[0]['participant']['wallet']
        frag = wallet[2:12]  # 10-hex fragment
        r = s.get(f'{API}/admin/participants', headers=admin_h, params={'q': frag})
        assert r.status_code == 200
        assert any(row['wallet'] == wallet for row in r.json()['rows'])

    def test_search_by_ticket_no(self, s, admin_h, seeded):
        tno = seeded[0]['participant']['ticket_no']
        r = s.get(f'{API}/admin/participants', headers=admin_h, params={'q': str(tno)})
        assert r.status_code == 200
        assert any(row['ticket_no'] == tno for row in r.json()['rows'])


# ---------- Delete ----------
class TestDelete:
    def test_delete_flow(self, s, admin_h):
        r = register(s)
        assert r.status_code == 200
        pid = r.json()['participant']['id']
        # first delete
        d1 = s.delete(f'{API}/admin/participants/{pid}', headers=admin_h)
        assert d1.status_code == 200
        assert d1.json() == {'ok': True}
        # second delete -> 404
        d2 = s.delete(f'{API}/admin/participants/{pid}', headers=admin_h)
        assert d2.status_code == 404

    def test_delete_requires_auth(self, s):
        r = s.delete(f'{API}/admin/participants/anything')
        assert r.status_code == 401
