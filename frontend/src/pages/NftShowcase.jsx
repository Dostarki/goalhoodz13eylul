import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ExternalLink, Gem, Loader2, Sparkles } from 'lucide-react';
import { StatPills, TraitChip } from '../components/NftBonus';
import { OPENSEA_URL } from '../components/NftGate';
import { api } from '../lib/api';
import { STAT_INFO, sortedStats } from '../lib/nftBonus';

const NftShowcase = () => {
  const { id } = useParams();
  const [bonus, setBonus] = useState(null);
  const [err, setErr] = useState('');
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    setBonus(null);
    setErr('');
    setImgOk(true);
    api.get(`/nft/bonus/${id}`).then((r) => setBonus(r.data)).catch(() => setErr('Unknown GoalHoodz token.'));
  }, [id]);

  if (err) {
    return (
      <main className="paper-grid min-h-screen">
        <div className="mx-auto max-w-[900px] px-5 py-24 text-center">
          <div className="font-mono text-[12px] tracking-wider text-red-700" data-testid="nft-showcase-error">{err}</div>
          <Link to="/" className="btn-outline mt-8">HOME</Link>
        </div>
      </main>
    );
  }
  if (!bonus) return <main className="paper-grid flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin" /></main>;

  const rare = bonus.traits.filter((t) => t.rarity === 'Rare');
  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-[1100px] px-5 py-10 md:px-10 md:py-14">
        <Link to="/profile" className="nav-link flex items-center gap-2" data-testid="nft-showcase-back"><ArrowLeft size={14} /> My NFT</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="frame-card self-start p-4" data-testid="nft-showcase-image-card">
            <div className="relative aspect-square w-full overflow-hidden border-2 border-[var(--ink)] bg-[var(--paper-2)]">
              {imgOk ? (
                <img src={`/nft/${bonus.token_id}.jpg`} alt={bonus.name} onError={() => setImgOk(false)} className="h-full w-full object-cover" style={{ imageRendering: 'pixelated' }} data-testid="nft-showcase-image" />
              ) : (
                <div className="font-pixel flex h-full w-full items-center justify-center text-[22px] text-[var(--ink-soft)]">#{bonus.token_id}</div>
              )}
              <div className="font-mono absolute left-3 top-3 bg-[var(--ink)] px-2 py-1 text-[9px] tracking-[0.2em] text-[var(--paper)]">GOALHOODZ &middot; ROBINHOOD CHAIN</div>
              {rare.length > 0 && (
                <div className="font-mono absolute right-3 top-3 flex items-center gap-1 bg-[var(--accent)] px-2 py-1 text-[9px] tracking-[0.2em] text-[var(--ink)]"><Gem size={9} /> {rare.length} RARE</div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">#{String(bonus.token_id).padStart(4, '0')} / 4444</div>
                <h1 className="font-pixel mt-2 text-[16px] md:text-[20px]" data-testid="nft-showcase-name">{bonus.name}</h1>
              </div>
              <a href={OPENSEA_URL} target="_blank" rel="noreferrer" className="btn-outline !px-3 !py-2 !text-[9px]">OPENSEA <ExternalLink size={11} /></a>
            </div>
          </div>

          <div className="space-y-6">
            <div className="frame-card p-6">
              <div className="label mb-4">Traits</div>
              <div className="grid gap-2">{bonus.traits.map((t) => <TraitChip key={t.category} t={t} />)}</div>
            </div>
            <div className="frame-card p-6" data-testid="nft-showcase-bonuses">
              <div className="label mb-4 flex items-center gap-2"><Sparkles size={11} /> On-pitch bonuses</div>
              <StatPills stats={bonus.stats} />
              <ul className="mt-5 space-y-2 border-t border-[var(--line)] pt-4">
                {sortedStats(bonus.stats).map(([s, v]) => (
                  <li key={s} className="flex items-center justify-between gap-4">
                    <span className="font-pixel text-[10px]">{s.toUpperCase()}</span>
                    <span className="font-mono flex-1 border-b border-dotted border-[var(--line)]" />
                    <span className="font-mono text-[11px] tracking-wider text-[var(--ink-soft)]">{STAT_INFO[s]}</span>
                    <span className="font-pixel text-[11px]">+{v}%</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between border-t-2 border-[var(--ink)] pt-4">
                <span className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">TOTAL BOOST</span>
                <span className="font-pixel text-[16px]" data-testid="nft-showcase-total">+{bonus.total}%</span>
              </div>
            </div>
            <Link to="/play?mode=global" className="btn-ink w-full justify-center" data-testid="nft-showcase-play">TAKE IT TO THE PITCH <ArrowRight size={14} /></Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NftShowcase;
