import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { collabApi, COLLAB_TOKEN } from '../../lib/early';
import { errMsg } from '../../lib/api';

const CollabEntry = ({ onEnter }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { data } = await collabApi.post('/collab/login', { code });
      localStorage.setItem(COLLAB_TOKEN, data.token);
      onEnter(data.collab);
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="frame-card p-7 md:p-9" data-testid="collab-entry">
      <div className="flex items-center justify-between">
        <div className="label">Partner access</div>
        <span className="h-2.5 w-2.5 bg-[var(--accent)]" />
      </div>
      <h2 className="font-pixel mt-3 text-[20px] leading-relaxed md:text-[26px]">COLLAB ENTRY</h2>
      <div className="mt-5 border-t-2 border-[var(--ink)]" />
      <label className="label mt-7 block">Collab access code</label>
      <input
        value={code} onChange={(e) => setCode(e.target.value)} placeholder="GH-…" autoComplete="off" spellCheck={false}
        className="font-mono mt-2 h-14 w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 text-[14px] uppercase tracking-widest outline-none"
        data-testid="collab-code-input"
      />
      {err && <div className="font-mono mt-3 text-[12px] text-red-700" data-testid="collab-entry-error">{err}</div>}
      <button type="submit" disabled={busy || code.trim().length < 8} className="btn-ink mt-5 w-full !py-4" data-testid="collab-entry-submit">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} OPEN COLLAB PANEL
      </button>
    </form>
  );
};

export default CollabEntry;
