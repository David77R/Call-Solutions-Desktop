import { rngFrom } from './catArtillery';

export const TILE = 24;
export const MW = 72;
export const MH = 48;
export const WORLD_W = MW * TILE;
export const WORLD_H = MH * TILE;
export const VW = 1120;
export const VH = 630;
export const POP_MAX = 60;
export const CARRY = 10;
export const PLAYER_COLORS = ['#ff8a5c', '#4fc3ff'];

export const GRASS = 0;
export const WATER = 1;
export const TREE = 2;
export const GOLD = 3;
export const BERRY = 4;

export const RES_KEYS = ['food', 'wood', 'gold'];
export const RES_NAMES = { food: 'Comida', wood: 'Madera', gold: 'Oro' };
export const TILE_RES = { [TREE]: 'wood', [GOLD]: 'gold', [BERRY]: 'food' };
const TILE_AMOUNT = { [TREE]: 100, [GOLD]: 350, [BERRY]: 125 };
const RATES = { wood: 0.85, gold: 0.75, food: 0.9, farm: 0.7 };
const CLAIM_CAP = { [TREE]: 2, [GOLD]: 4, [BERRY]: 3 };

export const AGES = [
  null,
  { name: 'Edad Oscura', short: 'I' },
  { name: 'Edad Feudal', short: 'II', cost: { food: 300 }, time: 35 },
  {
    name: 'Edad de los Castillos',
    short: 'III',
    cost: { food: 500, gold: 250 },
    time: 50,
  },
];

export const UNITS = {
  aldeano: {
    name: 'Aldeano',
    hp: 25,
    atk: 3,
    vsB: 1,
    armor: 0,
    range: 0.5,
    cd: 1.5,
    speed: 46,
    sight: 5,
    r: 7,
    cost: { food: 50 },
    time: 9,
    age: 1,
    text: 'Recolecta y construye.',
  },
  lancero: {
    name: 'Lancero',
    hp: 45,
    atk: 5,
    vsB: 0.5,
    bonus: { caballero: 10 },
    armor: 1,
    range: 0.5,
    cd: 1.6,
    speed: 48,
    sight: 5,
    r: 7,
    cost: { food: 35, wood: 25 },
    time: 10,
    age: 1,
    military: true,
    text: 'Barato y fuerte contra caballeros.',
  },
  arquero: {
    name: 'Arquero',
    hp: 30,
    atk: 4,
    vsB: 0.25,
    bonus: { lancero: 3 },
    armor: 0,
    range: 4.5,
    cd: 2,
    speed: 48,
    sight: 6,
    r: 7,
    cost: { wood: 25, gold: 40 },
    time: 11,
    age: 2,
    military: true,
    missile: 'arrow',
    text: 'Ataca de lejos. Bueno contra lanceros.',
  },
  caballero: {
    name: 'Caballero',
    hp: 85,
    atk: 8,
    vsB: 0.45,
    bonus: { arquero: 6 },
    armor: 2,
    range: 0.5,
    cd: 1.8,
    speed: 72,
    sight: 6,
    r: 9,
    cost: { food: 60, gold: 70 },
    time: 15,
    age: 2,
    military: true,
    text: 'Rápido y resistente. Acaba con arqueros.',
  },
  catapulta: {
    name: 'Catapulta',
    hp: 70,
    atk: 14,
    vsB: 3,
    armor: 1,
    range: 7,
    cd: 5,
    speed: 30,
    sight: 7,
    r: 11,
    cost: { wood: 160, gold: 120 },
    time: 20,
    age: 3,
    military: true,
    missile: 'rock',
    splash: 1.1,
    text: 'Lenta, pero derriba edificios y castillos.',
  },
};
export const UNIT_KEYS = Object.keys(UNITS);

export const BUILDINGS = {
  castillo: {
    name: 'Castillo',
    size: 3,
    hp: 1400,
    cost: {},
    time: 0,
    pop: 5,
    drop: true,
    sight: 8,
    shoot: { atk: 7, range: 7, cd: 1.5 },
    trains: ['aldeano'],
    age: 9,
    text: 'Entrena aldeanos y sube de edad. Si cae, pierdes.',
  },
  casa: {
    name: 'Casa',
    size: 2,
    hp: 220,
    cost: { wood: 30 },
    time: 10,
    pop: 5,
    sight: 3,
    age: 1,
    text: '+5 de población.',
  },
  almacen: {
    name: 'Almacén',
    size: 2,
    hp: 350,
    cost: { wood: 60 },
    time: 12,
    drop: true,
    sight: 4,
    age: 1,
    text: 'Los aldeanos dejan aquí lo que recolectan.',
  },
  granja: {
    name: 'Granja',
    size: 2,
    hp: 120,
    cost: { wood: 50 },
    time: 8,
    walk: true,
    sight: 2,
    age: 1,
    text: 'Comida infinita para un aldeano.',
  },
  cuartel: {
    name: 'Cuartel',
    size: 3,
    hp: 700,
    cost: { wood: 140 },
    time: 22,
    sight: 4,
    trains: ['lancero', 'arquero'],
    age: 1,
    text: 'Entrena lanceros y arqueros.',
  },
  torre: {
    name: 'Torre',
    size: 2,
    hp: 600,
    cost: { wood: 80, gold: 60 },
    time: 24,
    sight: 8,
    shoot: { atk: 6, range: 7, cd: 1.8 },
    age: 2,
    text: 'Dispara flechas a los enemigos cercanos.',
  },
  establo: {
    name: 'Establo',
    size: 3,
    hp: 700,
    cost: { wood: 160 },
    time: 24,
    sight: 4,
    trains: ['caballero'],
    age: 2,
    text: 'Entrena caballeros.',
  },
  taller: {
    name: 'Taller de asedio',
    size: 3,
    hp: 700,
    cost: { wood: 200 },
    time: 28,
    sight: 4,
    trains: ['catapulta'],
    age: 3,
    text: 'Construye catapultas.',
  },
};
export const BUILD_KEYS = Object.keys(BUILDINGS);
export const BUILD_MENU = ['casa', 'granja', 'almacen', 'cuartel', 'torre', 'establo', 'taller'];

export const TRIBES = {
  gatos: {
    name: 'Gatos',
    perk: 'Arqueros con +1 de alcance.',
    range: { arquero: 1 },
  },
  perros: {
    name: 'Perros',
    perk: 'Tropas con 15% más de vida.',
    militaryHp: 1.15,
  },
  zorros: {
    name: 'Zorros',
    perk: 'Recolectan oro 25% más rápido.',
    gather: { gold: 1.25 },
  },
  conejos: {
    name: 'Conejos',
    perk: 'Granjas 25% más rápidas y aldeanos más veloces.',
    farm: 1.25,
    villagerSpeed: 1.15,
  },
  osos: {
    name: 'Osos',
    perk: 'Edificios con 25% más vida y castillo más fuerte.',
    buildingHp: 1.25,
    castleAtk: 3,
  },
};
export const TRIBE_KEYS = Object.keys(TRIBES);

export function tribeOf(st, owner) {
  return TRIBES[st.players[owner]?.tribe] || TRIBES.gatos;
}

export function unitMaxHp(st, owner, type) {
  const def = UNITS[type];
  return Math.round(def.hp * (def.military ? tribeOf(st, owner).militaryHp || 1 : 1));
}

export function buildingMaxHp(st, owner, type) {
  return Math.round(BUILDINGS[type].hp * (tribeOf(st, owner).buildingHp || 1));
}

export function unitRange(st, owner, type) {
  return UNITS[type].range + (tribeOf(st, owner).range?.[type] || 0);
}

export const CONQUEST_MAPS = {
  pradera: {
    name: 'Pradera',
    text: 'Campo abierto con lagos y bosques sueltos. Ideal para empezar.',
  },
  rio: {
    name: 'Río',
    text: 'Un río cruza el mapa y solo se pasa por tres vados.',
  },
  bosque: {
    name: 'Bosque',
    text: 'Bosque cerrado con pocos caminos. Mucha madera y emboscadas.',
  },
};
export const CONQUEST_MAP_KEYS = Object.keys(CONQUEST_MAPS);

export const CONQUEST_LEVELS = {
  facil: {
    label: 'Fácil',
    gather: 0.75,
    vills: 12,
    firstAttack: 540,
    every: 200,
    wave: 4,
    maxAge: 2,
    towers: 0,
    barracks: 1,
    think: 1.2,
    bonus: 1,
  },
  medio: {
    label: 'Medio',
    gather: 1,
    vills: 18,
    firstAttack: 360,
    every: 150,
    wave: 6,
    maxAge: 3,
    towers: 1,
    barracks: 1,
    think: 0.8,
    bonus: 1.5,
  },
  dificil: {
    label: 'Difícil',
    gather: 1.2,
    vills: 24,
    firstAttack: 260,
    every: 110,
    wave: 8,
    maxAge: 3,
    towers: 2,
    barracks: 2,
    think: 0.5,
    bonus: 2.2,
  },
};

const N = MW * MH;
const BASES = [
  { x: 10, y: MH - 11 },
  { x: MW - 11, y: 10 },
];
const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

export const idx = (x, y) => y * MW + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
export const tileOf = (px) => Math.max(0, Math.min(MW - 1, Math.floor(px / TILE)));
const tileRowOf = (py) => Math.max(0, Math.min(MH - 1, Math.floor(py / TILE)));
export const baseOf = (p) => BASES[p];
const center = (t) => t * TILE + TILE / 2;

export function canAfford(res, cost) {
  return RES_KEYS.every((k) => (res[k] || 0) >= (cost[k] || 0));
}

function pay(res, cost, sign = -1) {
  RES_KEYS.forEach((k) => {
    res[k] += sign * (cost[k] || 0);
  });
}

