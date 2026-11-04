import { H, UNIT_R, W, WATER } from './catArtillery';

export function drawSky(ctx, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#070b2e');
  sky.addColorStop(0.55, '#24427f');
  sky.addColorStop(1, '#9ec9ee');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.26;
  for (let band = 0; band < 3; band += 1) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = 64 + band * 26 + Math.sin(x / 120 + time / 90 + band) * 22;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 26 - band * 6;
    ctx.strokeStyle = band === 1 ? '#c084fc' : '#5ef2a8';
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(214, 233, 250, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, 300);
  [
    [90, 215],
    [200, 282],
    [310, 195],
    [430, 272],
    [560, 205],
    [690, 268],
    [810, 190],
    [960, 262],
  ].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W, 360);
  ctx.lineTo(0, 360);
  ctx.fill();
}

export function drawWater(ctx, time, level = WATER) {
  const water = ctx.createLinearGradient(0, level, 0, H);
  water.addColorStop(0, '#2b6cb0');
  water.addColorStop(1, '#0b2a55');
  ctx.fillStyle = water;
  ctx.fillRect(0, level, W, H - level);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const y = level + Math.sin(x / 30 + time / 20) * 2;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function drawTerrain(ctx, terrain, base, level = WATER) {
  const ice = ctx.createLinearGradient(0, 150, 0, H);
  ice.addColorStop(0, '#ffffff');
  ice.addColorStop(0.35, '#cfe8f8');
  ice.addColorStop(1, '#5f9fd2');
  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x < W; x += 2) ctx.lineTo(x, terrain[x]);
  ctx.lineTo(W, terrain[W - 1]);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  let open = false;
  for (let x = 0; x < W; x += 1) {
    const solid = base[x] > 0 && terrain[x] < base[x] - 1;
    if (solid) ctx.rect(x, terrain[x], 1.2, base[x] - terrain[x]);
    open = open || solid;
  }
  if (open) {
    ctx.fillStyle = '#9fd3f3';
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.2;
    for (let y = 120; y < level; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let x = (y / 12) % 2 ? 0 : 11; x < W; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let pen = false;
  for (let x = 0; x < W; x += 2) {
    if (terrain[x] > level) {
      pen = false;
      continue;
    }
    if (!pen) ctx.moveTo(x, terrain[x]);
    else ctx.lineTo(x, terrain[x]);
    pen = true;
  }
  ctx.stroke();
}

function arm(ctx, angle) {
  if (angle == null) return;
  const a = (angle * Math.PI) / 180;
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(Math.cos(a) * 24, 4 - Math.sin(a) * 24);
  ctx.stroke();
  ctx.strokeStyle = '#6b5236';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(a) * 14, 4 - Math.sin(a) * 14);
  ctx.lineTo(Math.cos(a) * 24, 4 - Math.sin(a) * 24);
  ctx.stroke();
}

function eyes(ctx, cx, cy, face) {
  ctx.fillStyle = '#1a1033';
  ctx.beginPath();
  ctx.arc(cx - 4 + face * 1.5, cy, 1.9, 0, Math.PI * 2);
  ctx.arc(cx + 4 + face * 1.5, cy, 1.9, 0, Math.PI * 2);
  ctx.fill();
}

function drawCatBody(ctx, u, face, fancy) {
  const c = u.colors;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-face * 11, 6);
  ctx.quadraticCurveTo(-face * 26, 0, -face * 22, -15);
  ctx.stroke();
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  if (fancy) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-5, -3);
    ctx.lineTo(5, -3);
    ctx.lineTo(0, 12);
    ctx.fill();
  }
  ctx.fillStyle = c.body;
  const hx = face * 4;
  ctx.beginPath();
  ctx.arc(hx, -11, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - 9, -15);
  ctx.lineTo(hx - 7, -27);
  ctx.lineTo(hx - 1, -20);
  ctx.moveTo(hx + 9, -15);
  ctx.lineTo(hx + 7, -27);
  ctx.lineTo(hx + 1, -20);
  ctx.fill();
  eyes(ctx, hx, -12, face);
  ctx.fillStyle = '#ff8fb1';
  ctx.beginPath();
  ctx.arc(hx + face * 1.5, -8, 1.5, 0, Math.PI * 2);
  ctx.fill();
  if (fancy) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(hx - 8, -32, 16, 3);
    ctx.fillRect(hx - 5, -44, 10, 12);
    ctx.fillStyle = c.accent;
    ctx.fillRect(hx - 5, -35, 10, 2.5);
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(0, 0);
    ctx.lineTo(-6, 3);
    ctx.moveTo(6, -3);
    ctx.lineTo(0, 0);
    ctx.lineTo(6, 3);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(hx + 4 + face * 1.5, -12, 3.6, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = c.accent;
    ctx.fillRect(-9, -3, 18, 4);
    ctx.fillRect(face * -6, 0, 4, 8);
  }
}

