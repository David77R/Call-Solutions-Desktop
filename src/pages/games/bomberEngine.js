import { rngFrom } from './catArtillery';

export const COLS = 17;
export const ROWS = 11;
export const T = 44;
export const BW = COLS * T;
export const BH = ROWS * T;
export const FLOOR = 0;
export const WALL = 1;
export const BLOCK = 2;
export const WATER = 3;
const RIVER_COL = 8;
const BRIDGES = [2, 5, 8];
const PIRANHA_CYCLE = 2.4;
const PIRANHA_WARN = 1.1;
const PIRANHA_BITE = 0.5;
const SEAL_LANES = [3, 7];
const SEAL_CYCLE = 5;
const SEAL_WARN = 1.2;
const SEAL_SPEED = 10;
const BEAR_SPEED = 2.4;
const BEAR_PATH = (() => {
  const path = [];
  for (let c = 3; c <= 13; c += 1) path.push([c, 3]);
  for (let r = 4; r <= 7; r += 1) path.push([13, r]);
  for (let c = 12; c >= 3; c -= 1) path.push([c, 7]);
  for (let r = 6; r >= 4; r -= 1) path.push([3, r]);
  return path;
})();
const onBearPath = (c, r) => BEAR_PATH.some(([pc, pr]) => pc === c && pr === r);
export const FUSE = 2.5;
export const FLAME_TIME = 0.55;
export const SUDDEN_AT = 90;
export const SUDDEN_STEP = 0.4;
export const CONQUEST_TIME = 120;
export const RESPAWN = 3;
export const SHIELD = 2;
export const SLOT_COLORS = ['#ff8a5c', '#4fc3ff', '#b57bff', '#4ed38f'];
export const RULES = {
  survival: { name: 'Supervivencia', text: 'El último en pie gana.' },
  conquest: { name: 'Conquista', text: 'Pinta el piso con tus explosiones. Gana quien tenga más cuadros.' },
};
export const SPAWNS = [
  [1, 1],
  [COLS - 2, ROWS - 2],
  [COLS - 2, 1],
  [1, ROWS - 2],
];
export const POWERS = {
  bomb: { label: 'Bomba extra', max: 6 },
  fire: { label: 'Más alcance', max: 7 },
  speed: { label: 'Velocidad', max: 4 },
};
export const BOT_LEVELS = {
  facil: { label: 'Fácil', wait: 0.38, aggro: 0.45, hunt: false, bonus: 0 },
  medio: { label: 'Medio', wait: 0.14, aggro: 0.75, hunt: true, bonus: 40 },
  dificil: { label: 'Difícil', wait: 0, aggro: 0.95, hunt: true, bonus: 80 },
};

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_LIST = Object.entries(DIRS);

export const idx = (c, r) => r * COLS + c;
const inside = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

const border = (c, r) => c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
const grid = (c, r) => c % 2 === 0 && r % 2 === 0;

function fortWall(c, r) {
  if (grid(c, r)) return true;
  if ((r === 3 || r === 7) && c >= 5 && c <= 11) return !(r === 3 && c === 7) && !(r === 7 && c === 9);
  if ((c === 5 || c === 11) && r >= 3 && r <= 7) return r !== 5;
  return false;
}

function mazeWall(c, r) {
  if (grid(c, r)) return true;
  if (c % 2 === 0 && r % 2 === 1 && c > 2 && c < COLS - 3) return (c / 2 + (r - 1) / 2) % 3 === 0;
  if (c % 2 === 1 && r % 2 === 0 && r > 1 && r < ROWS - 2 && c > 2 && c < COLS - 3) return ((c - 1) / 2 + r / 2) % 4 === 1;
  return false;
}

