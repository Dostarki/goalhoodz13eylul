import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Check, Minus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { adminApi, padTicket, TIERS, fmtUsd } from '../../lib/early';
import { errMsg } from '../../lib/api';
import PointsCell from './PointsCell';
import DeleteParticipant from './DeleteParticipant';
import BulkDelete from './BulkDelete';

const Mark = ({ ok }) => (ok ? <Check size={12} className="mx-auto" /> : <Minus size={12} className="mx-auto opacity-30" />);

const STATUS = [['all', 'ALL'], ['completed', 'COMPLETED'], ['pending', 'PENDING']];
const MODES = [['contains', 'CONTAINS'], ['prefix', 'STARTS WITH']];
const cls = (on) => `font-mono px-3 py-2 text-[10px] tracking-widest ${on ? 'bg-[var(--ink)] text-[var(--paper)]' : 'hover:bg-[var(--paper-2)]'}`;

const ParticipantsTable = () => {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState('contains');
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(() => new Set());

  const load = useCallback(() => {
    setLoading(true);
    return adminApi.get('/admin/participants', { params: { q, status, mode, sort: 'points', limit: 1000 } })
      .then((r) => { setData(r.data); setSel(new Set()); })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [q, status, mode]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const onSaved = (p) => setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === p.id ? { ...r, ...p } : r)) }));
  const onDeleted = (id) => setData((d) => {
    const gone = d.rows.find((r) => r.id === id);
    return { ...d, total: d.total - 1, completed: d.completed - (gone?.completed ? 1 : 0), matched: d.matched - 1, rows: d.rows.filter((r) => r.id !== id) };
  });
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (!data) return <Loader2 className="animate-spin" size={16} />;
  const rows = data.rows;
  const term = q.trim();
  const selRows = rows.filter((r) => sel.has(r.id));
  const toggleAll = () => setSel(sel.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <div className="overflow-x-auto border border-[var(--line)] bg-[var(--paper)]" data-testid="admin-participants">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="font-mono text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="participants-count">
          {rows.length} SHOWN · {data.matched} MATCHED · {data.total} REGISTERED · {data.completed} COMPLETED · {data.total - data.completed} PENDING
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border-2 border-[var(--ink)]" data-testid="participants-status-filter">
            {STATUS.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={cls(status === k)} data-testid={`participants-filter-${k}`}>{l}</button>)}
          </div>
          <div className="flex border-2 border-[var(--ink)]" data-testid="participants-mode-filter">
            {MODES.map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={cls(mode === k)} data-testid={`participants-mode-${k}`}>{l}</button>)}
          </div>
          <label className="flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3">
            {loading ? <Loader2 size={12} className="animate-spin text-[var(--ink-soft)]" /> : <Search size={12} className="text-[var(--ink-soft)]" />}
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search @x, wallet or ticket #"
              className="font-mono h-9 w-full bg-transparent text-[12px] outline-none sm:w-64"
              data-testid="participants-search"
            />
          </label>
        </div>
      </div>
      {(sel.size > 0 || (term && data.matched > 0)) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--paper-2)] px-5 py-3" data-testid="bulk-actions-bar">
          {sel.size > 0 && (
            <BulkDelete
              id="selected" count={sel.size} label={`DELETE ${sel.size} SELECTED`} title={`Delete ${sel.size} selected participant${sel.size === 1 ? '' : 's'}?`}
              samples={selRows.slice(0, 5).map((r) => r.x_username)} payload={{ ids: [...sel] }} onDone={load}
            />
          )}
          {term && data.matched > 0 && (
            <BulkDelete
              id="matching" count={data.matched} label={`DELETE ALL ${data.matched} MATCHING`}
              title={`Delete every participant ${mode === 'prefix' ? 'starting with' : 'containing'} "${term}"${status !== 'all' ? ` (${status})` : ''}?`}
              samples={rows.slice(0, 5).map((r) => r.x_username)} confirmText={term} payload={{ q: term, status, mode }} onDone={load}
            />
          )}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="font-mono text-[10px] tracking-widest">
            <TableHead className="w-8"><input type="checkbox" checked={rows.length > 0 && sel.size === rows.length} onChange={toggleAll} aria-label="Select all" data-testid="participants-select-all" /></TableHead>
            <TableHead className="text-right">RANK</TableHead>
            <TableHead>TICKET</TableHead>
            <TableHead>X</TableHead>
            <TableHead>WALLET</TableHead>
            <TableHead className="text-center">F</TableHead>
            <TableHead className="text-center">RT</TableHead>
            <TableHead className="text-center">Q</TableHead>
            <TableHead>TIER</TableHead>
            <TableHead className="text-right">VOL</TableHead>
            <TableHead className="text-right">REFS</TableHead>
            <TableHead className="text-right">PTS</TableHead>
            <TableHead>JOINED</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className={`font-mono text-[12px] ${r.completed ? '' : 'text-[var(--ink-soft)]'} ${sel.has(r.id) ? 'bg-red-50' : ''}`} data-testid={`participant-${r.ticket_no}`}>
              <TableCell><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select @${r.x_username}`} data-testid={`participant-select-${r.ticket_no}`} /></TableCell>
              <TableCell className="font-pixel text-right text-[10px]" data-testid={`participant-rank-${r.ticket_no}`}>{r.rank ? `#${r.rank}` : '—'}</TableCell>
              <TableCell className="font-pixel text-[10px]">{padTicket(r.ticket_no)}</TableCell>
              <TableCell>@{r.x_username}</TableCell>
              <TableCell className="text-[11px]" title={r.wallet}>{r.wallet}</TableCell>
              <TableCell><Mark ok={r.tasks.follow} /></TableCell>
              <TableCell><Mark ok={r.tasks.rt} /></TableCell>
              <TableCell><Mark ok={r.tasks.quote} /></TableCell>
              <TableCell className="font-pixel text-[9px]" style={{ color: r.tier ? TIERS[r.tier].color : 'var(--ink-soft)' }}>{r.tier ? TIERS[r.tier].label : '—'}</TableCell>
              <TableCell className="text-right text-[11px]">{r.volume_usd != null ? fmtUsd(r.volume_usd) : '—'}</TableCell>
              <TableCell className="text-right">{r.referrals}{r.referred_by ? <span className="ml-1 text-[10px] text-[var(--ink-soft)]">← @{r.referred_by}</span> : null}</TableCell>
              <TableCell className="text-right"><PointsCell row={r} onSaved={onSaved} /></TableCell>
              <TableCell className="text-[var(--ink-soft)]">{new Date(r.created_at).toISOString().slice(0, 10)}</TableCell>
              <TableCell className="text-right"><DeleteParticipant row={r} onDeleted={onDeleted} /></TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={14} className="font-mono py-8 text-center text-[12px] text-[var(--ink-soft)]" data-testid="participants-empty">{q ? `No participant matches "${q}"` : 'No participants yet'}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ParticipantsTable;
