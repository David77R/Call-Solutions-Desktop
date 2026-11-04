export const W = 960;
export const H = 600;
export const WATER = 492;
export const UNIT_R = 14;
const GRAVITY = 0.2;
const MAX_SPEED = 15;
const WIND_FORCE = 0.028;
export const TEAM_X = [
  [70, 150, 230],
  [W - 70, W - 150, W - 230],
];

export const WEAPONS = [
  { key: 'snow', name: 'Bola de nieve', radius: 30, damage: 28, ammo: Infinity },
  { key: 'fish', name: 'Pescado explosivo', radius: 48, damage: 44, ammo: 2 },
  { key: 'yarn', name: 'Triple ovillo', radius: 22, damage: 16, ammo: 2, split: 3 },
  { key: 'icicle', name: 'Carámbano', radius: 18, damage: 36, ammo: 3, fast: true },
  { key: 'drill', name: 'Taladro de hielo', radius: 30, damage: 34, ammo: 2, drill: true },
];

export const BARREL = { key: 'barrel', radius: 46, damage: 32 };
export const SUDDEN_DEATH_TURN = 14;
export const WATER_RISE = 8;

export const ARENAS = {
  bahia: { name: 'Bahía helada', text: 'Colinas, igloos y torres de hielo.' },
  fortalezas: { name: 'Fortalezas', text: 'Murallas, búnkeres y una torre central.' },
  islas: { name: 'Islas', text: 'Tres islas y agua helada entre ellas.' },
  montana: { name: 'Montaña', text: 'Una montaña enorme en el medio.' },
};

export const ARENA_KEYS = Object.keys(ARENAS);

export function resolveArena(arena, seed) {
  return ARENAS[arena] ? arena : ARENA_KEYS[seed % ARENA_KEYS.length];
}

export const LEVELS = {
  facil: { label: 'Fácil', noise: 0.32, bonus: 0 },
  medio: { label: 'Medio', noise: 0.17, bonus: 50 },
  dificil: { label: 'Difícil', noise: 0.07, bonus: 100 },
};

export const TEAMS = {
  gatos: {
    name: 'Gatos',
    kind: 'cat',
    units: [
      { name: 'Michi', body: '#f2a44b', dark: '#c97a24', accent: '#e5484d' },
      { name: 'Luna', body: '#6b6b80', dark: '#45455a', accent: '#c084fc' },
      { name: 'Nieve', body: '#f4f4f7', dark: '#c9cbd6', accent: '#3b82f6' },
    ],
  },
  perros: {
    name: 'Perros',
    kind: 'dog',
    units: [
      { name: 'Toby', body: '#c98b4f', dark: '#8a5a2c', accent: '#22c55e' },
      { name: 'Canela', body: '#e8c39e', dark: '#b88a5c', accent: '#f97316' },
      { name: 'Rocky', body: '#3d3a3f', dark: '#1f1d21', accent: '#eab308' },
    ],
  },
  elegantes: {
    name: 'Elegantes',
    kind: 'fancy',
    units: [
      { name: 'Don Gato', body: '#2b2b33', dark: '#16161b', accent: '#d4af37' },
      { name: 'Lady Miau', body: '#f0e6f6', dark: '#c7b2d6', accent: '#be185d' },
      { name: 'Barón', body: '#8a6a4f', dark: '#5d4532', accent: '#1d4ed8' },
    ],
  },
  pinguinos: {
    name: 'Pingüinos',
    kind: 'penguin',
    units: [
      { name: 'Pingo', body: '#1f2433', dark: '#0f1320', accent: '#ef4444' },
      { name: 'Frost', body: '#25324d', dark: '#141c2e', accent: '#06b6d4' },
      { name: 'Tux', body: '#2a2a2a', dark: '#141414', accent: '#a3e635' },
    ],
  },
};

export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

export function windFor(seed, turn) {
  const r = rngFrom((seed ^ Math.imul(turn + 1, 2654435761)) >>> 0)();
  return Math.round((r * 2 - 1) * 10) / 10;
}

function flatten(t, cx, half) {
  const base = t[cx];
  for (let x = Math.max(0, cx - half); x <= Math.min(W - 1, cx + half); x += 1) {
    const k = 1 - Math.abs(x - cx) / half;
    t[x] = t[x] * (1 - k) + base * k;
  }
}

function addTower(t, base, cx, width, height) {
  for (let x = Math.max(0, Math.round(cx - width / 2)); x <= Math.min(W - 1, Math.round(cx + width / 2)); x += 1) {
    if (!(base[x] > 0)) base[x] = t[x];
    t[x] = Math.min(t[x], base[x] - height);
  }
}

