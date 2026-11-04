export const HW = 960;
export const HH = 540;
export const RINK = { l: 34, r: HW - 34, t: 34, b: HH - 34 };
export const GOAL_HALF = 82;
export const PUCK_R = 17;
export const MALLET_R = 31;
export const WIN_GOALS = 7;
export const MATCH_TIME = 180;
export const SERVE_PAUSE = 1.3;
const MAX_PUCK = 1500;
const RESTITUTION_WALL = 0.88;
const RESTITUTION_HIT = 0.92;
const FRICTION = 0.72;
const KEY_SPEED = 620;
const HAND_SPEED = 2400;

export const HOCKEY_LEVELS = {
  facil: { label: 'Fácil', speed: 360, react: 0.28, aim: 0.5, bonus: 0 },
  medio: { label: 'Medio', speed: 560, react: 0.14, aim: 0.25, bonus: 40 },
  dificil: { label: 'Difícil', speed: 780, react: 0.05, aim: 0.08, bonus: 90 },
};

const CY = (RINK.t + RINK.b) / 2;
const CX = HW / 2;

export function homeOf(side) {
  return { x: side === 0 ? RINK.l + 90 : RINK.r - 90, y: CY };
}

export function createMatch(config) {
  return {
    config,
    puck: { x: (config.seed || 0) % 2 ? CX + 140 : CX - 140, y: CY, vx: 0, vy: 0, spin: 0 },
    mallets: [0, 1].map((side) => {
      const h = homeOf(side);
      return { side, x: h.x, y: h.y, vx: 0, vy: 0, tx: h.x, ty: h.y, keys: { up: false, down: false, left: false, right: false }, pointer: false, think: 0, aimY: 0 };
    }),
    score: [0, 0],
    time: 0,
    pause: SERVE_PAUSE,
    golden: false,
    over: false,
    winner: null,
    lastGoal: null,
    hits: 0,
    sparks: [],
    flash: 0,
  };
}

function clampMallet(m, x, y) {
  const minX = m.side === 0 ? RINK.l + MALLET_R : CX + MALLET_R;
  const maxX = m.side === 0 ? CX - MALLET_R : RINK.r - MALLET_R;
  return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(RINK.t + MALLET_R, Math.min(RINK.b - MALLET_R, y)) };
}

export function setPointer(st, side, x, y) {
  const m = st.mallets[side];
  const c = clampMallet(m, x, y);
  m.tx = c.x;
  m.ty = c.y;
  m.pointer = true;
}

export function setKey(st, side, dir, down) {
  const m = st.mallets[side];
  m.keys[dir] = down;
  if (down) m.pointer = false;
}

function botTarget(st, m, dt) {
  const level = HOCKEY_LEVELS[st.config.level] || HOCKEY_LEVELS.medio;
  m.think -= dt;
  if (m.retreat > 0) {
    m.retreat -= dt;
    const home = homeOf(m.side);
    m.tx = home.x;
    m.ty = home.y;
    return;
  }
  if (m.think > 0) return;
  m.think = level.react;
  const p = st.puck;
  const dirToOwn = m.side === 0 ? -1 : 1;
  const reach = MALLET_R + PUCK_R - 8;
  const inMyHalf = m.side === 0 ? p.x < CX + reach : p.x > CX - reach;
  const coming = Math.sign(p.vx) === dirToOwn;
  if (inMyHalf && (Math.hypot(p.vx, p.vy) < 520 || !coming)) {
    if (!m.aimY || Math.random() < 0.3) m.aimY = (Math.random() - 0.5) * GOAL_HALF * 2 * level.aim * 3;
    const goalX = m.side === 0 ? RINK.r : RINK.l;
    const ax = goalX - p.x;
    const ay = CY + m.aimY - p.y;
    const len = Math.hypot(ax, ay) || 1;
    const ux = ax / len;
    const uy = ay / len;
    const attack = m.side === 0 ? 1 : -1;
    const lead = (p.x - m.x) * attack;
    let tx;
    let ty;
    if (lead > PUCK_R * 0.5) {
      tx = p.x + ux * 36;
      ty = p.y + uy * 36;
    } else {
      const around = m.y < p.y ? -1 : 1;
      const clear = MALLET_R + PUCK_R + 10;
      const blocked = (around < 0 && p.y - clear < RINK.t + MALLET_R) || (around > 0 && p.y + clear > RINK.b - MALLET_R);
      tx = p.x - attack * clear;
      ty = p.y + (blocked ? -around : around) * (Math.abs(lead) < clear ? clear : 0);
    }
    const c = clampMallet(m, tx, ty);
    m.tx = c.x;
    m.ty = c.y;
    return;
  }
  let y = p.y;
  if (coming && Math.abs(p.vx) > 40) {
    const lineX = m.side === 0 ? RINK.l + 70 : RINK.r - 70;
    const t = (lineX - p.x) / p.vx;
    if (t > 0 && t < 2) {
      y = p.y + p.vy * t;
      const span = RINK.b - RINK.t - PUCK_R * 2;
      let k = (y - RINK.t - PUCK_R) % (span * 2);
      if (k < 0) k += span * 2;
      y = RINK.t + PUCK_R + (k > span ? span * 2 - k : k);
    }
  }
  const guardX = m.side === 0 ? RINK.l + 70 : RINK.r - 70;
  const c = clampMallet(m, guardX, CY + Math.max(-GOAL_HALF - 10, Math.min(GOAL_HALF + 10, y - CY)) * 0.95);
  m.tx = c.x;
  m.ty = c.y;
}

