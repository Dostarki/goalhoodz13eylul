import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Lock, Ticket } from 'lucide-react';
import PixelSprite from '../components/PixelSprite';
import PixelMesh from '../components/PixelMesh';
import WalletGate from '../components/WalletGate';
import EarlyAccess from '../components/early/EarlyAccess';
import { Roadmap } from '../components/Roadmap';
import { useAuth } from '../context/AuthContext';
import { GAME_LOCKED } from '../lib/flags';
import { CHARACTERS, BALL_BITMAP, ARENAS, CONTROLS, FEATURES, getSelectedCharId, setSelectedCharId, getCharacter } from '../mock';

const StatBar = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="font-mono w-14 text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">{label}</span>
    <div className="flex gap-[3px]">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className={`h-2 w-2 ${i < value ? 'bg-[var(--ink)]' : 'bg-[var(--line)]'}`} />
      ))}
    </div>
  </div>
);

const ArenaPreview = ({ arena }) => (
  <div className="relative h-40 w-full overflow-hidden border-2" style={{ background: arena.bg, borderColor: arena.ink }}>
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: `linear-gradient(${arena.ink} 1px, transparent 1px), linear-gradient(90deg, ${arena.ink} 1px, transparent 1px)`,
        backgroundSize: '16px 16px',
      }}
    />
    <div className="absolute bottom-6 left-0 right-0 h-[3px]" style={{ background: arena.ink }} />
    <div className="absolute bottom-0 left-0 right-0 h-6 opacity-40" style={{ backgroundImage: `radial-gradient(${arena.ink} 1px, transparent 1px)`, backgroundSize: '6px 6px' }} />
    <div className="absolute bottom-6 left-3 h-16 w-10 border-r-[3px] border-t-[3px]" style={{ borderColor: arena.ink }} />
    <div className="absolute bottom-6 right-3 h-16 w-10 border-l-[3px] border-t-[3px]" style={{ borderColor: arena.ink }} />
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      <PixelSprite bitmap={CHARACTERS[0].bitmap} scale={3} ink={arena.ink} />
    </div>
    <div className="absolute bottom-16 left-[60%] ball-bounce">
      <PixelSprite bitmap={BALL_BITMAP} scale={2} ink={arena.ink} />
    </div>
  </div>
);

