import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Ticket as TicketIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { earlyApi, padTicket, EARLY_TOKEN, TIERS } from '../lib/early';

const EarlyList = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [me, setMe] = useState(null);

  useEffect(() => {
    earlyApi.get('/early/list').then((r) => setData(r.data)).catch(() => setErr('Could not load the Early List'));
    if (localStorage.getItem(EARLY_TOKEN)) earlyApi.get('/early/me').then((r) => setMe(r.data)).catch(() => {});
  }, []);

  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-[1100px] px-5 py-14 md:px-10">
        <div className="label mb-4">Season 01 · Early Access</div>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-pixel text-[22px] leading-[1.5] md:text-[30px]" data-testid="early-list-title">Early List</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
              Everyone who completed the X tasks and minted a ticket. Ranked by points, then by who finished first.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {data && (
              <div className="font-mono border-2 border-[var(--ink)] px-4 py-3 text-[11px] tracking-widest" data-testid="early-list-total">
                {data.total} TICKETS
              </div>
            )}
            <Link to="/#early" className="btn-ink !px-4 !py-3 !text-[10px]" data-testid="early-list-join">
              <TicketIcon size={12} /> {me?.completed ? 'MY TICKET' : 'JOIN'}
            </Link>
          </div>
        </div>

        <section className="frame-card mt-10 overflow-hidden">
          {!data && !err && (
            <div className="flex items-center justify-center gap-3 p-10 text-[var(--ink-soft)]">
              <Loader2 className="animate-spin" size={16} /> <span className="font-mono text-[12px] tracking-widest">LOADING</span>
            </div>
          )}
          {err && <div className="font-mono p-10 text-center text-[12px] text-red-700">{err}</div>}
          {data && data.rows.length === 0 && (
            <div className="font-mono p-10 text-center text-[12px] tracking-widest text-[var(--ink-soft)]" data-testid="early-list-empty">
              NO TICKETS YET. BE THE FIRST.
            </div>
          )}
          {data && data.rows.length > 0 && (
            <Table data-testid="early-list-table">
              <TableHeader>
                <TableRow className="font-mono text-[10px] tracking-widest">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>TICKET</TableHead>
                  <TableHead>X</TableHead>
                  <TableHead>TIER</TableHead>
                  <TableHead className="hidden sm:table-cell">REFS</TableHead>
                  <TableHead className="hidden sm:table-cell">JOINED</TableHead>
                  <TableHead className="text-right">PTS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => {
                  const mine = me && me.id === r.id;
                  return (
                    <TableRow key={r.id} className={`font-mono text-[12px] ${mine ? 'bg-[var(--paper)]' : ''}`} data-testid={`early-row-${r.ticket_no}`}>
                      <TableCell className="text-[var(--ink-soft)]">{r.rank}</TableCell>
                      <TableCell className="font-pixel text-[11px]">{padTicket(r.ticket_no)}</TableCell>
                      <TableCell>
                        <a href={`https://x.com/${r.x_username}`} target="_blank" rel="noreferrer" className="hover:underline">@{r.x_username}</a>
                        {mine && <span className="ml-2 bg-[var(--ink)] px-1.5 py-0.5 text-[9px] text-[var(--paper)]">YOU</span>}
                      </TableCell>
                      <TableCell>
                        {r.tier ? (
                          <span className="font-pixel text-[9px]" style={{ color: TIERS[r.tier].color }} data-testid={`tier-${r.ticket_no}`}>{TIERS[r.tier].label}</span>
                        ) : (
                          <span className="text-[10px] text-[var(--ink-soft)]">STANDARD</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-[var(--ink-soft)] sm:table-cell">{r.referrals}</TableCell>
                      <TableCell className="hidden text-[var(--ink-soft)] sm:table-cell">{new Date(r.completed_at).toISOString().slice(0, 10)}</TableCell>
                      <TableCell className="font-pixel text-right text-[11px]">{r.points}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </main>
  );
};

export default EarlyList;