function makeMap(seed, mapKey) {
  const rng = rngFrom(seed);
  const tiles = new Uint8Array(N);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const near = (x, y, r) => BASES.some((b) => Math.hypot(b.x - x, b.y - y) < r);
  const setSym = (x, y, v) => {
    if (!inMap(x, y)) return;
    tiles[idx(x, y)] = v;
    tiles[idx(MW - 1 - x, MH - 1 - y)] = v;
  };
  const get = (x, y) => (inMap(x, y) ? tiles[idx(x, y)] : WATER);
  const blob = (cx, cy, n, v, guard = 9) => {
    const cells = [[cx, cy]];
    if (!near(cx, cy, guard) && inMap(cx, cy)) setSym(cx, cy, v);
    let placed = 0;
    for (let k = 0; k < n * 25 && placed < n; k += 1) {
      const [x, y] = cells[Math.floor(rng() * cells.length)];
      const [dx, dy] = DIRS[Math.floor(rng() * 4)];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 1 || ny < 1 || nx > MW - 2 || ny > MH - 2 || near(nx, ny, guard)) continue;
      if (get(nx, ny) !== v) placed += 1;
      setSym(nx, ny, v);
      cells.push([nx, ny]);
    }
  };
  const carve = (x0, y0, x1, y1, w = 1) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s += 1) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps);
      const y = Math.round(y0 + ((y1 - y0) * s) / steps);
      for (let dy = -w; dy <= w; dy += 1) for (let dx = -w; dx <= w; dx += 1) setSym(x + dx, y + dy, GRASS);
    }
  };
  const randomSpot = (guard) => {
    for (let k = 0; k < 60; k += 1) {
      const x = ri(3, MW - 4);
      const y = ri(3, MH - 4);
      if (!near(x, y, guard) && !near(MW - 1 - x, MH - 1 - y, guard)) return [x, y];
    }
    return [Math.floor(MW / 2), 6];
  };

  if (mapKey === 'rio') {
    for (let x = 0; x <= MW / 2; x += 1) {
      const yc = Math.round((x * (MH - 1)) / (MW - 1) + Math.sin(x / 5) * 2.2);
      for (let dy = -1; dy <= 1; dy += 1) setSym(x, yc + dy, WATER);
      setSym(x, yc + 2, (x * 7) % 5 === 0 ? TREE : GRASS);
    }
    for (let k = 0; k < 6; k += 1) blob(...randomSpot(12), ri(10, 22), TREE);
    const fords = [Math.round(MW / 2), Math.round(MW * 0.24)];
    fords.forEach((fx) => {
      const yc = Math.round((fx * (MH - 1)) / (MW - 1) + Math.sin(fx / 5) * 2.2);
      for (let dx = -2; dx <= 2; dx += 1) for (let dy = -3; dy <= 3; dy += 1) setSym(fx + dx, yc + dy, GRASS);
    });
  } else if (mapKey === 'bosque') {
    for (let k = 0; k < 18; k += 1) blob(...randomSpot(9), ri(22, 46), TREE, 8);
    const a = BASES[0];
    const b = BASES[1];
    carve(a.x, a.y, b.x, b.y, 1);
    const mid = [Math.round(MW * 0.3), Math.round(MH * 0.22)];
    carve(a.x, a.y, mid[0], mid[1], 1);
    carve(mid[0], mid[1], b.x, b.y, 1);
  } else {
    for (let k = 0; k < 2; k += 1) blob(...randomSpot(13), ri(14, 24), WATER, 11);
    for (let k = 0; k < 7; k += 1) blob(...randomSpot(11), ri(10, 28), TREE);
  }

  const b0 = BASES[0];
  for (let y = 0; y < MH; y += 1) for (let x = 0; x < MW; x += 1) if (Math.hypot(b0.x - x, b0.y - y) < 6.5) setSym(x, y, GRASS);

  const jitter = () => ri(-1, 1);
  const square = (x, y, v) => [0, 1].forEach((dx) => [0, 1].forEach((dy) => setSym(x + dx, y + dy, v)));
  const fx = b0.x - 8 + jitter();
  const fy = b0.y + 6 + jitter();
  for (let dx = -3; dx <= 3; dx += 1) for (let dy = -2; dy <= 3; dy += 1) if (rng() < 0.8 && fy + dy < MH - 1 && fx + dx > 0) setSym(fx + dx, fy + dy, TREE);
  blob(b0.x + 2 + jitter(), b0.y - 10 + jitter(), 22, TREE, 7);
  square(b0.x - 6, b0.y - 5 + jitter(), GOLD);
  square(b0.x + 13 + jitter(), b0.y - 3, GOLD);
  const bx = b0.x + 5;
  const by = b0.y + 3;
  [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [1, 1],
  ].forEach(([dx, dy]) => setSym(bx + dx, by + dy, BERRY));
  square(Math.floor(MW / 2) - 1, Math.floor(MH / 2) - 1, GOLD);
  const extra = randomSpot(14);
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ].forEach(([dx, dy]) => setSym(extra[0] + dx, extra[1] + dy, BERRY));

  for (let y = 0; y < MH; y += 1)
    for (let x = 0; x < MW; x += 1) {
      if (Math.abs(b0.x - x) <= 2 && Math.abs(b0.y - y) <= 2) setSym(x, y, GRASS);
    }

  const reach = () => {
    const seen = new Uint8Array(N);
    const start = idx(b0.x + 2, b0.y);
    const goal = idx(BASES[1].x - 2, BASES[1].y);
    const queue = [start];
    seen[start] = 1;
    while (queue.length) {
      const i = queue.shift();
      if (i === goal) return true;
      const x = i % MW;
      const y = (i - x) / MW;
      for (let d = 0; d < 4; d += 1) {
        const nx = x + DIRS[d][0];
        const ny = y + DIRS[d][1];
        if (!inMap(nx, ny)) continue;
        const ni = idx(nx, ny);
        if (seen[ni] || tiles[ni] !== GRASS) continue;
        seen[ni] = 1;
        queue.push(ni);
      }
    }
    return false;
  };
  if (!reach()) carve(b0.x, b0.y, BASES[1].x, BASES[1].y, 1);

  const amt = new Float32Array(N);
  for (let i = 0; i < N; i += 1) amt[i] = TILE_AMOUNT[tiles[i]] || 0;
  return { tiles, amt };
}

function spiral(cx, cy, maxR, fn) {
  for (let r = 0; r <= maxR; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const out = fn(cx + dx, cy + dy);
        if (out !== undefined) return out;
      }
    }
  }
  return null;
}

export function createConquest(config) {
  const mapKey = CONQUEST_MAPS[config.map] ? config.map : 'pradera';
  const { tiles, amt } = makeMap(config.seed, mapKey);
  const st = {
    seed: config.seed,
    map: mapKey,
    t: 0,
    nextId: 1,
    tiles,
    amt,
    block: new Uint8Array(N),
    bmap: new Int32Array(N),
    units: [],
    buildings: [],
    ents: new Map(),
    missiles: [],
    fx: [],
    events: [],
    changes: [],
    tileRev: 0,
    over: false,
    winner: -1,
    visClock: 0,
    players: config.players.map((pl, p) => ({
      name: pl.name,
      controller: pl.controller,
      level: pl.level || config.level || 'medio',
      tribe: TRIBES[pl.tribe] ? pl.tribe : 'gatos',
      res: { food: 200, wood: 200, gold: 100 },
      age: 1,
      pop: 0,
      popCap: 0,
      alive: true,
      lastAlert: -99,
      vis: new Uint8Array(N),
      explored: new Uint8Array(N),
      stats: { kills: 0, lost: 0, razed: 0, gathered: 0, trained: 0 },
      color: PLAYER_COLORS[p],
    })),
    bots: {},
  };
  for (let i = 0; i < N; i += 1) st.block[i] = tiles[i] === GRASS ? 0 : 1;
  st.players.forEach((pl, p) => {
    const b = BASES[p];
    addBuilding(st, p, 'castillo', b.x - 1, b.y - 1, true);
    const spots = [
      [2, 0],
      [2, 1],
      [-2, 1],
      [0, 2],
    ];
    spots.forEach(([dx, dy]) => {
      const sx = p === 0 ? dx : -dx;
      const sy = p === 0 ? dy : -dy;
      addUnit(st, p, 'aldeano', center(b.x + sx), center(b.y + sy));
    });
    if (pl.controller === 'bot')
      st.bots[p] = {
        think: 1 + p * 0.3,
        nextAttack: CONQUEST_LEVELS[pl.level]?.firstAttack || 360,
        wave: CONQUEST_LEVELS[pl.level]?.wave || 6,
        rebalance: 20,
      };
  });
  refreshPop(st);
  computeVision(st);
  return st;
}

export function addBuilding(st, owner, type, tx, ty, done) {
  const def = BUILDINGS[type];
  const b = {
    id: st.nextId,
    kind: 'b',
    owner,
    type,
    tx,
    ty,
    size: def.size,
    hp: done ? buildingMaxHp(st, owner, type) : Math.max(1, def.hp * 0.08),
    done,
    progress: done ? 1 : 0,
    queue: [],
    trainT: 0,
    started: false,
    aging: null,
    rally: null,
    cd: 1,
    worker: 0,
    flash: 0,
  };
  st.nextId += 1;
  for (let y = ty; y < ty + def.size; y += 1)
    for (let x = tx; x < tx + def.size; x += 1) {
      const i = idx(x, y);
      st.bmap[i] = b.id;
      if (!def.walk) st.block[i] = 2;
    }
  st.buildings.push(b);
  st.ents.set(b.id, b);
  if (!def.walk) evictUnits(st, b);
  return b;
}

export function addUnit(st, owner, type, x, y) {
  const def = UNITS[type];
  const u = {
    id: st.nextId,
    kind: 'u',
    owner,
    type,
    x,
    y,
    hp: unitMaxHp(st, owner, type),
    order: { k: 'idle' },
    path: null,
    pi: 0,
    goal: null,
    carry: { res: null, amt: 0 },
    cd: 0,
    face: owner === 0 ? 1 : -1,
    fur: st.nextId % 4,
    moving: false,
    working: false,
    hit: 0,
    swing: 0,
    scan: Math.random() * 0.4,
    check: { x, y, t: 0 },
    lastRes: null,
  };
  st.nextId += 1;
  st.units.push(u);
  st.ents.set(u.id, u);
  return u;
}

function evictUnits(st, b) {
  st.units.forEach((u) => {
    const tx = tileOf(u.x);
    const ty = tileRowOf(u.y);
    if (tx < b.tx || ty < b.ty || tx >= b.tx + b.size || ty >= b.ty + b.size) return;
    const spot = spiral(tx, ty, 6, (x, y) => (inMap(x, y) && st.block[idx(x, y)] === 0 ? [x, y] : undefined));
    if (spot) {
      u.x = center(spot[0]);
      u.y = center(spot[1]);
      u.path = null;
    }
  });
}

function refreshPop(st) {
  st.players.forEach((pl) => {
    pl.pop = 0;
    pl.popCap = 0;
  });
  st.units.forEach((u) => {
    st.players[u.owner].pop += 1;
  });
  st.buildings.forEach((b) => {
    const pl = st.players[b.owner];
    if (b.done) pl.popCap += BUILDINGS[b.type].pop || 0;
    if (b.started) pl.pop += 1;
  });
  st.players.forEach((pl) => {
    pl.popCap = Math.min(POP_MAX, pl.popCap);
  });
}

function rectOf(b) {
  return { x0: b.tx, y0: b.ty, x1: b.tx + b.size - 1, y1: b.ty + b.size - 1 };
}

