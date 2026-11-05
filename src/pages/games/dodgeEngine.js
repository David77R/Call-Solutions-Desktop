import { rngFrom } from './catArtillery';

export const DW = 960;
export const DH = 540;
export const COURT = { l: 40, r: 920, t: 64, b: 492 };
export const MID = DW / 2;
export const PR = 17;
export const BR = 9;
export const TEAM_SIZE = 5;
export const ROUND_TIME = 120;
export const WIN_ROUNDS = 2;
export const TEAM_COLORS = ['#ff8a5c', '#4fc3ff'];

export const DYNAMICS = {
  clasico: { name: 'Clásico', text: '5 pelotas al centro. Pega, atrapa y esquiva.', balls: 5 },
  rebote: { name: 'Rebote', text: '7 pelotas que siguen vivas después de rebotar en la pared.', balls: 7, bounce: 1 },
  dorada: { name: 'Pelota dorada', text: 'Cada 20 segundos sale una pelota dorada rapidísima que no se puede atrapar.', balls: 4, golden: true },
  hielo: { name: 'Hielo resbaloso', text: 'Todos patinan: frenar y cambiar de dirección cuesta.', balls: 5, slippery: true },
  capitan: { name: 'Proteger al capitán', text: 'Cada equipo tiene un capitán con corona que aguanta 2 golpes. Si cae, el equipo pierde la ronda.', balls: 5, captain: true },
};
export const DYNAMIC_KEYS = Object.keys(DYNAMICS);

export const DODGE_LEVELS = {
  facil: { label: 'Fácil', react: 0.4, aim: 0.2, dodge: 0.45, catch: 0.1, power: 0.5, hold: [0.9, 1.8], depth: [0.3, 0.55], bonus: 0 },
  medio: { label: 'Medio', react: 0.22, aim: 0.1, dodge: 0.72, catch: 0.22, power: 0.72, hold: [0.6, 1.3], depth: [0.4, 0.7], bonus: 40 },
  dificil: { label: 'Difícil', react: 0.1, aim: 0.045, dodge: 0.9, catch: 0.36, power: 0.92, hold: [0.35, 0.9], depth: [0.5, 0.82], bonus: 90 },
};

const SPEED = 235;
const HOLD_SPEED = 205;
const ACCEL = 2600;
const ICE_ACCEL = 520;
const DASH_SPEED = 600;
const DASH_TIME = 0.16;
const DASH_COOLDOWN = 1.3;
const CATCH_WINDOW = 0.38;
const CATCH_COOLDOWN = 0.9;
const THROW_MIN = 480;
const THROW_MAX = 820;
const CHARGE_TIME = 0.75;
const LIVE_MIN = 230;
const GOLDEN_EVERY = 20;

const clampSide = (p, x, y) => {
  const minX = p.team === 0 ? COURT.l + PR : MID + PR;
  const maxX = p.team === 0 ? MID - PR : COURT.r - PR;
  return [Math.max(minX, Math.min(maxX, x)), Math.max(COURT.t + PR, Math.min(COURT.b - PR, y))];
};

function homeSpot(team, k) {
  const ys = [0.18, 0.39, 0.6, 0.81, 0.5];
  const xs = [0.16, 0.2, 0.16, 0.2, 0.3];
  const half = MID - COURT.l;
  const x = team === 0 ? COURT.l + half * xs[k % 5] : COURT.r - half * xs[k % 5];
  return [x, COURT.t + (COURT.b - COURT.t) * ys[k % 5]];
}

