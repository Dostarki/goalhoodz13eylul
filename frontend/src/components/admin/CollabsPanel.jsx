import React, { useEffect, useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { adminApi } from '../../lib/early';
import { errMsg } from '../../lib/api';
import CodeBanner from './CodeBanner';
import CollabRow from './CollabRow';
import ApplicationsPanel from './ApplicationsPanel';

const cls = 'font-mono rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[13px] h-12';
const EMPTY = { name: '', owner_x: '', gtd_spots: 0, fcfs_spots: 0, tweet_url: '' };

const CollabsPanel = () => {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    adminApi.get('/admin/collabs').then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await adminApi.post('/admin/collabs', { ...form, gtd_spots: Number(form.gtd_spots), fcfs_spots: Number(form.fcfs_spots) });
      setRows((r) => [data.collab, ...r]);
      setCode(data.code);
      setForm(EMPTY);
      toast.success(`Collab "${data.collab.name}" created`);
    } catch (ex) {
      toast.error(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const onChanged = (c) => setRows((r) => r.map((x) => (x.id === c.id ? c : x)));
  const onDeleted = (id) => setRows((r) => r.filter((x) => x.id !== id));

  return (
    <div data-testid="admin-collabs-panel">
      <div className="flex items-center justify-between">
        <div className="label !mb-0">Restricted control room</div>
        <span className="h-2.5 w-2.5 bg-[var(--accent)]" />
      </div>
      <h2 className="font-pixel mt-3 text-[18px] md:text-[22px]">COLLAB MANAGER</h2>
      <div className="mt-4 border-t-2 border-[var(--ink)]" />

      {code && <div className="mt-6"><CodeBanner code={code} onDismiss={() => setCode('')} /></div>}

      <div className="mt-6">
        <ApplicationsPanel onApproved={(d) => { setRows((r) => [d.collab, ...(r || [])]); setCode(d.code); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
      <div className="mt-8 border-t-2 border-[var(--ink)]" />

      <form onSubmit={create} className="mt-6 grid gap-4" data-testid="collab-create-form">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label block">Collab name</label><Input value={form.name} onChange={set('name')} placeholder="COLLAB NAME" className={`${cls} mt-2`} data-testid="collab-name" /></div>
          <div><label className="label block">Owner X username</label><Input value={form.owner_x} onChange={set('owner_x')} placeholder="@partner" className={`${cls} mt-2`} data-testid="collab-owner" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label block">GTD spots</label><Input type="number" min={0} value={form.gtd_spots} onChange={set('gtd_spots')} className={`${cls} mt-2`} data-testid="collab-gtd" /></div>
          <div><label className="label block">FCFS spots</label><Input type="number" min={0} value={form.fcfs_spots} onChange={set('fcfs_spots')} className={`${cls} mt-2`} data-testid="collab-fcfs" /></div>
        </div>
        <div><label className="label block">Announcement post (optional, X link)</label><Input value={form.tweet_url} onChange={set('tweet_url')} placeholder="https://x.com/user/status/…" className={`${cls} mt-2`} data-testid="collab-tweet" /></div>
        <button type="submit" disabled={busy || form.name.trim().length < 2 || !form.owner_x.trim()} className="btn-ink w-full !py-4" data-testid="collab-create">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} CREATE COLLAB + CODE
        </button>
      </form>

      <div className="mt-8 border-t-2 border-[var(--ink)]" />
      <div className="mt-6 grid gap-4">
        {!rows && <Loader2 className="animate-spin" size={16} />}
        {rows && rows.length === 0 && <div className="font-mono py-6 text-center text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="collabs-empty">NO COLLABS YET</div>}
        {rows?.map((c) => <CollabRow key={c.id} c={c} onChanged={onChanged} onCode={setCode} onDeleted={onDeleted} />)}
      </div>
    </div>
  );
};

export default CollabsPanel;