function pxDistToRect(x, y, r) {
  const rx0 = r.x0 * TILE;
  const ry0 = r.y0 * TILE;
  const rx1 = (r.x1 + 1) * TILE;
  const ry1 = (r.y1 + 1) * TILE;
  const dx = Math.max(rx0 - x, 0, x - rx1);
  const dy = Math.max(ry0 - y, 0, y - ry1);
  return Math.hypot(dx, dy);
}

export function distTo(u, target) {
  if (target.kind === 'b') return pxDistToRect(u.x, u.y, rectOf(target));
  return Math.hypot(target.x - u.x, target.y - u.y);
}

export function entCenter(e) {
  if (e.kind === 'b') return { x: (e.tx + e.size / 2) * TILE, y: (e.ty + e.size / 2) * TILE };
  return { x: e.x, y: e.y };
}

const gScore = new Float32Array(N);
const parent = new Int32Array(N);
const seenStamp = new Uint32Array(N);
const closedStamp = new Uint32Array(N);
let stamp = 0;

class Heap {
  constructor() {
    this.items = [];
    this.keys = [];
  }

  push(item, key) {
    const { items, keys } = this;
    let i = items.length;
    items.push(item);
    keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      items[i] = items[p];
      keys[i] = keys[p];
      i = p;
    }
    items[i] = item;
    keys[i] = key;
  }

  pop() {
    const { items, keys } = this;
    const top = items[0];
    const lastItem = items.pop();
    const lastKey = keys.pop();
    if (items.length) {
      let i = 0;
      const n = items.length;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && keys[r] < keys[l] ? r : l;
        if (keys[c] >= lastKey) break;
        items[i] = items[c];
        keys[i] = keys[c];
        i = c;
      }
      items[i] = lastItem;
      keys[i] = lastKey;
    }
    return top;
  }

  get size() {
    return this.items.length;
  }
}

function rectGap(x, y, r) {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dy = Math.max(r.y0 - y, 0, y - r.y1);
  return [dx, dy];
}