export function createDodge(config) {
  const st = {
    config,
    rnd: rngFrom(config.seed || 1),
    round: 0,
    wins: [0, 0],
    phase: 'ready',
    phaseT: 2.4,
    time: 0,
    roundTime: 0,
    players: config.players.map((pl, id) => ({
      id,
      team: pl.team,
      name: pl.name,
      kind: pl.kind,
      colors: pl.colors,
      controller: pl.controller,
      uid: pl.uid,
      keys: pl.keys,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ax: pl.team === 0 ? 1 : -1,
      ay: 0,
      out: false,
      outAt: 0,
      hold: null,
      catchT: 0,
      catchCd: 0,
      dashT: 0,
      dashCd: 0,
      charge: 0,
      charging: false,
      captain: false,
      hits: 0,
      catches: 0,
      input: { mx: 0, my: 0, tx: null, ty: null, throwHeld: false, catch: false, dash: false },
      ai: { think: 0, holdFor: 0, plan: null, seen: {} },
      flash: 0,
    })),
    balls: [],
    events: [],
    eventSeq: 0,
    dyn: null,
    goldenClock: 0,
    winner: null,
    roundWinner: null,
  };
  startRound(st);
  return st;
}

function pushEvent(st, kind, text, x, y, team) {
  st.eventSeq += 1;
  st.events.push({ id: st.eventSeq, kind, text, x, y, team, at: st.time });
  if (st.events.length > 12) st.events.shift();
}

export function startRound(st) {
  st.round += 1;
  const pick = st.config.dynamic === 'mezcla' ? DYNAMIC_KEYS[Math.floor(st.rnd() * DYNAMIC_KEYS.length)] : st.config.dynamic;
  st.dynKey = DYNAMICS[pick] ? pick : 'clasico';
  st.dyn = DYNAMICS[st.dynKey];
  st.roundTime = 0;
  st.goldenClock = 0;
  st.roundWinner = null;
  const counters = [0, 0];
  st.players.forEach((p) => {
    const [x, y] = homeSpot(p.team, counters[p.team]);
    counters[p.team] += 1;
    Object.assign(p, { x, y, vx: 0, vy: 0, out: false, hold: null, catchT: 0, catchCd: 0, dashT: 0, dashCd: 0, charge: 0, charging: false, captain: false, armor: 0, flash: 0 });
    p.ai = { think: 0, holdFor: 0, plan: null, seen: {} };
  });
  if (st.dyn.captain) {
    [0, 1].forEach((team) => {
      const mates = st.players.filter((p) => p.team === team);
      const bots = mates.filter((p) => p.controller === 'bot');
      const pool = bots.length ? bots : mates;
      const captain = pool[Math.floor(st.rnd() * pool.length)];
      captain.captain = true;
      captain.armor = 1;
    });
  }
  st.balls = Array.from({ length: st.dyn.balls }, (_, i) => ({
    id: `${st.round}-${i}`,
    x: MID,
    y: COURT.t + ((COURT.b - COURT.t) * (i + 1)) / (st.dyn.balls + 1),
    vx: 0,
    vy: 0,
    state: 'free',
    owner: null,
    team: null,
    bounces: 0,
    golden: false,
  }));
  st.phase = 'ready';
  st.phaseT = 2.4;
}

const alive = (st, team) => st.players.filter((p) => p.team === team && !p.out);
const ballById = (st, id) => st.balls.find((b) => b.id === id);

function dirTo(x, y, tx, ty) {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}

function autoAim(st, p) {
  const enemies = alive(st, 1 - p.team);
  if (!enemies.length) return [p.team === 0 ? 1 : -1, 0];
  let best = enemies[0];
  let bestD = Infinity;
  enemies.forEach((e) => {
    const d = Math.hypot(e.x - p.x, e.y - p.y) + (e.hold ? 40 : 0);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  });
  return dirTo(p.x, p.y, best.x, best.y);
}

function throwBall(st, p, power) {
  const b = ballById(st, p.hold);
  if (!b) return;
  const speed = (THROW_MIN + (THROW_MAX - THROW_MIN) * Math.min(1, Math.max(0, power))) * (b.golden ? 1.25 : 1);
  b.state = 'live';
  b.owner = p.id;
  b.team = p.team;
  b.bounces = 0;
  b.x = p.x + p.ax * (PR + BR + 2);
  b.y = p.y + p.ay * (PR + BR + 2);
  b.vx = p.ax * speed;
  b.vy = p.ay * speed;
  p.hold = null;
  p.charge = 0;
  p.charging = false;
}

