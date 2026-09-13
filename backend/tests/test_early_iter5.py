"""Backend tests for Iteration 5: bulk delete participants (query mode + ids mode),
mode=contains|prefix, matched count, status filter for bulk delete, JWT invalidation.

Uses localhost:8001 to bypass the register rate limit by varying X-Forwarded-For
and X-Client-Id headers (public ingress collapses them).
"""
import os
import uuid
import pytest
import requests

LOCAL = 'http://localhost:8001'
API = f'{LOCAL}/api'
ADMIN_PASSWORD = 'admin123'

PREFIX = 'tbot5'  # unique per this test module


def rand_wallet():
    return '0x' + (uuid.uuid4().hex + uuid.uuid4().hex)[:40]


def rand_ip():
    import random
    return f'10.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}'


def rand_cid():
    return uuid.uuid4().hex


@pytest.fixture(scope='module')
def s():
    return requests.Session()


@pytest.fixture(scope='module')
def admin_h(s):
    r = s.post(f'{API}/admin/login', json={'password': ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {'Authorization': f'Bearer {r.json()["token"]}'}


def register(s, x, w=None):
    headers = {'X-Forwarded-For': rand_ip(), 'X-Client-Id': rand_cid()}
    return s.post(f'{API}/early/register', json={'x_username': x, 'wallet': w or rand_wallet()}, headers=headers)


def complete_tasks(s, token):
    """Mark all core tasks complete so participant becomes 'completed'."""
    h = {'Authorization': f'Bearer {token}'}
    for t in ('follow', 'rt', 'quote'):
        r = s.post(f'{API}/early/tasks/{t}/complete', headers=h)
        assert r.status_code == 200, r.text


def cleanup(s, admin_h, q):
    """Best-effort cleanup by bulk deleting by prefix."""
    body = {'q': q, 'status': 'all', 'mode': 'contains', 'confirm': q}
    s.post(f'{API}/admin/participants/bulk-delete', json=body, headers=admin_h)


# ---------- Test 1: mode=contains vs prefix ----------
def test_mode_prefix_vs_contains(s, admin_h):
    q = f'{PREFIX}a_'  # e.g. tbot5a_
    try:
        # Create a matching-prefix user and a contains-only user
        r1 = register(s, f'{q}1')
        assert r1.status_code == 200, r1.text
        r2 = register(s, f'x{q}9')  # only matches contains
        assert r2.status_code == 200, r2.text

        # prefix mode: only 1 matches
        rp = s.get(f'{API}/admin/participants', params={'q': q, 'mode': 'prefix'}, headers=admin_h)
        assert rp.status_code == 200
        jp = rp.json()
        names_p = [row['x_username'].lower() for row in jp['rows']]
        assert f'{q}1' in names_p
        assert f'x{q}9' not in names_p
        assert jp['matched'] == 1

        # contains mode: both match
        rc = s.get(f'{API}/admin/participants', params={'q': q, 'mode': 'contains'}, headers=admin_h)
        jc = rc.json()
        names_c = [row['x_username'].lower() for row in jc['rows']]
        assert f'{q}1' in names_c
        assert f'x{q}9' in names_c
        assert jc['matched'] == 2
    finally:
        cleanup(s, admin_h, q)
        cleanup(s, admin_h, f'x{q}')


# ---------- Test 2: matched is real DB count, not row length ----------
def test_matched_is_db_count(s, admin_h):
    q = f'{PREFIX}b_'
    try:
        for i in range(5):
            r = register(s, f'{q}{i}')
            assert r.status_code == 200
        r = s.get(f'{API}/admin/participants', params={'q': q, 'mode': 'prefix', 'limit': 2}, headers=admin_h)
        j = r.json()
        assert len(j['rows']) == 2
        assert j['matched'] == 5  # true DB count, not rows length
    finally:
        cleanup(s, admin_h, q)


# ---------- Test 3: bulk-delete query mode - empty q ----------
def test_bulk_delete_empty_q(s, admin_h):
    r = s.post(f'{API}/admin/participants/bulk-delete',
               json={'q': '', 'status': 'all', 'mode': 'contains', 'confirm': ''}, headers=admin_h)
    assert r.status_code == 400
    assert 'required' in r.text.lower()


# ---------- Test 4: bulk-delete query mode - bad confirm ----------
def test_bulk_delete_bad_confirm(s, admin_h):
    r = s.post(f'{API}/admin/participants/bulk-delete',
               json={'q': 'somequery', 'status': 'all', 'mode': 'contains', 'confirm': 'wrong'}, headers=admin_h)
    assert r.status_code == 400
    assert 'match' in r.text.lower()


# ---------- Test 5: bulk-delete query mode success + real DB delete ----------
def test_bulk_delete_query_success(s, admin_h):
    q = f'{PREFIX}c_'
    try:
        for i in range(4):
            r = register(s, f'{q}{i}')
            assert r.status_code == 200

        r = s.post(f'{API}/admin/participants/bulk-delete',
                   json={'q': q, 'status': 'all', 'mode': 'prefix', 'confirm': q}, headers=admin_h)
        assert r.status_code == 200, r.text
        assert r.json()['deleted'] == 4

        # Verify DB actually empty of these
        r2 = s.get(f'{API}/admin/participants', params={'q': q, 'mode': 'prefix'}, headers=admin_h)
        assert r2.json()['matched'] == 0
    finally:
        cleanup(s, admin_h, q)


# ---------- Test 6: status=pending only deletes non-completed; completed remain ----------
def test_bulk_delete_pending_keeps_completed(s, admin_h):
    q = f'{PREFIX}d_'
    try:
        # 2 completed, 2 pending
        completed_names = []
        pending_names = []
        for i in range(2):
            name = f'{q}c{i}'
            r = register(s, name)
            assert r.status_code == 200
            complete_tasks(s, r.json()['token'])
            completed_names.append(name)
        for i in range(2):
            name = f'{q}p{i}'
            r = register(s, name)
            assert r.status_code == 200
            pending_names.append(name)

        # bulk delete pending only
        r = s.post(f'{API}/admin/participants/bulk-delete',
                   json={'q': q, 'status': 'pending', 'mode': 'prefix', 'confirm': q}, headers=admin_h)
        assert r.status_code == 200, r.text
        assert r.json()['deleted'] == 2

        # Verify completed still exist
        r2 = s.get(f'{API}/admin/participants', params={'q': q, 'mode': 'prefix'}, headers=admin_h)
        names_left = [row['x_username'].lower() for row in r2.json()['rows']]
        for n in completed_names:
            assert n in names_left, f'completed {n} was wrongly deleted'
        for n in pending_names:
            assert n not in names_left, f'pending {n} was not deleted'
    finally:
        cleanup(s, admin_h, q)


# ---------- Test 7: ids mode ----------
def test_bulk_delete_ids_mode(s, admin_h):
    q = f'{PREFIX}e_'
    try:
        ids = []
        for i in range(3):
            r = register(s, f'{q}{i}')
            assert r.status_code == 200
            ids.append(r.json()['participant']['id'])

        # delete 2 of 3
        r = s.post(f'{API}/admin/participants/bulk-delete',
                   json={'ids': ids[:2]}, headers=admin_h)
        assert r.status_code == 200, r.text
        assert r.json()['deleted'] == 2

        # third still exists
        r2 = s.get(f'{API}/admin/participants', params={'q': q, 'mode': 'prefix'}, headers=admin_h)
        assert r2.json()['matched'] == 1
    finally:
        cleanup(s, admin_h, q)


# ---------- Test 8: ids mode - empty list ----------
def test_bulk_delete_ids_empty(s, admin_h):
    r = s.post(f'{API}/admin/participants/bulk-delete', json={'ids': []}, headers=admin_h)
    assert r.status_code == 400
    assert 'selected' in r.text.lower()


# ---------- Test 9: ids mode - unknown ids ----------
def test_bulk_delete_ids_unknown(s, admin_h):
    r = s.post(f'{API}/admin/participants/bulk-delete',
               json={'ids': [str(uuid.uuid4()), str(uuid.uuid4())]}, headers=admin_h)
    assert r.status_code == 200
    assert r.json()['deleted'] == 0


# ---------- Test 10: 401 without token ----------
def test_bulk_delete_no_auth(s):
    r = s.post(f'{API}/admin/participants/bulk-delete',
               json={'q': 'x', 'status': 'all', 'mode': 'contains', 'confirm': 'x'})
    assert r.status_code in (401, 403)


# ---------- Test 11: JWT invalidated after bulk delete ----------
def test_bulk_delete_invalidates_jwt(s, admin_h):
    q = f'{PREFIX}f_'
    try:
        r = register(s, f'{q}1')
        assert r.status_code == 200
        token = r.json()['token']

        # Token works
        me = s.get(f'{API}/early/me', headers={'Authorization': f'Bearer {token}'})
        assert me.status_code == 200

        # Bulk delete
        rd = s.post(f'{API}/admin/participants/bulk-delete',
                    json={'q': q, 'status': 'all', 'mode': 'prefix', 'confirm': q}, headers=admin_h)
        assert rd.status_code == 200 and rd.json()['deleted'] == 1

        # Token now 401
        me2 = s.get(f'{API}/early/me', headers={'Authorization': f'Bearer {token}'})
        assert me2.status_code == 401
        assert 'not found' in me2.text.lower()
    finally:
        cleanup(s, admin_h, q)