export function findPath(st, sx, sy, rect, adjacent, limit = 6000) {
  stamp += 1;
  const start = idx(sx, sy);
  const free = (i) => st.block[i] === 0;
  const isGoal = (x, y) => {
    const [dx, dy] = rectGap(x, y, rect);
    const d = Math.max(dx, dy);
    return adjacent ? d <= 1 : d === 0;
  };
  const h = (x, y) => {
    const [dx, dy] = rectGap(x, y, rect);
    return Math.max(0, Math.max(dx, dy) + 0.414 * Math.min(dx, dy) - (adjacent ? 1 : 0));
  };
  if (isGoal(sx, sy)) return [];
  const heap = new Heap();
  gScore[start] = 0;
  seenStamp[start] = stamp;
  parent[start] = -1;
  heap.push(start, h(sx, sy));
  let best = start;
  let bestH = h(sx, sy);
  let found = -1;
  let expansions = 0;
  while (heap.size) {
    const i = heap.pop();
    if (closedStamp[i] === stamp) continue;
    closedStamp[i] = stamp;
    const x = i % MW;
    const y = (i - x) / MW;
    if (isGoal(x, y)) {
      found = i;
      break;
    }
    const hi = h(x, y);
    if (hi < bestH) {
      bestH = hi;
      best = i;
    }
    expansions += 1;
    if (expansions > limit) break;
    for (let d = 0; d < 8; d += 1) {
      const [dx, dy, cost] = DIRS[d];
      const nx = x + dx;
      const ny = y + dy;
      if (!inMap(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (!free(ni)) continue;
      if (dx && dy && (!free(idx(x + dx, y)) || !free(idx(x, y + dy)))) continue;
      const g = gScore[i] + cost;
      if (seenStamp[ni] === stamp && g >= gScore[ni]) continue;
      seenStamp[ni] = stamp;
      gScore[ni] = g;
      parent[ni] = i;
      heap.push(ni, g + h(nx, ny) * 1.05);
    }
  }
  let node = found >= 0 ? found : best;
  const out = [];
  while (node !== -1 && node !== start) {
    out.push(node);
    node = parent[node];
  }
  return out.reverse();
}

function losClear(st, x0, y0, x1, y1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
  for (let s = 1; s < steps; s += 1) {
    const x = x0 + ((x1 - x0) * s) / steps;
    const y = y0 + ((y1 - y0) * s) / steps;
    for (const [ox, oy] of [
      [0, 0],
      [5, 5],
      [-5, 5],
      [5, -5],
      [-5, -5],
    ]) {
      const tx = Math.floor((x + ox) / TILE);
      const ty = Math.floor((y + oy) / TILE);
      if (!inMap(tx, ty) || st.block[idx(tx, ty)] !== 0) return false;
    }
  }
  return true;
}

function setPath(st, u, rect, adjacent, final) {
  const tiles = findPath(st, tileOf(u.x), tileRowOf(u.y), rect, adjacent);
  const pts = tiles.map((i) => ({
    x: center(i % MW),
    y: center(Math.floor(i / MW)),
  }));
  if (final && !adjacent) {
    const ft = idx(tileOf(final.x), tileRowOf(final.y));
    const lastTile = tiles.length ? tiles[tiles.length - 1] : idx(tileOf(u.x), tileRowOf(u.y));
    if (lastTile === ft && st.block[ft] === 0) {
      if (pts.length) pts[pts.length - 1] = { x: final.x, y: final.y };
      else pts.push({ x: final.x, y: final.y });
    }
  }
  const smooth = [];
  let from = { x: u.x, y: u.y };
  let k = 0;
  while (k < pts.length) {
    let far = k;
    for (let j = Math.min(pts.length - 1, k + 8); j > k; j -= 1) {
      if (losClear(st, from.x, from.y, pts[j].x, pts[j].y)) {
        far = j;
        break;
      }
    }
    smooth.push(pts[far]);
    from = pts[far];
    k = far + 1;
  }
  u.path = smooth;
  u.pi = 0;
  u.goal = { rect, adjacent, final };
  u.check = { x: u.x, y: u.y, t: st.t };
}

function goToPoint(st, u, x, y) {
  const tx = Math.max(0, Math.min(MW - 1, Math.floor(x / TILE)));
  const ty = Math.max(0, Math.min(MH - 1, Math.floor(y / TILE)));
  const blocked = st.block[idx(tx, ty)] !== 0;
  setPath(
    st,
    u,
    { x0: tx, y0: ty, x1: tx, y1: ty },
    blocked,
    blocked
      ? null
      : {
          x: Math.max(4, Math.min(WORLD_W - 4, x)),
          y: Math.max(4, Math.min(WORLD_H - 4, y)),
        },
  );
}

function goToEnt(st, u, target) {
  if (target.kind === 'b') setPath(st, u, rectOf(target), !BUILDINGS[target.type].walk, null);
  else {
    const tx = tileOf(target.x);
    const ty = tileRowOf(target.y);
    setPath(st, u, { x0: tx, y0: ty, x1: tx, y1: ty }, st.block[idx(tx, ty)] !== 0, { x: target.x, y: target.y });
  }
}

function followPath(st, u, dt) {
  if (!u.path || u.pi >= u.path.length) {
    u.moving = false;
    return true;
  }
  const def = UNITS[u.type];
  const target = u.path[u.pi];
  const dx = target.x - u.x;
  const dy = target.y - u.y;
  const d = Math.hypot(dx, dy);
  const step = def.speed * (u.type === 'aldeano' ? tribeOf(st, u.owner).villagerSpeed || 1 : 1) * dt;
  u.moving = true;
  if (Math.abs(dx) > 0.5) u.face = dx > 0 ? 1 : -1;
  if (d <= step + 0.5) {
    u.x = target.x;
    u.y = target.y;
    u.pi += 1;
  } else {
    u.x += (dx / d) * step;
    u.y += (dy / d) * step;
  }
  if (st.t - u.check.t > 1.2) {
    const moved = Math.hypot(u.x - u.check.x, u.y - u.check.y);
    if (moved < 6 && u.goal) {
      u.stuck = (u.stuck || 0) + 1;
      if (u.stuck > 3) {
        u.path = null;
        u.stuck = 0;
        u.moving = false;
        return true;
      }
      setPath(st, u, u.goal.rect, u.goal.adjacent, u.goal.final);
    } else u.stuck = 0;
    u.check = { x: u.x, y: u.y, t: st.t };
  }
  if (u.pi >= u.path.length) {
    u.moving = false;
    return true;
  }
  return false;
}

function enemiesOf(st, owner) {
  return 1 - owner;
}

function visibleTo(st, owner, e) {
  const vis = st.players[owner].vis;
  if (e.kind === 'b') {
    for (let y = e.ty; y < e.ty + e.size; y += 1) for (let x = e.tx; x < e.tx + e.size; x += 1) if (vis[idx(x, y)]) return true;
    return false;
  }
  return !!vis[idx(tileOf(e.x), tileRowOf(e.y))];
}

function findEnemy(st, u, radius, includeBuildings) {
  const foe = enemiesOf(st, u.owner);
  let best = null;
  let bestD = radius;
  for (const e of st.units) {
    if (e.owner !== foe || e.hp <= 0) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y);
    const weight = e.type === 'aldeano' ? d + 30 : d;
    if (weight < bestD && visibleTo(st, u.owner, e)) {
      bestD = weight;
      best = e;
    }
  }
  if (best || !includeBuildings) return best;
  bestD = radius;
  for (const b of st.buildings) {
    if (b.owner !== foe || b.hp <= 0) continue;
    const d = pxDistToRect(u.x, u.y, rectOf(b));
    const weight = BUILDINGS[b.type].shoot ? d - 40 : d;
    if (weight < bestD && visibleTo(st, u.owner, b)) {
      bestD = weight;
      best = b;
    }
  }
  return best;
}

function damageOf(st, type, owner, target) {
  const def = UNITS[type];
  const up = def.military && st.players[owner].age >= 3 ? 1 : 0;
  if (target.kind === 'b') return Math.max(1, (def.atk + up) * (def.vsB ?? 0.4));
  const tdef = UNITS[target.type];
  const armor = tdef.armor + (tdef.military && st.players[target.owner].age >= 3 ? 1 : 0);
  return Math.max(1, def.atk + up + (def.bonus?.[target.type] || 0) - armor);
}

function hurt(st, target, dmg, fromOwner, fromId) {
  if (target.hp <= 0) return;
  target.hp -= dmg;
  target.hit = 0.25;
  const pl = st.players[target.owner];
  if (st.t - pl.lastAlert > 12) {
    pl.lastAlert = st.t;
    const c = entCenter(target);
    st.events.push({ k: 'alert', owner: target.owner, x: c.x, y: c.y });
  }
  if (target.kind === 'u') {
    const def = UNITS[target.type];
    if (def.military && target.order.k === 'idle' && fromId) {
      const src = st.ents.get(fromId);
      if (src && src.hp > 0) target.order = { k: 'attack', id: fromId, auto: true };
    }
  }
  if (target.hp <= 0) {
    st.players[fromOwner].stats[target.kind === 'b' ? 'razed' : 'kills'] += 1;
    st.players[target.owner].stats.lost += 1;
  }
}

function fireMissile(st, kind, owner, from, target, dmgFn, splash, fromId = 0) {
  const c = entCenter(target);
  st.missiles.push({
    kind,
    owner,
    x: from.x,
    y: from.y - (kind === 'rock' ? 10 : 8),
    sx: from.x,
    sy: from.y - 8,
    tx: c.x,
    ty: c.y,
    target: target.id,
    speed: kind === 'rock' ? 260 : 380,
    dmgFn,
    splash,
    from: fromId,
    age: 0,
  });
}

function unitAttack(st, u, target, dt) {
  const def = UNITS[u.type];
  const reach = unitRange(st, u.owner, u.type) * TILE + (target.kind === 'b' ? 8 : def.r + (target.kind === 'u' ? UNITS[target.type].r : 0));
  const d = distTo(u, target);
  if (d > reach) {
    const tc = entCenter(target);
    const goalMoved = !u.goal || !u.goal.at || Math.hypot(u.goal.at.x - tc.x, u.goal.at.y - tc.y) > TILE * 1.2 || !u.path || u.pi >= u.path.length;
    if (goalMoved || st.t - (u.chaseT || 0) > 2) {
      goToEnt(st, u, target);
      u.goal.at = tc;
      u.chaseT = st.t;
    }
    followPath(st, u, dt);
    return;
  }
  u.moving = false;
  u.path = null;
  const tc = entCenter(target);
  if (Math.abs(tc.x - u.x) > 1) u.face = tc.x > u.x ? 1 : -1;
  u.working = true;
  if (u.cd > 0) return;
  u.cd = def.cd;
  u.swing = 0.3;
  if (def.missile) {
    const type = u.type;
    const owner = u.owner;
    fireMissile(st, def.missile, owner, u, target, (t) => damageOf(st, type, owner, t), def.splash || 0, u.id);
  } else hurt(st, target, damageOf(st, u.type, u.owner, target), u.owner, u.id);
}

function dropSites(st, owner) {
  return st.buildings.filter((b) => b.owner === owner && b.done && BUILDINGS[b.type].drop);
}

function nearestDrop(st, u) {
  let best = null;
  let bestD = Infinity;
  dropSites(st, u.owner).forEach((b) => {
    const d = pxDistToRect(u.x, u.y, rectOf(b));
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  });
  return best;
}

function claims(st, owner) {
  const map = new Map();
  st.units.forEach((u) => {
    if (u.owner === owner && u.order.k === 'gather') map.set(u.order.ti, (map.get(u.order.ti) || 0) + 1);
  });
  return map;
}

function reachableTile(st, i) {
  const x = i % MW;
  const y = (i - x) / MW;
  for (let d = 0; d < 8; d += 1) {
    const nx = x + DIRS[d][0];
    const ny = y + DIRS[d][1];
    if (inMap(nx, ny) && st.block[idx(nx, ny)] === 0) return true;
  }
  return false;
}

export function nearestResource(st, owner, res, tx, ty, maxR = 10, skip = -1) {
  const taken = claims(st, owner);
  return spiral(tx, ty, maxR, (x, y) => {
    if (!inMap(x, y)) return undefined;
    const i = idx(x, y);
    if (i === skip) return undefined;
    const t = st.tiles[i];
    if (TILE_RES[t] !== res || st.amt[i] <= 0) return undefined;
    if ((taken.get(i) || 0) >= CLAIM_CAP[t]) return undefined;
    if (!reachableTile(st, i)) return undefined;
    return i;
  });
}

function depleteTile(st, i) {
  st.tiles[i] = GRASS;
  st.amt[i] = 0;
  if (!st.bmap[i]) st.block[i] = 0;
  st.changes.push(i);
  st.tileRev += 1;
}

function startGather(st, u, ti) {
  const res = TILE_RES[st.tiles[ti]];
  if (!res) return false;
  if (u.carry.res && u.carry.res !== res) u.carry = { res: null, amt: 0 };
  u.order = { k: 'gather', ti, res, phase: 'go' };
  u.lastRes = res;
  const x = ti % MW;
  const y = (ti - x) / MW;
  setPath(st, u, { x0: x, y0: y, x1: x, y1: y }, true, null);
  return true;
}

function startFarm(st, u, farm) {
  if (farm.worker && farm.worker !== u.id) {
    const w = st.ents.get(farm.worker);
    if (w && w.hp > 0 && w.order.k === 'farm' && w.order.bid === farm.id) return false;
  }
  farm.worker = u.id;
  if (u.carry.res && u.carry.res !== 'food') u.carry = { res: null, amt: 0 };
  u.order = { k: 'farm', bid: farm.id, phase: 'go' };
  u.lastRes = 'food';
  const spot = {
    x: (farm.tx + 0.5 + Math.random() * (farm.size - 1)) * TILE,
    y: (farm.ty + 0.5 + Math.random() * (farm.size - 1)) * TILE,
  };
  setPath(st, u, rectOf(farm), false, spot);
  return true;
}

function startReturn(st, u, nextOrder) {
  const drop = nearestDrop(st, u);
  if (!drop) {
    u.order = nextOrder || { k: 'idle' };
    return;
  }
  u.order = { k: 'return', bid: drop.id, next: nextOrder };
  goToEnt(st, u, drop);
}

function updateVillagerWork(st, u, dt) {
  const o = u.order;
  const pl = st.players[u.owner];
  const mul = pl.controller === 'bot' ? CONQUEST_LEVELS[pl.level]?.gather || 1 : 1;
  if (o.k === 'gather') {
    const alive = TILE_RES[st.tiles[o.ti]] === o.res && st.amt[o.ti] > 0;
    if (!alive) {
      const x = o.ti % MW;
      const y = (o.ti - x) / MW;
      const next = nearestResource(st, u.owner, o.res, x, y, 8, o.ti);
      if (next !== null) startGather(st, u, next);
      else if (u.carry.amt > 0) startReturn(st, u, null);
      else u.order = { k: 'idle' };
      return;
    }
    if (o.phase === 'go') {
      const tx = o.ti % MW;
      const ty = (o.ti - tx) / MW;
      const d = pxDistToRect(u.x, u.y, { x0: tx, y0: ty, x1: tx, y1: ty });
      if (d <= 20) {
        o.phase = 'work';
        u.path = null;
      } else if (followPath(st, u, dt)) {
        if (pxDistToRect(u.x, u.y, { x0: tx, y0: ty, x1: tx, y1: ty }) > 20) {
          const next = nearestResource(st, u.owner, o.res, tx, ty, 6, o.ti);
          if (next !== null && (o.retry || 0) < 3) {
            startGather(st, u, next);
            u.order.retry = (o.retry || 0) + 1;
          } else u.order = { k: 'idle' };
        }
      }
      return;
    }
    if (o.phase === 'work') {
      u.moving = false;
      u.working = true;
      const tx = o.ti % MW;
      const tcx = center(tx);
      if (Math.abs(tcx - u.x) > 1) u.face = tcx > u.x ? 1 : -1;
      const amount = Math.min(st.amt[o.ti], RATES[o.res] * mul * (tribeOf(st, u.owner).gather?.[o.res] || 1) * dt);
      u.carry.res = o.res;
      u.carry.amt += amount;
      st.amt[o.ti] -= amount;
      if (st.amt[o.ti] <= 0.01) depleteTile(st, o.ti);
      if (u.carry.amt >= CARRY) startReturn(st, u, { k: 'gather', ti: o.ti, res: o.res, phase: 'go' });
    }
    return;
  }
  if (o.k === 'farm') {
    const farm = st.ents.get(o.bid);
    if (!farm || farm.hp <= 0 || !farm.done) {
      u.order = { k: 'idle' };
      return;
    }
    if (o.phase === 'go') {
      if (followPath(st, u, dt)) {
        const inside = pxDistToRect(u.x, u.y, rectOf(farm)) <= 2;
        o.phase = inside ? 'work' : 'go';
        if (!inside) startFarm(st, u, farm);
      }
      return;
    }
    u.moving = false;
    u.working = true;
    u.carry.res = 'food';
    u.carry.amt += RATES.farm * mul * (tribeOf(st, u.owner).farm || 1) * dt;
    if (u.carry.amt >= CARRY) startReturn(st, u, { k: 'farm', bid: farm.id, phase: 'go' });
    return;
  }
  if (o.k === 'return') {
    const drop = st.ents.get(o.bid);
    if (!drop || drop.hp <= 0) {
      startReturn(st, u, o.next);
      return;
    }
    const arrived = pxDistToRect(u.x, u.y, rectOf(drop)) <= 16;
    if (!arrived && !followPath(st, u, dt)) return;
    if (!arrived && pxDistToRect(u.x, u.y, rectOf(drop)) > 16) {
      goToEnt(st, u, drop);
      o.tries = (o.tries || 0) + 1;
      if (o.tries > 4) u.order = { k: 'idle' };
      return;
    }
    if (u.carry.res && u.carry.amt > 0) {
      const got = Math.round(u.carry.amt);
      pl.res[u.carry.res] += got;
      pl.stats.gathered += got;
    }
    u.carry = { res: null, amt: 0 };
    const next = o.next;
    if (next?.k === 'gather') {
      if (TILE_RES[st.tiles[next.ti]] === next.res) startGather(st, u, next.ti);
      else {
        const x = next.ti % MW;
        const y = (next.ti - x) / MW;
        const alt = nearestResource(st, u.owner, next.res, x, y, 8);
        if (alt !== null) startGather(st, u, alt);
        else u.order = { k: 'idle' };
      }
    } else if (next?.k === 'farm') {
      const farm = st.ents.get(next.bid);
      if (farm && farm.hp > 0) startFarm(st, u, farm);
      else u.order = { k: 'idle' };
    } else u.order = { k: 'idle' };
    return;
  }
  if (o.k === 'build') {
    const b = st.ents.get(o.bid);
    if (!b || b.hp <= 0) {
      u.order = { k: 'idle' };
      return;
    }
    const def = BUILDINGS[b.type];
    const maxHp = buildingMaxHp(st, b.owner, b.type);
    const need = !b.done || b.hp < maxHp;
    if (!need) {
      finishBuilderTask(st, u, b);
      return;
    }
    const d = pxDistToRect(u.x, u.y, rectOf(b));
    if (d > 18) {
      if (followPath(st, u, dt) && pxDistToRect(u.x, u.y, rectOf(b)) > 18) {
        o.tries = (o.tries || 0) + 1;
        if (o.tries > 4) u.order = { k: 'idle' };
        else goToEnt(st, u, b);
      }
      return;
    }
    u.moving = false;
    u.working = true;
    u.path = null;
    const c = entCenter(b);
    if (Math.abs(c.x - u.x) > 1) u.face = c.x > u.x ? 1 : -1;
    if (!b.done) {
      b.progress = Math.min(1, b.progress + dt / def.time);
      b.hp = Math.min(maxHp, b.hp + (maxHp * 0.92 * dt) / def.time);
      if (b.progress >= 1) {
        b.done = true;
        st.events.push({ k: 'built', owner: b.owner, type: b.type, id: b.id });
        refreshPop(st);
        finishBuilderTask(st, u, b);
      }
    } else b.hp = Math.min(maxHp, b.hp + (maxHp * dt) / (def.time * 2.5));
  }
}

function finishBuilderTask(st, u, b) {
  if (b.type === 'granja' && startFarm(st, u, b)) return;
  const other = st.buildings.find((x) => x.owner === u.owner && !x.done && x.hp > 0 && pxDistToRect(u.x, u.y, rectOf(x)) < TILE * 8);
  if (other) {
    u.order = { k: 'build', bid: other.id };
    goToEnt(st, u, other);
    return;
  }
  if (u.lastRes && (u.lastRes !== 'food' || st.players[u.owner].controller !== 'bot')) {
    const ti = nearestResource(st, u.owner, u.lastRes, tileOf(u.x), tileRowOf(u.y), BUILDINGS[b.type].drop ? 7 : 10);
    if (ti !== null) {
      startGather(st, u, ti);
      return;
    }
  }
  u.order = { k: 'idle' };
}

function updateUnit(st, u, dt) {
  const def = UNITS[u.type];
  if (u.cd > 0) u.cd -= dt;
  if (u.hit > 0) u.hit -= dt;
  if (u.swing > 0) u.swing -= dt;
  u.working = false;
  const o = u.order;
  u.scan -= dt;
  if ((o.k === 'idle' || o.k === 'amove' || (o.k === 'attack' && o.auto)) && def.military && u.scan <= 0) {
    u.scan = 0.4;
    const radius = (o.k === 'amove' ? def.sight + 1 : def.sight) * TILE;
    const foe = findEnemy(st, u, radius, o.k === 'amove' || o.k === 'attack');
    if (foe && (o.k !== 'attack' || o.id !== foe.id)) {
      const current = o.k === 'attack' ? st.ents.get(o.id) : null;
      const switchTarget = !current || current.hp <= 0 || (current.kind === 'b' && foe.kind === 'u');
      if (o.k !== 'attack' || switchTarget)
        u.order = {
          k: 'attack',
          id: foe.id,
          auto: true,
          resume: o.k === 'amove' ? o : o.resume,
        };
    }
  }
  const order = u.order;
  if (order.k === 'idle') {
    u.moving = false;
    return;
  }
  if (order.k === 'move' || order.k === 'amove') {
    if (followPath(st, u, dt)) u.order = { k: 'idle' };
    return;
  }
  if (order.k === 'attack') {
    const target = st.ents.get(order.id);
    if (!target || target.hp <= 0) {
      if (order.resume) {
        u.order = order.resume;
        goToPoint(st, u, order.resume.x, order.resume.y);
      } else u.order = { k: 'idle' };
      return;
    }
    if (order.auto && target.kind === 'u' && Math.hypot(target.x - u.x, target.y - u.y) > (def.sight + 4) * TILE) {
      u.order = order.resume || { k: 'idle' };
      if (order.resume) goToPoint(st, u, order.resume.x, order.resume.y);
      return;
    }
    unitAttack(st, u, target, dt);
    return;
  }
  if (u.type === 'aldeano') updateVillagerWork(st, u, dt);
}

function updateBuilding(st, b, dt) {
  const def = BUILDINGS[b.type];
  if (b.flash > 0) b.flash -= dt;
  if (b.hit > 0) b.hit -= dt;
  if (!b.done) return;
  const pl = st.players[b.owner];
  if (b.aging) {
    b.aging.t += dt;
    if (b.aging.t >= b.aging.total) {
      pl.age = b.aging.age;
      b.aging = null;
      st.events.push({ k: 'age', owner: b.owner, age: pl.age });
    }
  } else if (b.queue.length) {
    if (!b.started) {
      if (pl.pop < pl.popCap) {
        b.started = true;
        b.trainT = 0;
        pl.pop += 1;
        b.blocked = false;
      } else b.blocked = true;
    }
    if (b.started) {
      b.trainT += dt;
      const type = b.queue[0];
      if (b.trainT >= UNITS[type].time) {
        b.queue.shift();
        b.started = false;
        b.trainT = 0;
        spawnFrom(st, b, type);
      }
    }
  }
  if (def.shoot) {
    b.cd -= dt;
    if (b.cd <= 0) {
      const foe = enemiesOf(st, b.owner);
      let best = null;
      let bestD = def.shoot.range * TILE;
      const r = rectOf(b);
      for (const e of st.units) {
        if (e.owner !== foe || e.hp <= 0) continue;
        const d = pxDistToRect(e.x, e.y, r);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best) {
        b.cd = def.shoot.cd;
        const c = entCenter(b);
        const atk = def.shoot.atk + (b.type === 'castillo' ? tribeOf(st, b.owner).castleAtk || 0 : 0);
        fireMissile(st, 'arrow', b.owner, { x: c.x, y: c.y - TILE * 0.8 }, best, (t) => Math.max(1, atk - (t.kind === 'u' ? UNITS[t.type].armor : 0)), 0);
      } else b.cd = 0.3;
    }
  }
}

function spawnFrom(st, b, type) {
  const target = b.rally || {
    x: (b.tx + b.size / 2) * TILE,
    y: (b.ty + b.size + 1) * TILE,
  };
  let best = null;
  let bestD = Infinity;
  for (let y = b.ty - 1; y <= b.ty + b.size; y += 1)
    for (let x = b.tx - 1; x <= b.tx + b.size; x += 1) {
      if (!inMap(x, y) || st.block[idx(x, y)] !== 0) continue;
      if (x >= b.tx && x < b.tx + b.size && y >= b.ty && y < b.ty + b.size) continue;
      const d = Math.hypot(center(x) - target.x, center(y) - target.y);
      if (d < bestD) {
        bestD = d;
        best = [x, y];
      }
    }
  if (!best) best = spiral(b.tx + 1, b.ty + 1, 8, (x, y) => (inMap(x, y) && st.block[idx(x, y)] === 0 ? [x, y] : undefined));
  if (!best) return;
  const u = addUnit(st, b.owner, type, center(best[0]), center(best[1]));
  st.players[b.owner].stats.trained += 1;
  st.events.push({ k: 'trained', owner: b.owner, type, id: u.id });
  if (b.rally) {
    const ri = idx(tileOf(b.rally.x), tileRowOf(b.rally.y));
    if (type === 'aldeano' && TILE_RES[st.tiles[ri]]) startGather(st, u, ri);
    else if (type === 'aldeano' && b.rally.farm) {
      const farm = st.ents.get(b.rally.farm);
      if (!farm || !startFarm(st, u, farm)) {
        u.order = { k: 'move' };
        goToPoint(st, u, b.rally.x, b.rally.y);
      }
    } else {
      u.order = { k: 'move' };
      goToPoint(st, u, b.rally.x, b.rally.y);
    }
  }
}

function removeBuilding(st, b) {
  for (let y = b.ty; y < b.ty + b.size; y += 1)
    for (let x = b.tx; x < b.tx + b.size; x += 1) {
      const i = idx(x, y);
      st.bmap[i] = 0;
      st.block[i] = st.tiles[i] === GRASS ? 0 : 1;
    }
  const pl = st.players[b.owner];
  b.queue.forEach((type) => pay(pl.res, UNITS[type].cost, 1));
  b.queue = [];
  st.fx.push({
    k: 'rubble',
    x: b.tx * TILE,
    y: b.ty * TILE,
    size: b.size,
    t: 0,
    life: 8,
  });
  for (let k = 0; k < b.size * 4; k += 1)
    st.fx.push({
      k: 'smoke',
      x: (b.tx + Math.random() * b.size) * TILE,
      y: (b.ty + Math.random() * b.size) * TILE,
      t: -Math.random() * 0.6,
      life: 1.4,
    });
  if (b.type === 'castillo') {
    pl.alive = false;
    if (!st.over) {
      st.over = true;
      st.winner = 1 - b.owner;
      st.events.push({ k: 'over', winner: st.winner });
    }
  }
}

function cleanup(st) {
  let deadU = false;
  let deadB = false;
  st.units.forEach((u) => {
    if (u.hp > 0) return;
    deadU = true;
    st.ents.delete(u.id);
    st.fx.push({
      k: 'poof',
      x: u.x,
      y: u.y,
      t: 0,
      life: 0.7,
      color: st.players[u.owner].color,
    });
  });
  st.buildings.forEach((b) => {
    if (b.hp > 0) return;
    deadB = true;
    st.ents.delete(b.id);
    removeBuilding(st, b);
  });
  if (deadU) st.units = st.units.filter((u) => u.hp > 0);
  if (deadB) st.buildings = st.buildings.filter((b) => b.hp > 0);
  if (deadU || deadB) refreshPop(st);
}

function separate(st) {
  const cell = 28;
  const grid = new Map();
  st.units.forEach((u) => {
    const key = Math.floor(u.x / cell) * 1000 + Math.floor(u.y / cell);
    let list = grid.get(key);
    if (!list) grid.set(key, (list = []));
    list.push(u);
  });
  st.units.forEach((u) => {
    const cx = Math.floor(u.x / cell);
    const cy = Math.floor(u.y / cell);
    const ru = UNITS[u.type].r;
    for (let gx = cx - 1; gx <= cx + 1; gx += 1)
      for (let gy = cy - 1; gy <= cy + 1; gy += 1) {
        const list = grid.get(gx * 1000 + gy);
        if (!list) continue;
        for (const v of list) {
          if (v.id <= u.id) continue;
          const min = (ru + UNITS[v.type].r) * 0.85;
          let dx = v.x - u.x;
          let dy = v.y - u.y;
          let d = Math.hypot(dx, dy);
          if (d >= min) continue;
          if (d < 0.01) {
            dx = Math.cos(u.id);
            dy = Math.sin(u.id);
            d = 1;
          }
          const push = (min - d) * 0.35;
          const wu = u.working ? 0.2 : u.moving ? 0.6 : 1;
          const wv = v.working ? 0.2 : v.moving ? 0.6 : 1;
          const nx = dx / d;
          const ny = dy / d;
          nudge(st, u, -nx * push * wu, -ny * push * wu);
          nudge(st, v, nx * push * wv, ny * push * wv);
        }
      }
  });
}

function nudge(st, u, dx, dy) {
  const x = u.x + dx;
  const y = u.y + dy;
  if (x < 2 || y < 2 || x > WORLD_W - 2 || y > WORLD_H - 2) return;
  const i = idx(Math.floor(x / TILE), Math.floor(y / TILE));
  if (st.block[i] !== 0 && st.block[idx(tileOf(u.x), tileRowOf(u.y))] === 0) return;
  u.x = x;
  u.y = y;
}

function updateMissiles(st, dt) {
  st.missiles = st.missiles.filter((m) => {
    m.age += dt;
    const target = st.ents.get(m.target);
    if (m.kind === 'arrow' && target && target.hp > 0) {
      const c = entCenter(target);
      m.tx = c.x;
      m.ty = c.y;
    }
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const d = Math.hypot(dx, dy);
    const step = m.speed * dt;
    if (d > step + 2 && m.age < 4) {
      m.x += (dx / d) * step;
      m.y += (dy / d) * step;
      return true;
    }
    m.x = m.tx;
    m.y = m.ty;
    if (m.kind === 'rock') {
      const radius = (m.splash || 1) * TILE;
      const foe = 1 - m.owner;
      st.units.forEach((u) => {
        if (u.owner === foe && u.hp > 0 && Math.hypot(u.x - m.x, u.y - m.y) <= radius) hurt(st, u, m.dmgFn(u), m.owner, m.from);
      });
      st.buildings.forEach((b) => {
        if (b.owner === foe && b.hp > 0 && pxDistToRect(m.x, m.y, rectOf(b)) <= radius * 0.5) hurt(st, b, m.dmgFn(b), m.owner, 0);
      });
      st.fx.push({ k: 'boom', x: m.x, y: m.y, t: 0, life: 0.6 });
    } else if (target && target.hp > 0) {
      hurt(st, target, m.dmgFn(target), m.owner, m.from);
      st.fx.push({ k: 'spark', x: m.x, y: m.y, t: 0, life: 0.25 });
    }
    return false;
  });
}

const circleCache = new Map();
function circle(r) {
  if (circleCache.has(r)) return circleCache.get(r);
  const out = [];
  for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) if (dx * dx + dy * dy <= r * r + r) out.push([dx, dy]);
  circleCache.set(r, out);
  return out;
}