function knockOut(st, p, by, b) {
  if (p.out) return;
  if (p.armor > 0) {
    p.armor -= 1;
    p.flash = 0.6;
    pushEvent(st, 'armor', `¡${p.name} aguantó el golpe!`, p.x, p.y, p.team);
    if (b) {
      b.state = 'free';
      b.owner = null;
      b.team = null;
      b.vx *= -0.3;
      b.vy *= -0.3;
    }
    return;
  }
  p.out = true;
  p.outAt = st.time;
  p.flash = 0.6;
  if (p.hold) {
    const held = ballById(st, p.hold);
    if (held) Object.assign(held, { state: 'free', owner: null, team: null, x: p.x, y: p.y, vx: 0, vy: 0 });
    p.hold = null;
  }
  const thrower = st.players[by];
  if (thrower) thrower.hits += 1;
  pushEvent(st, 'out', `${p.name} fuera`, p.x, p.y, p.team);
  if (b) {
    b.state = 'free';
    b.owner = null;
    b.team = null;
    b.vx *= -0.3;
    b.vy *= -0.3;
  }
}

function catchBall(st, p, b) {
  const thrower = st.players[b.owner];
  b.state = 'held';
  b.owner = null;
  b.team = null;
  b.vx = 0;
  b.vy = 0;
  p.hold = b.id;
  p.catchT = 0;
  p.catches += 1;
  pushEvent(st, 'catch', `¡${p.name} la atrapó!`, p.x, p.y, p.team);
  if (thrower && !thrower.out) knockOut(st, thrower, -1, null);
  const back = st.players.filter((q) => q.team === p.team && q.out).sort((a, c) => a.outAt - c.outAt)[0];
  if (back) {
    const [x, y] = homeSpot(back.team, back.id % 5);
    Object.assign(back, { out: false, x, y, vx: 0, vy: 0, flash: 0.8 });
    pushEvent(st, 'back', `${back.name} vuelve`, x, y, back.team);
  }
}

function applyMovement(st, p, wantX, wantY, dt, speedCap = 1) {
  const max = (p.hold ? HOLD_SPEED : SPEED) * speedCap;
  const tvx = wantX * max;
  const tvy = wantY * max;
  if (p.dashT > 0) {
    p.dashT -= dt;
  } else {
    const accel = (st.dyn.slippery ? ICE_ACCEL : ACCEL) * dt;
    const dvx = tvx - p.vx;
    const dvy = tvy - p.vy;
    const dv = Math.hypot(dvx, dvy);
    if (dv <= accel || dv === 0) {
      p.vx = tvx;
      p.vy = tvy;
    } else {
      p.vx += (dvx / dv) * accel;
      p.vy += (dvy / dv) * accel;
    }
  }
  const [x, y] = clampSide(p, p.x + p.vx * dt, p.y + p.vy * dt);
  if (x !== p.x + p.vx * dt) p.vx *= st.dyn.slippery ? -0.4 : 0;
  if (y !== p.y + p.vy * dt) p.vy *= st.dyn.slippery ? -0.4 : 0;
  p.x = x;
  p.y = y;
}

function dash(p, dx, dy) {
  if (p.dashCd > 0) return;
  const len = Math.hypot(dx, dy);
  const [ux, uy] = len > 0 ? [dx / len, dy / len] : [0, p.y < (COURT.t + COURT.b) / 2 ? 1 : -1];
  p.vx = ux * DASH_SPEED;
  p.vy = uy * DASH_SPEED;
  p.dashT = DASH_TIME;
  p.dashCd = DASH_COOLDOWN;
}

function startCatch(p) {
  if (p.catchCd > 0 || p.hold) return;
  p.catchT = CATCH_WINDOW;
  p.catchCd = CATCH_COOLDOWN;
}

