import React, { useEffect, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import PixelSprite from '../components/PixelSprite';
import { api } from '../lib/api';
import { getCharacter } from '../mock';
import { useAuth } from '../context/AuthContext';

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/leaderboard', { params: { limit: 100 } })
      .then((r) => setRows(r.data))
      .catch(() => setErr('Could not load leaderboard'));
  }, [user?.points]);

  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-[1100px] px-5 py-14 md:px-10">
        <div className="label mb-4">Global Ranking</div>
        <h1 className="font-pixel text-[22px] leading-[1.5] md:text-[30px]" data-testid="leaderboard-title">Leaderboard</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
          Every match counts: league and quick matches. Win = 3 points, draw = 1 point. Scores are stored per wallet.
        </p>

        <section className="mt-10 frame-card overflow-hidden">
          {!rows && !err && (
            <div className="flex items-center justify-center gap-3 p-10 text-[var(--ink-soft)]">
              <Loader2 className="animate-spin" size={16} /> <span className="font-mono text-[12px] tracking-widest">LOADING</span>
            </div>
          )}
          {err && <div className="font-mono p-10 text-center text-[12px] text-red-700">{err}</div>}
          {rows && rows.length === 0 && (
            <div className="font-mono p-10 text-center text-[12px] tracking-widest text-[var(--ink-soft)]" data-testid="leaderboard-empty">
              NO PLAYERS YET. BE THE FIRST.
            </div>
          )}
          {rows && rows.length > 0 && (
            <Table data-testid="leaderboard-table">
              <TableHeader>
                <TableRow className="font-mono text-[10px] tracking-widest">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>PLAYER</TableHead>
                  <TableHead className="hidden sm:table-cell">WALLET</TableHead>
                  <TableHead className="text-center">MP</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="hidden text-center sm:table-cell">GF</TableHead>
                  <TableHead className="hidden text-center sm:table-cell">GA</TableHead>
                  <TableHead className="text-center">PTS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const me = user && r.username === user.username;
                  return (
                    <TableRow key={r.rank} className={`font-mono text-[12px] ${me ? 'bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink)]' : ''}`} data-testid={`lb-row-${r.rank}`}>
                      <TableCell className="font-pixel text-[10px]">
                        <span className="flex items-center gap-2">{r.rank}{r.rank === 1 && <Trophy size={12} />}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PixelSprite bitmap={getCharacter(r.character_id).bitmap} scale={2} ink={me ? 'var(--paper)' : 'var(--ink)'} />
                          <span className="tracking-wider">@{r.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden opacity-70 sm:table-cell">{r.address}</TableCell>
                      <TableCell className="text-center">{r.matches}</TableCell>
                      <TableCell className="text-center">{r.wins}</TableCell>
                      <TableCell className="text-center">{r.draws}</TableCell>
                      <TableCell className="text-center">{r.losses}</TableCell>
                      <TableCell className="hidden text-center sm:table-cell">{r.goals_for}</TableCell>
                      <TableCell className="hidden text-center sm:table-cell">{r.goals_against}</TableCell>
                      <TableCell className="font-pixel text-center text-[10px]">{r.points}</TableCell>
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