function stampVision(vis, explored, tx, ty, r) {
  circle(r).forEach(([dx, dy]) => {
    const x = tx + dx;
    const y = ty + dy;
    if (!inMap(x, y)) return;
    const i = idx(x, y);
    vis[i] = 1;
    explored[i] = 1;
  });
}

export function computeVision(st) {
  st.players.forEach((pl) => pl.vis.fill(0));
  st.units.forEach((u) => {
    const pl = st.players[u.owner];
    stampVision(pl.vis, pl.explored, tileOf(u.x), tileRowOf(u.y), UNITS[u.type].sight);
  });
  st.buildings.forEach((b) => {
    const pl = st.players[b.owner];
    stampVision(pl.vis, pl.explored, b.tx + Math.floor(b.size / 2), b.ty + Math.floor(b.size / 2), b.done ? BUILDINGS[b.type].sight : 2);
  });
}

export function stepConquest(st, dt) {
  if (st.over) return;
  st.t += dt;
  st.units.forEach((u) => updateUnit(st, u, dt));
  st.buildings.forEach((b) => updateBuilding(st, b, dt));
  updateMissiles(st, dt);
  separate(st);
  cleanup(st);
  stepFx(st, dt);
  st.visClock -= dt;
  if (st.visClock <= 0) {
    st.visClock = 0.25;
    computeVision(st);
  }
  Object.keys(st.bots).forEach((key) => {
    const p = Number(key);
    const bot = st.bots[p];
    bot.think -= dt;
    if (bot.think <= 0 && st.players[p].alive) {
      bot.think = CONQUEST_LEVELS[st.players[p].level]?.think || 0.8;
      botThink(st, p);
    }
  });
}

