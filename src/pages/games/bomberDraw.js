import { BH, BLOCK, BW, COLS, FLAME_TIME, FLOOR, FUSE, ROWS, SLOT_COLORS, T, WALL, WATER, hazardState, idx } from './bomberEngine';
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

function drawWaterTile(ctx, c, r, time) {
  const x = c * T;
  const y = r * T;
  const g = ctx.createLinearGradient(0, y, 0, y + T);
  g.addColorStop(0, '#2b6cb0');
  g.addColorStop(1, '#1e4f8f');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, T, T);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 2; k += 1) {
    const yy = y + 12 + k * 18 + Math.sin(time * 2 + c + k) * 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, yy);
    ctx.quadraticCurveTo(x + T / 2, yy - 4, x + T - 6, yy);
    ctx.stroke();
  }
}

function drawBridge(ctx, i) {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const x = c * T;
  const y = r * T;
  ctx.fillStyle = '#2b6cb0';
  ctx.fillRect(x, y, T, T);
  ctx.fillStyle = '#a16207';
  ctx.fillRect(x - 2, y + 4, T + 4, T - 8);
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 5; k += 1) {
    ctx.beginPath();
    ctx.moveTo(x + (k * T) / 5, y + 4);
    ctx.lineTo(x + (k * T) / 5, y + T - 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#5b3a12';
  ctx.fillRect(x - 2, y + 2, T + 4, 3);
  ctx.fillRect(x - 2, y + T - 5, T + 4, 3);
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
      else if (cell === WATER) drawWaterTile(ctx, c, r, st.time || 0);
    }
  }
  (st.board.bridges || []).forEach((i) => st.board.cells[i] === FLOOR && drawBridge(ctx, i));
}

function drawPiranha(ctx, x, y, angle, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#e5484d';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-21, -8);
  ctx.lineTo(-21, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a1d2a';
  ctx.beginPath();
  ctx.ellipse(-1, 3, 9, 4, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 4; k += 1) {
    ctx.beginPath();
    ctx.moveTo(2 + k * 3, 1);
    ctx.lineTo(3.5 + k * 3, 4.5);
    ctx.lineTo(5 + k * 3, 1);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(7, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1033';
  ctx.beginPath();
  ctx.arc(8, -4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSeal(ctx, x, y, dir) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = 'rgba(20, 30, 60, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a96a8';
  ctx.beginPath();
  ctx.ellipse(-2, 2, 22, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.lineTo(-30, -6);
  ctx.lineTo(-30, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c3ccd8';
  ctx.beginPath();
  ctx.ellipse(-2, 7, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1033';
  ctx.beginPath();
  ctx.arc(17, -5, 1.8, 0, Math.PI * 2);
  ctx.arc(23, -1, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1033';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(22, 1);
  ctx.lineTo(30, 0);
  ctx.moveTo(22, 2);
  ctx.lineTo(30, 4);
  ctx.stroke();
  ctx.restore();
}

function drawBear(ctx, x, y, face, time) {
  const step = Math.sin(time * 10) * 1.5;
  ctx.save();
  ctx.translate(x, y + step);
  ctx.scale(face < 0 ? -1.2 : 1.2, 1.2);
  ctx.fillStyle = 'rgba(20, 30, 60, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(-4, 4, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -6, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -16, 4, 0, Math.PI * 2);
  ctx.arc(19, -15, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d6cfc0';
  ctx.fillRect(-18, 12, 7, 7);
  ctx.fillRect(4, 12, 7, 7);
  ctx.fillStyle = '#1a1033';
  ctx.beginPath();
  ctx.arc(23, -4, 2.6, 0, Math.PI * 2);
  ctx.arc(16, -9, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHazards(ctx, st) {
  const h = hazardState(st);
  if (!h) return;
  if (h.kind === 'piranhas') {
    const c = h.bridge % COLS;
    const r = Math.floor(h.bridge / COLS);
    const x = px(c);
    if (h.warn) {
      [-1, 1].forEach((d) => {
        ctx.strokeStyle = `rgba(255,255,255,${0.4 + h.k * 0.5})`;
        ctx.lineWidth = 2;
        for (let k = 0; k < 3; k += 1) {
          ctx.beginPath();
          ctx.arc(x + (k - 1) * 9, px(r + d) + Math.sin(st.time * 12 + k) * 3, 3 + h.k * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      if (h.k > 0.5) {
        ctx.fillStyle = '#ff4d6d';
        ctx.font = '900 20px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', x, px(r) - 18);
      }
    } else if (h.bite) {
      const y = px(r - 1) + (px(r + 1) - px(r - 1)) * h.k;
      const lift = Math.sin(Math.PI * h.k) * 26;
      drawPiranha(ctx, x - 6, y - lift, Math.PI / 2 - 0.4 + h.k * 0.8, 1);
      drawPiranha(ctx, x + 8, px(r + 1) - (px(r + 1) - px(r - 1)) * h.k - lift, -Math.PI / 2 + 0.4 - h.k * 0.8, 0.85);
    }
    return;
  }
  if (h.kind === 'seals') {
    h.seals.forEach((s) => {
      const y = px(s.row);
      if (s.warn) {
        const blink = Math.floor(st.time * 6) % 2;
        ctx.fillStyle = `rgba(255, 77, 109, ${blink ? 0.16 : 0.07})`;
        ctx.fillRect(T, s.row * T, BW - 2 * T, T);
        const ex = px(s.entry + s.dir);
        ctx.fillStyle = blink ? '#ff4d6d' : '#ffd166';
        ctx.beginPath();
        ctx.moveTo(ex + s.dir * 12, y);
        ctx.lineTo(ex - s.dir * 6, y - 11);
        ctx.lineTo(ex - s.dir * 6, y + 11);
        ctx.closePath();
        ctx.fill();
      } else if (s.sliding) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let k = 1; k <= 3; k += 1) ctx.fillRect(px(s.x - s.dir * k * 0.6) - 3, y + 8, 6, 2);
        drawSeal(ctx, px(s.x), y + 2, s.dir);
      }
    });
    return;
  }
  drawBear(ctx, px(h.x), px(h.y) + 2, h.face || 1, st.time);
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
  drawHazards(ctx, st);
  drawFlames(ctx, st);
  drawTexts(ctx, st);
}
