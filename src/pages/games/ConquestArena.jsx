import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameActiveRef } from './gameActivity';
import fifo from '../../assets/fifo.webp';
import {
  AGES,
  BUILDINGS,
  BUILD_MENU,
  MH,
  MW,
  RES_KEYS,
  TILE,
  TILE_RES,
  TRIBES,
  UNITS,
  VH,
  VW,
  WORLD_H,
  WORLD_W,
  applyCommand,
  applyConquestSnapshot,
  applyTileChanges,
  baseOf,
  buildingMaxHp,
  canAfford,
  canPlace,
  conquestScore,
  conquestSnapshot,
  createConquest,
  idx,
  stepConquest,
  stepGuest,
  takeTileChanges,
  unitMaxHp,
  unitRange,
} from './conquestEngine';
import { buildingSprite, drawMinimap, drawWorld, makeTerrain, unitSprite, unitVisible } from './conquestDraw';

const RES_LABEL = { food: 'Comida', wood: 'Madera', gold: 'Oro' };

function ResIcon({ kind, size = 15 }) {
  return (
    <svg className="conq__icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {kind === 'food' && (
        <>
          <rect x="1.6" y="9.6" width="7" height="2.4" rx="1.2" transform="rotate(-40 5 10.8)" fill="#f3e9d8" />
          <circle cx="2.6" cy="13.2" r="1.7" fill="#f3e9d8" />
          <ellipse cx="10" cy="6" rx="5.2" ry="4.6" fill="#d9773f" />
          <ellipse cx="8.6" cy="4.6" rx="1.8" ry="1.2" fill="#f2a46e" />
        </>
      )}
      {kind === 'wood' && (
        <>
          <rect x="0.8" y="5" width="11" height="7" rx="2" fill="#8b5a2b" />
          <rect x="0.8" y="7.4" width="9" height="0.9" fill="#6b4128" />
          <ellipse cx="12" cy="8.5" rx="3.2" ry="3.6" fill="#d9b07a" />
          <ellipse cx="12" cy="8.5" rx="1.6" ry="1.9" fill="none" stroke="#8b5a2b" strokeWidth="0.9" />
        </>
      )}
      {kind === 'gold' && (
        <>
          <circle cx="8" cy="8" r="6.6" fill="#e8b830" />
          <circle cx="8" cy="8" r="4.6" fill="#f6d55c" stroke="#c99a1e" strokeWidth="1" />
          <path d="M6.6 6.2h2.6M6.6 9.8h2.6M8 5v6" stroke="#c99a1e" strokeWidth="1.1" strokeLinecap="round" />
        </>
      )}
      {kind === 'pop' && (
        <>
          <path d="M8 1.8 1.4 7.4h2v6.6h9.2V7.4h2z" fill="#e8eef9" />
          <path d="M8 1.8 1.4 7.4h13.2z" fill="#ff8a5c" />
          <rect x="6.6" y="9.6" width="2.8" height="4.4" rx="0.6" fill="#8b5a2b" />
        </>
      )}
    </svg>
  );
}
const MINI_W = 216;
const MINI_H = 144;
const PAN_SPEED = 760;
const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.2;
const ZOOM_START = 1.35;
const ZOOM_STEP = 1.15;

function clampCam(x, y, z) {
  return { x: Math.max(0, Math.min(WORLD_W - VW / z, x)), y: Math.max(0, Math.min(WORLD_H - VH / z, y)), z };
}
const ORDER_TEXT = {
  gather: (o) => `Recolectando ${{ food: 'comida', wood: 'madera', gold: 'oro' }[o.res] || ''}`,
  farm: () => 'Trabajando la granja',
  build: () => 'Construyendo o reparando',
  return: () => 'Llevando lo recolectado',
  attack: () => 'Atacando',
  move: () => 'Caminando',
  amove: () => 'Avanzando al ataque',
  busy: () => 'Ocupado',
  idle: () => 'Esperando órdenes',
};
const iconCache = new Map();

