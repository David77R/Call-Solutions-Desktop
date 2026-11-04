import { rngFrom } from './catArtillery';

export const COLS = 17;
export const ROWS = 11;
export const T = 44;
export const BW = COLS * T;
export const BH = ROWS * T;
export const FLOOR = 0;
export const WALL = 1;
export const BLOCK = 2;
export const FUSE = 2.5;
export const FLAME_TIME = 0.55;
export const SUDDEN_AT = 90;
export const SUDDEN_STEP = 0.4;
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

function isPillar(c, r) {
  return c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1 || (c % 2 === 0 && r % 2 === 0);
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

export function makeBoard(seed) {
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
      if (isPillar(c, r)) cells[i] = WALL;
      else if (!clear.has(i) && rnd() < 0.72) {
        cells[i] = BLOCK;
        if (rnd() < 0.34) {
          const roll = rnd();
          hidden[i] = roll < 0.38 ? 'bomb' : roll < 0.76 ? 'fire' : 'speed';
        }
      }
    }
  }
  return { cells, hidden, powerups: {}, spiral: makeSpiral() };
}

export function createState(config) {
  const board = makeBoard(config.seed);
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
    };
  });
  return {
    config,
    board,
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
  if (st.time > SUDDEN_AT - 4) st.board.spiral.slice(st.suddenIndex, st.suddenIndex + 8).forEach((i) => (danger[i] = Math.min(danger[i], 1)));
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
  if (p.bombsOut < p.maxBombs && (enemyInLine(st, p, here[0], here[1]) || nextToBlock(st, here[0], here[1])) && rnd() < level.aggro) {
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
    if (level.hunt && enemyInLine(st, p, c, r)) score += 7;
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
    if (!p.alive) return;
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

  if (st.time >= SUDDEN_AT && st.suddenIndex < st.board.spiral.length) {
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
    if (!p.alive || p.controller === 'remote') return;
    const i = idx(...cellOf(p));
    if (st.flames[i] > 0) {
      killPlayer(st, p, st.flameOwner[i]);
      hooks.onDeath?.(p);
    }
  });

  st.texts.forEach((t) => {
    t.life -= dt;
    t.y -= dt * 0.6;
  });
  st.texts = st.texts.filter((t) => t.life > 0);
  if (st.shake > 0.2) st.shake *= 0.85;

  const alive = st.players.filter((p) => p.alive);
  if (alive.length <= 1 && !st.endAt) st.endAt = st.time + 1.1;
  if (st.endAt && st.time >= st.endAt) {
    const still = st.players.filter((p) => p.alive);
    st.over = true;
    st.winner = still.length === 1 ? still[0].slot : -1;
    hooks.onOver?.(st.winner);
  }
}

export function applyRemote(st, slot, data) {
  const p = st.players[slot];
  if (!p || !data || data.seq <= p.seq) return;
  p.seq = data.seq;
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
  return p.blocks * 2 + p.kills * 40 + (won ? 120 + (st.config.mode === 'online' ? 60 : level?.bonus || 0) : 0);
}