function moveMallet(st, m, dt) {
  const controller = st.config.players[m.side]?.controller;
  if (controller === 'bot') botTarget(st, m, dt);
  else if (controller === 'human' && !m.pointer) {
    const dx = (m.keys.right ? 1 : 0) - (m.keys.left ? 1 : 0);
    const dy = (m.keys.down ? 1 : 0) - (m.keys.up ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    const c = clampMallet(m, m.x + (dx / len) * KEY_SPEED * dt, m.y + (dy / len) * KEY_SPEED * dt);
    m.tx = c.x;
    m.ty = c.y;
  }
  const level = HOCKEY_LEVELS[st.config.level] || HOCKEY_LEVELS.medio;
  const limit = controller === 'bot' ? level.speed : controller === 'human' && !m.pointer ? KEY_SPEED : HAND_SPEED;
  const gx = m.tx - m.x;
  const gy = m.ty - m.y;
  const dist = Math.hypot(gx, gy);
  const stepLen = Math.min(dist, limit * dt);
  const nx = dist > 0 ? m.x + (gx / dist) * stepLen : m.x;
  const ny = dist > 0 ? m.y + (gy / dist) * stepLen : m.y;
  const c = clampMallet(m, nx, ny);
  if (st.pause > 0) {
    const dx = c.x - st.puck.x;
    const dy = c.y - st.puck.y;
    const d = Math.hypot(dx, dy);
    const min = MALLET_R + PUCK_R + 1;
    if (d < min) {
      const k = d > 0 ? min / d : 1;
      const pushed = clampMallet(m, st.puck.x + (d > 0 ? dx * k : -min), st.puck.y + (d > 0 ? dy * k : 0));
      c.x = pushed.x;
      c.y = pushed.y;
    }
  }
  m.vx = dt > 0 ? (c.x - m.x) / dt : 0;
  m.vy = dt > 0 ? (c.y - m.y) / dt : 0;
  m.x = c.x;
  m.y = c.y;
}

function spark(st, x, y, n, color) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 220;
    st.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.3, color });
  }
}

function collide(st, m, hooks) {
  const p = st.puck;
  const dx = p.x - m.x;
  const dy = p.y - m.y;
  const d = Math.hypot(dx, dy);
  const min = MALLET_R + PUCK_R;
  if (d >= min || d === 0) return;
  const nx = dx / d;
  const ny = dy / d;
  p.x = m.x + nx * min;
  p.y = m.y + ny * min;
  const rvx = p.vx - m.vx;
  const rvy = p.vy - m.vy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    p.vx -= (1 + RESTITUTION_HIT) * vn * nx;
    p.vy -= (1 + RESTITUTION_HIT) * vn * ny;
    p.spin = (rvx * ny - rvy * nx) * 0.01;
    if (vn > -40) return;
    st.hits += 1;
    const power = Math.min(1, -vn / 900);
    spark(st, p.x - nx * PUCK_R, p.y - ny * PUCK_R, 4 + Math.round(power * 8), '#bfefff');
    hooks.onHit?.(power);
  }
}

function resetAfterGoal(st, conceded) {
  st.puck = { x: conceded === 0 ? CX - 140 : CX + 140, y: CY, vx: 0, vy: 0, spin: 0 };
  st.mallets.forEach((m) => {
    const h = homeOf(m.side);
    Object.assign(m, { x: h.x, y: h.y, tx: h.x, ty: h.y, vx: 0, vy: 0 });
  });
  st.pause = SERVE_PAUSE;
}

function checkEnd(st, hooks) {
  const [a, b] = st.score;
  if (a >= WIN_GOALS || b >= WIN_GOALS || (st.golden && a !== b)) {
    st.over = true;
    st.winner = a > b ? 0 : 1;
    hooks.onOver?.(st.winner);
  }
}

