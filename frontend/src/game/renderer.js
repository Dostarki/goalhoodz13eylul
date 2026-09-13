import { W, H, GROUND, GOAL_W, BAR_Y, BAR_T, HEAD_OFF, footPos } from './engine';
import { BALL_BITMAP } from '../mock';

const PX = 4; // karakter piksel olcegi

function drawBitmap(ctx, bitmap, x, y, scale, color, invert, bg) {
  if (invert) {
    // ters stil: dolu murekkep blok, ozellikler kagit renginde
    ctx.fillStyle = color;
    ctx.fillRect(x, y, bitmap[0].length * scale, bitmap.length * scale);
    ctx.fillStyle = bg;
  } else {
    ctx.fillStyle = color;
  }
  for (let r = 0; r < bitmap.length; r++) {
    const row = bitmap[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '#') ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

function drawDither(ctx, x, y, w, h, color, size = 4) {
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h; yy += size) {
    const off = ((yy - y) / size) % 2 === 0 ? 0 : size;
    for (let xx = x + off; xx < x + w; xx += size * 2) {
      ctx.fillRect(xx, yy, size, size);
    }
  }
}

function drawGoal(ctx, side, ink, bg) {
  const x0 = side === 'left' ? 0 : W - GOAL_W;
  ctx.save();
  // ag
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  for (let x = x0 + 8; x < x0 + GOAL_W; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, BAR_Y + BAR_T);
    ctx.lineTo(x, GROUND);
    ctx.stroke();
  }
  for (let y = BAR_Y + BAR_T + 12; y < GROUND; y += 12) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + GOAL_W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // ust direk
  ctx.fillStyle = ink;
  ctx.fillRect(x0, BAR_Y, GOAL_W, BAR_T);
  // on direk
  const px = side === 'left' ? x0 + GOAL_W - BAR_T : x0;
  ctx.fillRect(px, BAR_Y, BAR_T, GROUND - BAR_Y);
  // arka duvar
  const bx = side === 'left' ? 0 : W - 4;
  ctx.fillRect(bx, BAR_Y, 4, GROUND - BAR_Y);
  ctx.restore();
}

function drawCrowd(ctx, ink, frame, excited) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = ink;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const y = 46 + r * 14;
    for (let i = 0; i < 40; i++) {
      const x = 10 + i * 20 + (r % 2) * 10;
      const seed = (i * 7 + r * 13) % 5;
      const jump = excited ? (Math.floor(frame / 6) + seed) % 2 === 0 : (Math.floor(frame / 20) + seed) % 5 === 0;
      const yy = y - (jump ? 4 : 0);
      ctx.fillRect(x, yy, 6, 6);
      ctx.fillRect(x - 2, yy + 6, 10, 6);
    }
  }
  ctx.globalAlpha = 1;
  // tribun cizgisi
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 96, W, 2);
  ctx.restore();
}

function drawPlayer(ctx, pl, bitmap, ink, bg, invert, name) {
  const headCX = pl.x;
  const headCY = pl.y - HEAD_OFF;
  const bw = bitmap[0].length * PX;
  const bh = bitmap.length * PX;

  // golge
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ink;
  const airH = Math.max(0, GROUND - pl.y);
  const sw = Math.max(22, 44 - airH * 0.12);
  ctx.fillRect(pl.x - sw / 2, GROUND - 2, sw, 4);
  ctx.restore();

  // bacaklar
  ctx.fillStyle = ink;
  const back = pl.facing === 1 ? -14 : 6;
  ctx.fillRect(pl.x + back, pl.y - 14, 8, 14);
  if (pl.kick > 0) {
    const f = footPos(pl);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(pl.x + pl.facing * 4, pl.y - 14);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();
    ctx.fillRect(f.x - 6, f.y - 4, 12, 8);
  } else {
    const front = pl.facing === 1 ? 6 : -14;
    ctx.fillRect(pl.x + front, pl.y - 14, 8, 14);
    // ayakkabilar
    ctx.fillRect(pl.x + front + (pl.facing === 1 ? 0 : -4), pl.y - 4, 12, 4);
    ctx.fillRect(pl.x + back + (pl.facing === 1 ? -4 : 0), pl.y - 4, 12, 4);
  }

  // kafa
  ctx.save();
  ctx.translate(headCX, headCY);
  if (pl.facing === -1) ctx.scale(-1, 1);
  drawBitmap(ctx, bitmap, -bw / 2, -bh / 2 - 2, PX, ink, invert, bg);
  ctx.restore();

  // isim
  ctx.save();
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.7;
  ctx.fillText(name, pl.x, headCY - bh / 2 - 12);
  ctx.restore();
}

