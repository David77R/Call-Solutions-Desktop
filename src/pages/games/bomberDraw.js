import { BH, BLOCK, BW, COLS, FLAME_TIME, FLOOR, FUSE, ROWS, SLOT_COLORS, T, WALL, idx } from './bomberEngine';
import { drawUnit } from './catArtilleryDraw';

const px = (v) => (v + 0.5) * T;

export function drawFloor(ctx) {
  ctx.fillStyle = '#cfe6fa';
  ctx.fillRect(0, 0, BW, BH);
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if ((c + r) % 2) continue;
      ctx.fillStyle = '#dcedfc';
      ctx.fillRect(c * T, r * T, T, T);
    }
  }
}

function drawWallTile(ctx, c, r, border, drop = 0) {
  const x = c * T;
  const y = r * T - drop;
  const g = ctx.createLinearGradient(0, y, 0, y + T);
  g.addColorStop(0, border ? '#4b6fae' : '#7fb2e6');
  g.addColorStop(1, border ? '#2b4479' : '#4f86c6');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  ctx.strokeStyle = border ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y + T / 2);
  ctx.lineTo(x + T, y + T / 2);
  ctx.moveTo(x + T / 2, y);
  ctx.lineTo(x + T / 2, y + T / 2);
  ctx.moveTo(x + T / 4, y + T / 2);
  ctx.lineTo(x + T / 4, y + T);
  ctx.moveTo(x + (3 * T) / 4, y + T / 2);
  ctx.lineTo(x + (3 * T) / 4, y + T);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, y, T, 3);
}

function drawBlockTile(ctx, c, r) {
  const x = c * T + 3;
  const y = r * T + 3;
  const s = T - 6;
  ctx.fillStyle = 'rgba(40, 80, 140, 0.18)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 5, s, s - 2, 8);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + s);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c8dcf0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 196, 232, 0.6)';
  ctx.beginPath();
  ctx.arc(x + s * 0.3, y + s * 0.62, 4, 0, Math.PI * 2);
  ctx.arc(x + s * 0.68, y + s * 0.38, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPaint(ctx, st) {
  for (let i = 0; i < st.paint.length; i += 1) {
    const owner = st.paint[i];
    if (owner < 0 || st.board.cells[i] !== FLOOR) continue;
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const color = SLOT_COLORS[owner];
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(c * T + 2, r * T + 2, T - 4, T - 4, 7);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    const x = c * T + T / 2;
    const y = r * T + T / 2 + 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 5, 4, 0, 0, Math.PI * 2);
    ctx.arc(x - 6, y - 4, 2.2, 0, Math.PI * 2);
    ctx.arc(x - 2, y - 8, 2.2, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 8, 2.2, 0, Math.PI * 2);
    ctx.arc(x + 7, y - 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawBoard(ctx, st) {
  drawFloor(ctx);
  if (st.paint) drawPaint(ctx, st);
  const falling = new Map(st.fallen.map((f) => [f.i, f.t]));
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const i = idx(c, r);
      const cell = st.board.cells[i];
      if (cell === WALL) {
        const t = falling.get(i);
        const border = c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
        drawWallTile(ctx, c, r, border, t != null ? Math.max(0, 1 - t / 0.35) * T * 1.5 : 0);
      } else if (cell === BLOCK) drawBlockTile(ctx, c, r);
    }
  }
}

function drawBombIcon(ctx, x, y, s) {
  ctx.fillStyle = '#1f2440';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.1, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x + s * 0.2, y - s * 0.6, s * 0.18, s * 0.3);
}

function drawFireIcon(ctx, x, y, s) {
  ctx.fillStyle = '#ff7a45';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.75);
  ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.1, x + s * 0.35, y + s * 0.6);
  ctx.quadraticCurveTo(x, y + s * 0.8, x - s * 0.35, y + s * 0.6);
  ctx.quadraticCurveTo(x - s * 0.7, y - s * 0.1, x, y - s * 0.75);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.25, s * 0.2, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpeedIcon(ctx, x, y, s) {
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.moveTo(x + s * 0.15, y - s * 0.75);
  ctx.lineTo(x - s * 0.45, y + s * 0.1);
  ctx.lineTo(x - s * 0.02, y + s * 0.1);
  ctx.lineTo(x - s * 0.2, y + s * 0.75);
  ctx.lineTo(x + s * 0.45, y - s * 0.15);
  ctx.lineTo(x + s * 0.02, y - s * 0.15);
  ctx.closePath();
  ctx.fill();
}

