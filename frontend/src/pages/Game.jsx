import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ChevronUp, Pause, Play, RotateCcw, Zap, Loader2 } from 'lucide-react';
import { createMatch, step, W, H } from '../game/engine';
import { render } from '../game/renderer';
import { Sfx } from '../game/sound';
import PixelSprite from '../components/PixelSprite';
import WalletGate from '../components/WalletGate';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ARENAS, ROUNDS, MATCH_SECONDS, getCharacter, getSoundEnabled, arenaForRound } from '../mock';

const KEYMAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
  x: 'kick', X: 'kick', k: 'kick', K: 'kick', ArrowDown: 'kick',
};

// ---- the actual match (mounted only when setup is resolved) ----
const Match = ({ setup, mode, user, setUser }) => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stateRef = useRef(createMatch({ duration: MATCH_SECONDS }));
  const inputRef = useRef({ left: false, right: false, jump: false, kick: false });
  const sfxRef = useRef(new Sfx());
  const recordedRef = useRef(false);

  const [hud, setHud] = useState({ time: MATCH_SECONDS, score: [0, 0], phase: 'countdown', paused: false });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [pressed, setPressed] = useState({});

  sfxRef.current.enabled = getSoundEnabled();
  const playerName = `@${user.username}`;
  const oppName = `@${setup.opp.username}`;

  const finish = useCallback(
    async (st) => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      const [ps, bs] = st.score;
      const outcome = ps > bs ? 'win' : ps < bs ? 'lose' : 'draw';
      setResult({ ps, bs, outcome, pts: outcome === 'win' ? 3 : outcome === 'draw' ? 1 : 0 });
      setSaving(true);
      try {
        const r = await api.post('/matches', {
          mode,
          opponent_username: setup.opp.username,
          opponent_char_id: setup.opp.char_id,
          opponent_address: setup.opp.address || null,
          player_goals: ps,
          opponent_goals: bs,
          arena: setup.arena.id,
          character_id: setup.playerChar.id,
        });
        setUser(r.data.user);
      } catch (e) {
        setSaveErr('Result could not be saved. Check your connection.');
      } finally {
        setSaving(false);
      }
    },
    [mode, setup, setUser]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const STEP = 1000 / 60;
    let alive = true;
    const fontsReady = document.fonts ? document.fonts.load('16px "Press Start 2P"').catch(() => {}) : Promise.resolve();

    const loop = (now) => {
      if (!alive) return;
      acc += Math.min(100, now - last);
      last = now;
      const st = stateRef.current;
      while (acc >= STEP) {
        step(st, inputRef.current);
        st.events.forEach((e) => sfxRef.current.play(e));
        acc -= STEP;
      }
      render(ctx, st, {
        arena: setup.arena,
        playerBitmap: setup.playerChar.bitmap,
        botBitmap: setup.botChar.bitmap,
        playerName,
        botName: oppName,
      });
      const t = Math.ceil(st.time);
      setHud((h) =>
        h.time !== t || h.score[0] !== st.score[0] || h.score[1] !== st.score[1] || h.phase !== st.phase || h.paused !== st.paused
          ? { time: t, score: [...st.score], phase: st.phase, paused: st.paused }
          : h
      );
      if (st.phase === 'end') finish(st);
      raf = requestAnimationFrame(loop);
    };
    fontsReady.then(() => {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    });
    const onSound = (e) => { sfxRef.current.enabled = e.detail; };
    window.addEventListener('futbot-sound', onSound);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('futbot-sound', onSound);
    };
  }, [setup, finish, playerName, oppName]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        const st = stateRef.current;
        if (st.phase === 'play' || st.paused) st.paused = !st.paused;
        return;
      }
      const k = KEYMAP[e.key];
      if (k) {
        e.preventDefault();
        inputRef.current[k] = true;
        sfxRef.current.ensure();
      }
    };
    const up = (e) => {
      const k = KEYMAP[e.key];
      if (k) inputRef.current[k] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const press = (k, v) => (e) => {
    if (e && e.preventDefault) e.preventDefault();
    inputRef.current[k] = v;
    setPressed((p) => ({ ...p, [k]: v }));
    if (v) sfxRef.current.ensure();
  };

  const togglePause = () => {
    const st = stateRef.current;
    if (st.phase === 'play' || st.paused) st.paused = !st.paused;
  };

  const restart = () => navigate(0);
  const goLeague = () => navigate('/league', { state: { result: result ? { ps: result.ps, bs: result.bs, opp: setup.opp.username } : null } });

  const touchBtn = (k, Icon, label) => (
    <button
      className={`touch-btn ${pressed[k] ? 'pressed' : ''}`}
      onPointerDown={press(k, true)}
      onPointerUp={press(k, false)}
      onPointerLeave={press(k, false)}
      onPointerCancel={press(k, false)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label}
      data-testid={`touch-${k}`}
    >
      <Icon size={24} />
    </button>
  );

  const outcomeText = result ? (result.outcome === 'win' ? 'YOU WIN!' : result.outcome === 'lose' ? 'YOU LOSE' : 'DRAW') : '';

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-10 md:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link to={mode === 'league' ? '/league' : mode === 'global' ? '/leaderboard' : '/'} className="nav-link flex items-center gap-2" data-testid="game-back-link">
          <ArrowLeft size={14} /> {mode === 'league' ? 'League' : mode === 'global' ? 'Standings' : 'Home'}
        </Link>
        <div className="label" data-testid="game-mode-label">
          {mode === 'league' ? `Week ${setup.leagueRound + 1}` : mode === 'global' ? (setup.opp.is_bot ? 'League · Bot Rival' : 'League · Wallet vs Wallet') : 'Quick Match'} &middot; {setup.arena.name}
        </div>
      </div>

      <div className="frame-card grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 md:px-6" data-testid="scoreboard">
        <div className="flex items-center gap-3">
          <PixelSprite bitmap={setup.playerChar.bitmap} scale={2} ink="var(--ink)" />
          <div className="font-pixel truncate text-[10px] md:text-[12px]">{playerName}</div>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <div className="font-pixel text-[22px] md:text-[30px]" data-testid="score-player">{hud.score[0]}</div>
          <div className="border-2 border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-[var(--paper)]">
            <div className={`font-pixel text-[14px] md:text-[18px] ${hud.time <= 10 && hud.phase === 'play' ? 'blink' : ''}`} data-testid="timer">
              {Math.floor(hud.time / 60)}:{String(hud.time % 60).padStart(2, '0')}
            </div>
          </div>
          <div className="font-pixel text-[22px] md:text-[30px]" data-testid="score-bot">{hud.score[1]}</div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <div className="font-pixel truncate text-right text-[10px] md:text-[12px]" data-testid="opponent-name">{oppName}</div>
          <div className="bg-[var(--ink)] p-[2px]">
            <PixelSprite bitmap={setup.botChar.bitmap} scale={2} ink="var(--paper)" flip />
          </div>
        </div>
      </div>

      <div className="relative mt-4 border-[3px] border-[var(--ink)] shadow-[8px_8px_0_rgba(28,28,34,0.15)]">
        <canvas ref={canvasRef} width={W} height={H} className="game-canvas" data-testid="game-canvas" />

        {result && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(239,237,228,0.9)] p-4" data-testid="result-overlay">
            <div className="frame-card w-full max-w-md p-6 text-center md:p-10">
              <div className="label">Full Time</div>
              <h2 className="font-pixel mt-4 text-[20px] md:text-[26px]" data-testid="result-title">{outcomeText}</h2>
              <div className="font-pixel mt-5 text-[30px] md:text-[40px]" data-testid="result-score">{result.ps} - {result.bs}</div>
              <div className="font-mono mt-2 text-[11px] tracking-widest text-[var(--ink-soft)]">{playerName} vs {oppName}</div>
              <div className="font-mono mt-4 flex items-center justify-center gap-2 text-[11px] tracking-widest" data-testid="result-save-status">
                {saving ? (<><Loader2 size={12} className="animate-spin" /> SAVING RESULT</>) : saveErr ? (<span className="text-red-700">{saveErr}</span>) : (<>+{result.pts} PTS SAVED &middot; TOTAL {user.points} PTS</>)}
              </div>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {mode === 'league' ? (
                  <button onClick={goLeague} className="btn-ink" data-testid="result-league-btn" disabled={saving}>
                    BACK TO LEAGUE <ArrowRight size={14} />
                  </button>
                ) : (
                  <button onClick={restart} className="btn-ink" data-testid="result-restart-btn" disabled={saving}>
                    <RotateCcw size={14} /> {mode === 'global' ? 'NEXT RIVAL' : 'PLAY AGAIN'}
                  </button>
                )}
                <Link to="/leaderboard" className="btn-outline" data-testid="result-standings-btn">STANDINGS</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="font-mono hidden text-[11px] tracking-wider text-[var(--ink-soft)] md:block">
          <span className="kbd">&larr;</span> <span className="kbd">&rarr;</span> move &nbsp; <span className="kbd">&uarr;</span> jump &nbsp; <span className="kbd">X</span> kick &nbsp; <span className="kbd">P</span> pause
        </div>
        <div className="font-mono text-[11px] tracking-wider text-[var(--ink-soft)] md:hidden">Landscape recommended</div>
        <button onClick={togglePause} className="btn-outline !px-4 !py-3 !text-[10px]" data-testid="pause-btn" disabled={!!result}>
          {hud.paused ? <Play size={12} /> : <Pause size={12} />} {hud.paused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between md:hidden" data-testid="touch-controls">
        <div className="flex gap-3">
          {touchBtn('left', ChevronLeft, 'Left')}
          {touchBtn('right', ChevronRight, 'Right')}
        </div>
        <div className="flex gap-3">
          {touchBtn('kick', Zap, 'Kick')}
          {touchBtn('jump', ChevronUp, 'Jump')}
        </div>
      </div>
    </div>
  );
};

