import { padTicket, TIERS } from '../../lib/early';

const PAPER = '#efede4';
const INK = '#1c1c22';
const SOFT = '#6b6a64';
const ACCENT = '#7fa88b';
export const TICKET_W = 1200;
export const TICKET_H = 630;

const rand = (seed) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const drawBitmap = (ctx, bitmap, x, y, s, color) => {
  ctx.fillStyle = color;
  bitmap.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === '#') ctx.fillRect(x + c * s, y + r * s, s, s);
  });
};

export const loadTicketFonts = () =>
  Promise.all([document.fonts.load('40px "Press Start 2P"'), document.fonts.load('20px "Share Tech Mono"')]).catch(() => {});

export const drawTicket = (canvas, { participant, character, ballBitmap }) => {
  const ctx = canvas.getContext('2d');
  const W = TICKET_W;
  const H = TICKET_H;
  const tier = participant.tier ? TIERS[participant.tier] : null;
  const TIER_COLOR = tier ? tier.color : ACCENT;
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // faint pixel grid
  ctx.fillStyle = 'rgba(28,28,34,0.05)';
  for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 24) ctx.fillRect(0, y, W, 1);

  // scattered accent pixels
  const r = rand(participant.ticket_no * 7 + 13);
  for (let i = 0; i < (tier ? 220 : 120); i++) {
    ctx.fillStyle = r() > 0.5 ? TIER_COLOR : INK;
    ctx.globalAlpha = 0.12 + r() * 0.25;
    ctx.fillRect(Math.floor(r() * W / 8) * 8, Math.floor(r() * H / 8) * 8, 8, 8);
  }
  ctx.globalAlpha = 1;

  // VIP band behind the stub
  if (tier) {
    ctx.fillStyle = TIER_COLOR;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(884, 48, W - 48 - 884, H - 96);
    ctx.globalAlpha = 1;
    ctx.fillStyle = TIER_COLOR;
    ctx.fillRect(24, 24, W - 48, 14);
    ctx.fillRect(24, H - 38, W - 48, 14);
  }

  // outer frame
  ctx.lineWidth = 8;
  ctx.strokeStyle = tier ? TIER_COLOR : INK;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  if (tier) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(40, 40, W - 80, H - 80);
  }

  // stub separator (perforation)
  const stubX = 860;
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(stubX, 40);
  ctx.lineTo(stubX, H - 40);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = PAPER;
  [24, H - 24].forEach((cy) => {
    ctx.beginPath();
    ctx.arc(stubX, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.stroke();
  });

  // header
  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';
  ctx.font = '13px "Share Tech Mono"';
  ctx.fillStyle = SOFT;
  ctx.fillText('SEASON 01  ·  ROBINHOOD CHAIN  ·  1-BIT HEAD SOCCER', 72, 66);
  ctx.fillStyle = TIER_COLOR;
  ctx.fillRect(72, 100, 12, 12);
  ctx.fillStyle = INK;
  ctx.font = '38px "Press Start 2P"';
  ctx.fillText('GOALHOODZ', 100, 92);
  ctx.font = '16px "Press Start 2P"';
  ctx.fillStyle = tier ? TIER_COLOR : SOFT;
  ctx.fillText(tier ? `${tier.label} VIP TICKET` : 'EARLY ACCESS TICKET', 72, 152);

  // divider
  ctx.fillStyle = INK;
  ctx.fillRect(72, 196, 700, 3);

  // holder
  ctx.font = '13px "Share Tech Mono"';
  ctx.fillStyle = SOFT;
  ctx.fillText('HOLDER', 72, 222);
  ctx.font = '30px "Press Start 2P"';
  ctx.fillStyle = INK;
  let name = `@${participant.x_username}`;
  while (ctx.measureText(name).width > 560 && name.length > 4) name = name.slice(0, -2) + '…';
  ctx.fillText(name, 72, 246);

  ctx.font = '13px "Share Tech Mono"';
  ctx.fillStyle = SOFT;
  ctx.fillText('WALLET', 72, 312);
  ctx.font = '20px "Share Tech Mono"';
  ctx.fillStyle = INK;
  ctx.fillText(participant.wallet, 72, 334);

  // meta row
  const meta = [
    ['TICKET NO', padTicket(participant.ticket_no)],
    ['POINTS', String(participant.points)],
    ['ISSUED', new Date(participant.completed_at || participant.created_at).toISOString().slice(0, 10)],
  ];
  meta.forEach(([k, v], i) => {
    const x = 72 + i * 230;
    ctx.font = '13px "Share Tech Mono"';
    ctx.fillStyle = SOFT;
    ctx.fillText(k, x, 400);
    ctx.font = '22px "Press Start 2P"';
    ctx.fillStyle = INK;
    ctx.fillText(v, x, 424);
  });

  // pitch line + striker + ball
  ctx.fillStyle = INK;
  ctx.fillRect(72, 540, 740, 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(72, 540);
  ctx.lineTo(72, 480);
  ctx.lineTo(120, 480);
  ctx.stroke();
  drawBitmap(ctx, character.bitmap, 620, 540 - character.bitmap.length * 8, 8, INK);
  drawBitmap(ctx, ballBitmap, 740, 500, 4, INK);
  ctx.font = '12px "Share Tech Mono"';
  ctx.fillStyle = SOFT;
  ctx.fillText(`STRIKER  ${character.name.toUpperCase()}`, 72, 556);

  // stub
  ctx.save();
  ctx.translate(stubX + 40, H - 60);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '26px "Press Start 2P"';
  ctx.fillStyle = INK;
  ctx.fillText(tier ? 'VIP' : 'ADMIT ONE', 0, 0);
  ctx.restore();

  drawBitmap(ctx, character.bitmap, 950, 80, 14, INK);
  ctx.font = '18px "Press Start 2P"';
  ctx.fillStyle = INK;
  ctx.fillText(padTicket(participant.ticket_no), 940, 320);
  ctx.font = '12px "Share Tech Mono"';
  ctx.fillStyle = SOFT;
  ctx.fillText(tier ? `${tier.label} · EARLY LIST` : 'EARLY LIST', 940, 352);

  // tier stamp
  if (tier) {
    ctx.save();
    ctx.translate(690, 300);
    ctx.rotate(-0.22);
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 6;
    ctx.strokeStyle = TIER_COLOR;
    ctx.strokeRect(-10, -10, 22 * tier.label.length + 40, 66);
    ctx.lineWidth = 2;
    ctx.strokeRect(-2, -2, 22 * tier.label.length + 24, 50);
    ctx.font = '22px "Press Start 2P"';
    ctx.fillStyle = TIER_COLOR;
    ctx.fillText(tier.label, 8, 12);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // barcode
  const br = rand(participant.ticket_no * 31 + 5);
  let bx = 940;
  ctx.fillStyle = INK;
  while (bx < 1140) {
    const w = 2 + Math.floor(br() * 4) * 2;
    if (br() > 0.35) ctx.fillRect(bx, 400, w, 130);
    bx += w + 2;
  }
  ctx.font = '11px "Share Tech Mono"';
  ctx.fillStyle = SOFT;
  ctx.fillText(participant.wallet.slice(2, 26).toUpperCase(), 940, 544);
};
