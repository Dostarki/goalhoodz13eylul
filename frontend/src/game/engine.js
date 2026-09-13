// Kafa topu fizik motoru + Cok Zor bot yapay zekasi
// Sabit adim: 60 Hz. Koordinat sistemi 800x450.

export const W = 800;
export const H = 450;
export const GROUND = 392;
export const GOAL_W = 72;
export const GOAL_H = 150;
export const BAR_T = 6;
export const BAR_Y = GROUND - GOAL_H;

const GRAV = 0.55;
export const BALL_R = 12;
const P_SPEED = 5.0;
const AI_SPEED = 5.6;
const JUMP_V = -12.5;
export const HEAD_R = 26;
export const HEAD_OFF = 44;
const BODY_R = 13;
const BODY_OFF = 14;
const KICK_FRAMES = 14;
const MAX_SPEED = 22;

// NFT trait bonuses (fractions, e.g. 0.08). Only the human player gets them.
export const NO_MODS = { speed: 0, agility: 0, shooting: 0, attack: 0, dribbling: 0, passing: 0, defense: 0, physical: 0, stamina: 0 };
export const modsFromStats = (stats = {}) => {
  const m = { ...NO_MODS };
  Object.entries(stats).forEach(([k, v]) => {
    const key = k.toLowerCase();
    if (key in m) m[key] = v / 100;
  });
  return m;
};
const staminaActive = (st) => st.time < st.duration / 3;

const makePlayer = (x, facing) => ({
  x,
  y: GROUND,
  vx: 0,
  vy: 0,
  facing,
  onGround: true,
  kick: 0,
  kickHit: false,
  cool: 0,
  homeX: x,
  jumpLatch: false,
  kickLatch: false,
  noise: 0,
  noiseT: 0,
  hesitate: 0,
  hold: 40,
});

export function createMatch({ duration = 60, mods = NO_MODS } = {}) {
  return {
    time: duration,
    duration,
    mods: { ...NO_MODS, ...mods },
    phase: 'countdown', // countdown | play | goal | end
    phaseT: 3.4,
    score: [0, 0],
    ball: { x: W / 2, y: 170, vx: 0, vy: 0, r: BALL_R, rot: 0 },
    p: makePlayer(200, 1),
    b: makePlayer(600, -1),
    events: [],
    shake: 0,
    flash: 0,
    lastScorer: null,
    frame: 0,
    paused: false,
  };
}

const resetPositions = (st) => {
  st.ball.x = W / 2;
  st.ball.y = 170;
  st.ball.vx = 0;
  st.ball.vy = 0;
  [st.p, st.b].forEach((pl) => {
    pl.x = pl.homeX;
    pl.y = GROUND;
    pl.vx = 0;
    pl.vy = 0;
    pl.kick = 0;
    pl.onGround = true;
    pl.hold = 40;
  });
};

export const footPos = (pl) => {
  const t = pl.kick / KICK_FRAMES;
  const s = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
  return {
    x: pl.x + pl.facing * (8 + 32 * s),
    y: pl.y - 6 - 30 * s,
    s,
  };
};

function controlPlayer(pl, input, st) {
  const m = st.mods;
  const speed = P_SPEED * (1 + m.speed + (staminaActive(st) ? m.stamina : 0));
  pl.vx = 0;
  if (input.left) pl.vx = -speed;
  if (input.right) pl.vx = speed;
  if (input.jump && pl.onGround && !pl.jumpLatch) {
    pl.vy = JUMP_V * (1 + m.agility * 0.8);
    pl.onGround = false;
    st.events.push('jump');
  }
  pl.jumpLatch = !!input.jump;
  if (input.kick && pl.kick === 0 && pl.cool === 0 && !pl.kickLatch) {
    pl.kick = 1;
    pl.kickHit = false;
    st.events.push('swing');
  }
  pl.kickLatch = !!input.kick;
}

function physicsPlayer(pl) {
  pl.vy += GRAV;
  pl.y += pl.vy;
  pl.x += pl.vx;
  pl.x = Math.max(HEAD_R, Math.min(W - HEAD_R, pl.x));
  if (pl.y >= GROUND) {
    pl.y = GROUND;
    pl.vy = 0;
    pl.onGround = true;
  }
  if (pl.kick > 0) {
    pl.kick++;
    if (pl.kick > KICK_FRAMES) {
      pl.kick = 0;
      pl.cool = 6;
    }
  }
  if (pl.cool > 0) pl.cool--;
}

function separatePlayers(a, b, m) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = HEAD_R * 2 - 4;
  if (Math.abs(dx) < min && Math.abs(dy) < HEAD_OFF + HEAD_R) {
    const push = min - Math.abs(dx);
    const wa = 0.5 * (1 - m.physical);
    const dir = dx >= 0 ? 1 : -1;
    a.x -= push * wa * dir;
    b.x += push * (1 - wa) * dir;
    a.x = Math.max(HEAD_R, Math.min(W - HEAD_R, a.x));
    b.x = Math.max(HEAD_R, Math.min(W - HEAD_R, b.x));
  }
}

