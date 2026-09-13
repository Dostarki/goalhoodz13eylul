import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, LogOut } from 'lucide-react';
import { Input } from '../components/ui/input';
import SettingsForm from '../components/admin/SettingsForm';
import DailyTasksPanel from '../components/admin/DailyTasksPanel';
import ParticipantsTable from '../components/admin/ParticipantsTable';
import CollabsPanel from '../components/admin/CollabsPanel';
import { adminApi, ADMIN_TOKEN } from '../lib/early';
import { errMsg } from '../lib/api';

const TABS = [
  ['settings', 'X Tasks'],
  ['daily', 'Daily Tasks'],
  ['participants', 'Participants'],
  ['collabs', 'Collabs'],
];

const Admin = () => {
  const [authed, setAuthed] = useState(null);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('settings');

  useEffect(() => {
    if (!localStorage.getItem(ADMIN_TOKEN)) return setAuthed(false);
    adminApi.get('/admin/me').then(() => setAuthed(true)).catch(() => {
      localStorage.removeItem(ADMIN_TOKEN);
      setAuthed(false);
    });
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { data } = await adminApi.post('/admin/login', { password: pw });
      localStorage.setItem(ADMIN_TOKEN, data.token);
      setAuthed(true);
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN);
    setAuthed(false);
  };

  if (authed === null) return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin" size={18} /></main>;

  if (!authed) {
    return (
      <main className="paper-grid flex min-h-[70vh] items-center justify-center px-5">
        <form onSubmit={login} className="frame-card w-full max-w-sm p-8" data-testid="admin-login-form">
          <div className="label mb-3">Admin</div>
          <h1 className="font-pixel text-[14px] leading-relaxed">Control room</h1>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password" className="font-mono mt-6 h-12 rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[14px]" data-testid="admin-password" />
          {err && <div className="font-mono mt-3 text-[12px] text-red-700" data-testid="admin-login-error">{err}</div>}
          <button type="submit" disabled={busy || !pw} className="btn-ink mt-5 w-full" data-testid="admin-login-submit">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} ENTER
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-[1100px] px-5 py-14 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label mb-4">Admin · Early List</div>
            <h1 className="font-pixel text-[22px] leading-[1.5] md:text-[30px]" data-testid="admin-title">Control room</h1>
          </div>
          <button onClick={logout} className="nav-link text-[11px]" data-testid="admin-logout"><LogOut size={12} className="mr-1 inline" /> Log out</button>
        </div>

        <div className="mt-10 flex gap-6 border-b border-[var(--line)]">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`nav-link pb-3 ${tab === k ? 'active' : ''}`} data-testid={`admin-tab-${k}`}>{l}</button>
          ))}
        </div>

        <section className="frame-card mt-8 p-6 md:p-8">
          {tab === 'settings' && <SettingsForm />}
          {tab === 'daily' && <DailyTasksPanel />}
          {tab === 'participants' && <ParticipantsTable />}
          {tab === 'collabs' && <CollabsPanel />}
        </section>
      </div>
    </main>
  );
};

export default Admin;
