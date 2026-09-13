import React, { useEffect, useState } from 'react';
import { Loader2, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { adminApi } from '../../lib/early';
import { errMsg } from '../../lib/api';

const cls = 'font-mono rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[13px] h-10';
const TABS = [['pending', 'PENDING'], ['approved', 'APPROVED'], ['rejected', 'REJECTED']];

const AppRow = ({ a, onApproved, onChanged }) => {
  const [f, setF] = useState({ name: a.project_name || a.x_username, gtd_spots: a.gtd_requested, fcfs_spots: a.fcfs_requested });
  const [busy, setBusy] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const run = async (key, fn) => { setBusy(key); try { await fn(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); } };
  const approve = () => run('approve', async () => {
    const { data } = await adminApi.post(`/admin/collab-applications/${a.id}/approve`, { ...f, gtd_spots: Number(f.gtd_spots), fcfs_spots: Number(f.fcfs_spots) });
    toast.success(`Collab "${data.collab.name}" created`);
    onApproved(data);
  });
  const reject = () => run('reject', async () => { await adminApi.post(`/admin/collab-applications/${a.id}/reject`); onChanged(); });
  const remove = () => run('delete', async () => { await adminApi.delete(`/admin/collab-applications/${a.id}`); onChanged(); });
  const pending = a.status === 'pending';

  return (
    <div className="border-2 border-[var(--ink)] p-4" data-testid={`application-${a.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a href={`https://x.com/${a.x_username}`} target="_blank" rel="noreferrer" className="font-pixel text-[12px] hover:underline" data-testid={`application-x-${a.id}`}>@{a.x_username}</a>
          <div className="font-mono mt-1 text-[10px] tracking-widest text-[var(--ink-soft)]" data-testid={`application-req-${a.id}`}>
            WANTS GTD {a.gtd_requested} · FCFS {a.fcfs_requested} · {new Date(a.created_at).toISOString().slice(0, 16).replace('T', ' ')} · {a.status.toUpperCase()}
          </div>
          {a.note && <p className="font-mono mt-2 max-w-xl text-[11px] leading-5">{a.note}</p>}
        </div>
        <button onClick={remove} disabled={!!busy} className="p-1 text-[var(--ink-soft)] hover:text-red-700" title="Delete" data-testid={`application-delete-${a.id}`}><Trash2 size={12} /></button>
      </div>
      {pending && (
        <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-3 md:grid-cols-[1.4fr_90px_90px_auto_auto] md:items-end">
          <div><div className="label !mb-1 text-[9px]">Collab name</div><Input value={f.name} onChange={set('name')} className={cls} data-testid={`application-name-${a.id}`} /></div>
          <div><div className="label !mb-1 text-[9px]">GTD</div><Input type="number" min={0} value={f.gtd_spots} onChange={set('gtd_spots')} className={cls} data-testid={`application-gtd-${a.id}`} /></div>
          <div><div className="label !mb-1 text-[9px]">FCFS</div><Input type="number" min={0} value={f.fcfs_spots} onChange={set('fcfs_spots')} className={cls} data-testid={`application-fcfs-${a.id}`} /></div>
          <button onClick={approve} disabled={!!busy} className="btn-ink !px-3 !py-2.5 !text-[9px]" data-testid={`application-approve-${a.id}`}>{busy === 'approve' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} APPROVE + CODE</button>
          <button onClick={reject} disabled={!!busy} className="btn-outline !px-3 !py-2.5 !text-[9px] hover:!text-red-700" data-testid={`application-reject-${a.id}`}><X size={11} /> REJECT</button>
        </div>
      )}
    </div>
  );
};

const ApplicationsPanel = ({ onApproved }) => {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState(null);
  const load = () => adminApi.get('/admin/collab-applications', { params: { status } }).then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-testid="admin-applications">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-pixel text-[13px]">COLLAB APPLICATIONS{rows && status === 'pending' && rows.length > 0 ? ` · ${rows.length} WAITING` : ''}</h3>
        <div className="flex border-2 border-[var(--ink)]" data-testid="applications-status-filter">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`font-mono px-3 py-1.5 text-[10px] tracking-widest ${status === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--paper-2)]'}`} data-testid={`applications-filter-${k}`}>{l}</button>)}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {!rows && <Loader2 className="animate-spin" size={16} />}
        {rows && rows.length === 0 && <div className="font-mono py-4 text-center text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="applications-empty">NO {status.toUpperCase()} APPLICATIONS</div>}
        {rows?.map((a) => <AppRow key={a.id} a={a} onChanged={load} onApproved={(d) => { load(); onApproved(d); }} />)}
      </div>
    </div>
  );
};

export default ApplicationsPanel;
