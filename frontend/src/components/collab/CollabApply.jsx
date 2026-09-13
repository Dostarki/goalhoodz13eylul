import React, { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { collabApi } from '../../lib/early';
import { errMsg } from '../../lib/api';

const field = 'font-mono mt-2 h-12 w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 text-[13px] outline-none';
const EMPTY = { x_username: '', project_name: '', gtd_requested: 0, fcfs_requested: 0, note: '' };

const CollabApply = ({ onBack }) => {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { data } = await collabApi.post('/collab/apply', { ...f, gtd_requested: Number(f.gtd_requested), fcfs_requested: Number(f.fcfs_requested) });
      setDone(data);
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="frame-card p-7 md:p-9" data-testid="collab-apply-success">
        <CheckCircle2 size={28} className="text-[var(--accent)]" />
        <h2 className="font-pixel mt-4 text-[18px] leading-relaxed md:text-[22px]">APPLICATION SENT</h2>
        <p className="font-mono mt-4 text-[12px] leading-6 text-[var(--ink-soft)]">
          @{done.x_username} asked for <b>{done.gtd_requested} GTD</b> + <b>{done.fcfs_requested} FCFS</b>. The GoalHoodz team reviews every request and sends the collab code via X DM.
        </p>
        <button onClick={onBack} className="btn-outline mt-7 !py-3" data-testid="collab-apply-back">BACK</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="frame-card p-7 md:p-9" data-testid="collab-apply">
      <div className="flex items-center justify-between">
        <div className="label">Partner request</div>
        <span className="h-2.5 w-2.5 bg-[var(--accent)]" />
      </div>
      <h2 className="font-pixel mt-3 text-[20px] leading-relaxed md:text-[26px]">COLLAB APPLICATION</h2>
      <div className="mt-5 border-t-2 border-[var(--ink)]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div><label className="label block">Your X username</label><input value={f.x_username} onChange={set('x_username')} placeholder="@project" className={field} data-testid="apply-x" /></div>
        <div><label className="label block">Project name (optional)</label><input value={f.project_name} onChange={set('project_name')} placeholder="PIXEL BUNZ" className={field} data-testid="apply-project" /></div>
        <div><label className="label block">GTD spots wanted</label><input type="number" min={0} value={f.gtd_requested} onChange={set('gtd_requested')} className={field} data-testid="apply-gtd" /></div>
        <div><label className="label block">FCFS spots wanted</label><input type="number" min={0} value={f.fcfs_requested} onChange={set('fcfs_requested')} className={field} data-testid="apply-fcfs" /></div>
      </div>
      <label className="label mt-4 block">Note (optional)</label>
      <textarea value={f.note} onChange={set('note')} rows={3} maxLength={500} placeholder="Community size, mint date, why GoalHoodz…" className={`${field} h-auto py-3`} data-testid="apply-note" />
      {err && <div className="font-mono mt-3 text-[12px] text-red-700" data-testid="apply-error">{err}</div>}
      <button type="submit" disabled={busy || !f.x_username.trim() || Number(f.gtd_requested) + Number(f.fcfs_requested) < 1} className="btn-ink mt-5 w-full !py-4" data-testid="apply-submit">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} SEND APPLICATION
      </button>
    </form>
  );
};

export default CollabApply;
