import React, { useState } from 'react';
import { Loader2, Plus, Trash2, LogOut, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { collabApi, COLLAB_TOKEN, shortWallet } from '../../lib/early';
import { errMsg } from '../../lib/api';

const field = 'font-mono h-13 w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-[13px] outline-none';

const Stat = ({ label, value, testId }) => (
  <div className="border-2 border-[var(--ink)] px-5 py-4" data-testid={testId}>
    <div className="label !mb-0 text-[9px]">{label}</div>
    <div className="font-pixel mt-2 text-[22px]">{value}</div>
  </div>
);

const CollabPanel = ({ collab, onChange, onLogout }) => {
  const [type, setType] = useState('gtd');
  const [wallet, setWallet] = useState('');
  const [tweet, setTweet] = useState(collab.tweet_url || '');
  const [busy, setBusy] = useState(false);

  const reload = () => collabApi.get('/collab/me').then((r) => onChange(r.data)).catch((e) => toast.error(errMsg(e)));

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await collabApi.post('/collab/wallets', { type, wallet });
      toast.success(`${type.toUpperCase()} wallet added`);
      setWallet('');
      await reload();
    } catch (ex) {
      toast.error(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (w) => {
    try {
      await collabApi.delete(`/collab/wallets/${w.id}`);
      await reload();
    } catch (ex) {
      toast.error(errMsg(ex));
    }
  };

  const saveTweet = async () => {
    try {
      const { data } = await collabApi.put('/collab/tweet', { tweet_url: tweet });
      onChange({ ...collab, ...data });
      toast.success(tweet ? 'Post link saved' : 'Post link removed');
    } catch (ex) {
      toast.error(errMsg(ex));
    }
  };

  const logout = () => {
    localStorage.removeItem(COLLAB_TOKEN);
    onLogout();
  };

  return (
    <div className="frame-card p-7 md:p-9" data-testid="collab-panel">
      <div className="flex items-center justify-between">
        <div className="label">Partner allocation · @{collab.owner_x}</div>
        <span className="h-2.5 w-2.5 bg-[var(--accent)]" />
      </div>
      <h2 className="font-pixel mt-3 text-[20px] uppercase leading-relaxed md:text-[26px]" data-testid="collab-panel-name">{collab.name}</h2>
      <div className="mt-5 border-t-2 border-[var(--ink)]" />

      <div className="mt-7 grid grid-cols-2 gap-4">
        <Stat label="GTD remaining" value={collab.gtd_remaining} testId="collab-gtd-remaining" />
        <Stat label="FCFS remaining" value={collab.fcfs_remaining} testId="collab-fcfs-remaining" />
      </div>

      <form onSubmit={add} className="mt-7 grid gap-4 sm:grid-cols-[150px_1fr]" data-testid="collab-add-form">
        <div>
          <label className="label block">Spot type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${field} mt-2 uppercase`} data-testid="collab-spot-type">
            <option value="gtd">GTD</option>
            <option value="fcfs">FCFS</option>
          </select>
        </div>
        <div>
          <label className="label block">Wallet address</label>
          <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" spellCheck={false} className={`${field} mt-2`} data-testid="collab-wallet-input" />
        </div>
        <button type="submit" disabled={busy || wallet.trim().length < 42} className="btn-ink sm:col-span-2 !py-4" data-testid="collab-add-wallet">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} ADD WALLET
        </button>
      </form>

      <div className="mt-7 border-t-2 border-[var(--ink)]" />
      <div className="label mt-6">Allocated wallets · {collab.wallets.length}</div>
      {collab.wallets.length === 0 && <div className="font-mono mt-2 text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="collab-wallets-empty">NO WALLETS ADDED YET.</div>}
      <ul className="mt-2 divide-y divide-[var(--line)]" data-testid="collab-wallets">
        {collab.wallets.map((w) => (
          <li key={w.id} className="font-mono flex items-center justify-between gap-3 py-2 text-[12px]" data-testid={`collab-wallet-${w.wallet}`}>
            <span><span className="font-pixel mr-3 text-[9px] uppercase text-[var(--accent)]">{w.type}</span><span title={w.wallet}>{shortWallet(w.wallet)}</span></span>
            <button onClick={() => remove(w)} className="p-1 text-[var(--ink-soft)] hover:text-red-700" title="Remove" data-testid={`collab-wallet-remove-${w.wallet}`}><Trash2 size={12} /></button>
          </li>
        ))}
      </ul>

      <div className="mt-7 border-t-2 border-[var(--ink)]" />
      <label className="label mt-6 block">Announcement post (X link, shown in the ledger)</label>
      <div className="mt-2 flex gap-2">
        <input value={tweet} onChange={(e) => setTweet(e.target.value)} placeholder="https://x.com/you/status/…" className={field} data-testid="collab-tweet-input" />
        <button onClick={saveTweet} className="btn-outline !px-4 !py-2 !text-[10px]" data-testid="collab-tweet-save"><Link2 size={12} /> SAVE</button>
      </div>

      <button onClick={logout} className="nav-link mt-8 text-[11px]" data-testid="collab-logout"><LogOut size={12} className="mr-1 inline" /> Close panel</button>
    </div>
  );
};

export default CollabPanel;