export const MAPS = {
  clasico: { name: 'Clásico', text: 'Pilares de hielo y mucha nieve.', density: 0.72, wall: grid },
  fortaleza: { name: 'Fortaleza', text: 'Un fuerte en el centro con poderes adentro.', density: 0.62, wall: fortWall, vault: (c, r) => c > 5 && c < 11 && r > 3 && r < 7 },
  abierto: { name: 'Pista abierta', text: 'Pocos pilares y mucho espacio.', density: 0.5, wall: (c, r) => c % 4 === 0 && r % 4 === 0 },
  cruce: { name: 'Cruce', text: 'Dos avenidas despejadas en cruz.', density: 0.8, wall: grid, open: (c, r) => r === 5 || c === 7 || c === 9 },
  laberinto: { name: 'Laberinto', text: 'Pasillos estrechos y esquinas peligrosas.', density: 0.55, wall: mazeWall },
  rio: {
    name: 'Río de pirañas',
    text: 'Cruza por los puentes antes de que salten las pirañas.',
    density: 0.62,
    wall: (c, r) => grid(c, r) && c !== RIVER_COL,
    water: (c, r) => c === RIVER_COL && !BRIDGES.includes(r),
    open: (c) => c === RIVER_COL,
    hazard: 'piranhas',
  },
  focas: { name: 'Carril de focas', text: 'Las focas pasan deslizándose por los carriles.', density: 0.68, wall: grid, open: (c, r) => SEAL_LANES.includes(r), hazard: 'seals' },
  oso: { name: 'Guarida del oso', text: 'Un oso polar patrulla el centro del mapa.', density: 0.6, wall: grid, open: onBearPath, hazard: 'bear' },
};
export const MAP_KEYS = Object.keys(MAPS);

export function resolveMap(key, seed) {
  return MAPS[key] ? key : MAP_KEYS[seed % MAP_KEYS.length];
}

let currentWall = grid;
function isPillar(c, r) {
  return border(c, r) || currentWall(c, r);
}

function makeSpiral() {
  const order = [];
  for (let k = 0; 1 + k <= COLS - 2 - k && 1 + k <= ROWS - 2 - k; k += 1) {
    const left = 1 + k;
    const right = COLS - 2 - k;
    const top = 1 + k;
    const bottom = ROWS - 2 - k;
    for (let c = left; c <= right; c += 1) order.push([c, top]);
    for (let r = top + 1; r <= bottom; r += 1) order.push([right, r]);
    if (bottom > top) for (let c = right - 1; c >= left; c -= 1) order.push([c, bottom]);
    if (right > left) for (let r = bottom - 1; r > top; r -= 1) order.push([left, r]);
  }
  return [...new Set(order.map(([c, r]) => `${c},${r}`))]
    .map((key) => key.split(',').map(Number))
    .filter(([c, r]) => !isPillar(c, r))
    .map(([c, r]) => idx(c, r));
}

export function makeBoard(seed, mapKey = 'clasico') {
  const map = MAPS[mapKey] || MAPS.clasico;
  currentWall = map.wall;
  const rnd = rngFrom(seed);
  const cells = new Uint8Array(COLS * ROWS);
  const hidden = {};
  const clear = new Set();
  SPAWNS.forEach(([c, r]) =>
    [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => clear.add(idx(c + dx, r + dy))),
  );
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const i = idx(c, r);
      const vault = map.vault?.(c, r);
      if (isPillar(c, r)) cells[i] = WALL;
      else if (map.water?.(c, r)) cells[i] = WATER;
      else if (!clear.has(i) && !map.open?.(c, r) && (vault || rnd() < map.density)) {
        cells[i] = BLOCK;
        if (rnd() < (vault ? 0.85 : 0.34)) {
          const roll = rnd();
          hidden[i] = roll < 0.38 ? 'bomb' : roll < 0.76 ? 'fire' : 'speed';
        }
      }
    }
  }
  const spiral = makeSpiral();
  currentWall = grid;
  return { cells, hidden, powerups: {}, spiral, hazard: map.hazard || null, bridges: map.hazard === 'piranhas' ? BRIDGES.map((r) => idx(RIVER_COL, r)) : [] };
}