function collideCircle(ball, cx, cy, cr, pvx, pvy, rest) {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const d = Math.hypot(dx, dy);
  const min = cr + ball.r;
  if (d >= min || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  ball.x = cx + nx * min;
  ball.y = cy + ny * min;
  let rvx = ball.vx - pvx;
  let rvy = ball.vy - pvy;
  const dot = rvx * nx + rvy * ny;
  if (dot < 0) {
    rvx -= (1 + rest) * dot * nx;
    rvy -= (1 + rest) * dot * ny;
  }
  ball.vx = rvx + pvx * 0.8;
  ball.vy = rvy + pvy * 0.8;
  const sp = ball.vx * nx + ball.vy * ny;
  if (sp < 3.5) {
    ball.vx += nx * (3.5 - sp);
    ball.vy += ny * (3.5 - sp);
  }
  return true;
}

function collideBar(ball, x0, x1, y0, y1) {
  const cx = Math.max(x0, Math.min(x1, ball.x));
  const cy = Math.max(y0, Math.min(y1, ball.y));
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= ball.r || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  ball.x = cx + nx * ball.r;
  ball.y = cy + ny * ball.r;
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) {
    ball.vx -= 1.7 * dot * nx;
    ball.vy -= 1.7 * dot * ny;
  }
  return true;
}

function playerBallInteraction(pl, ball, st, m = NO_MODS) {
  // kafa (defense: larger blocking radius, passing: livelier header)
  if (collideCircle(ball, pl.x, pl.y - HEAD_OFF, HEAD_R * (1 + m.defense * 0.6), pl.vx, pl.vy, 0.92 * (1 + m.passing * 0.5))) {
    st.events.push('head');
  }
  // govde (physical: harder body bounce)
  if (collideCircle(ball, pl.x, pl.y - BODY_OFF, BODY_R, pl.vx, pl.vy, 0.6 * (1 + m.physical))) {
    st.events.push('bounce');
  }
  // vurus (shooting/attack: power, dribbling: ball keeps more of your momentum)
  if (pl.kick > 0 && !pl.kickHit) {
    const f = footPos(pl);
    if (f.s > 0.35 && Math.hypot(ball.x - f.x, ball.y - f.y) < 18 + ball.r) {
      const power = (12 + 5 * f.s) * (1 + m.shooting + m.attack * 0.5);
      ball.vx = pl.facing * power + pl.vx * 0.4 * (1 + m.dribbling * 2);
      ball.vy = -5 - 7 * f.s - (pl.onGround ? 0 : 2);
      pl.kickHit = true;
      st.events.push('kick');
    }
  }
}

function physicsBall(ball, st) {
  ball.vy += GRAV;
  ball.vx *= 0.997;
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > MAX_SPEED) {
    ball.vx = (ball.vx / sp) * MAX_SPEED;
    ball.vy = (ball.vy / sp) * MAX_SPEED;
  }
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.rot += ball.vx * 0.03;

  if (ball.y + ball.r > GROUND) {
    ball.y = GROUND - ball.r;
    if (Math.abs(ball.vy) > 2.2) st.events.push('bounce');
    ball.vy = -ball.vy * 0.72;
    ball.vx *= 0.96;
    if (Math.abs(ball.vy) < 1.2) ball.vy = 0;
    if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
  }
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = -ball.vx * 0.8;
  }
  if (ball.x + ball.r > W) {
    ball.x = W - ball.r;
    ball.vx = -ball.vx * 0.8;
  }
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = -ball.vy * 0.8;
  }
  // ust direkler
  if (collideBar(ball, 0, GOAL_W, BAR_Y, BAR_Y + BAR_T)) st.events.push('post');
  if (collideBar(ball, W - GOAL_W, W, BAR_Y, BAR_Y + BAR_T)) st.events.push('post');
}

function predictBall(ball, frames) {
  const pts = [];
  let { x, y, vx, vy } = ball;
  for (let i = 0; i < frames; i++) {
    vy += GRAV;
    vx *= 0.997;
    x += vx;
    y += vy;
    if (y + BALL_R > GROUND) {
      y = GROUND - BALL_R;
      vy = -vy * 0.72;
      vx *= 0.96;
    }
    if (x - BALL_R < 0) {
      x = BALL_R;
      vx = -vx * 0.8;
    }
    if (x + BALL_R > W) {
      x = W - BALL_R;
      vx = -vx * 0.8;
    }
    if (y - BALL_R < 0) {
      y = BALL_R;
      vy = -vy * 0.8;
    }
    pts.push({ x, y, vx, vy, t: i });
  }
  return pts;
}