function humanControl(st, p, dt) {
  const inp = p.input;
  const len = Math.hypot(inp.mx, inp.my);
  const mx = len > 0 ? inp.mx / len : 0;
  const my = len > 0 ? inp.my / len : 0;
  if (inp.dash) {
    dash(p, mx, my);
    inp.dash = false;
  }
  if (inp.catch) {
    startCatch(p);
    inp.catch = false;
  }
  if (inp.tx != null) [p.ax, p.ay] = dirTo(p.x, p.y, inp.tx, inp.ty);
  else [p.ax, p.ay] = autoAim(st, p);
  if (p.hold && inp.throwHeld) {
    p.charging = true;
    p.charge = Math.min(CHARGE_TIME, p.charge + dt);
  } else if (p.hold && p.charging && !inp.throwHeld) {
    throwBall(st, p, 0.45 + (0.55 * p.charge) / CHARGE_TIME);
  } else if (!p.hold) {
    p.charging = false;
    p.charge = 0;
  }
  applyMovement(st, p, mx, my, dt);
}

function threatFor(st, p) {
  let best = null;
  st.balls.forEach((b) => {
    if (b.state !== 'live' || b.team === p.team) return;
    const rx = p.x - b.x;
    const ry = p.y - b.y;
    const v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 < 1) return;
    const t = (rx * b.vx + ry * b.vy) / v2;
    if (t < 0 || t > 0.7) return;
    const cx = b.x + b.vx * t - p.x;
    const cy = b.y + b.vy * t - p.y;
    const miss = Math.hypot(cx, cy);
    if (miss > PR + BR + 10) return;
    if (!best || t < best.t) best = { b, t, cx, cy };
  });
  return best;
}

function botControl(st, p, dt, claimed) {
  const level = DODGE_LEVELS[st.config.level] || DODGE_LEVELS.medio;
  const ai = p.ai;
  ai.think -= dt;
  const threat = threatFor(st, p);
  if (threat) {
    let plan = ai.seen[threat.b.id];
    if (!plan) {
      const roll = st.rnd();
      plan = !p.hold && !threat.b.golden && roll < level.catch ? 'catch' : st.rnd() < level.dodge ? 'dodge' : 'freeze';
      plan = { kind: plan, at: st.time + level.react * (0.6 + st.rnd() * 0.8) };
      ai.seen[threat.b.id] = plan;
    }
    if (st.time >= plan.at) {
      if (plan.kind === 'catch' && threat.t < 0.28) startCatch(p);
      if (plan.kind === 'dodge') {
        const speed = Math.hypot(threat.b.vx, threat.b.vy) || 1;
        let px = -threat.b.vy / speed;
        let py = threat.b.vx / speed;
        if (px * -threat.cx + py * -threat.cy < 0) {
          px = -px;
          py = -py;
        }
        if (p.y + py * 40 > COURT.b - PR || p.y + py * 40 < COURT.t + PR) {
          px = -px;
          py = -py;
        }
        if (threat.t < 0.3) dash(p, px, py);
        applyMovement(st, p, px, py, dt);
        return;
      }
    }
  }
  if (p.hold) {
    if (ai.target == null || st.players[ai.target]?.out) {
      const enemies = alive(st, 1 - p.team);
      const pick = enemies.sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) + (a.hold ? 60 : 0) - (Math.hypot(c.x - p.x, c.y - p.y) + (c.hold ? 60 : 0)))[0];
      ai.target = pick ? pick.id : null;
      ai.holdFor = level.hold[0] + st.rnd() * (level.hold[1] - level.hold[0]);
      const depth = level.depth[0] + st.rnd() * (level.depth[1] - level.depth[0]);
      ai.throwX = p.team === 0 ? COURT.l + (MID - COURT.l) * depth : COURT.r - (COURT.r - MID) * depth;
    }
    const target = st.players[ai.target];
    ai.holdFor -= dt;
    if (target) {
      const lineX = ai.throwX;
      const [mx, my] = dirTo(p.x, p.y, lineX, target.y * 0.5 + p.y * 0.5);
      const far = Math.abs(p.x - lineX) > 24;
      applyMovement(st, p, far ? mx : 0, far ? my * 0.5 : 0, dt);
      const dist = Math.hypot(target.x - p.x, target.y - p.y);
      const t = dist / (THROW_MIN + (THROW_MAX - THROW_MIN) * level.power);
      const lx = target.x + target.vx * t * 0.9;
      const ly = target.y + target.vy * t * 0.9;
      const angle = Math.atan2(ly - p.y, lx - p.x) + (st.rnd() - 0.5) * 2 * level.aim;
      p.ax = Math.cos(angle);
      p.ay = Math.sin(angle);
      if (ai.holdFor <= 0) {
        throwBall(st, p, level.power + (st.rnd() - 0.5) * 0.15);
        ai.target = null;
      }
    } else applyMovement(st, p, 0, 0, dt);
    return;
  }
  const mine = claimed.get(p.id);
  if (mine) {
    const [mx, my] = dirTo(p.x, p.y, mine.x, mine.y);
    applyMovement(st, p, mx, my, dt);
    return;
  }
  if (ai.think <= 0 || !ai.plan) {
    ai.think = 0.6 + st.rnd() * 0.8;
    const half = MID - COURT.l;
    const depth = 0.12 + st.rnd() * 0.3;
    const x = p.team === 0 ? COURT.l + half * depth : COURT.r - half * depth;
    ai.plan = { x, y: COURT.t + 30 + st.rnd() * (COURT.b - COURT.t - 60) };
  }
  const d = Math.hypot(ai.plan.x - p.x, ai.plan.y - p.y);
  const [mx, my] = dirTo(p.x, p.y, ai.plan.x, ai.plan.y);
  applyMovement(st, p, d > 8 ? mx : 0, d > 8 ? my : 0, dt, 0.7);
}