export function stepFx(st, dt) {
  st.fx = st.fx.filter((f) => {
    f.t += dt;
    return f.t < f.life;
  });
}

export function canPlace(st, owner, type, tx, ty, margin = 0) {
  const size = BUILDINGS[type].size;
  if (tx < 1 || ty < 1 || tx + size > MW - 1 || ty + size > MH - 1) return false;
  const explored = st.players[owner].explored;
  for (let y = ty - margin; y < ty + size + margin; y += 1)
    for (let x = tx - margin; x < tx + size + margin; x += 1) {
      if (!inMap(x, y)) return false;
      const i = idx(x, y);
      const inside = x >= tx && y >= ty && x < tx + size && y < ty + size;
      if (inside) {
        if (st.block[i] !== 0 || st.bmap[i] || st.tiles[i] !== GRASS || !explored[i]) return false;
      } else if (st.bmap[i]) return false;
    }
  return true;
}

function ownUnits(st, owner, ids) {
  return (ids || []).map((id) => st.ents.get(id)).filter((u) => u && u.kind === 'u' && u.owner === owner && u.hp > 0);
}

function formation(n, x, y) {
  const cols = Math.ceil(Math.sqrt(n));
  const gap = 20;
  return Array.from({ length: n }, (_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return {
      x: x + (c - (cols - 1) / 2) * gap,
      y: y + (r - (Math.ceil(n / cols) - 1) / 2) * gap,
    };
  });
}

export function applyCommand(st, owner, cmd) {
  if (st.over || !cmd) return null;
  const pl = st.players[owner];
  const units = ownUnits(st, owner, cmd.ids);
  switch (cmd.k) {
    case 'move':
    case 'amove': {
      const spots = formation(units.length, cmd.x, cmd.y);
      units.forEach((u, i) => {
        if (u.order.k === 'farm') {
          const farm = st.ents.get(u.order.bid);
          if (farm?.worker === u.id) farm.worker = 0;
        }
        u.order = { k: cmd.k, x: spots[i].x, y: spots[i].y };
        goToPoint(st, u, spots[i].x, spots[i].y);
      });
      return null;
    }
    case 'attack': {
      const target = st.ents.get(cmd.target);
      if (!target || target.owner === owner || target.hp <= 0) return null;
      units.forEach((u) => {
        u.order = { k: 'attack', id: target.id };
        goToEnt(st, u, target);
      });
      return null;
    }
    case 'gather': {
      const res = TILE_RES[st.tiles[cmd.ti]];
      if (!res) return null;
      const x = cmd.ti % MW;
      const y = (cmd.ti - x) / MW;
      units.forEach((u, i) => {
        if (u.type !== 'aldeano') {
          u.order = { k: 'move' };
          goToPoint(st, u, center(x), center(y));
          return;
        }
        const ti = i === 0 ? cmd.ti : nearestResource(st, owner, res, x, y, 5);
        startGather(st, u, ti ?? cmd.ti);
      });
      return null;
    }
    case 'farm': {
      const farm = st.ents.get(cmd.bid);
      if (!farm || farm.owner !== owner || farm.type !== 'granja') return null;
      units
        .filter((u) => u.type === 'aldeano')
        .forEach((u, i) => {
          if (!farm.done) {
            u.order = { k: 'build', bid: farm.id };
            goToEnt(st, u, farm);
            return;
          }
          if (i === 0 && startFarm(st, u, farm)) return;
          const free = st.buildings.find(
            (b) => b.owner === owner && b.type === 'granja' && b.done && (!b.worker || !st.ents.get(b.worker) || st.ents.get(b.worker).order.bid !== b.id),
          );
          if (!free || !startFarm(st, u, free)) {
            u.order = { k: 'move' };
            goToEnt(st, u, farm);
          }
        });
      return null;
    }
    case 'repair': {
      const b = st.ents.get(cmd.bid);
      if (!b || b.owner !== owner) return null;
      units
        .filter((u) => u.type === 'aldeano')
        .forEach((u) => {
          u.order = { k: 'build', bid: b.id };
          goToEnt(st, u, b);
        });
      return null;
    }
    case 'return': {
      units.filter((u) => u.type === 'aldeano' && u.carry.amt > 0).forEach((u) => startReturn(st, u, u.lastRes && u.order.k === 'gather' ? u.order : null));
      return null;
    }
    case 'build': {
      const def = BUILDINGS[cmd.type];
      if (!def || cmd.type === 'castillo') return null;
      if (pl.age < def.age) return 'Todavía no tienes la edad para eso.';
      if (!canAfford(pl.res, def.cost)) return 'Faltan recursos.';
      if (!canPlace(st, owner, cmd.type, cmd.tx, cmd.ty)) return 'No se puede construir ahí.';
      pay(pl.res, def.cost);
      const b = addBuilding(st, owner, cmd.type, cmd.tx, cmd.ty, false);
      units
        .filter((u) => u.type === 'aldeano')
        .forEach((u) => {
          u.order = { k: 'build', bid: b.id };
          goToEnt(st, u, b);
        });
      return null;
    }
    case 'train': {
      const b = st.ents.get(cmd.bid);
      const def = UNITS[cmd.unit];
      if (!b || b.owner !== owner || !b.done || !def) return null;
      if (!(BUILDINGS[b.type].trains || []).includes(cmd.unit)) return null;
      if (pl.age < def.age) return 'Necesitas subir de edad.';
      if (b.queue.length >= 5) return 'La cola está llena.';
      if (!canAfford(pl.res, def.cost)) return 'Faltan recursos.';
      pay(pl.res, def.cost);
      b.queue.push(cmd.unit);
      return null;
    }
    case 'untrain': {
      const b = st.ents.get(cmd.bid);
      if (!b || b.owner !== owner || !b.queue.length) return null;
      const type = b.queue.pop();
      pay(pl.res, UNITS[type].cost, 1);
      if (!b.queue.length && b.started) {
        b.started = false;
        b.trainT = 0;
        refreshPop(st);
      }
      return null;
    }
    case 'age': {
      const b = st.ents.get(cmd.bid);
      if (!b || b.owner !== owner || b.type !== 'castillo' || b.aging) return null;
      const next = AGES[pl.age + 1];
      if (!next) return null;
      if (b.queue.length && b.started) return 'Espera a que termine de entrenar.';
      if (!canAfford(pl.res, next.cost)) return 'Faltan recursos.';
      pay(pl.res, next.cost);
      b.aging = { t: 0, total: next.time, age: pl.age + 1 };
      return null;
    }
    case 'cancelAge': {
      const b = st.ents.get(cmd.bid);
      if (!b || b.owner !== owner || !b.aging) return null;
      pay(pl.res, AGES[b.aging.age].cost, 1);
      b.aging = null;
      return null;
    }
    case 'rally': {
      const b = st.ents.get(cmd.bid);
      if (!b || b.owner !== owner) return null;
      b.rally = { x: cmd.x, y: cmd.y, farm: cmd.farm || 0 };
      return null;
    }
    case 'stop': {
      units.forEach((u) => {
        u.order = { k: 'idle' };
        u.path = null;
      });
      return null;
    }
    case 'delete': {
      const e = st.ents.get(cmd.id);
      if (e && e.owner === owner && !(e.kind === 'b' && e.type === 'castillo')) {
        e.hp = 0;
        if (e.kind === 'b' && !e.done) pay(pl.res, BUILDINGS[e.type].cost, 1);
        cleanup(st);
      }
      return null;
    }
    case 'resign': {
      if (!st.over) {
        pl.alive = false;
        st.over = true;
        st.winner = 1 - owner;
        st.events.push({ k: 'over', winner: st.winner });
      }
      return null;
    }
    default:
      return null;
  }
}

