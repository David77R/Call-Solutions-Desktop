import { BR, COURT, DH, DW, MID, PR, TEAM_COLORS } from './dodgeEngine';
import { drawUnit } from './catArtilleryDraw';

export function drawCourt(ctx, st) {
  ctx.fillStyle = '#0d1440';
  ctx.fillRect(0, 0, DW, DH);
  const icy = st.dyn?.slippery;
  [0, 1].forEach((team) => {
    const x = team === 0 ? COURT.l : MID;
    const g = ctx.createLinearGradient(0, COURT.t, 0, COURT.b);
    g.addColorStop(0, icy ? '#eef8ff' : team === 0 ? '#fde9dc' : '#dcefff');
    g.addColorStop(1, icy ? '#cfe6fa' : team === 0 ? '#f6d2bd' : '#c3e2fb');
    ctx.fillStyle = g;
    ctx.fillRect(x, COURT.t, MID - COURT.l, COURT.b - COURT.t);
  });
  if (icy) {
    ctx.strokeStyle = 'rgba(120, 170, 220, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i += 1) {
      const x = COURT.l + ((i * 211) % (COURT.r - COURT.l));
      const y = COURT.t + ((i * 97) % (COURT.b - COURT.t));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 18 + (i % 4) * 6, y + ((i % 3) - 1) * 8);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(COURT.l, COURT.t, COURT.r - COURT.l, COURT.b - COURT.t);
  ctx.strokeStyle = '#e5484d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(MID, COURT.t);
  ctx.lineTo(MID, COURT.b);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  [MID - 110, MID + 110].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, COURT.t);
    ctx.lineTo(x, COURT.b);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(MID, (COURT.t + COURT.b) / 2, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(COURT.l, COURT.b + 8, COURT.r - COURT.l, DH - COURT.b - 12);
}