function claimBalls(st) {
  const claims = new Map();
  [0, 1].forEach((team) => {
    const bots = alive(st, team).filter((p) => p.controller === 'bot' && !p.hold);
    const free = st.balls.filter((b) => b.state === 'free' && (team === 0 ? b.x <= MID + 6 : b.x >= MID - 6) && Math.hypot(b.vx, b.vy) < 400);
    free.forEach((b) => {
      let best = null;
      let bestD = Infinity;
      bots.forEach((p) => {
        if (claims.has(p.id)) return;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      });
      if (best) claims.set(best.id, b);
    });
  });
  return claims;
}

function moveBalls(st, dt) {
  st.balls.forEach((b) => {
    if (b.state === 'held') {
      const holder = st.players.find((p) => p.hold === b.id);
      if (!holder) {
        b.state = 'free';
        return;
      }
      b.x = holder.x + holder.ax * (PR + 4);
      b.y = holder.y + holder.ay * (PR + 4);
      return;
    }
    const steps = 3;
    for (let k = 0; k < steps; k += 1) {
      b.x += (b.vx * dt) / steps;
      b.y += (b.vy * dt) / steps;
      let bounced = false;
      if (b.x < COURT.l + BR) {
        b.x = COURT.l + BR;
        b.vx = Math.abs(b.vx);
        bounced = true;
      } else if (b.x > COURT.r - BR) {
        b.x = COURT.r - BR;
        b.vx = -Math.abs(b.vx);
        bounced = true;
      }
      if (b.y < COURT.t + BR) {
        b.y = COURT.t + BR;
        b.vy = Math.abs(b.vy);
        bounced = true;
      } else if (b.y > COURT.b - BR) {
        b.y = COURT.b - BR;
        b.vy = -Math.abs(b.vy);
        bounced = true;
      }
      if (b.state === 'live') {
        if (bounced) {
          b.bounces += 1;
          if (b.bounces > (st.dyn.bounce || 0)) {
            b.state = 'free';
            b.vx *= 0.45;
            b.vy *= 0.45;
          }
        }
        if (b.state === 'live') {
          for (const p of st.players) {
            if (p.out || p.team === b.team) continue;
            if (Math.hypot(p.x - b.x, p.y - b.y) > PR + BR) continue;
            const facing = p.ax * -b.vx + p.ay * -b.vy > 0 || p.controller === 'bot';
            if (p.catchT > 0 && !b.golden && !p.hold && facing) catchBall(st, p, b);
            else knockOut(st, p, b.owner, b);
            break;
          }
        }
      }
    }
    if (b.state === 'live') {
      b.vx *= Math.pow(0.88, dt);
      b.vy *= Math.pow(0.88, dt);
      if (Math.hypot(b.vx, b.vy) < LIVE_MIN) b.state = 'free';
    } else if (b.state === 'free') {
      const decay = Math.pow(0.18, dt);
      b.vx *= decay;
      b.vy *= decay;
    }
  });
}