export function drawPowerups(ctx, st) {
  Object.entries(st.board.powerups).forEach(([key, pu]) => {
    const i = Number(key);
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const x = px(c);
    const y = px(r) + Math.sin(st.time * 4 + i) * 2;
    ctx.fillStyle = pu.type === 'bomb' ? '#7f97e8' : pu.type === 'fire' ? '#ffb38a' : '#5fd39a';
    ctx.beginPath();
    ctx.roundRect(x - 15, y - 15, 30, 30, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (pu.type === 'bomb') drawBombIcon(ctx, x, y, 14);
    else if (pu.type === 'fire') drawFireIcon(ctx, x, y, 14);
    else drawSpeedIcon(ctx, x, y, 14);
  });
}

export function drawBombs(ctx, st) {
  st.bombs.forEach((b) => {
    const x = px(b.c);
    const y = px(b.r);
    const urgency = 1 - Math.max(0, b.t) / FUSE;
    const pulse = 1 + Math.sin(st.time * (8 + urgency * 18)) * (0.05 + urgency * 0.07);
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(20, 30, 60, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = urgency > 0.7 && Math.floor(st.time * 10) % 2 ? '#7a2340' : '#1f2440';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-5, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9ae6';
    ctx.beginPath();
    ctx.arc(0, 3, 3.2, 0, Math.PI * 2);
    ctx.arc(-4.5, -2, 1.8, 0, Math.PI * 2);
    ctx.arc(0, -4, 1.8, 0, Math.PI * 2);
    ctx.arc(4.5, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a07a4a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(7, -11);
    ctx.quadraticCurveTo(12, -18, 9, -22);
    ctx.stroke();
    ctx.fillStyle = Math.floor(st.time * 14) % 2 ? '#fff7ae' : '#ff9f1c';
    ctx.beginPath();
    ctx.arc(9, -23, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function drawFlames(ctx, st) {
  for (let i = 0; i < st.flames.length; i += 1) {
    const life = st.flames[i];
    if (life <= 0) continue;
    const k = life / FLAME_TIME;
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const x = px(c);
    const y = px(r);
    const grow = 0.75 + 0.25 * Math.min(1, (1 - k) * 6);
    const half = (T / 2) * grow;
    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18 * k;
    ctx.fillStyle = `rgba(14, 165, 233, ${0.85 * k})`;
    ctx.beginPath();
    ctx.roundRect(x - half, y - half, half * 2, half * 2, 12);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(165, 243, 252, ${0.95 * k})`;
    ctx.beginPath();
    ctx.roundRect(x - half * 0.68, y - half * 0.68, half * 1.36, half * 1.36, 9);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${k})`;
    ctx.beginPath();
    ctx.arc(x, y, half * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlayer(ctx, p, time, showName, ring) {
  const x = px(p.x);
  const y = px(p.y) + 7;
  if (!p.alive) {
    const t = time - p.deadAt;
    if (t > 0.9) return;
    ctx.save();
    ctx.globalAlpha = 1 - t / 0.9;
    ctx.translate(x, y - t * 30);
    ctx.rotate(t * 8);
    ctx.scale(0.76, 0.76);
    drawUnit(ctx, { x: 0, y: 0, alive: true, flash: 0, face: p.face, colors: p.colors }, p.kind, null, false, time * 60);
    ctx.restore();
    return;
  }
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + 11, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(20, 30, 60, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 11, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  if (p.shield > 0) ctx.globalAlpha = Math.floor(time * 12) % 2 ? 0.35 : 1;
  ctx.translate(x, y + (p.dir ? Math.abs(Math.sin(time * 14)) * -2 : 0));
  ctx.scale(0.76, 0.76);
  drawUnit(ctx, { x: 0, y: 0, alive: true, flash: 0, face: p.face, colors: p.colors }, p.kind, null, false, time * 60);
  ctx.restore();
  if (showName) {
    ctx.font = '800 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,3,32,0.75)';
    ctx.strokeText(p.name, x, y - 30);
    ctx.fillStyle = ring || '#ffffff';
    ctx.fillText(p.name, x, y - 30);
  }
}

export function drawTexts(ctx, st) {
  ctx.font = '800 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  st.texts.forEach((t) => {
    ctx.globalAlpha = Math.min(1, t.life * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(5,3,32,0.8)';
    ctx.strokeText(t.text, px(t.x), px(t.y));
    ctx.fillStyle = '#ffd166';
    ctx.fillText(t.text, px(t.x), px(t.y));
  });
  ctx.globalAlpha = 1;
}

export function drawScene(ctx, st, showNames) {
  drawBoard(ctx, st);
  drawPowerups(ctx, st);
  drawBombs(ctx, st);
  [...st.players].sort((a, b) => a.y - b.y).forEach((p) => drawPlayer(ctx, p, st.time, showNames, st.conquest || st.players.length > 2 ? SLOT_COLORS[p.slot] : null));
  drawFlames(ctx, st);
  drawTexts(ctx, st);
}
