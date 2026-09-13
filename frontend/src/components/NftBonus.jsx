import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Gem } from 'lucide-react';
import { sortedStats, STAT_INFO } from '../lib/nftBonus';

export const TraitChip = ({ t }) => (
  <div className={`flex items-center justify-between gap-3 border px-3 py-2 ${t.rarity === 'Rare' ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]' : 'border-[var(--line)] bg-[var(--paper)]'}`} data-testid={`trait-${t.category.toLowerCase()}`}>
    <div className="min-w-0">
      <div className={`font-mono text-[9px] uppercase tracking-[0.2em] ${t.rarity === 'Rare' ? 'opacity-70' : 'text-[var(--ink-soft)]'}`}>{t.category}</div>
      <div className="font-pixel mt-1 truncate text-[10px]">{t.value}</div>
    </div>
    <div className="shrink-0 text-right">
      {t.rarity === 'Rare' && <div className="font-mono flex items-center justify-end gap-1 text-[9px] tracking-widest"><Gem size={9} /> RARE</div>}
      <div className="font-pixel text-[10px]">+{t.pct}% <span className="font-mono text-[9px] uppercase tracking-wider opacity-80">{t.stat}</span></div>
    </div>
  </div>
);

export const StatPills = ({ stats, className = '' }) => (
  <div className={`flex flex-wrap gap-2 ${className}`} data-testid="nft-stat-pills">
    {sortedStats(stats).map(([s, v]) => (
      <span key={s} title={STAT_INFO[s]} className="font-mono border border-[var(--ink)] bg-[var(--paper)] px-2 py-1 text-[10px] tracking-widest" data-testid={`stat-pill-${s.toLowerCase()}`}>
        +{v}% {s.toUpperCase()}
      </span>
    ))}
  </div>
);

// compact strip used on the match & matchmaking screens
export const NftBonusStrip = ({ bonus }) => {
  if (!bonus) {
    return (
      <div className="frame-card mt-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid="nft-bonus-strip-empty">
        <div className="font-mono flex items-center gap-2 text-[11px] tracking-widest text-[var(--ink-soft)]"><Sparkles size={12} /> NO ACTIVE NFT — NO TRAIT BONUSES</div>
        <Link to="/profile" className="nav-link text-[11px]" data-testid="nft-bonus-strip-pick-link">Pick your GoalHoodz</Link>
      </div>
    );
  }
  return (
    <div className="frame-card mt-3 flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between" data-testid="nft-bonus-strip">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--ink)] text-[var(--paper)]"><Sparkles size={13} /></span>
        <div>
          <div className="font-pixel text-[10px]" data-testid="nft-bonus-strip-name">{bonus.name}</div>
          <div className="font-mono mt-1 text-[10px] tracking-widest text-[var(--ink-soft)]">
            {bonus.traits.map((t) => `${t.category.toUpperCase()}: ${t.value.toUpperCase()}`).join(' · ')}
          </div>
        </div>
      </div>
      <StatPills stats={bonus.stats} />
    </div>
  );
};

// full card used on the profile page
export const NftBonusCard = ({ bonus, active, onSelect, busy }) => {
  const rare = bonus.traits.filter((t) => t.rarity === 'Rare').length;
  return (
    <div className={`char-card flex flex-col p-5 text-left ${active ? 'selected' : ''}`} data-testid={`nft-card-${bonus.token_id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">#{String(bonus.token_id).padStart(4, '0')}</div>
          <div className="font-pixel mt-2 text-[12px]"><Link to={`/nft/${bonus.token_id}`} className="hover:underline" data-testid={`nft-card-${bonus.token_id}-link`}>{bonus.name}</Link></div>
        </div>
        {active ? (
          <span className="font-mono flex items-center gap-1 bg-[var(--ink)] px-2 py-1 text-[9px] tracking-widest text-[var(--paper)]" data-testid={`nft-card-${bonus.token_id}-active`}>ACTIVE</span>
        ) : (
          <button onClick={() => onSelect(bonus.token_id)} disabled={busy} className="btn-outline !px-3 !py-2 !text-[9px]" data-testid={`nft-card-${bonus.token_id}-select`}>USE THIS</button>
        )}
      </div>
      <div className="mt-4 grid gap-2">
        {bonus.traits.map((t) => <TraitChip key={t.category} t={t} />)}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <span className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">{rare ? `${rare} RARE TRAIT${rare > 1 ? 'S' : ''}` : 'ALL COMMON'}</span>
        <span className="font-pixel text-[11px]" data-testid={`nft-card-${bonus.token_id}-total`}>+{bonus.total}% TOTAL</span>
      </div>
    </div>
  );
};