function pickups(st) {
  st.players.forEach((p) => {
    if (p.out || p.hold) return;
    for (const b of st.balls) {
      if (b.state !== 'free') continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) > PR + BR + 4) continue;
      if (p.team === 0 ? b.x > MID + 8 : b.x < MID - 8) continue;
      b.state = 'held';
      b.vx = 0;
      b.vy = 0;
      p.hold = b.id;
      p.ai.target = null;
      break;
    }
  });
}

function separate(st) {
  const list = st.players.filter((p) => !p.out);
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const c = list[j];
      if (a.team !== c.team) continue;
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= PR * 2 || d === 0) continue;
      const push = (PR * 2 - d) / 2;
      [a.x, a.y] = clampSide(a, a.x - (dx / d) * push, a.y - (dy / d) * push);
      [c.x, c.y] = clampSide(c, c.x + (dx / d) * push, c.y + (dy / d) * push);
    }
  }
}

function endRound(st, winner, hooks) {
  st.roundWinner = winner;
  if (winner >= 0) st.wins[winner] += 1;
  st.phase = 'roundEnd';
  st.phaseT = 2.8;
  pushEvent(st, 'round', winner >= 0 ? `Ronda para el equipo ${winner === 0 ? 'naranja' : 'azul'}` : 'Ronda empatada', MID, DH / 2, winner);
  hooks.onRound?.(winner);
}

