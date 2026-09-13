import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Loader2, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import PixelSprite from '../components/PixelSprite';
import { api } from '../lib/api';
import { getCharacter } from '../mock';
import { useAuth } from '../context/AuthContext';

const COLS = [
  ['O', 'matches', 'Oynanan'],
  ['G', 'wins', 'Galibiyet'],
  ['B', 'draws', 'Beraberlik'],
  ['M', 'losses', 'Mağlubiyet'],
  ['A', 'goals_for', 'Atılan', true],
  ['Y', 'goals_against', 'Yenilen', true],
  ['AV', 'goal_diff', 'Averaj'],
  ['P', 'points', 'Puan'],
];

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/leaderboard', { params: { limit: 100 } })
      .then((r) => setRows(r.data))
      .catch(() => setErr('Puan tablosu yüklenemedi'));
  }, [user?.points]);

  const me = rows?.find((r) => user && r.username === user.username);

  return (
    <main className="paper-grid min-h-screen">
      <div className="mx-auto max-w-[1100px] px-5 py-14 md:px-10">
        <div className="label mb-4">Sezon 01 &middot; Genel Sıralama</div>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className="font-pixel text-[22px] leading-[1.5] md:text-[30px]" data-testid="leaderboard-title">LİG PUANLARI</h1>
          <Link to="/play?mode=league" className="btn-ink !px-5 !py-3 !text-[10px]" data-testid="leaderboard-play-btn">
            MAÇ OYNA <ArrowRight size={12} />
          </Link>
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
          Oynanan her maç lige işlenir. Galibiyet = 3 puan, beraberlik = 1 puan. Sıralama puan, averaj ve atılan gole göre yapılır.
        </p>

        {me && (
          <div className="font-mono mt-8 border border-[var(--ink)] bg-[var(--paper-2)] px-5 py-4 text-[12px] tracking-wider" data-testid="my-rank-banner">
            SENİN SIRAN: #{me.rank} &middot; @{me.username} &middot; {me.points} PUAN &middot; {me.matches} MAÇ
          </div>
        )}

        <section className="mt-10 frame-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div className="label">Puan Durumu</div>
            <div className="font-mono text-[10px] tracking-widest text-[var(--ink-soft)]">G3 &middot; B1 &middot; M0</div>
          </div>
          {!rows && !err && (
            <div className="flex items-center justify-center gap-3 p-10 text-[var(--ink-soft)]">
              <Loader2 className="animate-spin" size={16} /> <span className="font-mono text-[12px] tracking-widest">YÜKLENİYOR</span>
            </div>
          )}
          {err && <div className="font-mono p-10 text-center text-[12px] text-red-700">{err}</div>}
          {rows && rows.length === 0 && (
            <div className="font-mono p-10 text-center text-[12px] tracking-widest text-[var(--ink-soft)]" data-testid="leaderboard-empty">
              HENÜZ MAÇ OYNANMADI. İLK SEN OL.
            </div>
          )}
          {rows && rows.length > 0 && (
            <Table data-testid="leaderboard-table">
              <TableHeader>
                <TableRow className="font-mono text-[10px] tracking-widest">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>OYUNCU</TableHead>
                  <TableHead className="hidden sm:table-cell">CÜZDAN</TableHead>
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
