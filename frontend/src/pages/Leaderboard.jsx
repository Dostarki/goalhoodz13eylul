import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Loader2, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import PixelSprite from '../components/PixelSprite';
import { api } from '../lib/api';
import { getCharacter } from '../mock';
import { useAuth } from '../context/AuthContext';

const COLS = [
  ['P', 'matches', 'Played'],
  ['W', 'wins', 'Won'],
  ['D', 'draws', 'Drawn'],
  ['L', 'losses', 'Lost'],
  ['GF', 'goals_for', 'Goals For', true],
  ['GA', 'goals_against', 'Goals Against', true],
  ['GD', 'goal_diff', 'Goal Difference'],
  ['Pts', 'points', 'Points'],
];

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/leaderboard', { params: { limit: 100 } })
      .then((r) => setRows(r.data))
      .catch(() => setErr('Failed to load standings'));
  }, [user?.points]);

  const me = rows?.find((r) => user && r.username === user.username);

  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-[1100px] px-5 py-14 md:px-10">
        <div className="label mb-4">Season 01 &middot; Standings</div>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className="font-pixel text-[22px] leading-[1.5] md:text-[30px]" data-testid="leaderboard-title">STANDINGS</h1>
          <Link to="/play?mode=league" className="btn-ink !px-5 !py-3 !text-[10px]" data-testid="leaderboard-play-btn">
            PLAY MATCH <ArrowRight size={12} />
          </Link>
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
          Every match played is recorded to the league. Win = 3 points, draw = 1 point. Ranking is by points, then goal difference, then goals for.
        </p>

        {me && (
          <div className="font-mono mt-8 border border-[var(--ink)] bg-[var(--paper-2)] px-5 py-4 text-[12px] tracking-wider" data-testid="my-rank-banner">
            YOUR RANK: #{me.rank} &middot; @{me.username} &middot; {me.points} PTS &middot; {me.matches} PLAYED
          </div>
        )}

        <section className="mt-10 frame-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div className="label">League Table</div>
            <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">W3 &middot; D1 &middot; L0</div>
          </div>
          {!rows && !err && (
            <div className="flex items-center justify-center gap-3 p-10 text-[var(--ink-soft)]">
              <Loader2 className="animate-spin" size={16} /> <span className="font-mono text-[12px] tracking-widest">LOADING</span>
            </div>
          )}
          {err && <div className="font-mono p-10 text-center text-[12px] text-red-700">{err}</div>}
          {rows && rows.length === 0 && (
            <div className="font-mono p-10 text-center text-[12px] tracking-widest text-[var(--ink-soft)]" data-testid="leaderboard-empty">
              NO MATCHES PLAYED YET. BE THE FIRST.
            </div>
          )}
          {rows && rows.length > 0 && (
            <Table data-testid="leaderboard-table">
              <TableHeader>
                <TableRow className="font-mono text-[10px] tracking-widest">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>PLAYER</TableHead>
                  <TableHead className="hidden sm:table-cell">WALLET</TableHead>
                  {COLS.map(([h, , title, hide]) => (
                    <TableHead key={h} title={title} className={`text-center ${hide ? 'hidden sm:table-cell' : ''}`}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const mine = user && r.username === user.username;
                  return (
                    <TableRow key={r.rank} className={`font-mono text-[12px] ${mine ? 'bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)]' : ''}`} data-testid={`lb-row-${r.rank}`}>
                      <TableCell className="font-pixel text-[10px]">
                        <span className="flex items-center gap-2">{r.rank}{r.rank === 1 && <Trophy size={12} />}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PixelSprite bitmap={getCharacter(r.character_id).bitmap} scale={2} ink={mine ? 'var(--paper)' : 'var(--ink)'} />
                          <span className="tracking-wider">@{r.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden opacity-70 sm:table-cell">{r.address}</TableCell>
                      {COLS.map(([h, key, , hide]) => (
                        <TableCell key={h} className={`text-center ${hide ? 'hidden sm:table-cell' : ''} ${key === 'points' ? 'font-pixel text-[10px]' : ''}`}>
                          {key === 'goal_diff' && r[key] > 0 ? `+${r[key]}` : r[key]}
                        </TableCell>
                      ))}
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

export default Leaderboard;