function hash(seed, n) {
  let h = (seed ^ Math.imul(n + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

export function hazardState(st, t = st.time) {
  const kind = st.board.hazard;
  if (kind === 'piranhas') {
    const cycle = Math.floor(t / PIRANHA_CYCLE);
    const phase = t - cycle * PIRANHA_CYCLE;
    const bridge = st.board.bridges[hash(st.config.seed, cycle) % st.board.bridges.length];
    const bite = phase >= PIRANHA_WARN && phase < PIRANHA_WARN + PIRANHA_BITE;
    return { kind, bridge, warn: phase < PIRANHA_WARN, bite, k: bite ? (phase - PIRANHA_WARN) / PIRANHA_BITE : phase / PIRANHA_WARN };
  }
  if (kind === 'seals') {
    return {
      kind,
      seals: SEAL_LANES.map((row, lane) => {
        const shifted = t + lane * (SEAL_CYCLE / 2);
        const cycle = Math.floor(shifted / SEAL_CYCLE);
        const phase = shifted - cycle * SEAL_CYCLE;
        const dir = (cycle + lane) % 2 ? 1 : -1;
        const entry = dir > 0 ? 0 : COLS - 1;
        const travel = (COLS - 1) / SEAL_SPEED;
        const sliding = phase >= SEAL_WARN && phase < SEAL_WARN + travel;
        return { row, dir, entry, warn: phase < SEAL_WARN, sliding, x: sliding ? entry + dir * (phase - SEAL_WARN) * SEAL_SPEED : null, phase };
      }),
    };
  }
  if (kind === 'bear') {
    const total = BEAR_PATH.length;
    const d = (t * BEAR_SPEED) % total;
    const i = Math.floor(d);
    const [c0, r0] = BEAR_PATH[i];
    const [c1, r1] = BEAR_PATH[(i + 1) % total];
    const k = d - i;
    return { kind, x: c0 + (c1 - c0) * k, y: r0 + (r1 - r0) * k, face: c1 > c0 ? 1 : c1 < c0 ? -1 : 0 };
  }
  return null;
}

const HAZARD_TEXT = { piranhas: '¡Pirañas!', seals: '¡Foca!', bear: '¡El oso!' };

function hazardHits(st, p) {
  const h = hazardState(st);
  if (!h) return false;
  if (h.kind === 'piranhas') return h.bite && idx(...cellOf(p)) === h.bridge;
  if (h.kind === 'seals') return h.seals.some((s) => s.sliding && Math.abs(p.y - s.row) < 0.6 && Math.abs(p.x - s.x) < 0.8);
  return Math.hypot(p.x - h.x, p.y - h.y) < 0.75;
}

function hazardDanger(st, danger) {
  const kind = st.board.hazard;
  if (!kind) return;
  if (kind === 'piranhas') {
    for (let ahead = 0; ahead <= 1; ahead += 1) {
      const cycle = Math.floor(st.time / PIRANHA_CYCLE) + ahead;
      const strikeAt = cycle * PIRANHA_CYCLE + PIRANHA_WARN - st.time;
      if (strikeAt + PIRANHA_BITE < 0 || strikeAt > 2) continue;
      const bridge = st.board.bridges[hash(st.config.seed, cycle) % st.board.bridges.length];
      danger[bridge] = Math.min(danger[bridge], Math.max(0, strikeAt));
    }
    return;
  }
  if (kind === 'seals') {
    hazardState(st).seals.forEach((s) => {
      if (!s.warn && !s.sliding && s.phase < SEAL_CYCLE - 1.5) return;
      for (let c = 1; c < COLS - 1; c += 1) {
        const i = idx(c, s.row);
        const arrive = SEAL_WARN + Math.abs(c - s.entry) / SEAL_SPEED - s.phase;
        const passed = s.sliding && (c - s.x) * s.dir < -1;
        if (!passed && arrive < 2) danger[i] = Math.min(danger[i], Math.max(0, arrive));
      }
    });
    return;
  }
  for (let k = 0; k <= 4; k += 1) {
    const h = hazardState(st, st.time + k * 0.3);
    const c = Math.round(h.x);
    const r = Math.round(h.y);
    [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => {
      if (inside(c + dx, r + dy)) danger[idx(c + dx, r + dy)] = Math.min(danger[idx(c + dx, r + dy)], k * 0.3);
    });
  }
}

export function createState(config) {
  const board = makeBoard(config.seed, config.map);
  const conquest = config.rules === 'conquest';
  let paintable = 0;
  board.cells.forEach((cell) => cell !== WALL && cell !== WATER && (paintable += 1));
  const players = config.players.map((pl, slot) => {
    const [c, r] = SPAWNS[slot];
    return {
      slot,
      name: pl.name,
      kind: pl.kind,
      colors: pl.colors,
      controller: pl.controller,
      uid: pl.uid,
      x: c,
      y: r,
      dir: null,
      held: [],
      face: c < COLS / 2 ? 1 : -1,
      alive: true,
      deadAt: 0,
      maxBombs: 1,
      fire: 2,
      speed: 0,
      bombsOut: 0,
      passing: new Set(),
      blocks: 0,
      kills: 0,
      by: -1,
      seq: 0,
      target: null,
      wait: 0,
      ex: 0,
      ey: 0,
      shield: 0,
    };
  });
  return {
    config,
    conquest,
    board,
    paint: new Int8Array(COLS * ROWS).fill(-1),
    paintable,
    players,
    bombs: [],
    flames: new Float32Array(COLS * ROWS),
    flameOwner: new Int8Array(COLS * ROWS).fill(-1),
    fallen: [],
    seenBombs: new Set(),
    texts: [],
    time: 0,
    suddenClock: 0,
    suddenIndex: 0,
    bombCounter: 0,
    endAt: 0,
    over: false,
    winner: null,
  };
}

const bombAt = (st, i) => st.bombs.find((b) => idx(b.c, b.r) === i);

function walkable(st, c, r, p) {
  if (!inside(c, r)) return false;
  const i = idx(c, r);
  if (st.board.cells[i] !== FLOOR) return false;
  const b = bombAt(st, i);
  return !b || (p && p.passing.has(b.id));
}

export function speedOf(p) {
  return 3.4 + p.speed * 0.5;
}

export function cellOf(p) {
  return [Math.round(p.x), Math.round(p.y)];
}

function moveDir(st, p, dir, dist) {
  const [dx, dy] = DIRS[dir];
  const horizontal = dx !== 0;
  let along = horizontal ? p.x : p.y;
  let across = horizontal ? p.y : p.x;
  const sign = horizontal ? dx : dy;
  const crossCell = Math.round(across);
  const offset = across - crossCell;
  const openAt = (a, b) => (horizontal ? walkable(st, a, b, p) : walkable(st, b, a, p));
  let rest = dist;
  if (Math.abs(offset) > 0.001) {
    const alongCell = Math.round(along);
    let toward = crossCell;
    if (!openAt(alongCell + sign, crossCell) && Math.abs(offset) > 0.2) {
      const alt = crossCell + Math.sign(offset);
      if (openAt(alongCell + sign, alt) && openAt(alongCell, alt)) toward = alt;
    }
    const gap = toward - across;
    const step = Math.min(Math.abs(gap), rest);
    across += Math.sign(gap) * step;
    rest -= step;
    if (Math.abs(toward - across) > 0.001) {
      if (horizontal) p.y = across;
      else p.x = across;
      return;
    }
    across = toward;
  }
  const alongCell = Math.round(along);
  if (openAt(alongCell + sign, Math.round(across))) along += sign * rest;
  else along = sign > 0 ? Math.min(along + rest, alongCell) : Math.max(along - rest, alongCell);
  if (horizontal) {
    p.x = along;
    p.y = across;
    p.face = sign;
  } else {
    p.y = along;
    p.x = across;
  }
}

export function placeBomb(st, p, remote) {
  if (!p.alive) return null;
  const [c, r] = remote ? [remote.c, remote.r] : cellOf(p);
  const i = idx(c, r);
  if (st.board.cells[i] !== FLOOR || bombAt(st, i)) return null;
  if (!remote && p.bombsOut >= p.maxBombs) return null;
  st.bombCounter += 1;
  const b = remote || { id: `${p.slot}-${st.bombCounter}-${Math.round(st.time * 1000)}`, c, r, fire: p.fire };
  const bomb = { id: b.id, c: b.c, r: b.r, fire: b.fire, owner: p.slot, t: remote ? FUSE - 0.15 : FUSE };
  st.bombs.push(bomb);
  st.seenBombs.add(bomb.id);
  p.bombsOut += 1;
  st.players.forEach((q) => {
    if (q.alive && Math.abs(q.x - bomb.c) < 1 && Math.abs(q.y - bomb.r) < 1) q.passing.add(bomb.id);
  });
  return b;
}

function blastCells(st, b, cells = st.board.cells) {
  const list = [idx(b.c, b.r)];
  DIR_LIST.forEach(([, [dx, dy]]) => {
    for (let k = 1; k <= b.fire; k += 1) {
      const c = b.c + dx * k;
      const r = b.r + dy * k;
      if (!inside(c, r)) break;
      const i = idx(c, r);
      if (cells[i] === WALL) break;
      list.push(i);
      if (cells[i] === BLOCK || bombAt(st, i)) break;
    }
  });
  return list;
}

function explode(st, b) {
  st.bombs = st.bombs.filter((x) => x !== b);
  const owner = st.players[b.owner];
  if (owner) owner.bombsOut = Math.max(0, owner.bombsOut - 1);
  blastCells(st, b).forEach((i) => {
    st.flames[i] = FLAME_TIME;
    st.flameOwner[i] = b.owner;
    if (st.conquest && st.board.cells[i] !== WATER) st.paint[i] = b.owner;
    if (st.board.cells[i] === BLOCK) {
      st.board.cells[i] = FLOOR;
      if (owner) owner.blocks += 1;
      if (st.board.hidden[i]) {
        st.board.powerups[i] = { type: st.board.hidden[i], born: st.time };
        delete st.board.hidden[i];
      }
    } else if (st.board.powerups[i] && st.time - st.board.powerups[i].born > 0.2) {
      delete st.board.powerups[i];
    }
    const chained = bombAt(st, i);
    if (chained && chained !== b) chained.t = Math.min(chained.t, 0.06);
  });
  st.shake = 7;
}

export function killPlayer(st, p, by) {
  if (!p.alive) return;
  p.alive = false;
  p.deadAt = st.time;
  p.by = by;
  if (by >= 0 && by !== p.slot && st.players[by]) st.players[by].kills += 1;
}

function dangerMap(st, extra) {
  const danger = new Float32Array(COLS * ROWS).fill(Infinity);
  for (let i = 0; i < danger.length; i += 1) if (st.flames[i] > 0) danger[i] = 0;
  const bombs = (extra ? [...st.bombs, extra] : st.bombs).map((b) => ({ ...b, cells: blastCells(st, b) }));
  for (let pass = 0; pass < 3; pass += 1) {
    bombs.forEach((a) =>
      bombs.forEach((b) => {
        if (a !== b && b.t > a.t && a.cells.includes(idx(b.c, b.r))) b.t = a.t;
      }),
    );
  }
  bombs.forEach((b) => b.cells.forEach((i) => (danger[i] = Math.min(danger[i], b.t))));
  hazardDanger(st, danger);
  if (!st.conquest && st.time > SUDDEN_AT - 4) st.board.spiral.slice(st.suddenIndex, st.suddenIndex + 8).forEach((i) => (danger[i] = Math.min(danger[i], 1)));
  return danger;
}

function bfs(st, p, start, blocked) {
  const prev = new Int32Array(COLS * ROWS).fill(-2);
  const dist = new Int32Array(COLS * ROWS).fill(-1);
  const startI = idx(start[0], start[1]);
  prev[startI] = -1;
  dist[startI] = 0;
  const queue = [startI];
  for (let q = 0; q < queue.length; q += 1) {
    const i = queue[q];
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    DIR_LIST.forEach(([, [dx, dy]]) => {
      const nc = c + dx;
      const nr = r + dy;
      if (!walkable(st, nc, nr, p)) return;
      const ni = idx(nc, nr);
      if (prev[ni] !== -2 || blocked(ni, dist[i] + 1)) return;
      prev[ni] = i;
      dist[ni] = dist[i] + 1;
      queue.push(ni);
    });
  }
  return { prev, dist, order: queue };
}

function firstStep(prev, from, to) {
  let i = to;
  while (prev[i] !== from && prev[i] >= 0) i = prev[i];
  return prev[i] === from ? i : -1;
}

function enemyInLine(st, p, c, r) {
  return st.players.some((q) => {
    if (!q.alive || q === p) return false;
    const [qc, qr] = cellOf(q);
    return blastCells(st, { c, r, fire: p.fire }).includes(idx(qc, qr));
  });
}

function nextToBlock(st, c, r) {
  return DIR_LIST.some(([, [dx, dy]]) => inside(c + dx, r + dy) && st.board.cells[idx(c + dx, r + dy)] === BLOCK);
}

function paintGain(st, p, c, r) {
  return blastCells(st, { c, r, fire: p.fire }).filter((i) => st.paint[i] !== p.slot).length;
}

export function paintCounts(st) {
  const counts = st.players.map(() => 0);
  for (let i = 0; i < st.paint.length; i += 1) if (st.paint[i] >= 0 && counts[st.paint[i]] != null) counts[st.paint[i]] += 1;
  return counts;
}

function escapeFrom(st, p, here, danger, limit) {
  const tps = speedOf(p);
  const search = bfs(st, p, here, (ni, d) => danger[ni] < d / tps + 0.25);
  const hereI = idx(here[0], here[1]);
  for (const i of search.order) {
    if (danger[i] === Infinity && search.dist[i] <= limit) return i === hereI ? hereI : firstStep(search.prev, hereI, i);
  }
  return -1;
}

function botThink(st, p, rnd) {
  const level = BOT_LEVELS[st.config.level] || BOT_LEVELS.medio;
  const here = cellOf(p);
  const hereI = idx(here[0], here[1]);
  const danger = dangerMap(st);
  if (danger[hereI] < Infinity) {
    const step = escapeFrom(st, p, here, danger, 12);
    if (step >= 0 && step !== hereI) p.target = step;
    return;
  }
  const wantsBomb = enemyInLine(st, p, here[0], here[1]) || nextToBlock(st, here[0], here[1]) || (st.conquest && paintGain(st, p, here[0], here[1]) >= 4);
  if (p.bombsOut < p.maxBombs && wantsBomb && rnd() < level.aggro) {
    const hypo = dangerMap(st, { c: here[0], r: here[1], fire: p.fire, t: FUSE });
    const step = escapeFrom(st, p, here, hypo, 6);
    if (step >= 0 && step !== hereI) {
      placeBomb(st, p);
      p.target = step;
      return;
    }
  }
  const search = bfs(st, p, here, (ni) => danger[ni] < Infinity);
  let best = -1;
  let bestScore = -Infinity;
  for (const i of search.order) {
    if (i === hereI) continue;
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const d = search.dist[i];
    let score = -d;
    if (st.board.powerups[i]) score += 14;
    if (nextToBlock(st, c, r)) score += 5;
    if (level.hunt && enemyInLine(st, p, c, r)) score += st.conquest ? 3 : 7;
    if (st.conquest && d < 7) score += paintGain(st, p, c, r) * 0.8;
    score += rnd() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best >= 0) {
    const step = firstStep(search.prev, hereI, best);
    if (step >= 0) p.target = step;
  }
}

function moveBot(st, p, dt, rnd) {
  const level = BOT_LEVELS[st.config.level] || BOT_LEVELS.medio;
  if (p.wait > 0) {
    p.wait -= dt;
    return;
  }
  if (p.target == null) {
    botThink(st, p, rnd);
    if (p.target == null) p.wait = 0.2;
    return;
  }
  const tc = p.target % COLS;
  const tr = Math.floor(p.target / COLS);
  const dist = speedOf(p) * dt;
  const gx = tc - p.x;
  const gy = tr - p.y;
  if (Math.abs(gx) + Math.abs(gy) <= dist) {
    p.x = tc;
    p.y = tr;
    p.target = null;
    p.wait = level.wait * (0.5 + rnd());
    return;
  }
  if (!walkable(st, tc, tr, p)) {
    p.target = null;
    return;
  }
  if (Math.abs(gx) > 0.001) moveDir(st, p, gx > 0 ? 'right' : 'left', Math.min(dist, Math.abs(gx)));
  else moveDir(st, p, gy > 0 ? 'down' : 'up', Math.min(dist, Math.abs(gy)));
}

export function step(st, dt, hooks = {}) {
  if (st.over) return;
  st.time += dt;
  const rnd = st.rnd || (st.rnd = rngFrom((st.config.seed ^ 0x9e3779b9) >>> 0));

  st.players.forEach((p) => {
    if (!p.alive) {
      if (st.conquest && p.controller !== 'remote' && !p.left && st.time - p.deadAt >= RESPAWN && st.time < CONQUEST_TIME) {
        const [c, r] = SPAWNS[p.slot];
        Object.assign(p, { alive: true, x: c, y: r, dir: null, held: [], target: null, wait: 0, shield: SHIELD });
        p.passing.clear();
        hooks.onRevive?.(p);
      }
      return;
    }
    if (p.shield > 0) p.shield = Math.max(0, p.shield - dt);
    if (p.controller === 'bot') moveBot(st, p, dt, rnd);
    else if (p.dir) moveDir(st, p, p.dir, speedOf(p) * dt);
    if (p.controller === 'remote' && (p.ex || p.ey)) {
      const kx = p.ex * 0.18;
      const ky = p.ey * 0.18;
      p.x += kx;
      p.y += ky;
      p.ex -= kx;
      p.ey -= ky;
      if (Math.abs(p.ex) < 0.01) p.ex = 0;
      if (Math.abs(p.ey) < 0.01) p.ey = 0;
    }
    p.passing.forEach((id) => {
      const b = st.bombs.find((x) => x.id === id);
      if (!b || Math.abs(p.x - b.c) >= 1 || Math.abs(p.y - b.r) >= 1) p.passing.delete(id);
    });
    if (p.controller !== 'remote') {
      const [c, r] = cellOf(p);
      const i = idx(c, r);
      const pu = st.board.powerups[i];
      if (pu) {
        delete st.board.powerups[i];
        if (pu.type === 'bomb') p.maxBombs = Math.min(POWERS.bomb.max, p.maxBombs + 1);
        else if (pu.type === 'fire') p.fire = Math.min(POWERS.fire.max, p.fire + 1);
        else p.speed = Math.min(POWERS.speed.max, p.speed + 1);
        st.texts.push({ x: p.x, y: p.y - 0.6, text: POWERS[pu.type].label, life: 1.2 });
        hooks.onPick?.(p, i);
      }
    }
  });

  st.bombs.forEach((b) => (b.t -= dt));
  for (let guard = 0; guard < 20; guard += 1) {
    const ready = st.bombs.find((b) => b.t <= 0);
    if (!ready) break;
    explode(st, ready);
  }
  for (let i = 0; i < st.flames.length; i += 1) if (st.flames[i] > 0) st.flames[i] = Math.max(0, st.flames[i] - dt);

  if (!st.conquest && st.time >= SUDDEN_AT && st.suddenIndex < st.board.spiral.length) {
    st.suddenClock += dt;
    while (st.suddenClock >= SUDDEN_STEP && st.suddenIndex < st.board.spiral.length) {
      st.suddenClock -= SUDDEN_STEP;
      const i = st.board.spiral[st.suddenIndex];
      st.suddenIndex += 1;
      st.board.cells[i] = WALL;
      delete st.board.powerups[i];
      delete st.board.hidden[i];
      st.bombs = st.bombs.filter((b) => {
        if (idx(b.c, b.r) !== i) return true;
        const owner = st.players[b.owner];
        if (owner) owner.bombsOut = Math.max(0, owner.bombsOut - 1);
        return false;
      });
      st.fallen.push({ i, t: 0 });
      st.players.forEach((p) => {
        if (p.alive && p.controller !== 'remote' && idx(...cellOf(p)) === i) {
          killPlayer(st, p, -1);
          hooks.onDeath?.(p);
        }
      });
    }
  }
  st.fallen.forEach((f) => (f.t += dt));
  st.fallen = st.fallen.filter((f) => f.t < 0.6);

  st.players.forEach((p) => {
    if (!p.alive || p.controller === 'remote' || p.shield > 0) return;
    const i = idx(...cellOf(p));
    if (st.flames[i] > 0) {
      killPlayer(st, p, st.flameOwner[i]);
      hooks.onDeath?.(p);
    } else if (hazardHits(st, p)) {
      killPlayer(st, p, -2);
      st.texts.push({ x: p.x, y: p.y - 0.6, text: HAZARD_TEXT[st.board.hazard], life: 1.4 });
      hooks.onDeath?.(p);
    }
  });

  st.texts.forEach((t) => {
    t.life -= dt;
    t.y -= dt * 0.6;
  });
  st.texts = st.texts.filter((t) => t.life > 0);
  if (st.shake > 0.2) st.shake *= 0.85;

  if (st.conquest) {
    const playing = st.players.filter((p) => !p.left);
    if (st.time >= CONQUEST_TIME || playing.length <= 1) {
      st.over = true;
      st.winner = conquestWinner(st);
      hooks.onOver?.(st.winner);
    }
    return;
  }
  const alive = st.players.filter((p) => p.alive);
  if (alive.length <= 1 && !st.endAt) st.endAt = st.time + 1.1;
  if (st.endAt && st.time >= st.endAt) {
    const still = st.players.filter((p) => p.alive);
    st.over = true;
    st.winner = still.length === 1 ? still[0].slot : -1;
    hooks.onOver?.(st.winner);
  }
}

export function conquestWinner(st) {
  const counts = paintCounts(st);
  const playing = st.players.filter((p) => !p.left);
  if (playing.length === 1) return playing[0].slot;
  const best = Math.max(...counts);
  const top = counts.map((n, i) => (n === best ? i : -1)).filter((i) => i >= 0);
  return best > 0 && top.length === 1 ? top[0] : -1;
}

export function encodePaint(st) {
  return Array.from(st.paint, (v) => (v < 0 ? '.' : String(v))).join('');
}

export function applyRemote(st, slot, data) {
  const p = st.players[slot];
  if (!p || !data || data.seq <= p.seq) return;
  p.seq = data.seq;
  if (data.left) p.left = true;
  if (st.conquest && slot === 0 && st.config.me !== 0 && typeof data.paint === 'string' && data.paint.length === st.paint.length) {
    for (let i = 0; i < st.paint.length; i += 1) st.paint[i] = data.paint[i] === '.' ? -1 : Number(data.paint[i]);
  }
  if (st.conquest && data.alive && !p.alive && !data.left) {
    Object.assign(p, { alive: true, x: data.x, y: data.y, ex: 0, ey: 0, shield: SHIELD });
    p.passing.clear();
  }
  p.fire = data.fire ?? p.fire;
  p.maxBombs = data.maxBombs ?? p.maxBombs;
  p.speed = data.speed ?? p.speed;
  p.dir = data.dir || null;
  if (typeof data.x === 'number' && p.alive) {
    const ex = data.x - p.x;
    const ey = data.y - p.y;
    if (Math.abs(ex) + Math.abs(ey) > 1.5) {
      p.x = data.x;
      p.y = data.y;
      p.ex = 0;
      p.ey = 0;
    } else {
      p.ex = ex;
      p.ey = ey;
    }
  }
  (data.bombs || []).forEach((b) => {
    if (st.seenBombs.has(b.id)) return;
    placeBomb(st, p, b);
  });
  (data.picks || []).forEach((i) => delete st.board.powerups[i]);
  if (data.alive === false && p.alive) killPlayer(st, p, data.by ?? -1);
}

export function bomberScore(st, slot, won) {
  const p = st.players[slot];
  if (!p) return 0;
  const level = BOT_LEVELS[st.config.level];
  const bonus = won ? 120 + (st.config.mode === 'online' ? 60 : level?.bonus || 0) : 0;
  if (st.conquest) return Math.round(paintCounts(st)[slot] / 2) + p.kills * 15 + bonus;
  return p.blocks * 2 + p.kills * 40 + (won ? 120 + (st.config.mode === 'online' ? 60 : level?.bonus || 0) : 0);
}
