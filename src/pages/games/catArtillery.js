export const W = 960;
export const H = 540;
export const WATER = 492;
export const CAT_R = 15;
const GRAVITY = 0.2;
const MAX_SPEED = 15;
const WIND_FORCE = 0.028;

export const WEAPONS = [
  { key: 'snow', name: 'Bola de nieve', radius: 30, damage: 30, ammo: Infinity },
  { key: 'fish', name: 'Pescado explosivo', radius: 48, damage: 46, ammo: 2 },
  { key: 'yarn', name: 'Triple ovillo', radius: 22, damage: 17, ammo: 2, split: 3 },
];

export const LEVELS = {
  facil: { label: 'Fácil', noise: 0.32, bonus: 0 },
  medio: { label: 'Medio', noise: 0.17, bonus: 50 },
  dificil: { label: 'Difícil', noise: 0.07, bonus: 100 },
};

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

export function makeTerrain() {
  const t = new Float32Array(W);
  const phases = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
  const hill = 80 + Math.random() * 70;
  const hillX = W / 2 + (Math.random() - 0.5) * 160;
  for (let x = 0; x < W; x += 1) {
    let y = 360;
    y += Math.sin(x / 140 + phases[0]) * 26;
    y += Math.sin(x / 61 + phases[1]) * 12;
    y += Math.sin(x / 23 + phases[2]) * 4;
    y -= hill * Math.exp(-((x - hillX) ** 2) / (2 * 120 ** 2));
    t[x] = y;
  }
  [110, W - 110].forEach((cx) => {
    const base = t[cx];
    for (let x = cx - 40; x <= cx + 40; x += 1) {
      const k = 1 - Math.abs(x - cx) / 40;
      t[x] = t[x] * (1 - k) + base * k;
    }
  });
  return t;
}

export function groundAt(terrain, x) {
  const i = Math.max(0, Math.min(W - 1, Math.round(x)));
  return terrain[i];
}

export function launchVelocity(angleDeg, power) {
  const a = (angleDeg * Math.PI) / 180;
  const speed = (power / 100) * MAX_SPEED;
  return { vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed };
}

export function stepProjectile(p, wind) {
  p.vx += wind * WIND_FORCE;
  p.vy += GRAVITY;
  p.x += p.vx;
  p.y += p.vy;
  p.age += 1;
}

export function simulate(x, y, angle, power, wind, terrain, targets = [], maxSteps = 700) {
  const { vx, vy } = launchVelocity(angle, power);
  const p = { x, y, vx, vy, age: 0 };
  for (let i = 0; i < maxSteps; i += 1) {
    stepProjectile(p, wind);
    if (p.x < -60 || p.x > W + 60 || p.y > H) return { x: p.x, y: p.y, out: true };
    if (p.y >= groundAt(terrain, p.x)) return { x: p.x, y: p.y };
    for (const t of targets) {
      if (p.age > 4 && Math.hypot(p.x - t.x, p.y - t.y) < CAT_R + 4) return { x: p.x, y: p.y, hit: true };
    }
  }
  return { x: p.x, y: p.y, out: true };
}

export function previewPath(x, y, angle, power, wind, terrain, steps = 26) {
  const { vx, vy } = launchVelocity(angle, power);
  const p = { x, y, vx, vy, age: 0 };
  const points = [];
  for (let i = 0; i < steps * 3; i += 1) {
    stepProjectile(p, wind);
    if (p.y >= groundAt(terrain, p.x) || p.x < 0 || p.x > W) break;
    if (i % 3 === 0) points.push({ x: p.x, y: p.y });
  }
  return points;
}

export function carve(terrain, cx, cy, r) {
  for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x += 1) {
    const dx = x - cx;
    const bottom = cy + Math.sqrt(Math.max(0, r * r - dx * dx));
    if (bottom > terrain[x]) terrain[x] = Math.min(H + 40, bottom);
  }
}

export function botShot(bot, player, wind, terrain, level, weapons) {
  let best = null;
  for (let angle = 95; angle <= 172; angle += 1.5) {
    for (let power = 25; power <= 100; power += 2.5) {
      const hit = simulate(bot.x, bot.y - CAT_R, angle, power, wind, terrain, [player]);
      if (hit.out) continue;
      const err = Math.hypot(hit.x - player.x, hit.y - player.y);
      if (!best || err < best.err) best = { angle, power, err };
    }
  }
  if (!best) best = { angle: 135, power: 70, err: 999 };
  const { noise } = LEVELS[level];
  const angle = Math.max(92, Math.min(175, best.angle + gauss() * noise * 30));
  const power = Math.max(20, Math.min(100, best.power * (1 + gauss() * noise)));
  let weapon = 0;
  if (weapons[1] > 0 && best.err < 60 && Math.random() < 0.45) weapon = 1;
  else if (weapons[2] > 0 && Math.random() < 0.25) weapon = 2;
  return { angle, power, weapon };
}

export function scoreFor(result, playerHp, level, damageDealt) {
  if (result === 'won') return 100 + Math.round(playerHp) + LEVELS[level].bonus;
  return Math.round(damageDealt / 2);
}