function drawBall(ctx, ball, ink, bg) {
  // golge
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ink;
  const airH = Math.max(0, GROUND - ball.y - ball.r);
  const sw = Math.max(8, 24 - airH * 0.06);
  ctx.fillRect(ball.x - sw / 2, GROUND - 2, sw, 3);
  ctx.restore();

  ctx.save();
  ctx.translate(ball.x, ball.y);
  const q = Math.round(ball.rot / (Math.PI / 2)) * (Math.PI / 2);
  ctx.rotate(q);
  const s = 3;
  // ic dolgu (kagit) sonra murekkep desen
  ctx.fillStyle = bg;
  ctx.fillRect(-9, -9, 18, 18);
  drawBitmap(ctx, BALL_BITMAP, -12, -12, s, ink, false, bg);
  ctx.restore();
}

export function render(ctx, st, opts) {
  const { arena, playerBitmap, botBitmap, playerName, botName } = opts;
  const ink = arena.ink;
  const bg = arena.bg;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  // titreme
  if (st.shake > 0) {
    ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
  }

  // zemin
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // arka plan grid
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND);
    ctx.stroke();
  }
  for (let y = 0; y <= GROUND; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  drawCrowd(ctx, ink, st.frame, st.phase === 'goal');

  // orta cizgi ve daire
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 110);
  ctx.lineTo(W / 2, GROUND);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(W / 2, GROUND, 70, Math.PI, 0);
  ctx.stroke();
  ctx.restore();

  // zemin cizgisi + dither
  ctx.fillStyle = ink;
  ctx.fillRect(0, GROUND, W, 3);
  ctx.save();
  ctx.globalAlpha = 0.35;
  drawDither(ctx, 0, GROUND + 3, W, H - GROUND - 3, ink, 4);
  ctx.restore();

  drawGoal(ctx, 'left', ink, bg);
  drawGoal(ctx, 'right', ink, bg);

  drawPlayer(ctx, st.p, playerBitmap, ink, bg, false, playerName);
  drawPlayer(ctx, st.b, botBitmap, ink, bg, true, botName);
  drawBall(ctx, st.ball, ink, bg);

  // metinler
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (st.phase === 'countdown') {
    const n = Math.ceil(st.phaseT - 0.4);
    const txt = n <= 0 ? 'BASLA!' : String(n);
    ctx.fillStyle = ink;
    ctx.font = `${n <= 0 ? 36 : 48}px "Press Start 2P", monospace`;
    ctx.fillText(txt, W / 2, 200);
  }
  if (st.phase === 'goal') {
    const who = st.lastScorer === 0 ? playerName : botName;
    ctx.fillStyle = ink;
    ctx.font = '52px "Press Start 2P", monospace';
    ctx.fillText('GOL!', W / 2, 190);
    ctx.font = '14px "Share Tech Mono", monospace';
    ctx.fillText(`${who} skoru buldu`, W / 2, 236);
  }
  if (st.paused) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ink;
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.fillText('DURAKLATILDI', W / 2, 210);
    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillText('Devam etmek icin P tusuna bas', W / 2, 250);
    ctx.restore();
  }

  // 1-bit ters cevirme flasi
  if (st.flash > 0 && Math.floor(st.flash * 8) % 2 === 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.restore();
  }

  ctx.restore();
}
