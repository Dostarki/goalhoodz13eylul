import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, RotateCcw, Trophy, Loader2 } from 'lucide-react';
import PixelSprite from '../components/PixelSprite';
import WalletGate from '../components/WalletGate';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ARENAS, ROUNDS, TROPHY_BITMAP, getCharacter, arenaForRound } from '../mock';

const League = () => {
  const loc = useLocation();
  const { ready, user, loading } = useAuth();
  const [league, setLeague] = useState(null);
  const [err, setErr] = useState('');
  const lastResult = loc.state?.result;

  useEffect(() => {
    if (!ready) return;
    api.get('/league').then((r) => setLeague(r.data)).catch(() => setErr('Could not load your league'));
  }, [ready]);

  const onReset = async () => {
    const r = await api.post('/league/reset');
    setLeague(r.data);
  };

  if (loading) {
    return (
      <main className="paper-grid flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="paper-grid min-h-screen">
        <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-10">
          <WalletGate title="The league is wallet-only." subtitle="Connect and sign in with your Robinhood Chain wallet to open your personal 5-week season. Results and points are saved to your profile." />
        </div>
      </main>
    );
  }

  // participants: 0 = you, 1..5 = league opponents
  const teams = league ? [{ username: user.username, char_id: user.character_id, isPlayer: true }, ...league.opponents] : [];
  const standings = league ? league.standings : [];
  const finished = league?.finished;
  const playerRank = standings.findIndex((r) => r.idx === 0);
  const fixture = league && !finished ? { round: league.round, away: teams[ROUNDS[league.round][0][1]], arena: arenaForRound(league.round) } : null;

  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-10">
        <div className="label mb-4">Season 01 &middot; Week {league ? Math.min(league.round + 1, ROUNDS.length) : '-'} / {ROUNDS.length}</div>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className="font-pixel text-[22px] leading-[1.5] md:text-[30px]" data-testid="league-title">League Table</h1>
          <button onClick={onReset} className="btn-outline !px-4 !py-3 !text-[10px]" data-testid="league-reset-btn" disabled={!league}>
            <RotateCcw size={12} /> RESET SEASON
          </button>
        </div>

        {err && <div className="font-mono mt-8 text-[12px] text-red-700">{err}</div>}
        {!league && !err && (
          <div className="font-mono mt-10 flex items-center gap-3 text-[12px] tracking-widest text-[var(--ink-soft)]"><Loader2 className="animate-spin" size={14} /> LOADING SEASON</div>
        )}

        {lastResult && (
          <div className="font-mono mt-8 border border-[var(--ink)] bg-[var(--paper-2)] px-5 py-4 text-[12px] tracking-wider" data-testid="last-result-banner">
            LAST MATCH: @{user.username} {lastResult.ps} - {lastResult.bs} @{lastResult.opp} &middot;{' '}
            {lastResult.ps > lastResult.bs ? 'WIN (+3)' : lastResult.ps === lastResult.bs ? 'DRAW (+1)' : 'LOSS'}
          </div>
        )}

        {league && finished && (
          <section className="mt-12 frame-card invert-card p-10 text-center md:p-16" data-testid="champion-screen">
            <div className="flex justify-center">
              <PixelSprite bitmap={TROPHY_BITMAP} scale={7} ink="var(--paper)" className="bob" />
            </div>
            <div className="label mt-8 !text-[var(--paper)] opacity-60">Season Complete</div>
            <h2 className="font-pixel mt-5 text-[20px] leading-[1.6] md:text-[28px]">
              CHAMPION: @{teams[standings[0].idx].username}
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-7 opacity-70">
              {playerRank === 0
                ? 'The circle is closed. You beat every rival and finished on top.'
                : `You finished the season in position ${playerRank + 1}. A new season opens the circle again.`}
            </p>
            <button onClick={onReset} className="btn-outline mt-10 !border-[var(--paper)] !bg-transparent !text-[var(--paper)] hover:!bg-[var(--paper)] hover:!text-[var(--ink)]">
              NEW SEASON <ArrowRight size={14} />
            </button>
          </section>
        )}

        {fixture && (
          <section className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="frame-card p-6 md:p-8" data-testid="next-fixture-card">
              <div className="label mb-6">Next Match &middot; {ARENAS[fixture.arena].name}</div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <PixelSprite bitmap={getCharacter(user.character_id).bitmap} scale={6} ink="var(--ink)" />
                  <div className="font-pixel text-[11px] md:text-[13px]">@{user.username}</div>
                  <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">YOU</div>
                </div>
                <div className="font-pixel text-[18px] text-[var(--ink-soft)]">VS</div>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="bg-[var(--ink)] p-1">
                    <PixelSprite bitmap={getCharacter(fixture.away.char_id).bitmap} scale={6} ink="var(--paper)" flip />
                  </div>
                  <div className="font-pixel text-[11px] md:text-[13px]" data-testid="next-opponent-name">@{fixture.away.username}</div>
                  <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">RIVAL</div>
                </div>
              </div>
              <div className="mt-8 flex justify-center">
                <Link to="/play?mode=league" className="btn-ink" data-testid="play-next-match-btn">
                  PLAY MATCH <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="frame-card p-6">
              <div className="label mb-4">Match Info</div>
              <div className="font-pixel text-[12px]">Week {fixture.round + 1}</div>
              <p className="mt-3 text-[14px] leading-6 text-[var(--ink-soft)]">Your rival reads the ball's flight, guards the goal and shoots the moment there is space. Make them jump first.</p>
              <div className="font-mono mt-6 space-y-2 text-[11px] tracking-wider text-[var(--ink-soft)]">
                <div className="flex justify-between border-b border-[var(--line)] pb-2"><span>LENGTH</span><span className="text-[var(--ink)]">60 S</span></div>
                <div className="flex justify-between border-b border-[var(--line)] pb-2"><span>ARENA</span><span className="text-[var(--ink)]">{ARENAS[fixture.arena].name}</span></div>
                <div className="flex justify-between pb-2"><span>POINTS</span><span className="text-[var(--ink)]">W3 / D1 / L0</span></div>
              </div>
            </div>
          </section>
        )}

        {league && (
          <>
            <section className="mt-12 frame-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div className="label">Standings</div>
                <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">W3 &middot; D1 &middot; L0</div>
              </div>
              <Table data-testid="standings-table">
                <TableHeader>
                  <TableRow className="font-mono text-[10px] tracking-widest">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>PLAYER</TableHead>
                    <TableHead className="text-center">MP</TableHead>
                    <TableHead className="text-center">W</TableHead>
                    <TableHead className="text-center">D</TableHead>
                    <TableHead className="text-center">L</TableHead>
                    <TableHead className="hidden text-center sm:table-cell">GF</TableHead>
                    <TableHead className="hidden text-center sm:table-cell">GA</TableHead>
                    <TableHead className="text-center">GD</TableHead>
                    <TableHead className="text-center">PTS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((r, i) => {
                    const t = teams[r.idx];
                    return (
                      <TableRow key={r.idx} className={`font-mono text-[12px] ${t.isPlayer ? 'bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)]' : ''}`} data-testid={`standing-row-${r.idx}`}>
                        <TableCell className="font-pixel text-[10px]">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <PixelSprite bitmap={getCharacter(t.char_id).bitmap} scale={2} ink={t.isPlayer ? 'var(--paper)' : 'var(--ink)'} />
                            <span className="tracking-wider">@{t.username}</span>
                            {i === 0 && finished && <Trophy size={12} />}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{r.o}</TableCell>
                        <TableCell className="text-center">{r.g}</TableCell>
                        <TableCell className="text-center">{r.b}</TableCell>
                        <TableCell className="text-center">{r.m}</TableCell>
                        <TableCell className="hidden text-center sm:table-cell">{r.a}</TableCell>
                        <TableCell className="hidden text-center sm:table-cell">{r.y}</TableCell>
                        <TableCell className="text-center">{r.av > 0 ? `+${r.av}` : r.av}</TableCell>
                        <TableCell className="font-pixel text-center text-[10px]">{r.p}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>

            <section className="mt-12">
              <div className="label mb-6">Fixtures &amp; Results</div>
              <div className="grid gap-4 md:grid-cols-5">
                {ROUNDS.map((pairs, r) => {
                  const res = league.results[r];
                  const current = r === league.round && !finished;
                  return (
                    <div key={r} className={`frame-card p-4 ${current ? '!border-[var(--ink)]' : ''}`} data-testid={`round-card-${r + 1}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-pixel text-[10px]">WEEK {r + 1}</div>
                        <div className="font-mono text-[9px] tracking-widest text-[var(--ink-soft)]">{res ? 'PLAYED' : current ? 'NEXT' : 'PENDING'}</div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {pairs.map(([h, a], i) => {
                          const m = res?.[i];
                          return (
                            <div key={i} className="font-mono flex items-center justify-between gap-2 text-[10px] tracking-wider">
                              <span className={`truncate ${teams[h].isPlayer ? 'font-semibold' : ''}`}>{teams[h].username}</span>
                              <span className="shrink-0 bg-[var(--paper)] px-2 py-[2px] text-[var(--ink)]">{m ? `${m.hs} - ${m.as}` : '-'}</span>
                              <span className={`truncate text-right ${teams[a].isPlayer ? 'font-semibold' : ''}`}>{teams[a].username}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default League;