function iconUrl(kind, type, color, tribe) {
  const key = `${kind}|${type}|${color}|${tribe}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const sp = kind === 'u' ? unitSprite(type, color, 0, tribe) : buildingSprite(type, color, tribe);
  const url = sp.c.toDataURL();
  iconCache.set(key, url);
  return url;
}

function Cost({ cost }) {
  const parts = RES_KEYS.filter((k) => cost?.[k]);
  if (!parts.length) return null;
  return (
    <span className="conq__cost">
      {parts.map((k) => (
        <span key={k} title={RES_LABEL[k]}>
          <ResIcon kind={k} size={12} />
          {cost[k]}
        </span>
      ))}
    </span>
  );
}

const fmtClock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export default function ConquestArena({ config, onExit, onSave }) {
  const canvasRef = useRef(null);
  const miniRef = useRef(null);
  const rootRef = useRef(null);
  const stRef = useRef(null);
  const terrainRef = useRef(null);
  const camRef = useRef({ x: 0, y: 0, z: ZOOM_START });
  const selRef = useRef(new Set());
  const placeRef = useRef(null);
  const ghostRef = useRef(null);
  const boxRef = useRef(null);
  const keysRef = useRef(new Set());
  const pointerRef = useRef({ vx: VW / 2, vy: VH / 2, inside: false });
  const lastClickRef = useRef({ t: 0, type: null });
  const pausedRef = useRef(false);
  const alertRef = useRef(null);
  const [hud, setHud] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [lost, setLost] = useState(false);
  const [paused, setPaused] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [mode, setMode] = useState(null);
  const [hand, setHand] = useState(false);
  const online = config.mode === 'online';
  const activeRef = useGameActiveRef();
  const host = !online || config.side === 0;
  const mine = online ? config.side : 0;
  const link = config.link;

  const toast = useCallback((text, tone = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
  }, []);

  const syncHud = useCallback(() => {
    const st = stRef.current;
    if (!st) return;
    const pl = st.players[mine];
    const sel = selRef.current;
    [...sel].forEach((id) => {
      const e = st.ents.get(id);
      if (!e || e.hp <= 0) sel.delete(id);
    });
    const ents = [...sel].map((id) => st.ents.get(id)).filter(Boolean);
    const castle = st.buildings.find((b) => b.owner === mine && b.type === 'castillo');
    setHud({
      t: st.t,
      res: { ...pl.res },
      age: pl.age,
      pop: pl.pop,
      popCap: pl.popCap,
      aging: castle?.aging
        ? {
            p: castle.aging.total ? castle.aging.t / castle.aging.total : castle.aging.t,
          }
        : null,
      idle: st.units.filter((u) => u.owner === mine && u.type === 'aldeano' && u.order.k === 'idle').length,
      over: st.over,
      winner: st.winner,
      points: st.points || 0,
      sel: ents.map((e) =>
        e.kind === 'u'
          ? {
              id: e.id,
              kind: 'u',
              type: e.type,
              owner: e.owner,
              hp: e.hp,
              max: unitMaxHp(st, e.owner, e.type),
              order: e.order,
              carry: e.carry,
            }
          : {
              id: e.id,
              kind: 'b',
              type: e.type,
              owner: e.owner,
              hp: e.hp,
              max: buildingMaxHp(st, e.owner, e.type),
              done: e.done,
              progress: e.progress,
              queue: [...e.queue],
              train: e.started && e.queue.length ? e.trainT / UNITS[e.queue[0]].time : 0,
              blocked: e.blocked,
              aging: e.aging ? (e.aging.total ? e.aging.t / e.aging.total : e.aging.t) : null,
            },
      ),
    });
  }, [mine]);

  const finish = useCallback(
    (winner) => {
      const st = stRef.current;
      if (!st || st.saved) return;
      st.saved = true;
      st.over = true;
      st.winner = winner;
      const won = winner === mine;
      st.points = conquestScore(st, mine, won, config.level, online);
      onSave?.(st.points, won ? 'won' : 'lost');
      syncHud();
    },
    [config.level, mine, online, onSave, syncHud],
  );

  const issue = useCallback(
    (cmd) => {
      const st = stRef.current;
      if (!st || st.over) return;
      if (host) {
        const msg = applyCommand(st, mine, cmd);
        if (msg) toast(msg, 'warn');
      } else {
        const pl = st.players[mine];
        if (cmd.k === 'build') {
          const def = BUILDINGS[cmd.type];
          if (!canAfford(pl.res, def.cost)) return toast('Faltan recursos.', 'warn');
          if (!canPlace(st, mine, cmd.type, cmd.tx, cmd.ty)) return toast('No se puede construir ahí.', 'warn');
        }
        if (cmd.k === 'train' && !canAfford(pl.res, UNITS[cmd.unit].cost)) return toast('Faltan recursos.', 'warn');
        if (cmd.k === 'age' && !canAfford(pl.res, AGES[pl.age + 1]?.cost || {})) return toast('Faltan recursos.', 'warn');
        link?.send('sure', { t: 'c', c: cmd });
      }
      window.setTimeout(syncHud, 60);
      return undefined;
    },
    [host, mine, link, toast, syncHud],
  );

  const centerOn = useCallback((x, y) => {
    const { z } = camRef.current;
    camRef.current = clampCam(x - VW / z / 2, y - VH / z / 2, z);
  }, []);

  const zoomBy = useCallback((factor) => {
    const cam = camRef.current;
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.z * factor));
    const cx = cam.x + VW / cam.z / 2;
    const cy = cam.y + VH / cam.z / 2;
    camRef.current = clampCam(cx - VW / z / 2, cy - VH / z / 2, z);
  }, []);

  useEffect(() => {
    const st = createConquest(config);
    stRef.current = st;
    terrainRef.current = makeTerrain(st);
    const b = baseOf(mine);
    centerOn((b.x + 0.5) * TILE + (mine === 0 ? 120 : -120), (b.y + 0.5) * TILE + (mine === 0 ? -80 : 80));
    syncHud();
    const t = window.setInterval(syncHud, 220);
    return () => window.clearInterval(t);
  }, [config, mine, centerOn, syncHud]);

  useEffect(() => {
    if (!link) return undefined;
    let lastSeq = -1;
    return link.on((msg) => {
      const st = stRef.current;
      if (!st) return;
      if (msg.t === 'lost' || msg.t === 'leave') {
        if (!st.over) setLost(true);
        return;
      }
      if (host && msg.t === 'c') {
        const text = applyCommand(st, 1 - mine, msg.c);
        if (text) link.send('sure', { t: 'msg', text });
        return;
      }
      if (!host && msg.t === 's') {
        if (msg.n <= lastSeq) return;
        lastSeq = msg.n;
        applyConquestSnapshot(st, msg.s);
        return;
      }
      if (!host && msg.t === 'tiles') {
        applyTileChanges(st, msg.c);
        return;
      }
      if (!host && msg.t === 'ev') {
        st.events.push(msg.e);
        return;
      }
      if (!host && msg.t === 'msg') {
        toast(msg.text, 'warn');
        return;
      }
      if (!host && msg.t === 'over') {
        st.over = true;
        finish(msg.winner);
      }
    });
  }, [link, host, mine, finish, toast]);

  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onChange = () => setExpanded(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VW * dpr;
    canvas.height = VH * dpr;
    const ctx = canvas.getContext('2d');
    const mini = miniRef.current;
    mini.width = MINI_W;
    mini.height = MINI_H;
    const mctx = mini.getContext('2d');
    let raf = 0;
    let last = performance.now();
    let sendClock = 0;
    let miniClock = 0;
    let seq = 0;
    const tick = (now) => {
      const st = stRef.current;
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      if (!activeRef.current && !online) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (st) {
        const run = !st.over && !(pausedRef.current && !online);
        if (run) {
          if (host) {
            const steps = dt > 0.05 ? 2 : 1;
            for (let k = 0; k < steps; k += 1) stepConquest(st, dt / steps);
          } else stepGuest(st, dt);
        }
        const events = st.events;
        st.events = [];
        events.forEach((ev) => {
          if (host && online && (ev.owner === 1 - mine || ev.k === 'over')) link?.send('sure', { t: 'ev', e: ev });
          if (ev.k === 'alert' && ev.owner === mine) {
            alertRef.current = { x: ev.x, y: ev.y };
            toast('¡Te están atacando! Presiona Espacio para ir.', 'danger');
          }
          if (ev.k === 'age' && ev.owner === mine) toast(`¡Llegaste a la ${AGES[ev.age].name}!`, 'good');
          if (ev.k === 'age' && ev.owner !== mine) toast(`${st.players[ev.owner].name} subió a la ${AGES[ev.age].name}.`);
          if (ev.k === 'built' && ev.owner === mine && ev.type !== 'casa' && ev.type !== 'granja') toast(`${BUILDINGS[ev.type].name} terminado.`);
          if (ev.k === 'over' && host) {
            if (online) link?.send('sure', { t: 'over', winner: ev.winner });
            finish(ev.winner);
          }
        });
        if (online && host && !st.over) {
          sendClock += dt;
          if (sendClock >= 0.1) {
            sendClock = 0;
            const tiles = takeTileChanges(st);
            if (tiles.length) link?.send('sure', { t: 'tiles', c: tiles });
            seq += 1;
            link?.send('fast', { t: 's', n: seq, s: conquestSnapshot(st) });
          }
        } else if (!online) st.changes = [];

        const cam = camRef.current;
        const keys = keysRef.current;
        let dx = 0;
        let dy = 0;
        if (keys.has('left')) dx -= 1;
        if (keys.has('right')) dx += 1;
        if (keys.has('up')) dy -= 1;
        if (keys.has('down')) dy += 1;
        const p = pointerRef.current;
        if (document.fullscreenElement && p.inside && !boxRef.current) {
          if (p.vx < 14) dx -= 1;
          if (p.vx > VW - 14) dx += 1;
          if (p.vy < 14) dy -= 1;
          if (p.vy > VH - 14) dy += 1;
        }
        if (dx || dy) {
          Object.assign(cam, clampCam(cam.x + (dx * PAN_SPEED * dt) / cam.z, cam.y + (dy * PAN_SPEED * dt) / cam.z, cam.z));
        }
        if (placeRef.current) {
          const wx = cam.x + p.vx / cam.z;
          const wy = cam.y + p.vy / cam.z;
          const size = BUILDINGS[placeRef.current].size;
          const tx = Math.floor(wx / TILE - size / 2 + 0.5);
          const ty = Math.floor(wy / TILE - size / 2 + 0.5);
          ghostRef.current = {
            type: placeRef.current,
            tx,
            ty,
            ok: canPlace(st, mine, placeRef.current, tx, ty),
          };
        } else ghostRef.current = null;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawWorld(ctx, st, {
          me: mine,
          cam,
          time: now / 1000,
          sel: selRef.current,
          ghost: ghostRef.current,
          box: boxRef.current,
          terrain: terrainRef.current,
        });
        miniClock -= dt;
        if (miniClock <= 0) {
          miniClock = 0.25;
          drawMinimap(mctx, st, mine, cam, MINI_W, MINI_H);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config, online, host, mine, link, finish, toast]);

  const viewPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      vx: ((e.clientX - rect.left) * VW) / rect.width,
      vy: ((e.clientY - rect.top) * VH) / rect.height,
    };
  };

  const pickAt = (wx, wy) => {
    const st = stRef.current;
    let best = null;
    let bestD = 18;
    st.units.forEach((u) => {
      if (!unitVisible(st, mine, u)) return;
      const d = Math.hypot(u.x - wx, u.y - 10 - wy);
      const score = d - (u.owner === mine ? 3 : 0);
      if (score < bestD) {
        bestD = score;
        best = u;
      }
    });
    if (best) return best;
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    for (const probe of [
      [tx, ty],
      [tx, ty + 1],
    ]) {
      if (probe[0] < 0 || probe[1] < 0 || probe[0] >= MW || probe[1] >= MH) continue;
      const id = st.bmap[idx(probe[0], probe[1])];
      const b = id && st.ents.get(id);
      if (b && (b.owner === mine || st.players[mine].explored[idx(probe[0], probe[1])])) return b;
    }
    return null;
  };

  const selectOnly = (ids) => {
    selRef.current = new Set(ids);
    syncHud();
  };

  const startPlacing = (type) => {
    placeRef.current = type;
    setMode('place');
  };

  const cancelModes = () => {
    placeRef.current = null;
    setMode(null);
  };

  const myUnits = () => [...selRef.current].map((id) => stRef.current.ents.get(id)).filter((e) => e && e.kind === 'u' && e.owner === mine);

  const startPan = (e, onTap) => {
    const canvas = canvasRef.current;
    const start = { x: e.clientX, y: e.clientY, cam: { ...camRef.current }, moved: false };
    const rect = canvas.getBoundingClientRect();
    const move = (ev) => {
      if (!start.moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
      if (!start.moved) canvas.classList.add('is-grabbing');
      start.moved = true;
      camRef.current = clampCam(
        start.cam.x - ((ev.clientX - start.x) * VW) / rect.width / start.cam.z,
        start.cam.y - ((ev.clientY - start.y) * VH) / rect.height / start.cam.z,
        start.cam.z,
      );
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      canvas.classList.remove('is-grabbing');
      if (!start.moved) onTap?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onPointerDown = (e) => {
    const st = stRef.current;
    if (!st || st.over) return;
    const { vx, vy } = viewPoint(e);
    const cam = camRef.current;
    const wx = cam.x + vx / cam.z;
    const wy = cam.y + vy / cam.z;
    if (e.button === 2) {
      startPan(e, () => command(wx, wy));
      return;
    }
    if (e.button === 1) {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (hand && !placeRef.current && mode !== 'amove') {
      const shift = e.shiftKey;
      startPan(e, () => {
        boxRef.current = { x0: vx, y0: vy, x1: vx, y1: vy, shift };
        onPointerUp({ button: 0 });
      });
      return;
    }
    if (placeRef.current) {
      const g = ghostRef.current;
      if (g?.ok) {
        const ids = myUnits()
          .filter((u) => u.type === 'aldeano')
          .map((u) => u.id);
        issue({ k: 'build', ids, type: g.type, tx: g.tx, ty: g.ty });
        if (!e.shiftKey) cancelModes();
      } else toast('No se puede construir ahí.', 'warn');
      return;
    }
    if (mode === 'amove') {
      issue({ k: 'amove', ids: myUnits().map((u) => u.id), x: wx, y: wy });
      st.fx.push({
        k: 'mark',
        x: wx,
        y: wy,
        t: 0,
        life: 0.6,
        color: '#ff8a8a',
      });
      cancelModes();
      return;
    }
    canvasRef.current.setPointerCapture?.(e.pointerId);
    boxRef.current = { x0: vx, y0: vy, x1: vx, y1: vy, shift: e.shiftKey };
  };

  const onPointerMove = (e) => {
    const { vx, vy } = viewPoint(e);
    pointerRef.current = { vx, vy, inside: true };
    if (boxRef.current) {
      boxRef.current.x1 = vx;
      boxRef.current.y1 = vy;
    }
  };

  const onPointerUp = (e) => {
    const box = boxRef.current;
    boxRef.current = null;
    if (!box || e.button !== 0) return;
    const st = stRef.current;
    const cam = camRef.current;
    const big = Math.abs(box.x1 - box.x0) > 6 || Math.abs(box.y1 - box.y0) > 6;
    if (big) {
      const x0 = cam.x + Math.min(box.x0, box.x1) / cam.z;
      const x1 = cam.x + Math.max(box.x0, box.x1) / cam.z;
      const y0 = cam.y + Math.min(box.y0, box.y1) / cam.z;
      const y1 = cam.y + Math.max(box.y0, box.y1) / cam.z;
      const inside = st.units.filter((u) => u.owner === mine && u.x >= x0 - 6 && u.x <= x1 + 6 && u.y - 10 >= y0 - 10 && u.y - 10 <= y1 + 10);
      const military = inside.filter((u) => UNITS[u.type].military);
      const pick = military.length && military.length < inside.length && !box.shift ? military : inside;
      if (box.shift) pick.forEach((u) => selRef.current.add(u.id));
      else selRef.current = new Set(pick.map((u) => u.id));
      syncHud();
      return;
    }
    const wx = cam.x + box.x1 / cam.z;
    const wy = cam.y + box.y1 / cam.z;
    const hit = pickAt(wx, wy);
    const now = performance.now();
    if (hit && hit.kind === 'u' && hit.owner === mine && now - lastClickRef.current.t < 340 && lastClickRef.current.type === hit.type) {
      const same = st.units.filter((u) => u.owner === mine && u.type === hit.type && u.x >= cam.x && u.x <= cam.x + VW / cam.z && u.y >= cam.y && u.y <= cam.y + VH / cam.z);
      selectOnly(same.map((u) => u.id));
      lastClickRef.current = { t: 0, type: null };
      return;
    }
    lastClickRef.current = {
      t: now,
      type: hit?.kind === 'u' ? hit.type : null,
    };
    if (!hit) {
      if (!box.shift) selectOnly([]);
      return;
    }
    if (box.shift && hit.owner === mine && hit.kind === 'u') {
      if (selRef.current.has(hit.id)) selRef.current.delete(hit.id);
      else selRef.current.add(hit.id);
      syncHud();
    } else selectOnly([hit.id]);
  };

  const command = (wx, wy) => {
    const st = stRef.current;
    if (!st || st.over) return;
    if (placeRef.current || mode) {
      cancelModes();
      return;
    }
    const sel = [...selRef.current].map((id) => st.ents.get(id)).filter((x) => x && x.owner === mine);
    const units = sel.filter((x) => x.kind === 'u');
    const builds = sel.filter((x) => x.kind === 'b');
    const tx = Math.max(0, Math.min(MW - 1, Math.floor(wx / TILE)));
    const ty = Math.max(0, Math.min(MH - 1, Math.floor(wy / TILE)));
    const ti = idx(tx, ty);
    const res = st.players[mine].explored[ti] ? TILE_RES[st.tiles[ti]] : null;
    if (!units.length && builds.length) {
      const farmId = st.bmap[ti] && st.ents.get(st.bmap[ti])?.type === 'granja' ? st.bmap[ti] : 0;
      builds.forEach((b) => issue({ k: 'rally', bid: b.id, x: wx, y: wy, farm: farmId }));
      st.fx.push({
        k: 'mark',
        x: wx,
        y: wy,
        t: 0,
        life: 0.6,
        color: '#ffffff',
      });
      return;
    }
    if (!units.length) return;
    const ids = units.map((u) => u.id);
    const vills = units.filter((u) => u.type === 'aldeano').map((u) => u.id);
    const others = units.filter((u) => u.type !== 'aldeano').map((u) => u.id);
    const target = pickAt(wx, wy);
    const mark = (color) => st.fx.push({ k: 'mark', x: wx, y: wy, t: 0, life: 0.6, color });
    if (target && target.owner !== mine) {
      issue({ k: 'attack', ids, target: target.id });
      mark('#ff8a8a');
      return;
    }
    if (target && target.kind === 'b' && target.owner === mine && vills.length) {
      const maxHp = buildingMaxHp(st, mine, target.type);
      if (target.type === 'granja' && target.done) issue({ k: 'farm', ids: vills, bid: target.id });
      else if (!target.done || target.hp < maxHp) issue({ k: 'repair', ids: vills, bid: target.id });
      else if (BUILDINGS[target.type].drop) issue({ k: 'return', ids: vills });
      else issue({ k: 'move', ids: vills, x: wx, y: wy });
      if (others.length) issue({ k: 'move', ids: others, x: wx, y: wy });
      mark('#8dffb0');
      return;
    }
    if (res && vills.length) {
      issue({ k: 'gather', ids: vills, ti });
      if (others.length) issue({ k: 'move', ids: others, x: wx, y: wy });
      mark('#ffe08a');
      return;
    }
    issue({ k: 'move', ids, x: wx, y: wy });
    mark('#8dffb0');
  };

  const onContextMenu = (e) => {
    e.preventDefault();
  };

  const onWheel = (e) => {
    const cam = camRef.current;
    const { vx, vy } = viewPoint(e);
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.z * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)));
    const wx = cam.x + vx / cam.z;
    const wy = cam.y + vy / cam.z;
    camRef.current = clampCam(wx - vx / z, wy - vy / z, z);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const stop = (e) => e.preventDefault();
    canvas.addEventListener('wheel', stop, { passive: false });
    return () => canvas.removeEventListener('wheel', stop);
  }, []);

  const miniJump = (e) => {
    const rect = miniRef.current.getBoundingClientRect();
    const wx = ((e.clientX - rect.left) / rect.width) * WORLD_W;
    const wy = ((e.clientY - rect.top) / rect.height) * WORLD_H;
    if (e.button === 2) {
      e.preventDefault();
      command(wx, wy);
      return;
    }
    centerOn(wx, wy);
  };

  const selectCastle = useCallback(() => {
    const st = stRef.current;
    const c = st?.buildings.find((b) => b.owner === mine && b.type === 'castillo');
    if (!c) return;
    selectOnly([c.id]);
    centerOn((c.tx + 1.5) * TILE, (c.ty + 1.5) * TILE);
  }, [mine, centerOn]);

  const nextIdle = useCallback(() => {
    const st = stRef.current;
    const idle = st?.units.filter((u) => u.owner === mine && u.type === 'aldeano' && u.order.k === 'idle');
    if (!idle?.length) return;
    st.idleIdx = ((st.idleIdx || 0) + 1) % idle.length;
    const u = idle[st.idleIdx];
    selectOnly([u.id]);
    centerOn(u.x, u.y);
  }, [mine, centerOn]);

  const actionsRef = useRef([]);

  useEffect(() => {
    const map = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
      a: 'left',
      d: 'right',
      w: 'up',
      s: 'down',
    };
    const down = (e) => {
      if (!activeRef.current) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[key]) {
        keysRef.current.add(map[key]);
        e.preventDefault();
        return;
      }
      if (key === 'Escape') {
        if (placeRef.current || mode) cancelModes();
        else selectOnly([]);
        return;
      }
      if (key === 'h') selectCastle();
      if (key === '+' || key === '=') zoomBy(ZOOM_STEP);
      if (key === 'm') setHand((v) => !v);
      if (key === '-') zoomBy(1 / ZOOM_STEP);
      if (key === '.') nextIdle();
      if (key === ' ') {
        e.preventDefault();
        if (alertRef.current) centerOn(alertRef.current.x, alertRef.current.y);
      }
      if (key === 'p' && !online) {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
      }
      if (/^[1-9]$/.test(key)) {
        const action = actionsRef.current[Number(key) - 1];
        if (action && !action.disabled) action.run();
      }
    };
    const up = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[key]) keysRef.current.delete(map[key]);
    };
    const blur = () => keysRef.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  });

  const leave = () => {
    link?.send('sure', { t: 'leave' });
    onExit();
  };

  const resign = () => {
    setConfirmQuit(false);
    const st = stRef.current;
    if (!st || st.over) {
      leave();
      return;
    }
    issue({ k: 'resign' });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  const st = stRef.current;
  const me = st?.players[mine];
  const foe = st?.players[1 - mine];
  const sel = hud?.sel || [];
  const mineSel = sel.filter((e) => e.owner === mine);
  const units = mineSel.filter((e) => e.kind === 'u');
  const vills = units.filter((e) => e.type === 'aldeano');
  const building = sel.length === 1 && sel[0].kind === 'b' ? sel[0] : null;
  const color = me?.color || '#ff8a5c';
  const tribe = me?.tribe || 'gatos';

  const actions = [];
  if (hud && me) {
    if (building && building.owner === mine) {
      const def = BUILDINGS[building.type];
      if (!building.done)
        actions.push({
          key: 'cancel',
          label: 'Cancelar obra',
          icon: '✕',
          run: () => issue({ k: 'delete', id: building.id }),
        });
      else {
        (def.trains || []).forEach((type) => {
          const u = UNITS[type];
          const locked = hud.age < u.age;
          actions.push({
            key: type,
            label: u.name,
            img: iconUrl('u', type, color, tribe),
            cost: u.cost,
            locked: locked ? `Edad ${AGES[u.age].short}` : null,
            disabled: locked || !!building.aging,
            poor: !canAfford(hud.res, u.cost),
            title: `${u.name}: ${u.text}`,
            run: () => issue({ k: 'train', bid: building.id, unit: type }),
          });
        });
        if (building.type === 'castillo') {
          const next = AGES[hud.age + 1];
          if (building.aging !== null)
            actions.push({
              key: 'cancelAge',
              label: 'Cancelar edad',
              icon: '✕',
              run: () => issue({ k: 'cancelAge', bid: building.id }),
            });
          else if (next)
            actions.push({
              key: 'age',
              label: `Subir a ${next.name}`,
              icon: '⬆',
              cost: next.cost,
              poor: !canAfford(hud.res, next.cost),
              title: `Sube a la ${next.name} en ${next.time} s. Desbloquea nuevas tropas y edificios.`,
              run: () => issue({ k: 'age', bid: building.id }),
            });
        }
      }
    } else if (vills.length) {
      BUILD_MENU.forEach((type) => {
        const def = BUILDINGS[type];
        const locked = hud.age < def.age;
        actions.push({
          key: type,
          label: def.name,
          img: iconUrl('b', type, color, tribe),
          cost: def.cost,
          locked: locked ? `Edad ${AGES[def.age].short}` : null,
          disabled: locked,
          poor: !canAfford(hud.res, def.cost),
          title: `${def.name}: ${def.text}`,
          run: () => startPlacing(type),
        });
      });
      actions.push({
        key: 'stop',
        label: 'Detener',
        icon: '■',
        run: () => issue({ k: 'stop', ids: units.map((u) => u.id) }),
      });
    } else if (units.length) {
      actions.push({
        key: 'amove',
        label: 'Atacar aquí',
        icon: '⚔',
        title: 'Haz clic en el mapa: avanzan y atacan a todo lo que encuentren.',
        run: () => setMode('amove'),
      });
      actions.push({
        key: 'stop',
        label: 'Detener',
        icon: '■',
        run: () => issue({ k: 'stop', ids: units.map((u) => u.id) }),
      });
    }
  }
  actionsRef.current = actions;

  const groups = {};
  units.forEach((u) => {
    groups[u.type] = (groups[u.type] || 0) + 1;
  });
  const single = sel.length === 1 ? sel[0] : null;
  const won = hud?.over && hud.winner === mine;
  const ageName = hud ? AGES[hud.age].name : '';
  const capped = hud && hud.pop >= hud.popCap;

  return (
    <div className={expanded ? 'conq is-full' : 'conq'} ref={rootRef}>
      <div className="conq__stage">
        <div className="conq__top">
          {hud && (
            <div className="conq__res">
              {RES_KEYS.map((k) => (
                <span key={k} className="conq__chip" title={{ food: 'Comida', wood: 'Madera', gold: 'Oro' }[k]}>
                  <ResIcon kind={k} /> <b>{Math.floor(hud.res[k])}</b>
                </span>
              ))}
              <span className={capped ? 'conq__chip is-warn' : 'conq__chip'} title="Población: construye casas para subirla">
                <ResIcon kind="pop" /> <b>{hud.pop}</b>/{hud.popCap}
              </span>
              <span className="conq__chip conq__age" title={ageName}>
                {ageName}
                {hud.aging && <i style={{ '--p': `${Math.round(hud.aging.p * 100)}%` }} />}
              </span>
              <span className="conq__chip">⏱ {fmtClock(hud.t)}</span>
              {hud.idle > 0 && (
                <button type="button" className="conq__chip conq__idle" onClick={nextIdle} title="Ir al siguiente aldeano sin trabajo (tecla .)">
                  {hud.idle} {hud.idle === 1 ? 'aldeano libre' : 'aldeanos libres'}
                </button>
              )}
            </div>
          )}
          <div className="conq__foe">
            <span style={{ '--c': foe?.color }}>
              vs {foe?.name} · {TRIBES[foe?.tribe]?.name}
            </span>
          </div>
          <div className="bomb__tools">
            {!online && (
              <button
                type="button"
                className="cats__iconbtn"
                onClick={() => {
                  pausedRef.current = !pausedRef.current;
                  setPaused(pausedRef.current);
                }}
                aria-label={paused ? 'Seguir' : 'Pausar'}
                title="Pausa (P)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {paused ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h4v14H7zM13 5h4v14h-4z" />}
                </svg>
              </button>
            )}
            <button
              type="button"
              className={hand ? 'cats__iconbtn is-on' : 'cats__iconbtn'}
              onClick={() => setHand((v) => !v)}
              aria-pressed={hand}
              aria-label="Mover el mapa arrastrando"
              title="Mano: arrastra con clic izquierdo para mover el mapa (tecla M)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5v-8a1.5 1.5 0 0 1 3 0V12M14 6.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.8-2.4L4.3 14.9a1.5 1.5 0 0 1 2.3-1.9L8 14.5" />
              </svg>
            </button>
            <button type="button" className="cats__iconbtn" onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Alejar" title="Alejar (tecla -)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5M8 11h6" />
              </svg>
            </button>
            <button type="button" className="cats__iconbtn" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Acercar" title="Acercar (tecla +)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5M8 11h6M11 8v6" />
              </svg>
            </button>
            <button
              type="button"
              className="cats__iconbtn"
              onClick={toggleFullscreen}
              aria-label={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
              title="Pantalla completa"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {expanded ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
              </svg>
            </button>
            <button type="button" className="cats__iconbtn" onClick={() => (hud?.over ? leave() : setConfirmQuit(true))} aria-label="Salir de la partida" title="Salir">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="conq__view">
          <canvas
            ref={canvasRef}
            className={['conq__canvas', mode ? `is-${mode}` : '', hand && !mode ? 'is-hand' : ''].filter(Boolean).join(' ')}
            style={{ aspectRatio: `${VW} / ${VH}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => {
              pointerRef.current.inside = false;
            }}
            onContextMenu={onContextMenu}
            onWheel={onWheel}
            role="img"
            aria-label="Mapa de la conquista"
          />
          <div className="conq__toasts" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={`conq__toast is-${t.tone}`}>
                {t.text}
              </div>
            ))}
          </div>
          {mode === 'place' && <div className="conq__hint">Haz clic para construir · Shift para varias · Clic derecho o Esc para cancelar</div>}
          {mode === 'amove' && <div className="conq__hint">Haz clic donde quieres que ataquen · Esc para cancelar</div>}
          {paused && !hud?.over && <div className="conq__paused">Pausa · presiona P para seguir</div>}
        </div>

        <div className="conq__dock">
          <div className="conq__dock-inner">
            <canvas
              ref={miniRef}
              className="conq__mini"
              onPointerDown={(e) => {
                miniJump(e);
                if (e.button === 0) e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={(e) => e.buttons === 1 && miniJump(e)}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Minimapa"
            />
            <div className="conq__info">
              {!sel.length && (
                <div className="conq__tips">
                  <p>
                    <strong>{TRIBES[tribe].name}:</strong> {TRIBES[tribe].perk}
                  </p>
                  <span>
                    Selecciona a tus aldeanos con clic izquierdo y mándalos a trabajar con clic derecho sobre un árbol, las bayas o el oro. Los controles completos están debajo del
                    juego.
                  </span>
                </div>
              )}
              {single && single.kind === 'u' && (
                <div className="conq__one">
                  <img src={iconUrl('u', single.type, st.players[single.owner].color, st.players[single.owner].tribe)} alt="" />
                  <div>
                    <strong>
                      {UNITS[single.type].name}
                      {single.owner !== mine ? ` de ${st.players[single.owner].name}` : ''}
                    </strong>
                    <span className="conq__hp">
                      <i style={{ '--p': `${(single.hp / single.max) * 100}%` }} />
                      <em>
                        {Math.ceil(single.hp)}/{single.max}
                      </em>
                    </span>
                    <small>
                      ⚔ {UNITS[single.type].atk} · 🛡 {UNITS[single.type].armor}
                      {UNITS[single.type].missile ? ` · 🎯 ${unitRange(st, single.owner, single.type)}` : ''}
                      {single.owner === mine ? ` · ${(ORDER_TEXT[single.order.k] || ORDER_TEXT.idle)(single.order)}` : ''}
                    </small>
                    <small className="conq__muted">{UNITS[single.type].text}</small>
                  </div>
                </div>
              )}
              {single && single.kind === 'b' && (
                <div className="conq__one">
                  <img src={iconUrl('b', single.type, st.players[single.owner].color, st.players[single.owner].tribe)} alt="" />
                  <div>
                    <strong>
                      {BUILDINGS[single.type].name}
                      {single.owner !== mine ? ` de ${st.players[single.owner].name}` : ''}
                    </strong>
                    <span className="conq__hp">
                      <i style={{ '--p': `${(single.hp / single.max) * 100}%` }} />
                      <em>
                        {Math.ceil(single.hp)}/{single.max}
                      </em>
                    </span>
                    {!single.done && <small>En construcción: {Math.round(single.progress * 100)}% · haz clic derecho con aldeanos para ayudar</small>}
                    {single.done && single.aging !== null && single.owner === mine && <small>Subiendo de edad: {Math.round(single.aging * 100)}%</small>}
                    {single.done && single.blocked && single.owner === mine && <small className="conq__warn">Sin espacio: construye más casas.</small>}
                    {single.done && !single.queue.length && single.aging === null && <small className="conq__muted">{BUILDINGS[single.type].text}</small>}
                    {single.owner === mine && single.queue.length > 0 && (
                      <div className="conq__queue">
                        {single.queue.map((q, i) => (
                          <button
                            key={`${q}-${i}`}
                            type="button"
                            onClick={() => issue({ k: 'untrain', bid: single.id })}
                            title="Clic para cancelar el último de la cola"
                            style={{
                              '--p': i === 0 ? `${Math.round(single.train * 100)}%` : '0%',
                            }}
                          >
                            <img src={iconUrl('u', q, color, tribe)} alt={UNITS[q].name} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {sel.length > 1 && (
                <div className="conq__group">
                  {Object.entries(groups).map(([type, n]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => selectOnly(units.filter((u) => u.type === type).map((u) => u.id))}
                      title={`Seleccionar solo ${UNITS[type].name}`}
                    >
                      <img src={iconUrl('u', type, color, tribe)} alt="" />
                      <b>{n}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="conq__actions">
              {actions.map((a, i) => (
                <button
                  key={a.key}
                  type="button"
                  className={a.poor ? 'conq__act is-poor' : 'conq__act'}
                  disabled={a.disabled}
                  onClick={a.run}
                  title={`${a.title || a.label} (tecla ${i + 1})`}
                >
                  {a.img ? <img src={a.img} alt="" /> : <span className="conq__act-icon">{a.icon}</span>}
                  <span className="conq__act-label">{a.label}</span>
                  {a.locked ? <small className="conq__lock">🔒 {a.locked}</small> : <Cost cost={a.cost} />}
                  <kbd>{i + 1}</kbd>
                </button>
              ))}
            </div>
          </div>
        </div>

        {confirmQuit && !hud?.over && (
          <div className="cats__over">
            <h2>¿Rendirte?</h2>
            <p>Si sales ahora, la partida cuenta como perdida.</p>
            <div className="cats__over-actions">
              <button type="button" className="game-btn" onClick={resign}>
                Sí, rendirme
              </button>
              <button type="button" className="sf-chip" onClick={() => setConfirmQuit(false)}>
                Seguir jugando
              </button>
            </div>
          </div>
        )}
        {(hud?.over || lost) && (
          <div className="cats__over">
            <img src={fifo} alt="" className={won && !lost ? 'game-intro__fifo game-intro__fifo--party' : 'game-intro__fifo'} />
            <h2>{lost && !hud?.over ? 'Tu compañero salió de la partida' : won ? '¡Conquistaste el reino!' : `${foe?.name} conquistó tu castillo`}</h2>
            {hud?.over && (
              <>
                <p className="game-score">{hud.points} pts</p>
                <p>
                  {me?.stats.kills} enemigos derrotados · {me?.stats.razed} edificios destruidos · {me?.stats.gathered} recursos recolectados · {fmtClock(hud.t)}
                </p>
              </>
            )}
            <div className="cats__over-actions">
              <button type="button" className="game-btn" onClick={leave}>
                {online ? 'Volver a las salas' : 'Jugar otra'}
              </button>
            </div>
          </div>
        )}
      </div>
      <ConquestHelp online={online} />
    </div>
  );
}

function Key({ children }) {
  return <kbd className="conq-help__key">{children}</kbd>;
}

function ConquestHelp({ online }) {
  return (
    <section className="conq-help" aria-label="Controles de Conquista">
      <div className="conq-help__col">
        <h3>Con el mouse</h3>
        <ul>
          <li>
            <Key>Clic izquierdo</Key> sobre un aldeano, tropa o edificio para seleccionarlo.
          </li>
          <li>
            <Key>Arrastra con clic izquierdo</Key> para seleccionar varios a la vez.
          </li>
          <li>
            <Key>Doble clic</Key> en una tropa para elegir todas las de ese tipo en pantalla. <Key>Shift</Key> + clic las suma o quita.
          </li>
          <li>
            <Key>Clic derecho en el suelo</Key>: caminan hasta ahí.
          </li>
          <li>
            <Key>Clic derecho arrastrando</Key> o <Key>botón del medio arrastrando</Key>: mueven el mapa. Con el botón de la mano activo (tecla <Key>M</Key>), también se mueve
            arrastrando con <Key>clic izquierdo</Key>.
          </li>
          <li>
            <Key>Clic derecho en árbol, bayas u oro</Key> con aldeanos: recolectan solos y llevan todo al castillo o al almacén.
          </li>
          <li>
            <Key>Clic derecho en un enemigo</Key>: lo atacan.
          </li>
          <li>
            <Key>Clic derecho en un edificio tuyo</Key> con aldeanos: lo terminan de construir, lo reparan o trabajan la granja.
          </li>
          <li>
            Con un edificio seleccionado, <Key>clic derecho</Key> marca dónde se juntan las tropas nuevas.
          </li>
          <li>
            <Key>Rueda</Key> o los botones de lupa arriba: acercan o alejan el mapa. En el minimapa, <Key>clic</Key> salta a ese lugar y <Key>clic derecho</Key> manda a la
            selección.
          </li>
        </ul>
      </div>
      <div className="conq-help__col">
        <h3>Con el teclado</h3>
        <ul>
          <li>
            <Key>W</Key> <Key>A</Key> <Key>S</Key> <Key>D</Key> o las <Key>flechas</Key>: mueven la cámara.
          </li>
          <li>
            <Key>1</Key> al <Key>9</Key>: los botones del panel de acciones, en orden (construir, entrenar, subir de edad).
          </li>
          <li>
            <Key>H</Key>: va a tu castillo y lo selecciona.
          </li>
          <li>
            <Key>+</Key> y <Key>-</Key>: acercan o alejan el mapa.
          </li>
          <li>
            <Key>M</Key>: activa o desactiva la mano para mover el mapa con clic izquierdo.
          </li>
          <li>
            <Key>.</Key> (punto): va al siguiente aldeano sin trabajo.
          </li>
          <li>
            <Key>Espacio</Key>: va a donde te están atacando.
          </li>
          <li>
            <Key>Esc</Key>: cancela lo que estás colocando o quita la selección.
          </li>
          <li>
            <Key>Shift</Key> al colocar un edificio: sigues colocando más del mismo.
          </li>
          {!online && (
            <li>
              <Key>P</Key>: pausa y reanuda.
            </li>
          )}
        </ul>
      </div>
      <div className="conq-help__col">
        <h3>Para empezar</h3>
        <ol>
          <li>Manda a tus aldeanos a cortar árboles, recoger bayas y sacar oro.</li>
          <li>Haz clic en el castillo y entrena más aldeanos (tecla 1).</li>
          <li>
            Cuando la casita <ResIcon kind="pop" size={12} /> se ponga roja, construye casas: cada una da 5 de población.
          </li>
          <li>Construye un cuartel, entrena lanceros y sube a la Edad Feudal desde el castillo.</li>
          <li>Junta un ejército y derriba el castillo enemigo. Si cae el tuyo, pierdes.</li>
        </ol>
        <p>Lancero le gana a caballero, caballero a arquero y arquero a lancero. La catapulta derriba edificios.</p>
      </div>
    </section>
  );
}