function addIgloo(t, base, cx, r) {
  for (let x = Math.max(0, Math.round(cx - r)); x <= Math.min(W - 1, Math.round(cx + r)); x += 1) {
    const dx = x - cx;
    const h = Math.sqrt(Math.max(0, r * r - dx * dx)) * 0.85;
    if (!(base[x] > 0)) base[x] = t[x];
    t[x] = Math.min(t[x], base[x] - h);
  }
}

function addBattlement(t, base, cx, width, height) {
  const start = Math.round(cx - width / 2);
  for (let x = Math.max(0, start); x <= Math.min(W - 1, Math.round(cx + width / 2)); x += 1) {
    if (!(base[x] > 0)) base[x] = t[x];
    const merlon = Math.floor((x - start) / 7) % 2 === 0 ? 10 : 0;
    t[x] = Math.min(t[x], base[x] - height - merlon);
  }
}

function rolling(rnd, level, amp) {
  const t = new Float32Array(W);
  const phases = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let x = 0; x < W; x += 1) {
    t[x] = level + Math.sin(x / 140 + phases[0]) * 24 * amp + Math.sin(x / 61 + phases[1]) * 11 * amp + Math.sin(x / 23 + phases[2]) * 3 * amp;
  }
  return t;
}

function bahia(rnd, t, base) {
  const hill = 60 + rnd() * 70;
  const hillX = W / 2 + (rnd() - 0.5) * 160;
  for (let x = 0; x < W; x += 1) t[x] -= hill * Math.exp(-((x - hillX) ** 2) / (2 * 120 ** 2));
  TEAM_X.flat().forEach((cx) => flatten(t, cx, 22));
  addTower(t, base, 300 + rnd() * 20, 18, 48 + rnd() * 22);
  addTower(t, base, W - 300 - rnd() * 20, 18, 48 + rnd() * 22);
  const center = hillX + (rnd() < 0.5 ? -1 : 1) * (70 + rnd() * 50);
  if (rnd() < 0.5) addIgloo(t, base, center, 34 + rnd() * 10);
  else addTower(t, base, center, 26, 70 + rnd() * 30);
  addIgloo(t, base, 380 + rnd() * 30, 26);
  addIgloo(t, base, W - 380 - rnd() * 30, 26);
  return [420 + rnd() * 30, W - 420 - rnd() * 30];
}

function fortalezas(rnd, t, base) {
  TEAM_X.flat().forEach((cx) => flatten(t, cx, 24));
  const wall = 88 + rnd() * 20;
  addBattlement(t, base, 300, 30, wall);
  addBattlement(t, base, W - 300, 30, wall);
  [110, 190, W - 110, W - 190].forEach((cx) => addTower(t, base, cx, 10, 20 + rnd() * 8));
  addBattlement(t, base, W / 2, 44, 130 + rnd() * 30);
  addIgloo(t, base, W / 2 - 110 - rnd() * 20, 28);
  addIgloo(t, base, W / 2 + 110 + rnd() * 20, 28);
  return [345, W - 345, W / 2 - 60, W / 2 + 60];
}

function islas(rnd, t, base) {
  const channels = [
    [300 + rnd() * 10, 46],
    [W - 300 - rnd() * 10, 46],
  ];
  for (let x = 0; x < W; x += 1) {
    channels.forEach(([cx, half]) => {
      const d = Math.abs(x - cx);
      if (d < half) t[x] = Math.max(t[x], WATER + 50 - (d / half) ** 3 * (WATER + 50 - t[x]));
    });
    t[x] -= 50 * Math.exp(-((x - W / 2) ** 2) / (2 * 70 ** 2));
  }
  TEAM_X.flat().forEach((cx) => flatten(t, cx, 20));
  addTower(t, base, 250, 16, 46 + rnd() * 16);
  addTower(t, base, W - 250, 16, 46 + rnd() * 16);
  addIgloo(t, base, W / 2, 36 + rnd() * 8);
  return [W / 2 - 85, W / 2 + 85];
}

function montana(rnd, t, base) {
  const peak = 210 + rnd() * 40;
  const spread = 100 + rnd() * 20;
  for (let x = 0; x < W; x += 1) t[x] -= peak * Math.exp(-((x - W / 2) ** 2) / (2 * spread ** 2));
  TEAM_X.flat().forEach((cx) => flatten(t, cx, 22));
  addIgloo(t, base, W / 2, 30);
  addTower(t, base, 330, 16, 56 + rnd() * 20);
  addTower(t, base, W - 330, 16, 56 + rnd() * 20);
  return [385, W - 385, W / 2 - 150, W / 2 + 150];
}