function drawDogBody(ctx, u, face) {
  const c = u.colors;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-face * 12, 2);
  ctx.lineTo(-face * 20, -8);
  ctx.stroke();
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  const hx = face * 5;
  ctx.beginPath();
  ctx.arc(hx, -11, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + face * 8, -8, 6, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(hx - 9, -10, 3.5, 8, 0.25, 0, Math.PI * 2);
  ctx.ellipse(hx + 9, -10, 3.5, 8, -0.25, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, hx, -13, face);
  ctx.fillStyle = '#1a1033';
  ctx.beginPath();
  ctx.arc(hx + face * 12, -9, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.accent;
  ctx.fillRect(-9, -3, 18, 4);
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.arc(0, 3, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPenguinBody(ctx, u, face) {
  const c = u.colors;
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(0, -2, 13, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(face * 2, 2, 8.5, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(face * 3, -12, 6.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, face * 3, -13, face);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(face * 8, -11);
  ctx.lineTo(face * 15, -9);
  ctx.lineTo(face * 8, -7);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-5, 14, 4, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(5, 14, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.accent;
  ctx.fillRect(-9, -6, 18, 3.5);
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(-face * 12, 0, 3.5, 9, face * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawUnit(ctx, u, kind, aimAngle, active, time) {
  if (!u.alive) return;
  const face = u.face;
  const bob = active ? Math.sin(time / 8) * 1.2 : 0;
  ctx.save();
  ctx.translate(u.x, u.y + bob);
  if (u.flash > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(u.flash);
  arm(ctx, aimAngle);
  if (kind === 'dog') drawDogBody(ctx, u, face);
  else if (kind === 'penguin') drawPenguinBody(ctx, u, face);
  else drawCatBody(ctx, u, face, kind === 'fancy');
  ctx.restore();
  if (active) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    const y = u.y - 62 + Math.sin(time / 10) * 3;
    ctx.moveTo(u.x - 6, y);
    ctx.lineTo(u.x + 6, y);
    ctx.lineTo(u.x, y + 8);
    ctx.fill();
  }
}

export function drawUnitHud(ctx, u, color) {
  if (!u.alive) return;
  const w = 40;
  const x = u.x - w / 2;
  const y = u.y - 46;
  ctx.fillStyle = 'rgba(5, 3, 32, 0.6)';
  ctx.fillRect(x - 2, y - 2, w + 4, 8);
  ctx.fillStyle = u.hp > 50 ? '#5fd39a' : u.hp > 25 ? '#f2c94c' : '#ff8a7a';
  ctx.fillRect(x, y, (w * Math.max(0, u.hp)) / 100, 4);
  ctx.fillStyle = color;
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(u.name, u.x, y - 5);
}

export function drawProjectile(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === 'fish') {
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.fillStyle = '#ff9f6b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-16, -6);
    ctx.lineTo(-16, 6);
    ctx.fill();
    ctx.fillStyle = '#1a1033';
    ctx.beginPath();
    ctx.arc(5, -1, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'yarn') {
    ctx.fillStyle = '#ff7ad9';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd1f0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0.3, 2.6);
    ctx.stroke();
  } else if (p.kind === 'drill') {
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.fillStyle = '#8fa3bf';
    ctx.fillRect(-12, -5, 10, 10);
    ctx.fillStyle = '#5ef2ff';
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(13, 0);
    ctx.lineTo(-2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a6f86';
    ctx.lineWidth = 1.2;
    const spin = (p.age % 6) * 2;
    for (let k = 0; k < 3; k += 1) {
      const x = spin + k * 4 - 2;
      ctx.beginPath();
      ctx.moveTo(x, -5 + x / 3);
      ctx.lineTo(x + 2, 5 - x / 3);
      ctx.stroke();
    }
  } else if (p.kind === 'icicle') {
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.fillStyle = '#bfefff';
    ctx.shadowColor = '#5ef2ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.shadowColor = '#bfe6ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBarrel(ctx, o, time) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.roundRect(-8, -9, 16, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(-8, -5, 16, 2);
  ctx.fillRect(-8, 3, 16, 2);
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(0, -1, 4, 2.2, 0, 0, Math.PI * 2);
  ctx.moveTo(3, -1);
  ctx.lineTo(6, -3);
  ctx.lineTo(6, 1);
  ctx.fill();
  if (o.fuse > 0) {
    ctx.fillStyle = time % 6 < 3 ? '#fff7ae' : '#ff9f1c';
    ctx.beginPath();
    ctx.arc(0, -12, 3 + (time % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrate(ctx, o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.chute) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(-18, -34);
    ctx.moveTo(9, -9);
    ctx.lineTo(18, -34);
    ctx.stroke();
    ctx.fillStyle = o.type === 'heal' ? '#ff6b8a' : '#ffd166';
    ctx.beginPath();
    ctx.arc(0, -34, 20, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(0, -34, 20, Math.PI, Math.PI * 1.33);
    ctx.lineTo(0, -34);
    ctx.fill();
  }
  ctx.fillStyle = '#a16207';
  ctx.fillRect(-10, -10, 20, 20);
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 2;
  ctx.strokeRect(-10, -10, 20, 20);
  ctx.fillStyle = o.type === 'heal' ? '#ff4d6d' : '#ffffff';
  if (o.type === 'heal') {
    ctx.fillRect(-2.5, -6, 5, 12);
    ctx.fillRect(-6, -2.5, 12, 5);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawObject(ctx, o, time) {
  if (!o.alive) return;
  if (o.kind === 'barrel') drawBarrel(ctx, o, time);
  else drawCrate(ctx, o);
}

export function drawTexts(ctx, texts) {
  ctx.save();
  ctx.font = '800 15px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  texts.forEach((t) => {
    ctx.globalAlpha = Math.min(1, t.life / 30);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(5,3,32,0.8)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  });
  ctx.restore();
}

export function drawPreview(ctx, points) {
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffb703';
  ctx.shadowBlur = 6;
  points.forEach((pt, i) => {
    ctx.globalAlpha = 1 - (i / points.length) * 0.85;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.4 - (i / points.length) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export { UNIT_R };