// ---- matchmaking screen: random 5-10s search, then reveal ----
const Matchmaking = ({ setup, user, onDone }) => {
  const [elapsed, setElapsed] = useState(0);
  const [found, setFound] = useState(false);
  const totalRef = useRef(5 + Math.random() * 5); // seconds
  const online = useRef(120 + Math.floor(Math.random() * 300));

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      setElapsed(t);
      if (t >= totalRef.current) {
        setFound(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!found) return;
    const id = setTimeout(onDone, 1800);
    return () => clearTimeout(id);
  }, [found, onDone]);

  const dots = '.'.repeat((Math.floor(elapsed * 2) % 3) + 1);
  const pct = Math.min(100, (elapsed / totalRef.current) * 100);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[720px] items-center px-5" data-testid="matchmaking-screen">
      <div className="frame-card w-full p-8 text-center md:p-12">
        <div className="label mb-4">{setup.arena.name} &middot; {online.current} players online</div>
        <h2 className="font-pixel text-[16px] leading-relaxed md:text-[20px]" data-testid="matchmaking-title">
          {found ? 'OPPONENT FOUND' : `FINDING PLAYER${dots}`}
        </h2>

        <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <PixelSprite bitmap={setup.playerChar.bitmap} scale={6} ink="var(--ink)" />
            <div className="font-pixel text-[11px]">@{user.username}</div>
          </div>
          <div className="font-pixel text-[18px] text-[var(--ink-soft)]">VS</div>
          <div className="flex flex-col items-center gap-3">
            <div className={`bg-[var(--ink)] p-1 ${found ? '' : 'opacity-20'}`}>
              {found ? (
                <PixelSprite bitmap={setup.botChar.bitmap} scale={6} ink="var(--paper)" flip />
              ) : (
                <div className="flex h-[84px] w-[72px] items-center justify-center font-pixel text-[26px] text-[var(--paper)] blink">?</div>
              )}
            </div>
            <div className="font-pixel text-[11px]" data-testid="matchmaking-opponent">{found ? `@${setup.opp.username}` : '???'}</div>
          </div>
        </div>

        <div className="mt-10 h-3 w-full border-2 border-[var(--ink)] bg-[var(--paper)]">
          <div className="h-full bg-[var(--ink)]" style={{ width: `${pct}%`, transition: 'width 120ms linear' }} />
        </div>
        <div className="font-mono mt-3 flex justify-between text-[11px] tracking-widest text-[var(--ink-soft)]">
          <span>{found ? 'MATCH STARTING' : 'SEARCHING NEARBY LOBBIES'}</span>
          <span>{elapsed.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
};

