import { GOAL_HALF, HH, HW, MALLET_R, PUCK_R, RINK } from './hockeyEngine';
import { drawUnit } from './catArtilleryDraw';

const CY = (RINK.t + RINK.b) / 2;
const CX = HW / 2;
const SCRATCHES = Array.from({ length: 46 }, (_, i) => {
  const x = RINK.l + 20 + ((i * 197) % (RINK.r - RINK.l - 40));
  const y = RINK.t + 20 + ((i * 113) % (RINK.b - RINK.t - 40));
  const a = ((i * 37) % 180) * (Math.PI / 180);
  const len = 14 + ((i * 29) % 40);
  return { x, y, dx: Math.cos(a) * len, dy: Math.sin(a) * len };
});

export function drawRink(ctx, sideColors, goalFlash) {
  ctx.fillStyle = '#0d1440';
  ctx.fillRect(0, 0, HW, HH);
  const ice = ctx.createLinearGradient(0, RINK.t, 0, RINK.b);
  ice.addColorStop(0, '#f4fbff');
  ice.addColorStop(1, '#d6ecfb');
  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.roundRect(RINK.l, RINK.t, RINK.r - RINK.l, RINK.b - RINK.t, 46);
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120, 170, 220, 0.22)';
  ctx.lineWidth = 1;
  SCRATCHES.forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.dx, s.y + s.dy);
    ctx.stroke();
  });
  ctx.strokeStyle = '#e5484d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(CX, RINK.t);
  ctx.lineTo(CX, RINK.b);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.55)';
  ctx.lineWidth = 4;
  [RINK.l + (CX - RINK.l) * 0.45, RINK.r - (RINK.r - CX) * 0.45].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, RINK.t);
    ctx.lineTo(x, RINK.b);
    ctx.stroke();
  });
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, CY, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(CX, CY, 7, 0, Math.PI * 2);
  ctx.fill();
  [0, 1].forEach((side) => {
    const x = side === 0 ? RINK.l : RINK.r;
    ctx.fillStyle = `${sideColors[side]}33`;
    ctx.strokeStyle = sideColors[side];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, CY, GOAL_HALF + 26, side === 0 ? -Math.PI / 2 : Math.PI / 2, side === 0 ? Math.PI / 2 : (Math.PI * 3) / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();

  ctx.strokeStyle = '#c9d8f0';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(RINK.l, RINK.t, RINK.r - RINK.l, RINK.b - RINK.t, 46);
  ctx.stroke();

  [0, 1].forEach((side) => {
    const x = side === 0 ? RINK.l - 26 : RINK.r;
    const glow = goalFlash?.side === side ? goalFlash.k : 0;
    ctx.save();
    ctx.shadowColor = sideColors[side];
    ctx.shadowBlur = 12 + glow * 30;
    ctx.fillStyle = '#060a26';
    ctx.fillRect(x, CY - GOAL_HALF, 26, GOAL_HALF * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    for (let y = CY - GOAL_HALF + 8; y < CY + GOAL_HALF; y += 10) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 26, y);
      ctx.stroke();
    }
    for (let k = 6; k < 26; k += 8) {
      ctx.beginPath();
      ctx.moveTo(x + k, CY - GOAL_HALF);
      ctx.lineTo(x + k, CY + GOAL_HALF);
      ctx.stroke();
    }
    ctx.fillStyle = sideColors[side];
    const postX = side === 0 ? RINK.l - 4 : RINK.r - 4;
    ctx.fillRect(postX, CY - GOAL_HALF - 6, 8, 12);
    ctx.fillRect(postX, CY + GOAL_HALF - 6, 8, 12);
  });
}

export function drawPuck(ctx, puck, time) {
  const speed = Math.hypot(puck.vx, puck.vy);
  if (speed > 500) {
    const k = Math.min(1, (speed - 500) / 900);
    for (let i = 1; i <= 4; i += 1) {
      ctx.globalAlpha = 0.12 * k * (5 - i);
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(puck.x - puck.vx * 0.012 * i, puck.y - puck.vy * 0.012 * i, PUCK_R * (1 - i * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(20, 40, 80, 0.25)';
  ctx.beginPath();
  ctx.ellipse(puck.x + 3, puck.y + 5, PUCK_R, PUCK_R * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(puck.x, puck.y);
  puck.angle = (puck.angle || 0) + (puck.spin || 0) * 0.1 + speed * 0.00004;
  ctx.rotate(puck.angle + time * 0);
  ctx.fillStyle = '#1b2350';
  ctx.beginPath();
  ctx.arc(0, 0, PUCK_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, PUCK_R - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffb38a';
  ctx.beginPath();
  ctx.ellipse(-1, 0, 7.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(10, -4.5);
  ctx.lineTo(10, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1b2350';
  ctx.beginPath();
  ctx.arc(-5, -1, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMallet(ctx, m, player, color) {
  ctx.fillStyle = 'rgba(20, 40, 80, 0.28)';
  ctx.beginPath();
  ctx.ellipse(m.x + 4, m.y + 7, MALLET_R, MALLET_R * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(m.x - 10, m.y - 12, 4, m.x, m.y, MALLET_R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(m.x, m.y, MALLET_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(m.x, m.y, MALLET_R - 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(5, 3, 32, 0.25)';
  ctx.beginPath();
  ctx.arc(m.x, m.y, MALLET_R * 0.68, 0, Math.PI * 2);
  ctx.fill();
  if (player) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(m.x, m.y, MALLET_R * 0.68, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(m.x, m.y + 15);
    ctx.scale(0.82, 0.82);
    drawUnit(ctx, { x: 0, y: 0, alive: true, flash: 0, face: m.side === 0 ? 1 : -1, colors: player.colors }, player.kind, null, false, 0);
    ctx.restore();
  }
}

export function drawSparks(ctx, sparks) {
  sparks.forEach((s) => {
    ctx.globalAlpha = Math.min(1, s.life * 3);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

export function drawMatch(ctx, st, players, sideColors, time) {
  const flash = st.lastGoal && st.flash > 0 ? { side: 1 - st.lastGoal.scorer, k: st.flash / 1.2 } : null;
  drawRink(ctx, sideColors, flash);
  drawSparks(ctx, st.sparks);
  drawPuck(ctx, st.puck, time);
  st.mallets.forEach((m) => drawMallet(ctx, m, players[m.side], sideColors[m.side]));
}
