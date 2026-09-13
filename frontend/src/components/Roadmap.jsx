import React from 'react';
import { Ticket, Image, Coins, Users, Swords } from 'lucide-react';

const PHASES = [
  {
    n: '00', status: 'live', title: 'Early Access', icon: Ticket,
    text: 'Join the Early List, finish the X tasks and grab your numbered ticket. Prove on-chain volume to upgrade it to a VIP tier.',
    bullets: ['Numbered Early tickets', 'Referral points', 'Bronze → Platinum VIP via wallet volume'],
  },
  {
    n: '01', status: 'next', title: 'NFT Access Pass', icon: Image,
    text: 'A GoalHoodz collection drops on OpenSea. Holding a pass is your key to the pitch — only holders can enter the league.',
    bullets: ['Collection on OpenSea', 'Early List & VIP holders get priority mint', 'Your NFT unlocks its pixel striker in-game'],
  },
  {
    n: '02', status: 'planned', title: '$GOALZ Rewards', icon: Coins,
    text: 'Every match you play earns $GOALZ. Win the league and your season rewards are multiplied 10x. Claim straight to your wallet.',
    bullets: ['Earn per match: win > draw > loss', 'League champion: 10x season bonus', 'Claim rewards on Robinhood Chain'],
  },
  {
    n: '03', status: 'planned', title: 'Clubs', icon: Users,
    text: 'Reach the $GOALZ threshold and found your own club. Recruit strikers, climb the club table and share the season prize pool.',
    bullets: ['Found a club with $GOALZ', 'Club name, pixel crest & colors', 'Club league and prize pool'],
  },
  {
    n: '04', status: 'planned', title: 'Beyond', icon: Swords,
    text: 'Real-time PvP, tournaments and striker upgrades. The pitch keeps growing with the community.',
    bullets: ['Live PvP matches', 'Tournaments', 'Striker upgrades & cosmetics'],
  },
];

const BADGE = {
  live: { label: 'LIVE NOW', cls: 'bg-[var(--accent)] text-[var(--ink)] font-bold' },
  next: { label: 'UP NEXT', cls: 'bg-[var(--ink)] text-[var(--paper)]' },
  planned: { label: 'PLANNED', cls: 'border border-[var(--ink)] text-[var(--ink)]' },
};

const Phase = ({ p, last }) => {
  const Icon = p.icon;
  const b = BADGE[p.status];
  return (
    <div className="relative grid gap-5 pl-10 md:grid-cols-[120px_1fr] md:gap-10 md:pl-0" data-testid={`roadmap-phase-${p.n}`}>
      <div className="hidden md:block">
        <div className="font-pixel text-[22px] leading-none">{p.n}</div>
        <span className={`font-mono mt-3 inline-block px-2 py-1 text-[9px] tracking-[0.2em] ${b.cls}`}>{b.label}</span>
      </div>
      <div className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center md:left-[120px] md:-translate-x-1/2">
        <span className={`block h-3 w-3 ${p.status === 'planned' ? 'border-2 border-[var(--ink)] bg-[var(--paper)]' : 'bg-[var(--ink)]'}`} />
      </div>
      {!last && <div className="absolute left-[9px] top-6 h-[calc(100%+3rem)] w-[2px] bg-[var(--line)] md:left-[120px] md:-translate-x-1/2" />}
      <div className="frame-card p-5 md:ml-6 md:p-7">
        <div className="flex flex-wrap items-center gap-3 md:hidden">
          <span className="font-pixel text-[14px]">{p.n}</span>
          <span className={`font-mono inline-block px-2 py-1 text-[9px] tracking-[0.2em] ${b.cls}`}>{b.label}</span>
        </div>
        <div className="mt-3 flex items-center gap-3 md:mt-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--ink)] bg-[var(--paper-2)]"><Icon size={16} /></span>
          <h3 className="font-pixel text-[13px] leading-6 md:text-[15px]">{p.title}</h3>
        </div>
        <p className="mt-4 text-[15px] leading-7 text-[var(--ink-soft)]">{p.text}</p>
        <ul className="mt-4 space-y-1.5">
          {p.bullets.map((x) => (
            <li key={x} className="font-mono flex items-start gap-2 text-[11px] tracking-wider text-[var(--ink)]">
              <span className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 bg-[var(--accent)]" />{x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const Roadmap = () => (
  <section id="roadmap" className="scroll-mt-20 border-t border-[var(--line)]" data-testid="roadmap-section">
    <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
      <div className="label mb-4">Roadmap</div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h2 className="font-pixel text-[20px] leading-[1.6] md:text-[26px]">From Early ticket to your own club.</h2>
        <p className="max-w-md text-[15px] leading-7 text-[var(--ink-soft)]">
          New here? This is where GoalHoodz is heading. Phases ship in order; dates follow the community, not the other way round.
        </p>
      </div>
      <div className="mt-14 flex flex-col gap-12">
        {PHASES.map((p, i) => <Phase key={p.n} p={p} last={i === PHASES.length - 1} />)}
      </div>
      <p className="font-mono mt-12 max-w-2xl text-[11px] leading-6 tracking-wider text-[var(--ink-soft)]" data-testid="roadmap-disclaimer">
        No token or NFT is live yet. Anything claiming to be $GOALZ or a GoalHoodz pass today is not ours — official links will be announced on X first.
      </p>
    </div>
  </section>
);