const Home = () => {
  const { ready, user, setCharacter } = useAuth();
  const [charId, setCharId] = useState(user?.character_id || getSelectedCharId());
  const selected = getCharacter(charId);

  const choose = (id) => {
    setCharId(id);
    setSelectedCharId(id);
    if (user) setCharacter(id);
  };

  return (
    <main className="paper-grid relative">
      {/* HERO */}
      <section className="paper-noise relative mx-auto max-w-[1400px] px-5 pb-16 pt-20 md:px-10 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="label reveal reveal-1 mb-6 flex items-center justify-center gap-3 !text-[var(--ink)] max-sm:text-[12px]" data-testid="hero-season-label">
            <span className="inline-block h-2 w-2 bg-[var(--accent)]" />
            Season 01 &middot; Robinhood Chain &middot; 60 seconds
          </div>
          <h1 className="font-pixel reveal reveal-2 text-[30px] leading-[1.15] tracking-tight sm:text-[46px] md:text-[60px]" data-testid="hero-title">
            GOALHOODZ
            <span className="mt-3 block text-[14px] tracking-[0.3em] text-[var(--accent)] sm:text-[18px] md:text-[22px]">EARLY</span>
          </h1>
          <p className="reveal reveal-3 mx-auto mt-7 max-w-2xl text-[17px] font-medium leading-8 text-[var(--ink)] max-sm:text-[16px] max-sm:leading-7" data-testid="hero-description">
            One bit, two colors, one ball. Connect your wallet, pick a pixel striker and take on rivals in
            60-second head soccer matches. Every result is written to the global leaderboard.
          </p>
          <div className="reveal reveal-4 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {GAME_LOCKED ? (
              <>
                <a href="#early" className="btn-ink" data-testid="hero-early-btn">
                  <Ticket size={14} /> JOIN EARLY LIST <ArrowRight size={14} />
                </a>
                <button className="btn-outline cursor-not-allowed opacity-50" disabled title="Coming soon" data-testid="hero-league-btn">
                  <Lock size={12} /> CONNECT & PLAY · SOON
                </button>
              </>
            ) : (
              <>
                <Link to="/play?mode=global" className="btn-ink" data-testid="hero-league-btn">
                  {ready ? 'PLAY LEAGUE MATCH' : 'CONNECT & PLAY'} <ArrowRight size={14} />
                </Link>
                <Link to="/leaderboard" className="btn-outline" data-testid="hero-standings-btn">
                  STANDINGS
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Preview card */}
        <div className="reveal reveal-4 relative mx-auto mt-16 w-full max-w-[340px]">
          <div className="pointer-events-none absolute -inset-x-24 -inset-y-14 sm:-inset-x-40 sm:-inset-y-20" data-testid="hero-card-mesh-wrap">
            <PixelMesh dense className="pixel-mesh-local" testId="hero-card-pixel-mesh" />
          </div>
          <div className="frame-card relative p-5">
            <div className="pixel-frame relative flex h-[280px] items-end justify-center overflow-hidden">
              <div className="absolute bottom-10 left-3 h-20 w-12 border-r-[3px] border-t-[3px] border-[var(--ink)]" />
              <div className="absolute bottom-10 right-3 h-20 w-12 border-l-[3px] border-t-[3px] border-[var(--ink)]" />
              <div className="absolute bottom-10 left-0 right-0 h-[3px] bg-[var(--ink)]" />
              <div className="absolute bottom-[40px] right-[38%] ball-bounce">
                <PixelSprite bitmap={BALL_BITMAP} scale={3} ink="var(--ink)" />
              </div>
              <div className="bob relative z-10 mb-10 flex flex-col items-center">
                <PixelSprite key={selected.id} bitmap={selected.bitmap} scale={9} ink="var(--ink)" />
                <div className="mt-1 flex gap-3">
                  <span className="h-4 w-3 bg-[var(--ink)]" />
                  <span className="h-4 w-3 bg-[var(--ink)]" />
                </div>
              </div>
            </div>
            <div className="font-mono mt-4 flex items-center justify-center gap-2 text-[11px] tracking-[0.18em] text-[var(--ink-soft)]">
              <span className="inline-block h-[6px] w-[6px] bg-[var(--accent)]" />
              FUTBOT #{String(CHARACTERS.findIndex((c) => c.id === selected.id) + 1).padStart(4, '0')} &middot; {selected.name}
              {user?.username && <> &middot; @{user.username}</>}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mx-auto mt-12 grid max-w-[560px] grid-cols-3 border border-[var(--line)] bg-[var(--paper-2)]">
          {[
            ['8', 'PIXEL STRIKERS'],
            ['60 S', 'MATCH LENGTH'],
            ['2', 'ARENAS'],
          ].map(([v, l]) => (
            <div key={l} className="stat-cell px-4 py-5 text-center">
              <div className="font-pixel text-[15px] md:text-[18px]">{v}</div>
              <div className="label mt-2 text-[9px] md:text-[10px]">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y border-[var(--line)] bg-[var(--ink)] py-3 text-[var(--paper)]">
        <div className="marquee font-mono text-[12px] tracking-[0.25em]">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              {['WALLET SIGN-IN', 'ROBINHOOD CHAIN', 'ETH NATIVE', '60 SECOND MATCHES', 'GLOBAL LEADERBOARD', '5-WEEK SEASON', '1-BIT PIXEL ART'].map((t) => (
                <span key={t + k} className="mx-8">{t} &middot;</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {GAME_LOCKED ? (
        <section className="mx-auto max-w-[1400px] scroll-mt-20 px-5 py-20 md:px-10" id="early">
          <EarlyAccess />
        </section>
      ) : (
        !ready && (
          <section className="mx-auto max-w-[1400px] px-5 py-20 md:px-10" id="connect">
            <WalletGate title="Connect your wallet to unlock the pitch." subtitle="GoalHoodz runs on Robinhood Chain and the pitch is holders-only: your wallet must hold a GoalHoodz NFT. Connect, pass the check and pick your username to start playing." />
          </section>
        )
      )}

      {/* About */}
      <section className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
        <h2 className="font-pixel max-w-3xl text-[20px] leading-[1.6] md:text-[26px]">A tiny striker chased the ball.</h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="border-t-2 border-[var(--ink)] pt-6">
              <div className="label mb-3">0{i + 1}</div>
              <h3 className="font-pixel text-[13px] leading-6">{f.title}</h3>
              <p className="mt-4 text-[15px] leading-7 text-[var(--ink-soft)]">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Characters */}
      <section id="characters" className="border-t border-[var(--line)] bg-[var(--paper-2)]">
        <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
          <div className="label mb-4">Choose Character</div>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="font-pixel text-[20px] leading-[1.6] md:text-[26px]">Pick your pixel striker.</h2>
            <p className="max-w-md text-[15px] leading-7 text-[var(--ink-soft)]">
              Each character is a 12x14 monochrome bitmap. Your pick is saved to your profile and joins you in every match.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {CHARACTERS.map((c, i) => {
              const sel = c.id === charId;
              return (
                <button key={c.id} onClick={() => choose(c.id)} className={`char-card relative p-5 text-left ${sel ? 'selected' : ''}`} data-testid={`char-card-${c.id}`}>
                  {sel && (
                    <span className="font-mono absolute right-3 top-3 flex items-center gap-1 bg-[var(--ink)] px-2 py-1 text-[9px] tracking-widest text-[var(--paper)]">
                      <Check size={10} /> SELECTED
                    </span>
                  )}
                  <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">#{String(i + 1).padStart(4, '0')}</div>
                  <div className="my-5 flex h-[100px] items-center justify-center">
                    <PixelSprite bitmap={c.bitmap} scale={6} ink="var(--ink)" />
                  </div>
                  <div className="font-pixel text-[12px]">{c.name}</div>
                  <div className="font-mono mt-1 text-[11px] tracking-wider text-[var(--ink-soft)]">{c.title}</div>
                  <div className="mt-4 space-y-1.5">
                    <StatBar label="Speed" value={c.stats.speed} />
                    <StatBar label="Jump" value={c.stats.jump} />
                    <StatBar label="Shot" value={c.stats.shot} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Arenas */}
      <section id="arenas" className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
          <div className="label mb-4">Arenas</div>
          <h2 className="font-pixel text-[20px] leading-[1.6] md:text-[26px]">Two pitches, two moods.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {Object.values(ARENAS).map((a) => (
              <div key={a.id} className="frame-card p-5" data-testid={`arena-card-${a.id}`}>
                <ArenaPreview arena={a} />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-pixel text-[12px]">{a.name}</div>
                    <p className="mt-2 text-[14px] leading-6 text-[var(--ink-soft)]">{a.desc}</p>
                  </div>
                  {GAME_LOCKED ? (
                    <button disabled className="btn-outline shrink-0 cursor-not-allowed !px-4 !py-3 !text-[10px] opacity-50" data-testid={`arena-play-${a.id}`}><Lock size={11} /> SOON</button>
                  ) : (
                    <Link to={`/play?mode=quick&arena=${a.id}`} className="btn-outline shrink-0 !px-4 !py-3 !text-[10px]">PLAY</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <Roadmap />

      {/* How to play */}
      <section id="how-to-play" className="border-t border-[var(--line)] bg-[var(--paper-2)]">
        <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
          <div className="label mb-4">How to Play</div>
          <h2 className="font-pixel text-[20px] leading-[1.6] md:text-[26px]">Simple rules. Tough rivals.</h2>
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="border border-[var(--line)] bg-[var(--paper)]">
              {CONTROLS.map((c, i) => (
                <div key={c.action} className={`grid grid-cols-[1.2fr_1fr_1fr] items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-[var(--line)]' : ''}`}>
                  <div className="font-mono text-[12px] tracking-wider">{c.action}</div>
                  <div className="flex flex-wrap gap-2">
                    {c.keys.map((k) => <span key={k} className="kbd">{k}</span>)}
                    {c.alt.map((k) => <span key={k} className="kbd opacity-60">{k}</span>)}
                  </div>
                  <div className="font-mono text-[11px] text-[var(--ink-soft)]">{c.mobile}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-5 text-[15px] leading-7 text-[var(--ink-soft)]">
              <li><span className="font-pixel text-[11px] text-[var(--ink)]">01</span> &nbsp; A match lasts 60 seconds. Most goals wins; equal goals is a draw.</li>
              <li><span className="font-pixel text-[11px] text-[var(--ink)]">02</span> &nbsp; Head the ball, jump to redirect it, press X for a hard shot.</li>
              <li><span className="font-pixel text-[11px] text-[var(--ink)]">03</span> &nbsp; The season is 5 weeks: one rival per week. Win = 3 pts, draw = 1 pt. Champion screen at the end.</li>
              <li><span className="font-pixel text-[11px] text-[var(--ink)]">04</span> &nbsp; Rivals read the ball's flight and guard the goal. Make them jump, then slip the ball under.</li>
            </ul>
          </div>
          <div className="mt-14 flex justify-center">
            {GAME_LOCKED ? (
              <button disabled className="btn-ink cursor-not-allowed opacity-50" data-testid="start-season-btn"><Lock size={12} /> SEASON OPENS SOON</button>
            ) : (
              <Link to="/league" className="btn-ink">START THE SEASON <ArrowRight size={14} /></Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