export function stepMatch(st, dt, hooks = {}) {
  if (st.over) return;
  st.flash = Math.max(0, st.flash - dt);
  st.sparks.forEach((s) => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.9;
    s.vy *= 0.9;
    s.life -= dt;
  });
  st.sparks = st.sparks.filter((s) => s.life > 0);
  st.mallets.forEach((m) => moveMallet(st, m, dt));
  if (st.pause > 0) {
    st.pause = Math.max(0, st.pause - dt);
    return;
  }
  st.time += dt;
  if (st.golden && st.time >= MATCH_TIME + 60) {
    st.over = true;
    st.winner = -1;
    hooks.onOver?.(-1);
    return;
  }
  if (!st.golden && st.time >= MATCH_TIME) {
    if (st.score[0] === st.score[1]) {
      st.golden = true;
      hooks.onGolden?.();
    } else {
      st.over = true;
      st.winner = st.score[0] > st.score[1] ? 0 : 1;
      hooks.onOver?.(st.winner);
      return;
    }
  }
  const p = st.puck;
  const slow = Math.hypot(p.vx, p.vy) < 140;
  st.stuck = slow ? (st.stuck || 0) + dt : 0;
  if (st.stuck > 2.2) {
    st.stuck = 0;
    st.mallets.forEach((m) => {
      if (st.config.players[m.side]?.controller === 'bot') m.retreat = 0.7;
    });
  }
  const steps = 4;
  const h = dt / steps;
  for (let k = 0; k < steps; k += 1) {
    p.x += p.vx * h;
    p.y += p.vy * h;
    st.mallets.forEach((m) => collide(st, m, hooks));
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > MAX_PUCK) {
      p.vx = (p.vx / speed) * MAX_PUCK;
      p.vy = (p.vy / speed) * MAX_PUCK;
    }
    if (p.y - PUCK_R <= RINK.t) {
      p.y = RINK.t + PUCK_R;
      if (p.vy < 0) {
        p.vy = -p.vy * RESTITUTION_WALL;
        hooks.onWall?.();
      }
    } else if (p.y + PUCK_R >= RINK.b) {
      p.y = RINK.b - PUCK_R;
      if (p.vy > 0) {
        p.vy = -p.vy * RESTITUTION_WALL;
        hooks.onWall?.();
      }
    }
    const inMouth = Math.abs(p.y - CY) < GOAL_HALF - PUCK_R * 0.4;
    if (p.x - PUCK_R <= RINK.l && !inMouth) {
      p.x = RINK.l + PUCK_R;
      if (p.vx < 0) {
        p.vx = -p.vx * RESTITUTION_WALL;
        hooks.onWall?.();
      }
    } else if (p.x + PUCK_R >= RINK.r && !inMouth) {
      p.x = RINK.r - PUCK_R;
      if (p.vx > 0) {
        p.vx = -p.vx * RESTITUTION_WALL;
        hooks.onWall?.();
      }
    }
    if (p.x < RINK.l - PUCK_R || p.x > RINK.r + PUCK_R) {
      const scorer = p.x < CX ? 1 : 0;
      st.score[scorer] += 1;
      st.lastGoal = { scorer, at: st.time };
      st.flash = 1.2;
      spark(st, scorer === 1 ? RINK.l : RINK.r, CY, 30, '#ffd166');
      hooks.onGoal?.(scorer);
      resetAfterGoal(st, 1 - scorer);
      checkEnd(st, hooks);
      return;
    }
  }
  const decay = Math.pow(FRICTION, dt);
  p.vx *= decay;
  p.vy *= decay;
  p.spin *= decay;
}

export function setRemoteMallet(st, side, x, y, dt) {
  const m = st.mallets[side];
  const c = clampMallet(m, x, y);
  const span = Math.max(1 / 120, dt);
  m.vx = (c.x - m.x) / span;
  m.vy = (c.y - m.y) / span;
  m.x = c.x;
  m.y = c.y;
  m.tx = c.x;
  m.ty = c.y;
}

export function stepLocalOnly(st, dt, side) {
  moveMallet(st, st.mallets[side], dt);
  st.sparks.forEach((s) => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  });
  st.sparks = st.sparks.filter((s) => s.life > 0);
  st.flash = Math.max(0, st.flash - dt);
  if (st.pause > 0 || st.over) return;
  const p = st.puck;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.y - PUCK_R < RINK.t || p.y + PUCK_R > RINK.b) p.vy = -p.vy;
  p.y = Math.max(RINK.t + PUCK_R, Math.min(RINK.b - PUCK_R, p.y));
}

export function hockeyScore(st, side, won) {
  const level = HOCKEY_LEVELS[st.config.level];
  return st.score[side] * 15 + (won ? 100 + (st.config.mode === 'online' ? 60 : level?.bonus || 0) : 0);
}

export function snapshot(st) {
  const r = (v) => Math.round(v * 10) / 10;
  return {
    p: [r(st.puck.x), r(st.puck.y), r(st.puck.vx), r(st.puck.vy)],
    m: st.mallets.map((m) => [r(m.x), r(m.y)]),
    s: st.score,
    t: r(st.time),
    z: r(st.pause),
    g: st.golden ? 1 : 0,
  };
}

export function applySnapshot(st, snap, mine) {
  st.puck.x = snap.p[0];
  st.puck.y = snap.p[1];
  st.puck.vx = snap.p[2];
  st.puck.vy = snap.p[3];
  snap.m.forEach(([x, y], side) => {
    if (side === mine) return;
    const m = st.mallets[side];
    m.vx = (x - m.x) * 20;
    m.vy = (y - m.y) * 20;
    m.x = x;
    m.y = y;
    m.tx = x;
    m.ty = y;
  });
  st.score = snap.s;
  st.time = snap.t;
  st.pause = snap.z;
  st.golden = !!snap.g;
}