// ---- Cok Zor bot ----
function aiControl(st) {
  const b = st.b;
  const ball = st.ball;
  const headY = GROUND - HEAD_OFF;

  // baslangic beklemesi (adil kickoff)
  if (b.hold > 0) {
    b.hold--;
    b.vx = 0;
    return;
  }

  // gurultu (insanimsi kucuk sapmalar)
  if (b.noiseT <= 0) {
    b.noise = (Math.random() - 0.5) * 14;
    b.noiseT = 18 + Math.floor(Math.random() * 20);
    // nadiren tereddut
    if (Math.random() < 0.08) b.hesitate = 6 + Math.floor(Math.random() * 8);
  }
  b.noiseT--;
  if (b.hesitate > 0) {
    b.hesitate--;
    b.vx *= 0.5;
    b.jumpLatch = b.jumpLatch;
    return;
  }

  const pred = predictBall(ball, 70);
  const onMySide = ball.x > W / 2 - 40;
  const coming = ball.vx > 0.4;
  let target;

  if (onMySide || coming) {
    const pt = pred.find((q) => q.vy > 0 && q.y > headY - 70 && q.x > W / 2 - 60) || pred[pred.length - 1];
    // topun hemen sagina gec ki kafa/vurus sola (rakip kaleye) gitsin
    target = pt.x + 24;
    // top kaleme cok yakinsa araya gir
    if (ball.x > W - GOAL_W - 70 && ball.y > BAR_Y - 30) target = Math.min(W - HEAD_R - 2, ball.x + 38);
    // top hemen ustumdeyse hafif geri cekil
    if (Math.abs(ball.x - b.x) < 10 && ball.y < headY - 40) target = b.x + 20;
  } else {
    // savunma pozisyonu: top ile kale arasinda kal, topu takip et
    target = Math.max(W / 2 + 70, W - 175 + (ball.x - W / 2) * 0.3);
  }
  target += b.noise;
  target = Math.max(HEAD_R, Math.min(W - HEAD_R, target));

  const dx = target - b.x;
  b.vx = Math.abs(dx) < 3 ? 0 : Math.sign(dx) * Math.min(AI_SPEED, Math.abs(dx) * 0.6);

  const relX = ball.x - b.x;
  // ziplama kararlari
  if (b.onGround) {
    const high = ball.y < headY - 28 && ball.y > headY - 170;
    const near = Math.abs(relX) < 75;
    const falling = ball.vy > -1.5;
    const shotIncoming = ball.vx > 5 && ball.x > W / 2 && ball.y < headY - 10 && relX > -140 && relX < 60;
    if ((near && high && falling) || shotIncoming) {
      b.vy = JUMP_V;
      b.onGround = false;
      st.events.push('jump');
    }
  }
  // vurus karari: top solumda, ayak menzilinde ve alcak
  if (b.kick === 0 && b.cool === 0) {
    const inX = relX < -8 && relX > -58;
    const inY = ball.y > GROUND - 75 && ball.y < GROUND + 4;
    const clearNeeded = ball.x > W - 200; // kale onunde: hemen uzaklastir
    if ((inX && inY) || (clearNeeded && inX && ball.y > GROUND - 100)) {
      b.kick = 1;
      b.kickHit = false;
      st.events.push('swing');
    }
  }
}

function checkGoal(st) {
  const ball = st.ball;
  if (ball.y - ball.r > BAR_Y + BAR_T) {
    if (ball.x + ball.r < GOAL_W) return 1; // bot skoru
    if (ball.x - ball.r > W - GOAL_W) return 0; // oyuncu skoru
  }
  return -1;
}

export function step(st, input) {
  st.events.length = 0;
  st.frame++;
  if (st.shake > 0) st.shake *= 0.85;
  if (st.shake < 0.3) st.shake = 0;
  if (st.flash > 0) st.flash -= 1 / 40;

  if (st.paused || st.phase === 'end') return;

  if (st.phase === 'countdown') {
    st.phaseT -= 1 / 60;
    if (st.phaseT <= 0) {
      st.phase = 'play';
      st.events.push('whistle');
    }
    return;
  }

  if (st.phase === 'goal') {
    st.phaseT -= 1 / 60;
    physicsBall(st.ball, st);
    if (st.phaseT <= 0) {
      resetPositions(st);
      if (st.time <= 0) {
        st.phase = 'end';
        st.events.push('end');
      } else {
        st.phase = 'play';
      }
    }
    return;
  }

  // play
  st.time -= 1 / 60;
  if (st.time <= 0) {
    st.time = 0;
    st.phase = 'end';
    st.events.push('end');
    return;
  }

  controlPlayer(st.p, input, st);
  aiControl(st);
  physicsPlayer(st.p);
  physicsPlayer(st.b);
  separatePlayers(st.p, st.b, st.mods);
  physicsBall(st.ball, st);
  playerBallInteraction(st.p, st.ball, st, st.mods);
  playerBallInteraction(st.b, st.ball, st);

  const g = checkGoal(st);
  if (g >= 0) {
    st.score[g]++;
    st.lastScorer = g;
    st.phase = 'goal';
    st.phaseT = 1.7;
    st.shake = 14;
    st.flash = 1;
    st.events.push('goal');
  }
}