function findSpot(st, owner, type, nx, ny, minR, maxR) {
  const size = BUILDINGS[type].size;
  const out = spiral(nx, ny, maxR, (x, y) => {
    if (Math.max(Math.abs(x - nx), Math.abs(y - ny)) < minR) return undefined;
    const tx = x - Math.floor(size / 2);
    const ty = y - Math.floor(size / 2);
    return canPlace(st, owner, type, tx, ty, 1) ? [tx, ty] : undefined;
  });
  return out;
}

function botThink(st, p) {
  const pl = st.players[p];
  const L = CONQUEST_LEVELS[pl.level] || CONQUEST_LEVELS.medio;
  const bot = st.bots[p];
  const mine = st.units.filter((u) => u.owner === p);
  const vills = mine.filter((u) => u.type === 'aldeano');
  const army = mine.filter((u) => UNITS[u.type].military);
  const myB = st.buildings.filter((b) => b.owner === p);
  const castle = myB.find((b) => b.type === 'castillo');
  if (!castle) return;
  const cx = castle.tx + 1;
  const cy = castle.ty + 1;
  const foe = 1 - p;
  const enemyCastle = st.buildings.find((b) => b.owner === foe && b.type === 'castillo');
  const count = (type, all = true) => myB.filter((b) => b.type === type && (all || b.done)).length;
  const queuedVills = castle.queue.filter((t) => t === 'aldeano').length;
  const towardFoe = enemyCastle ? [Math.sign(enemyCastle.tx - castle.tx), Math.sign(enemyCastle.ty - castle.ty)] : [1, -1];
  const ageTarget = pl.age < L.maxAge && !castle.aging && (pl.age === 1 ? vills.length >= Math.min(10, L.vills - 2) : vills.length >= Math.min(15, L.vills - 1));
  const threat = st.units.some((u) => u.owner === foe && UNITS[u.type].military && Math.hypot(u.x - center(cx), u.y - center(cy)) < TILE * 14);
  const saving = ageTarget && !threat ? AGES[pl.age + 1].cost : {};
  const villReserve = vills.length + queuedVills < L.vills ? 50 : 0;
  const spare = (cost) => RES_KEYS.every((k) => !cost[k] || pl.res[k] - (saving[k] || 0) - (k === 'food' ? villReserve : 0) >= cost[k]);
  const idleVill = (prefer) => {
    const pool = vills.filter((u) => u.order.k !== 'build');
    return pool.find((u) => u.order.k === 'idle') || pool.find((u) => u.order.k === 'gather' && u.order.res === prefer) || pool[0];
  };
  const build = (type, near, minR, maxR) => {
    const def = BUILDINGS[type];
    if (!canAfford(pl.res, def.cost) || pl.age < def.age) return false;
    const spot = findSpot(st, p, type, near[0], near[1], minR, maxR);
    const worker = idleVill('wood');
    if (!spot || !worker) return false;
    applyCommand(st, p, {
      k: 'build',
      ids: [worker.id],
      type,
      tx: spot[0],
      ty: spot[1],
    });
    return true;
  };

  if (ageTarget && canAfford(pl.res, AGES[pl.age + 1].cost) && !(castle.queue.length && castle.started)) applyCommand(st, p, { k: 'age', bid: castle.id });

  if (!castle.aging && castle.queue.length < 2 && vills.length + queuedVills < L.vills && pl.res.food >= 50 && (!ageTarget || pl.res.food - 50 >= (saving.food || 0) * 0.6)) {
    applyCommand(st, p, { k: 'train', bid: castle.id, unit: 'aldeano' });
  }

  const housesBuilding = myB.some((b) => b.type === 'casa' && !b.done);
  if (pl.popCap < POP_MAX && pl.popCap - pl.pop <= 4 && !housesBuilding && !build('casa', [cx - towardFoe[0] * 3, cy - towardFoe[1] * 3], 2, 9)) {
    const anchor = myB[Math.floor(Math.random() * myB.length)];
    build('casa', [anchor.tx + 1, anchor.ty + 1], 2, 14);
  }

  myB
    .filter((b) => !b.done)
    .forEach((b) => {
      const builders = vills.filter((u) => u.order.k === 'build' && u.order.bid === b.id).length;
      if (!builders) {
        const w = idleVill('wood');
        if (w) applyCommand(st, p, { k: 'repair', ids: [w.id], bid: b.id });
      }
    });

  if (count('cuartel') < 1 && vills.length >= 7) build('cuartel', [cx + towardFoe[0] * 5, cy + towardFoe[1] * 5], 3, 10);
  else if (L.barracks > 1 && count('cuartel') < 2 && vills.length >= 16 && spare(BUILDINGS.cuartel.cost)) build('cuartel', [cx + towardFoe[0] * 6, cy], 3, 11);
  if (pl.age >= 2 && count('establo') < 1 && spare(BUILDINGS.establo.cost)) build('establo', [cx, cy + towardFoe[1] * 6], 3, 11);
  if (pl.age >= 2 && count('torre') < L.towers && spare(BUILDINGS.torre.cost)) build('torre', [cx + towardFoe[0] * 4, cy + towardFoe[1] * 4], 2, 8);
  if (pl.age >= 3 && count('taller') < 1 && spare(BUILDINGS.taller.cost)) build('taller', [cx - towardFoe[0] * 5, cy + towardFoe[1] * 4], 3, 11);

  const gatherers = { food: 0, wood: 0, gold: 0 };
  vills.forEach((u) => {
    const k = u.order.k === 'farm' ? 'food' : u.order.k === 'gather' ? u.order.res : u.order.k === 'return' ? u.lastRes : null;
    if (k) gatherers[k] += 1;
  });
  const want = pl.age === 1 ? { food: 0.5, wood: 0.4, gold: 0.1 } : { food: 0.4, wood: 0.3, gold: 0.3 };
  const pickRes = () => RES_KEYS.reduce((a, b) => (want[b] * vills.length - gatherers[b] > want[a] * vills.length - gatherers[a] ? b : a));
  const assign = (u, res) => {
    if (res === 'food') {
      const berry = nearestResource(st, p, 'food', cx, cy, 12);
      if (berry !== null) return startGather(st, u, berry);
      const free = myB.find((b) => b.type === 'granja' && b.done && (!b.worker || !st.ents.get(b.worker) || st.ents.get(b.worker).order.bid !== b.id));
      if (free) return startFarm(st, u, free);
      const pendingFarm = myB.find((b) => b.type === 'granja' && !b.done && !vills.some((v) => v.order.k === 'build' && v.order.bid === b.id));
      if (pendingFarm) {
        applyCommand(st, p, { k: 'repair', ids: [u.id], bid: pendingFarm.id });
        return true;
      }
      if (canAfford(pl.res, BUILDINGS.granja.cost)) {
        const spot = findSpot(st, p, 'granja', cx, cy, 2, 10);
        if (spot) {
          applyCommand(st, p, {
            k: 'build',
            ids: [u.id],
            type: 'granja',
            tx: spot[0],
            ty: spot[1],
          });
          return true;
        }
      }
      res = 'wood';
    }
    const ti = nearestResource(st, p, res, cx, cy, 30);
    if (ti !== null) return startGather(st, u, ti);
    const alt = nearestResource(st, p, res === 'gold' ? 'wood' : 'gold', cx, cy, 30);
    return alt !== null ? startGather(st, u, alt) : false;
  };
  vills
    .filter((u) => u.order.k === 'idle')
    .forEach((u) => {
      const res = pickRes();
      if (assign(u, res)) gatherers[res] += 1;
    });

  bot.rebalance -= L.think;
  if (bot.rebalance <= 0) {
    bot.rebalance = 15;
    const over = RES_KEYS.find((k) => gatherers[k] > want[k] * vills.length + 2);
    const under = RES_KEYS.find((k) => gatherers[k] < want[k] * vills.length - 2);
    if (over && under) {
      const v = vills.find((u) => (u.order.k === 'gather' && u.order.res === over) || (over === 'food' && u.order.k === 'farm'));
      if (v) {
        if (v.order.k === 'farm') {
          const farm = st.ents.get(v.order.bid);
          if (farm) farm.worker = 0;
        }
        v.order = { k: 'idle' };
      }
    }
  }

  if (count('almacen') < 4 && !myB.some((b) => b.type === 'almacen' && !b.done) && pl.res.wood >= 60) {
    const far = vills.find((u) => {
      if (u.order.k !== 'gather' || u.order.res === 'food') return false;
      const x = u.order.ti % MW;
      const y = (u.order.ti - x) / MW;
      const drop = dropSites(st, p).reduce((m, b) => Math.min(m, pxDistToRect(center(x), center(y), rectOf(b))), Infinity);
      return drop > TILE * 7;
    });
    if (far) {
      const x = far.order.ti % MW;
      const y = (far.order.ti - x) / MW;
      const spot = findSpot(st, p, 'almacen', x, y, 2, 6);
      if (spot)
        applyCommand(st, p, {
          k: 'build',
          ids: [far.id],
          type: 'almacen',
          tx: spot[0],
          ty: spot[1],
        });
    }
  }

  const home = st.units.filter((u) => u.owner === foe && Math.hypot(u.x - center(cx), u.y - center(cy)) < TILE * 13);
  const foeArmy = st.units.filter((u) => u.owner === foe && UNITS[u.type].military);
  const counts = { lancero: 0, arquero: 0, caballero: 0 };
  foeArmy.forEach((u) => {
    if (counts[u.type] !== undefined) counts[u.type] += 1;
  });
  const choose = (options) => {
    if (pl.level === 'dificil' && foeArmy.length >= 3) {
      if (counts.caballero >= counts.arquero && counts.caballero >= counts.lancero && options.includes('lancero')) return 'lancero';
      if (counts.arquero >= counts.lancero && options.includes('caballero')) return 'caballero';
      if (options.includes('arquero')) return 'arquero';
    }
    return options[Math.floor(Math.random() * options.length)];
  };
  const armyCap = pl.age === 1 ? bot.wave + 2 : POP_MAX;
  myB
    .filter((b) => b.done && b.type !== 'castillo' && BUILDINGS[b.type].trains && b.queue.length < 2 && (army.length < armyCap || home.length))
    .forEach((b) => {
      const options = BUILDINGS[b.type].trains.filter((t) => UNITS[t].age <= pl.age);
      if (!options.length) return;
      const type = choose(options);
      if (spare(UNITS[type].cost) && pl.res.wood >= (housesBuilding ? 0 : 30) + (UNITS[type].cost.wood || 0)) applyCommand(st, p, { k: 'train', bid: b.id, unit: type });
    });

  if (home.length) {
    army
      .filter((u) => u.order.k === 'idle' || (u.order.k === 'attack' && u.order.auto && st.ents.get(u.order.id)?.kind === 'b') || u.order.k === 'amove')
      .forEach((u) => {
        const target = home.reduce((a, b) => (Math.hypot(b.x - u.x, b.y - u.y) < Math.hypot(a.x - u.x, a.y - u.y) ? b : a));
        if (Math.hypot(target.x - u.x, target.y - u.y) < TILE * 26) {
          u.order = { k: 'attack', id: target.id, auto: true };
          goToEnt(st, u, target);
        }
      });
    if (home.length >= 3) {
      const threatened = vills.filter((v) => home.some((e) => Math.hypot(e.x - v.x, e.y - v.y) < TILE * 3));
      if (threatened.length && army.length < 2)
        threatened.forEach((v) =>
          applyCommand(st, p, {
            k: 'move',
            ids: [v.id],
            x: center(cx),
            y: center(cy) + TILE * 2,
          }),
        );
    }
  }

  const capped = pl.pop >= Math.min(POP_MAX, pl.popCap) - 1 && army.length >= 8;
  if (enemyCastle && (st.t >= bot.nextAttack || army.length >= 22 || capped) && army.length >= Math.min(bot.wave, capped ? 8 : 20)) {
    const c = entCenter(enemyCastle);
    const ids = army.filter((u) => u.order.k === 'idle' || u.order.k === 'move').map((u) => u.id);
    if (ids.length >= Math.min(bot.wave, capped ? 8 : 20) * 0.7) {
      applyCommand(st, p, {
        k: 'amove',
        ids,
        x: c.x,
        y: c.y + (p === 0 ? TILE * 2 : -TILE * 2),
      });
      bot.nextAttack = st.t + L.every;
      bot.wave += 2;
    }
  }
  army
    .filter((u) => u.order.k === 'idle' && Math.hypot(u.x - center(cx), u.y - center(cy)) > TILE * 18)
    .forEach((u) => {
      if (enemyCastle && army.length >= 4) {
        const c = entCenter(enemyCastle);
        u.order = { k: 'amove', x: c.x, y: c.y };
        goToPoint(st, u, c.x, c.y);
      }
    });
}

