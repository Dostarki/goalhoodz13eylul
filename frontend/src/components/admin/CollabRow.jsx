import React, { useState } from 'react';
import { Loader2, RefreshCw, Trash2, Save, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { adminApi, shortWallet } from '../../lib/early';
import { errMsg } from '../../lib/api';

const cls = 'font-mono rounded-none border-2 border-[var(--ink)] bg-[var(--paper)] text-[13px]';

const CollabRow = ({ c, onChanged, onCode, onDeleted }) => {
  const [f, setF] = useState({ name: c.name, owner_x: c.owner_x, gtd_spots: c.gtd_spots, fcfs_spots: c.fcfs_spots, tweet_url: c.tweet_url || '' });
  const [busy, setBusy] = useState('');
  const [wallets, setWallets] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const save = () => run('save', async () => {
    const { data } = await adminApi.put(`/admin/collabs/${c.id}`, { ...f, gtd_spots: Number(f.gtd_spots), fcfs_spots: Number(f.fcfs_spots) });
    onChanged(data);
    toast.success('Collab saved');
  });
  const rotate = () => run('rotate', async () => {
    if (!window.confirm(`Rotate the code for "${c.name}"? The old code stops working immediately.`)) return;
    const { data } = await adminApi.post(`/admin/collabs/${c.id}/rotate`);
    onChanged(data.collab);
    onCode(data.code);
  });
  const remove = () => run('delete', async () => {
    if (!window.confirm(`Delete collab "${c.name}" and its ${c.allocated} wallets?`)) return;
    await adminApi.delete(`/admin/collabs/${c.id}`);
    onDeleted(c.id);
  });
  const toggleWallets = () => {
    if (wallets) return setWallets(null);
    run('wallets', async () => setWallets((await adminApi.get(`/admin/collabs/${c.id}/wallets`)).data));
  };

  return (
    <div className="border-2 border-[var(--ink)] p-4" data-testid={`collab-row-${c.id}`}>
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_90px_90px]">
        <div><div className="label !mb-1 text-[9px]">Collab</div><Input value={f.name} onChange={set('name')} className={cls} data-testid={`collab-row-name-${c.id}`} /></div>
        <div><div className="label !mb-1 text-[9px]">Owner X</div><Input value={f.owner_x} onChange={set('owner_x')} className={cls} data-testid={`collab-row-owner-${c.id}`} /></div>
        <div><div className="label !mb-1 text-[9px]">GTD</div><Input type="number" min={0} value={f.gtd_spots} onChange={set('gtd_spots')} className={cls} data-testid={`collab-row-gtd-${c.id}`} /></div>
        <div><div className="label !mb-1 text-[9px]">FCFS</div><Input type="number" min={0} value={f.fcfs_spots} onChange={set('fcfs_spots')} className={cls} data-testid={`collab-row-fcfs-${c.id}`} /></div>
      </div>
      <div className="mt-3"><div className="label !mb-1 text-[9px]">Announcement post (X link)</div><Input value={f.tweet_url} onChange={set('tweet_url')} placeholder="https://x.com/user/status/…" className={cls} data-testid={`collab-row-tweet-${c.id}`} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
        <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]" data-testid={`collab-row-usage-${c.id}`}>
          GTD {c.gtd_used}/{c.gtd_spots} · FCFS {c.fcfs_used}/{c.fcfs_spots} · CODE {c.code_hint}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleWallets} className="btn-outline !px-3 !py-2 !text-[9px]" data-testid={`collab-row-wallets-${c.id}`}>{busy === 'wallets' ? <Loader2 size={11} className="animate-spin" /> : <Wallet size={11} />} {wallets ? 'HIDE' : 'WALLETS'}</button>
          <button onClick={save} disabled={!!busy} className="btn-outline !px-3 !py-2 !text-[9px]" data-testid={`collab-row-save-${c.id}`}>{busy === 'save' ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} SAVE</button>
          <button onClick={rotate} disabled={!!busy} className="btn-ink !px-3 !py-2 !text-[9px]" data-testid={`collab-row-rotate-${c.id}`}>{busy === 'rotate' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} ROTATE CODE</button>
          <button onClick={remove} disabled={!!busy} className="btn-outline !px-3 !py-2 !text-[9px] hover:!text-red-700" data-testid={`collab-row-delete-${c.id}`}><Trash2 size={11} /></button>
        </div>
      </div>
      {wallets && (
        <ul className="font-mono mt-3 grid gap-1 border-t border-[var(--line)] pt-3 text-[11px] sm:grid-cols-2" data-testid={`collab-row-wallet-list-${c.id}`}>
          {wallets.length === 0 && <li className="text-[var(--ink-soft)]">No wallets yet</li>}
          {wallets.map((w) => <li key={w.id} title={w.wallet}><span className="font-pixel mr-2 text-[8px] uppercase text-[var(--accent)]">{w.type}</span>{shortWallet(w.wallet)}</li>)}
        </ul>
      )}
    </div>
  );
};

export default CollabRow;