function drawCrown(ctx, x, y) {
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 9, y);
  ctx.lineTo(x - 9, y - 8);
  ctx.lineTo(x - 4.5, y - 4);
  ctx.lineTo(x, y - 10);
  ctx.lineTo(x + 4.5, y - 4);
  ctx.lineTo(x + 9, y - 8);
  ctx.lineTo(x + 9, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBallAt(ctx, x, y, golden, r = BR) {
  if (golden) {
    ctx.save();
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 16;
  }
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, golden ? '#fff6c2' : '#ff9a8a');
  g.addColorStop(1, golden ? '#e0a800' : '#d0263b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = golden ? 'rgba(160, 110, 0, 0.6)' : 'rgba(120, 10, 30, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, -0.6, 0.9);
  ctx.stroke();
  if (golden) ctx.restore();
}

export function drawPlayer(ctx, p, controlled, label, time) {
  if (p.out) return;
  const color = TEAM_COLORS[p.team];
  if (p.dashT > 0) {
    ctx.fillStyle = `${color}55`;
    for (let k = 1; k <= 3; k += 1) {
      ctx.beginPath();
      ctx.arc(p.x - (p.vx || 0) * 0.012 * k, p.y - (p.vy || 0) * 0.012 * k + 6, PR * (1 - k * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(20, 30, 60, 0.22)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 12, PR, PR * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = controlled ? 4 : 3;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 12, PR + 1, PR * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (p.armor > 0) {
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, PR + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p.catchT > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 40) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, PR + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  if (p.flash > 0) ctx.globalAlpha = Math.floor(time * 16) % 2 ? 0.4 : 1;
  ctx.translate(p.x, p.y + 6);
  ctx.scale(0.62, 0.62);
  drawUnit(ctx, { x: 0, y: 0, alive: true, flash: 0, face: p.ax >= 0 ? 1 : -1, colors: p.colors }, p.kind, null, false, 0);
  ctx.restore();
  if (p.captain) drawCrown(ctx, p.x, p.y - 22);
  if (p.hold && !controlled) drawBallAt(ctx, p.x + p.ax * (PR + 2), p.y + p.ay * (PR + 2), false, BR * 0.85);
  if (controlled) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    const y = p.y - (p.captain ? 40 : 32) + Math.sin(time * 6) * 2;
    ctx.moveTo(p.x - 6, y);
    ctx.lineTo(p.x + 6, y);
    ctx.lineTo(p.x, y + 7);
    ctx.fill();
  }
  if (label) {
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,3,32,0.75)';
    ctx.strokeText(label, p.x, p.y + 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, p.x, p.y + 32);
  }
}

export function drawAim(ctx, p, holdingGolden) {
  if (!p || p.out || !p.hold) return;
  const len = 70 + p.charge * 120;
  ctx.save();
  ctx.strokeStyle = holdingGolden ? '#ffd166' : 'rgba(5, 3, 32, 0.45)';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.moveTo(p.x + p.ax * (PR + 6), p.y + p.ay * (PR + 6));
  ctx.lineTo(p.x + p.ax * len, p.y + p.ay * len);
  ctx.stroke();
  ctx.restore();
  drawBallAt(ctx, p.x + p.ax * (PR + 2), p.y + p.ay * (PR + 2), holdingGolden, BR * 0.9);
  if (p.charge > 0) {
    ctx.fillStyle = 'rgba(5,3,32,0.55)';
    ctx.fillRect(p.x - 18, p.y + 22, 36, 5);
    ctx.fillStyle = p.charge > 0.6 ? '#ff8a7a' : '#ffd166';
    ctx.fillRect(p.x - 18, p.y + 22, 36 * Math.min(1, p.charge / 0.75), 5);
  }
}

export function drawBalls(ctx, st) {
  st.balls.forEach((b) => {
    if (b.state === 'held') return;
    if (b.state === 'live') {
      const color = TEAM_COLORS[b.team] || '#ffffff';
      ctx.strokeStyle = `${color}aa`;
      ctx.lineWidth = BR * 1.3;
      ctx.lineCap = 'round';
      const speed = Math.hypot(b.vx, b.vy) || 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - (b.vx / speed) * 26, b.y - (b.vy / speed) * 26);
      ctx.stroke();
      ctx.lineCap = 'butt';
    } else {
      ctx.fillStyle = 'rgba(20, 30, 60, 0.22)';
      ctx.beginPath();
      ctx.ellipse(b.x + 2, b.y + 6, BR, BR * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawBallAt(ctx, b.x, b.y, b.golden);
  });
}

export function drawBench(ctx, st) {
  [0, 1].forEach((team) => {
    const outs = st.players.filter((p) => p.team === team && p.out);
    outs.forEach((p, k) => {
      const x = team === 0 ? COURT.l + 26 + k * 34 : COURT.r - 26 - k * 34;
      const y = COURT.b + 30;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.translate(x, y);
      ctx.scale(0.42, 0.42);
      drawUnit(ctx, { x: 0, y: 0, alive: true, flash: 0, face: team === 0 ? 1 : -1, colors: p.colors }, p.kind, null, false, 0);
      ctx.restore();
    });
  });
}

export function drawEvents(ctx, st) {
  ctx.textAlign = 'center';
  st.events.forEach((e) => {
    const age = st.time - e.at;
    if (age > 1.3 || age < 0 || e.kind === 'round') return;
    ctx.globalAlpha = Math.max(0, 1 - age / 1.3);
    ctx.font = '800 13px Inter, system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,3,32,0.8)';
    ctx.strokeText(e.text, e.x, e.y - 34 - age * 20);
    ctx.fillStyle = e.kind === 'catch' || e.kind === 'back' ? '#5fd39a' : e.kind === 'golden' || e.kind === 'armor' ? '#ffd166' : '#ffffff';
    ctx.fillText(e.text, e.x, e.y - 34 - age * 20);
  });
  ctx.globalAlpha = 1;
}

export function drawDodge(ctx, st, controlledId, labels) {
  drawCourt(ctx, st);
  drawBench(ctx, st);
  drawBalls(ctx, st);
  const order = [...st.players].sort((a, c) => a.y - c.y);
  order.forEach((p) => drawPlayer(ctx, p, p.id === controlledId || labels?.marked?.includes(p.id), labels?.names?.[p.id], st.time));
  const me = st.players[controlledId];
  const heldGolden = me?.hold && st.balls.find((b) => b.id === me.hold)?.golden;
  drawAim(ctx, me, heldGolden);
  (labels?.marked || []).forEach((id) => id !== controlledId && drawAim(ctx, st.players[id], false));
  drawEvents(ctx, st);
}