const BUILDERS = { bahia, fortalezas, islas, montana };
const LEVELS_BY_ARENA = { bahia: [365, 1], fortalezas: [385, 0.45], islas: [385, 0.6], montana: [395, 0.5] };

export function makeMap(seed, arenaKey = 'bahia') {
  const arena = BUILDERS[arenaKey] ? arenaKey : 'bahia';
  const rnd = rngFrom(seed);
  const [level, amp] = LEVELS_BY_ARENA[arena];
  const t = rolling(rnd, level, amp);
  const base = new Float32Array(W);
  const barrels = BUILDERS[arena](rnd, t, base);
  const objects = barrels.map((x, i) => ({ id: `b${i}`, kind: 'barrel', x, y: 0, vy: 0, alive: true, fuse: 0 }));
  objects.forEach((o) => (o.y = groundAt(t, o.x) - 9));
  return { terrain: t, base, objects };
}

export function crateFor(seed, turn) {
  const r = rngFrom((seed ^ Math.imul(turn + 7, 40503)) >>> 0);
  return { id: `c${turn}`, kind: 'crate', x: 300 + r() * (W - 600), y: -24, vy: 0, alive: true, chute: true, type: r() < 0.5 ? 'ammo' : 'heal' };
}

export function groundAt(terrain, x) {
  const i = Math.max(0, Math.min(W - 1, Math.round(x)));
  return terrain[i];
}

export function launchVelocity(angleDeg, power, weapon) {
  const a = (angleDeg * Math.PI) / 180;
  const speed = (power / 100) * MAX_SPEED * (weapon?.fast ? 1.25 : 1);
  return { vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed };
}

export function stepProjectile(p, wind) {
  p.vx += wind * WIND_FORCE * (p.fast ? 0.4 : 1);
  p.vy += GRAVITY * (p.fast ? 0.7 : 1);
  p.x += p.vx;
  p.y += p.vy;
  p.age += 1;
}

export function simulate(x, y, angle, power, wind, terrain, targets = [], weapon = WEAPONS[0], maxSteps = 700) {
  const { vx, vy } = launchVelocity(angle, power, weapon);
  const p = { x, y, vx, vy, age: 0, fast: weapon.fast };
  for (let i = 0; i < maxSteps; i += 1) {
    stepProjectile(p, wind);
    if (p.x < -60 || p.x > W + 60 || p.y > H) return { x: p.x, y: p.y, out: true };
    if (p.y >= groundAt(terrain, p.x)) return { x: p.x, y: p.y };
    for (const t of targets) {
      if (p.age > 6 && Math.hypot(p.x - t.x, p.y - t.y) < UNIT_R + 4) return { x: p.x, y: p.y, hit: true };
    }
  }
  return { x: p.x, y: p.y, out: true };
}

export function previewPath(x, y, angle, power, wind, terrain, weapon, steps = 18) {
  const { vx, vy } = launchVelocity(angle, power, weapon);
  const p = { x, y, vx, vy, age: 0, fast: weapon?.fast };
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

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

export function botShot(shooter, targets, wind, terrain, level, ammo, facing) {
  let best = null;
  const lo = facing < 0 ? 92 : 8;
  const hi = facing < 0 ? 172 : 88;
  targets.forEach((target) => {
    for (let angle = lo; angle <= hi; angle += 2) {
      for (let power = 25; power <= 100; power += 3) {
        const hit = simulate(shooter.x, shooter.y - UNIT_R, angle, power, wind, terrain, [target]);
        if (hit.out) continue;
        const err = Math.hypot(hit.x - target.x, hit.y - target.y) + target.hp * 0.15;
        if (!best || err < best.err) best = { angle, power, err };
      }
    }
  });
  if (!best) best = { angle: facing < 0 ? 135 : 45, power: 70, err: 999 };
  const { noise } = LEVELS[level] || LEVELS.medio;
  const angle = Math.max(lo, Math.min(hi, best.angle + gauss() * noise * 30));
  const power = Math.max(20, Math.min(100, best.power * (1 + gauss() * noise)));
  let weapon = 0;
  if (ammo[1] > 0 && best.err < 70 && Math.random() < 0.4) weapon = 1;
  else if (ammo[2] > 0 && Math.random() < 0.2) weapon = 2;
  return { angle, power, weapon };
}

export function scoreFor(result, hpLeft, level, damageDealt) {
  if (result === 'won') return 100 + Math.round(hpLeft / 3) + (LEVELS[level]?.bonus ?? 50);
  return Math.round(damageDealt / 3);
}