export function conquestScore(st, me, won, level, online) {
  const s = st.players[me].stats;
  const base = s.kills * 4 + s.razed * 12 + s.gathered / 40 + (won ? 200 * Math.min(1, st.t / 480) : 0);
  const mul = online ? 1.6 : CONQUEST_LEVELS[level]?.bonus || 1;
  return Math.max(5, Math.round(base * mul));
}

export function conquestSnapshot(st) {
  return {
    t: Math.round(st.t * 10) / 10,
    u: st.units.map((u) => [
      u.id,
      u.owner,
      UNIT_KEYS.indexOf(u.type),
      Math.round(u.x),
      Math.round(u.y),
      Math.ceil(u.hp),
      (u.moving ? 1 : 0) | (u.working ? 2 : 0) | (u.swing > 0 ? 4 : 0) | (u.hit > 0 ? 8 : 0) | (u.face < 0 ? 16 : 0),
      u.carry.amt > 0.5 ? RES_KEYS.indexOf(u.carry.res) + 1 : 0,
      u.order.k === 'idle' ? 0 : 1,
    ]),
    b: st.buildings.map((b) => [
      b.id,
      b.owner,
      BUILD_KEYS.indexOf(b.type),
      b.tx,
      b.ty,
      Math.ceil(b.hp),
      b.done ? 1 : 0,
      Math.round(b.progress * 100),
      b.queue.map((q) => UNIT_KEYS.indexOf(q)),
      b.started ? Math.round((b.trainT / UNITS[b.queue[0]].time) * 100) : b.blocked ? -1 : 0,
      b.rally ? [Math.round(b.rally.x), Math.round(b.rally.y)] : 0,
      b.aging ? Math.round((b.aging.t / b.aging.total) * 100) : -1,
      b.hit > 0 ? 1 : 0,
    ]),
    p: st.players.map((pl) => [
      Math.floor(pl.res.food),
      Math.floor(pl.res.wood),
      Math.floor(pl.res.gold),
      pl.age,
      pl.pop,
      pl.popCap,
      pl.stats.kills,
      pl.stats.razed,
      pl.stats.gathered,
      pl.alive ? 1 : 0,
    ]),
    m: st.missiles.map((m) => [m.kind === 'rock' ? 1 : 0, Math.round(m.x), Math.round(m.y), Math.round(m.tx), Math.round(m.ty)]),
  };
}

export function takeTileChanges(st) {
  const out = st.changes.map((i) => [i, st.tiles[i]]);
  st.changes = [];
  return out;
}

export function applyTileChanges(st, list) {
  list.forEach(([i, v]) => {
    st.tiles[i] = v;
    if (v === GRASS) st.amt[i] = 0;
    if (!st.bmap[i]) st.block[i] = v === GRASS ? 0 : 1;
  });
  st.tileRev += 1;
}

export function applyConquestSnapshot(st, snap) {
  st.t = snap.t;
  const seenU = new Set();
  const units = [];
  snap.u.forEach(([id, owner, ti, x, y, hp, flags, carry, busy]) => {
    seenU.add(id);
    let u = st.ents.get(id);
    if (!u || u.kind !== 'u') {
      u = {
        id,
        kind: 'u',
        owner,
        type: UNIT_KEYS[ti],
        x,
        y,
        fur: id % 4,
        carry: { res: null, amt: 0 },
        order: { k: 'idle' },
        tx: x,
        ty: y,
      };
      st.ents.set(id, u);
    }
    u.tx = x;
    u.ty = y;
    u.hp = hp;
    u.moving = !!(flags & 1);
    u.working = !!(flags & 2);
    u.swing = flags & 4 ? 0.2 : 0;
    u.hit = flags & 8 ? 0.2 : 0;
    u.face = flags & 16 ? -1 : 1;
    u.carry = carry ? { res: RES_KEYS[carry - 1], amt: CARRY } : { res: null, amt: 0 };
    u.order = { k: busy ? 'busy' : 'idle' };
    units.push(u);
  });
  st.units.forEach((u) => {
    if (!seenU.has(u.id)) {
      st.ents.delete(u.id);
      st.fx.push({
        k: 'poof',
        x: u.x,
        y: u.y,
        t: 0,
        life: 0.7,
        color: st.players[u.owner].color,
      });
    }
  });
  st.units = units;

  const seenB = new Set();
  const buildings = [];
  snap.b.forEach(([id, owner, ti, tx, ty, hp, done, progress, queue, train, rally, aging, hit]) => {
    seenB.add(id);
    let b = st.ents.get(id);
    const type = BUILD_KEYS[ti];
    if (!b || b.kind !== 'b') {
      b = {
        id,
        kind: 'b',
        owner,
        type,
        tx,
        ty,
        size: BUILDINGS[type].size,
        queue: [],
        flash: 0,
      };
      st.ents.set(id, b);
      for (let y = ty; y < ty + b.size; y += 1)
        for (let x = tx; x < tx + b.size; x += 1) {
          const i = idx(x, y);
          st.bmap[i] = id;
          if (!BUILDINGS[type].walk) st.block[i] = 2;
        }
    }
    b.hp = hp;
    b.done = !!done;
    b.progress = progress / 100;
    b.queue = queue.map((q) => UNIT_KEYS[q]);
    b.started = train > 0;
    b.blocked = train === -1;
    b.trainT = b.queue.length && train > 0 ? (train / 100) * UNITS[b.queue[0]].time : 0;
    b.rally = rally ? { x: rally[0], y: rally[1] } : null;
    b.aging = aging >= 0 ? { t: aging / 100, total: 1 } : null;
    b.hit = hit ? 0.2 : 0;
    buildings.push(b);
  });
  st.buildings.forEach((b) => {
    if (seenB.has(b.id)) return;
    st.ents.delete(b.id);
    for (let y = b.ty; y < b.ty + b.size; y += 1)
      for (let x = b.tx; x < b.tx + b.size; x += 1) {
        const i = idx(x, y);
        st.bmap[i] = 0;
        st.block[i] = st.tiles[i] === GRASS ? 0 : 1;
      }
    st.fx.push({
      k: 'rubble',
      x: b.tx * TILE,
      y: b.ty * TILE,
      size: b.size,
      t: 0,
      life: 8,
    });
  });
  st.buildings = buildings;

  snap.p.forEach(([food, wood, gold, age, pop, popCap, kills, razed, gathered, alive], p) => {
    const pl = st.players[p];
    pl.res = { food, wood, gold };
    pl.age = age;
    pl.pop = pop;
    pl.popCap = popCap;
    pl.stats.kills = kills;
    pl.stats.razed = razed;
    pl.stats.gathered = gathered;
    pl.alive = !!alive;
  });
  st.missiles = snap.m.map(([rock, x, y, tx, ty]) => ({
    kind: rock ? 'rock' : 'arrow',
    x,
    y,
    tx,
    ty,
    sx: x,
    sy: y,
  }));
}

export function stepGuest(st, dt) {
  const k = Math.min(1, dt * 12);
  st.units.forEach((u) => {
    if (u.tx === undefined) return;
    u.x += (u.tx - u.x) * k;
    u.y += (u.ty - u.y) * k;
  });
  st.missiles.forEach((m) => {
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const d = Math.hypot(dx, dy);
    const step = (m.kind === 'rock' ? 260 : 380) * dt;
    if (d > step) {
      m.x += (dx / d) * step;
      m.y += (dy / d) * step;
    }
  });
  stepFx(st, dt);
  st.visClock -= dt;
  if (st.visClock <= 0) {
    st.visClock = 0.25;
    computeVision(st);
  }
}

export function previewConquestMap(seed, mapKey) {
  return makeMap(seed, mapKey).tiles;
}
