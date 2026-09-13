import React, { useState } from 'react';
import TweetEmbed from './TweetEmbed';

const PALETTE = ['#c8ff3d', '#2ad3b0', '#ff8a3d', '#ffd23d', '#ff6ea8', '#6ec6ff'];

const Avatar = ({ handle }) => {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <div className="font-pixel flex h-16 w-16 items-center justify-center border-2 border-[var(--ink)] bg-[var(--paper)] text-[18px] uppercase">{handle[0]}</div>;
  }
  return <img src={`https://unavatar.io/x/${handle}?fallback=false`} alt={`@${handle}`} onError={() => setBroken(true)} className="h-16 w-16 border-2 border-[var(--ink)] bg-[var(--paper)] object-cover" />;
};

const Stamp = () => (
  <div className="font-pixel flex h-16 w-16 -rotate-12 items-center justify-center rounded-full border-2 border-[var(--ink)] text-center text-[7px] leading-[1.4] opacity-80" data-testid="collab-stamp">
    COLLAB<br />APPROVED
  </div>
);

export const LedgerCard = ({ c, i }) => (
  <article className="relative border-2 border-[var(--ink)] p-5 shadow-[6px_6px_0_var(--ink)] md:p-7" style={{ background: PALETTE[i % PALETTE.length] }} data-testid={`ledger-card-${c.id}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <Avatar handle={c.owner_x} />
        <div>
          <a href={`https://x.com/${c.owner_x}`} target="_blank" rel="noreferrer" className="font-pixel text-[12px] hover:underline" data-testid={`ledger-owner-${c.id}`}>@{c.owner_x}</a>
          <div className="font-mono mt-1 text-[10px] tracking-widest" data-testid={`ledger-alloc-${c.id}`}>{c.allocated} NFTS ALLOCATED · {c.gtd_spots + c.fcfs_spots} SPOTS</div>
          <div className="font-mono mt-1 text-[10px] uppercase tracking-widest opacity-70">{c.name} · GTD {c.gtd_used}/{c.gtd_spots} · FCFS {c.fcfs_used}/{c.fcfs_spots}</div>
        </div>
      </div>
      <Stamp />
    </div>
    <div className="mx-auto mt-5 max-w-[520px]">
      {c.tweet_url ? (
        <TweetEmbed url={c.tweet_url} testId={`ledger-tweet-${c.id}`} />
      ) : (
        <div className="font-mono border-2 border-dashed border-[var(--ink)] p-6 text-center text-[10px] tracking-widest opacity-70" data-testid={`ledger-no-tweet-${c.id}`}>ANNOUNCEMENT POST COMING SOON</div>
      )}
    </div>
  </article>
);

const CollabLedger = ({ rows }) => (
  <section className="mt-20" data-testid="collab-ledger">
    <div className="label text-center">Full collab ledger</div>
    {rows.length === 0 && <div className="font-mono mt-6 text-center text-[11px] tracking-widest text-[var(--ink-soft)]" data-testid="ledger-empty">NO COLLABS YET.</div>}
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {rows.map((c, i) => <LedgerCard key={c.id} c={c} i={i} />)}
    </div>
  </section>
);

export default CollabLedger;