export function stepDodge(st, dt, hooks = {}) {
  if (st.phase === 'over') return;
  st.time += dt;
  st.players.forEach((p) => {
    p.flash = Math.max(0, p.flash - dt);
  });
  if (st.phase === 'ready') {
    st.phaseT -= dt;
    if (st.phaseT <= 0) st.phase = 'play';
    return;
  }
  if (st.phase === 'roundEnd') {
    st.phaseT -= dt;
    if (st.phaseT > 0) return;
    if (st.wins[0] >= WIN_ROUNDS || st.wins[1] >= WIN_ROUNDS || st.round >= 5) {
      st.phase = 'over';
      st.winner = st.wins[0] === st.wins[1] ? -1 : st.wins[0] > st.wins[1] ? 0 : 1;
      hooks.onOver?.(st.winner);
      return;
    }
    startRound(st);
    return;
  }
  st.roundTime += dt;
  if (st.dyn.golden) {
    st.goldenClock += dt;
    if (st.goldenClock >= GOLDEN_EVERY && !st.balls.some((b) => b.golden)) {
      st.goldenClock = 0;
      st.balls.push({
        id: `${st.round}-g${Math.round(st.roundTime)}`,
        x: MID,
        y: (COURT.t + COURT.b) / 2,
        vx: 0,
        vy: 0,
        state: 'free',
        owner: null,
        team: null,
        bounces: 0,
        golden: true,
      });
      pushEvent(st, 'golden', '¡Pelota dorada!', MID, (COURT.t + COURT.b) / 2, -1);
    }
  }
  st.players.forEach((p) => {
    if (p.out) return;
    p.catchT = Math.max(0, p.catchT - dt);
    p.catchCd = Math.max(0, p.catchCd - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
  });
  const claims = claimBalls(st);
  st.players.forEach((p) => {
    if (p.out) return;
    if (p.controller === 'bot') botControl(st, p, dt, claims);
    else humanControl(st, p, dt);
  });
  separate(st);
  pickups(st);
  moveBalls(st, dt);
  if (st.dyn.captain) {
    const fallen = [0, 1].find((team) => st.players.some((p) => p.team === team && p.captain && p.out));
    if (fallen != null) {
      endRound(st, 1 - fallen, hooks);
      return;
    }
  }
  const left = [alive(st, 0).length, alive(st, 1).length];
  if (left[0] === 0 || left[1] === 0) endRound(st, left[0] === 0 && left[1] === 0 ? -1 : left[0] === 0 ? 1 : 0, hooks);
  else if (st.roundTime >= ROUND_TIME) endRound(st, left[0] === left[1] ? -1 : left[0] > left[1] ? 0 : 1, hooks);
}

export function controlledFor(st, preferred, team) {
  const p = st.players[preferred];
  if (p && !p.out) return preferred;
  const humans = new Set(st.players.filter((q) => q.controller !== 'bot' && q.id !== preferred).map((q) => q.id));
  const mates = st.players.filter((q) => q.team === team && !q.out && !humans.has(q.id));
  if (!mates.length) return preferred;
  const from = p || mates[0];
  mates.sort((a, c) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(c.x - from.x, c.y - from.y));
  return mates[0].id;
}

export function dodgeScore(st, ids, team, won) {
  const level = DODGE_LEVELS[st.config.level];
  const mine = st.players.filter((p) => ids.includes(p.id));
  const hits = mine.reduce((a, p) => a + p.hits, 0);
  const catches = mine.reduce((a, p) => a + p.catches, 0);
  return hits * 10 + catches * 15 + st.wins[team] * 40 + (won ? 100 + (st.config.mode === 'online' ? 60 : level?.bonus || 0) : 0);
}

export function dodgeSnapshot(st) {
  const r = (v) => Math.round(v);
  return {
    p: st.players.map((p) => [
      r(p.x),
      r(p.y),
      p.out ? 1 : 0,
      p.hold ? 1 : 0,
      p.catchT > 0 ? 1 : 0,
      p.dashT > 0 ? 1 : 0,
      Math.round(p.ax * 100),
      Math.round(p.ay * 100),
      p.captain ? 1 + (p.armor || 0) : 0,
      p.controller === 'bot' ? 1 : 0,
      Math.round(p.charge * 100),
    ]),
    b: st.balls.map((b) => [r(b.x), r(b.y), b.state === 'live' ? 2 : b.state === 'held' ? 1 : 0, b.golden ? 1 : 0, b.team ?? -1]),
    w: st.wins,
    rd: st.round,
    ph: st.phase,
    pt: Math.round(st.phaseT * 10) / 10,
    rt: Math.round(st.roundTime * 10) / 10,
    dk: st.dynKey,
    rw: st.roundWinner,
    win: st.winner,
    ev: st.events.slice(-6),
  };
}

export function applyDodgeSnapshot(st, s) {
  s.p.forEach(([x, y, out, hold, ct, dash, ax, ay, cap, bot, charge], i) => {
    const p = st.players[i];
    if (!p) return;
    if (!p.out && out) p.flash = 0.6;
    Object.assign(p, {
      x,
      y,
      out: !!out,
      hold: hold ? 'h' : null,
      catchT: ct ? 0.2 : 0,
      dashT: dash ? 0.1 : 0,
      captain: !!cap,
      armor: cap > 1 ? 1 : 0,
      controller: bot ? 'bot' : p.controller,
      charge: charge / 100,
    });
    if (p.controller === 'bot' || !p.local) {
      p.ax = ax / 100;
      p.ay = ay / 100;
    }
  });
  st.balls = s.b.map(([x, y, state, golden, team], i) => ({ id: i, x, y, vx: 0, vy: 0, state: state === 2 ? 'live' : state === 1 ? 'held' : 'free', golden: !!golden, team }));
  st.wins = s.w;
  st.round = s.rd;
  st.phase = s.ph;
  st.phaseT = s.pt;
  st.roundTime = s.rt;
  st.dynKey = s.dk;
  st.dyn = DYNAMICS[s.dk] || DYNAMICS.clasico;
  st.roundWinner = s.rw;
  st.winner = s.win;
  st.events = s.ev;
}