// ---- page wrapper: gate + setup fetch ----
const Game = () => {
  const [params] = useSearchParams();
  const { ready, user, setUser, loading } = useAuth();
  const modeParam = params.get('mode');
  const mode = modeParam === 'league' || modeParam === 'global' ? modeParam : 'quick';
  const [setup, setSetup] = useState(null);
  const [matched, setMatched] = useState(false);
  const [err, setErr] = useState('');
  const onMatched = useCallback(() => setMatched(true), []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        let opp;
        let arenaId;
        let leagueRound = null;
        if (mode === 'league') {
          const { data: league } = await api.get('/league');
          if (league.finished) {
            setErr('Season is complete. Start a new season from the league page.');
            return;
          }
          leagueRound = league.round;
          opp = league.opponents[ROUNDS[league.round][0][1] - 1];
          arenaId = arenaForRound(league.round);
        } else if (mode === 'global') {
          const { data } = await api.get('/global/opponent');
          opp = data;
          arenaId = Math.random() < 0.5 ? 'paper' : 'inverted';
        } else {
          const { data } = await api.get('/opponent');
          opp = data;
          arenaId = params.get('arena') || (Math.random() < 0.5 ? 'paper' : 'inverted');
        }
        if (!cancelled) {
          setSetup({
            opp,
            arena: ARENAS[arenaId] || ARENAS.paper,
            playerChar: getCharacter(user.character_id),
            botChar: getCharacter(opp.char_id),
            leagueRound,
          });
        }
      } catch (e) {
        if (!cancelled) setErr('Could not set up the match.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mode]);

  if (loading) {
    return <main className="paper-grid flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin" /></main>;
  }
  if (!ready) {
    return (
      <main className="paper-grid min-h-screen">
        <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-10">
          <WalletGate title="Connect your wallet to kick off." subtitle="Matches are only available to signed-in wallets so every result can be saved to your profile and the leaderboard." />
        </div>
      </main>
    );
  }
  return (
    <main className="paper-grid min-h-screen">
      {err && (
        <div className="mx-auto max-w-[1100px] px-5 py-20 text-center">
          <div className="font-mono text-[12px] tracking-wider text-red-700" data-testid="game-error">{err}</div>
          <Link to="/league" className="btn-outline mt-8">GO TO LEAGUE</Link>
        </div>
      )}
      {!err && !setup && (
        <div className="font-mono flex min-h-[60vh] items-center justify-center gap-3 text-[12px] tracking-widest text-[var(--ink-soft)]"><Loader2 className="animate-spin" size={14} /> CONNECTING TO LOBBY</div>
      )}
      {setup && !matched && <Matchmaking setup={setup} user={user} onDone={onMatched} />}
      {setup && matched && <Match setup={setup} mode={mode} user={user} setUser={setUser} />}
    </main>
  );
};

export default Game;
