import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { H, TEAMS, TEAM_X, UNIT_R, W, WATER, WEAPONS, botShot, carve, groundAt, launchVelocity, makeMap, previewPath, scoreFor, stepProjectile, windFor } from './catArtillery';
import { drawPreview, drawProjectile, drawSky, drawTerrain, drawUnit, drawUnitHud, drawWater } from './catArtilleryDraw';
import { finishRoom, pushShot, pushState, useRoom } from '../../lib/catRooms';

const SIDE_COLORS = ['#ffb38a', '#9cc7ff'];

export function WeaponIcon({ kind, size = 26 }) {
  if (kind === 'fish') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 16c4-6 11-8 17-5l5-4v18l-5-4c-6 3-13 1-17-5z" fill="#ff9f6b" />
        <circle cx="10" cy="15" r="1.6" fill="#1a1033" />
        <path d="M14 12c1 2 1 6 0 8" stroke="#ffd0b5" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'yarn') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="11" cy="20" r="6" fill="#ff7ad9" />
        <circle cx="21" cy="20" r="6" fill="#f472b6" />
        <circle cx="16" cy="11" r="6" fill="#ff9ae6" />
        <path d="M12 9c3 1 5 3 6 6M8 18c3 0 5 2 6 5M18 18c3 0 5 2 6 5" stroke="#ffe0f6" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  if (kind === 'icicle') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 6l20 7-14 13z" fill="#bfefff" />
        <path d="M6 6l20 7-9 2z" fill="#ffffff" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="10" fill="#ffffff" />
      <circle cx="12.5" cy="12.5" r="3" fill="#dff1ff" />
      <path d="M20 20l2 2M22 14h3M14 22v3" stroke="#bfe6ff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function buildTeams(config, terrain) {
  return config.teams.map((t, side) => {
    const def = TEAMS[t.team];
    return {
      key: t.team,
      kind: def.kind,
      name: def.name,
      label: t.label,
      controller: t.controller,
      cursor: -1,
      angle: side === 0 ? 45 : 135,
      power: 60,
      weapon: 0,
      ammo: WEAPONS.map((w) => w.ammo),
      units: def.units.map((u, i) => ({
        name: u.name,
        colors: u,
        x: TEAM_X[side][i],
        y: groundAt(terrain, TEAM_X[side][i]) - UNIT_R,
        vy: 0,
        hp: 100,
        alive: true,
        flash: 0,
        face: side === 0 ? 1 : -1,
      })),
    };
  });
}

function nextAlive(team, from) {
  for (let k = 1; k <= team.units.length; k += 1) {
    const i = (from + k + team.units.length) % team.units.length;
    if (team.units[i].alive) return i;
  }
  return -1;
}

function newGame(config) {
  const { terrain, base } = makeMap(config.seed);
  return {
    config,
    terrain,
    base,
    teams: buildTeams(config, terrain),
    turnTeam: 0,
    turnNo: 0,
    phase: 'starting',
    wind: windFor(config.seed, 0),
    projectiles: [],
    particles: [],
    rings: [],
    shake: 0,
    settleAt: 0,
    dealt: [0, 0],
    result: null,
    score: 0,
    lastShooterHuman: false,
    snow: Array.from({ length: 70 }, (_, i) => ({ x: (i * 137) % W, y: (i * 89) % H, r: 1 + (i % 3) * 0.7, s: 0.4 + (i % 5) * 0.18 })),
    time: 0,
  };
}

export default function CatArena({ config, onExit, onSave }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const gameRef = useRef(null);
  const aimingRef = useRef(false);
  const timerRef = useRef(0);
  const [hud, setHud] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const online = config.mode === 'online';
  const room = useRoom(online ? config.code : null);
  const roomRef = useRef(null);
  roomRef.current = room;

  const sync = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    const team = g.teams[g.turnTeam];
    setHud({
      turnTeam: g.turnTeam,
      phase: g.phase,
      wind: g.wind,
      angle: Math.round(team.angle),
      power: Math.round(team.power),
      weapon: team.weapon,
      ammo: [...team.ammo],
      controller: team.controller,
      teams: g.teams.map((t) => ({ name: t.name, label: t.label, units: t.units.map((u) => ({ name: u.name, hp: Math.max(0, Math.round(u.hp)), alive: u.alive })) })),
      activeUnit: team.cursor,
      result: g.result,
      score: g.score,
    });
  }, []);

  const canAim = (g) => g && g.phase === 'aim' && g.teams[g.turnTeam].controller === 'human';

  const fire = useCallback(
    (params, fromRemote = false) => {
      const g = gameRef.current;
      if (!g || (g.phase !== 'aim' && g.phase !== 'thinking' && g.phase !== 'waiting')) return;
      const team = g.teams[g.turnTeam];
      const unit = team.units[team.cursor];
      if (!unit) return;
      const weaponIndex = team.ammo[params.weapon] > 0 ? params.weapon : 0;
      const weapon = WEAPONS[weaponIndex];
      team.ammo[weaponIndex] -= 1;
      if (team.ammo[team.weapon] <= 0) team.weapon = 0;
      team.angle = params.angle;
      team.power = params.power;
      const { vx, vy } = launchVelocity(params.angle, params.power, weapon);
      const spread = weapon.split ? [-1.2, 0, 1.2] : [0];
      g.projectiles = spread.map((d) => ({
        x: unit.x,
        y: unit.y - UNIT_R,
        vx: vx + d * 0.6,
        vy: vy - Math.abs(d) * 0.3,
        age: 0,
        kind: weapon.key,
        weapon,
        side: g.turnTeam,
        fast: weapon.fast,
      }));
      g.phase = 'flying';
      g.lastShooterHuman = team.controller === 'human';
      if (online && team.controller === 'human' && !fromRemote) {
        pushShot(config.code, { n: g.turnNo, side: g.turnTeam, unit: team.cursor, angle: params.angle, power: params.power, weapon: weaponIndex });
      }
      sync();
    },
    [online, config.code, sync],
  );

  const startTurn = useCallback(
    (g) => {
      const team = g.teams[g.turnTeam];
      team.cursor = nextAlive(team, team.cursor);
      g.wind = windFor(g.config.seed, g.turnNo);
      if (team.controller === 'bot') {
        g.phase = 'thinking';
        const enemies = g.teams[1 - g.turnTeam].units.filter((u) => u.alive);
        const shooter = team.units[team.cursor];
        const shot = botShot(shooter, enemies, g.wind, g.terrain, g.config.level, team.ammo, shooter.face);
        g.botTarget = shot;
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          if (gameRef.current === g && g.phase === 'thinking') fire(shot);
        }, 1300);
      } else if (team.controller === 'remote') {
        g.phase = 'waiting';
      } else {
        g.phase = 'aim';
      }
      sync();
    },
    [fire, sync],
  );

  useEffect(() => {
    const g = newGame(config);
    gameRef.current = g;
    startTurn(g);
    return () => window.clearTimeout(timerRef.current);
  }, [config, startTurn]);

  useEffect(() => {
    const g = gameRef.current;
    if (!online || !g || !room?.shots) return;
    if (g.phase === 'waiting') {
      const shot = room.shots.find((s) => s.n === g.turnNo && s.side === g.turnTeam);
      if (shot) {
        g.teams[g.turnTeam].cursor = shot.unit;
        fire(shot, true);
      }
    }
  }, [online, room, fire, hud]);

  useEffect(() => {
    const g = gameRef.current;
    if (!online || !g || !room?.state || g.lastAppliedState === room.state.n) return;
    if (room.state.n >= g.turnNo) return;
    g.lastAppliedState = room.state.n;
    room.state.hp.forEach((list, side) =>
      list.forEach(([hp, x], i) => {
        const u = g.teams[side].units[i];
        if (!u) return;
        u.hp = hp;
        u.x = x;
        u.alive = hp > 0;
      }),
    );
    sync();
  }, [online, room, sync, hud]);

  useEffect(() => {
    const onChange = () => setExpanded(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    let raf = 0;

    const explode = (g, x, y, weapon, side) => {
      carve(g.terrain, x, y, weapon.radius);
      g.shake = Math.min(14, 4 + weapon.radius / 5);
      g.rings.push({ x, y, r: 4, max: weapon.radius * 1.3, life: 1 });
      for (let i = 0; i < 24; i += 1) {
        const a = (i / 24) * Math.PI * 2;
        const s = 1.5 + ((i * 7) % 5);
        g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 40 + ((i * 13) % 30), c: i % 2 ? '#ffffff' : '#9fd0f5' });
      }
      g.teams.forEach((team, tSide) =>
        team.units.forEach((u) => {
          if (!u.alive) return;
          const d = Math.hypot(u.x - x, u.y - y);
          if (d < weapon.radius + UNIT_R) {
            const dmg = weapon.damage * (1 - (d / (weapon.radius + UNIT_R)) * 0.6);
            u.hp -= dmg;
            u.flash = 30;
            u.vy -= 2;
            u.x += Math.sign(u.x - x || 1) * Math.min(18, (weapon.radius - Math.min(d, weapon.radius)) * 0.5);
            u.x = Math.max(16, Math.min(W - 16, u.x));
            if (tSide !== side) g.dealt[side] += dmg;
          }
        }),
      );
    };

    const finishIfOver = (g) => {
      g.teams.forEach((team) =>
        team.units.forEach((u) => {
          if (u.alive && (u.hp <= 0 || u.y > WATER)) {
            u.alive = false;
            u.hp = 0;
          }
        }),
      );
      const out = g.teams.map((t) => t.units.every((u) => !u.alive));
      if (!out[0] && !out[1]) return false;
      const winner = out[0] && out[1] ? -1 : out[0] ? 1 : 0;
      g.result = { winner };
      g.phase = 'over';
      const mine = config.mode === 'online' ? config.side : 0;
      const hpLeft = g.teams[mine].units.reduce((s, u) => s + Math.max(0, u.hp), 0);
      if (config.mode !== 'local') {
        const won = winner === mine;
        g.score =
          config.mode === 'online' ? (won ? 150 + Math.round(hpLeft / 3) : Math.round(g.dealt[mine] / 3)) : scoreFor(won ? 'won' : 'lost', hpLeft, config.level, g.dealt[mine]);
        onSave?.(g.score, won ? 'won' : 'lost');
      }
      if (config.mode === 'online' && config.side === 0) finishRoom(config.code, winner);
      return true;
    };

    const endTurn = (g) => {
      if (online && g.lastShooterHuman) {
        pushState(config.code, { n: g.turnNo, hp: g.teams.map((t) => t.units.map((u) => [Math.round(Math.max(0, u.hp) * 10) / 10, Math.round(u.x)])) });
      }
      if (finishIfOver(g)) {
        sync();
        return;
      }
      g.turnNo += 1;
      g.turnTeam = 1 - g.turnTeam;
      startTurn(g);
    };

    const settle = (g) => {
      let moving = false;
      g.teams.forEach((team) =>
        team.units.forEach((u) => {
          if (!u.alive) return;
          const ground = groundAt(g.terrain, u.x) - UNIT_R;
          if (u.y < ground - 0.5 || u.vy < 0) {
            u.vy += 0.35;
            u.y = Math.min(ground, u.y + u.vy);
            if (u.y >= ground) u.vy = 0;
            moving = true;
          } else {
            u.y = ground;
            u.vy = 0;
          }
          if (u.flash > 0) u.flash -= 1;
        }),
      );
      return moving;
    };

    const tick = () => {
      const g = gameRef.current;
      if (!g) {
        raf = requestAnimationFrame(tick);
        return;
      }
      g.time += 1;
      g.snow.forEach((f) => {
        f.y += f.s;
        f.x += g.wind * 0.6;
        if (f.y > H) f.y = -4;
        if (f.x > W) f.x = 0;
        if (f.x < 0) f.x = W;
      });
      const team = g.teams[g.turnTeam];
      if (g.phase === 'thinking' && g.botTarget) team.angle += (g.botTarget.angle - team.angle) * 0.06;

      if (g.phase === 'flying') {
        for (let step = 0; step < 2; step += 1) {
          g.projectiles.forEach((p) => {
            if (p.done) return;
            stepProjectile(p, g.wind);
            if (p.x < -60 || p.x > W + 60 || p.y > H + 20) {
              p.done = true;
              return;
            }
            if (p.y >= groundAt(g.terrain, p.x)) {
              p.done = true;
              explode(g, p.x, p.y, p.weapon, p.side);
              return;
            }
            g.teams.forEach((t) =>
              t.units.forEach((u) => {
                if (!p.done && u.alive && p.age > 6 && Math.hypot(p.x - u.x, p.y - u.y) < UNIT_R + 4) {
                  p.done = true;
                  explode(g, p.x, p.y, p.weapon, p.side);
                }
              }),
            );
          });
        }
        if (g.projectiles.every((p) => p.done)) {
          g.phase = 'settling';
          g.settleAt = g.time;
        }
      }
      const moving = settle(g);
      g.particles = g.particles.filter((pt) => {
        pt.vy += 0.15;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        return pt.life > 0 && pt.y < H;
      });
      g.rings = g.rings.filter((r) => {
        r.r += (r.max - r.r) * 0.25;
        r.life -= 0.06;
        return r.life > 0;
      });
      if (g.phase === 'settling' && !moving && g.time - g.settleAt > 45) {
        g.phase = 'between';
        endTurn(g);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (g.shake > 0.3) {
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
        g.shake *= 0.88;
      }
      drawSky(ctx, g.time);
      drawTerrain(ctx, g.terrain, g.base);
      drawWater(ctx, g.time);
      const active = team.units[team.cursor];
      if (canAim(g) && active) {
        drawPreview(ctx, previewPath(active.x, active.y - UNIT_R, team.angle, team.power, g.wind, g.terrain, WEAPONS[team.weapon]));
      }
      g.teams.forEach((t, side) =>
        t.units.forEach((u, i) => {
          const isActive = side === g.turnTeam && i === t.cursor && g.phase !== 'over';
          drawUnit(ctx, u, t.kind, isActive ? t.angle : side === 0 ? 35 : 145, isActive, g.time);
          drawUnitHud(ctx, u, SIDE_COLORS[side]);
        }),
      );
      g.projectiles.forEach((p) => !p.done && drawProjectile(ctx, p));
      g.rings.forEach((r) => {
        ctx.strokeStyle = `rgba(255,255,255,${r.life})`;
        ctx.lineWidth = 4 * r.life;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      });
      g.particles.forEach((pt) => {
        ctx.fillStyle = pt.c;
        ctx.globalAlpha = Math.min(1, pt.life / 30);
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      g.snow.forEach((f) => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config, online, onSave, startTurn, sync]);

  const pointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * W) / rect.width, y: ((e.clientY - rect.top) * H) / rect.height };
  };

  const aimAt = (e) => {
    const g = gameRef.current;
    if (!canAim(g)) return;
    const team = g.teams[g.turnTeam];
    const u = team.units[team.cursor];
    const { x, y } = pointerPos(e);
    const dx = x - u.x;
    const dy = u.y - UNIT_R - y;
    team.angle = Math.max(2, Math.min(178, (Math.atan2(dy, dx) * 180) / Math.PI));
    team.power = Math.max(10, Math.min(100, Math.hypot(dx, dy) / 3.2));
    sync();
  };

  const fireHuman = useCallback(() => {
    const g = gameRef.current;
    if (!canAim(g)) return;
    const team = g.teams[g.turnTeam];
    fire({ angle: team.angle, power: team.power, weapon: team.weapon });
  }, [fire]);

  useEffect(() => {
    const onKey = (e) => {
      const g = gameRef.current;
      if (!canAim(g)) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const team = g.teams[g.turnTeam];
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft') team.angle = Math.min(178, team.angle + step);
      else if (e.key === 'ArrowRight') team.angle = Math.max(2, team.angle - step);
      else if (e.key === 'ArrowUp') team.power = Math.min(100, team.power + step);
      else if (e.key === 'ArrowDown') team.power = Math.max(10, team.power - step);
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        fireHuman();
        return;
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const i = Number(e.key) - 1;
        if (team.ammo[i] > 0) team.weapon = i;
      } else return;
      e.preventDefault();
      sync();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fireHuman, sync]);

  const pickWeapon = (i) => {
    const g = gameRef.current;
    if (!canAim(g)) return;
    const team = g.teams[g.turnTeam];
    if (team.ammo[i] <= 0) return;
    team.weapon = i;
    sync();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  const myTurn = hud && hud.phase === 'aim' && hud.controller === 'human';
  const teamHud = hud?.teams?.[hud.turnTeam];
  const shooterName = teamHud && hud.activeUnit >= 0 ? teamHud.units[hud.activeUnit]?.name : '';
  const windLabel = !hud || hud.wind === 0 ? 'Sin viento' : `${Math.abs(hud.wind).toFixed(1)} ${hud.wind > 0 ? '→' : '←'}`;
  const opponentLeft = online && room && (room.status === 'left' || room.missing) && hud?.phase !== 'over';
  let status = '';
  if (hud) {
    if (hud.phase === 'over') status = 'Fin de la partida';
    else if (hud.phase === 'waiting') status = `Turno de ${teamHud.label}…`;
    else if (hud.phase === 'thinking') status = `${shooterName} está apuntando…`;
    else if (hud.phase === 'aim') status = config.mode === 'local' ? `Turno de ${teamHud.label}: ${shooterName}` : `Tu turno: ${shooterName}`;
    else status = '¡Volando!';
  }
  const mine = config.mode === 'online' ? config.side : 0;
  const winnerText = !hud?.result
    ? ''
    : hud.result.winner === -1
      ? '¡Empate!'
      : config.mode === 'local'
        ? `¡Ganó ${hud.teams[hud.result.winner].label}!`
        : hud.result.winner === mine
          ? '¡Ganaste!'
          : `${hud.teams[1 - mine].label} ganó esta vez`;

  return (
    <div className={expanded ? 'cats is-full' : 'cats'} ref={rootRef}>
      <div className="cats__stage">
        <canvas
          ref={canvasRef}
          className={myTurn ? 'cats__canvas is-aiming' : 'cats__canvas'}
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerDown={(e) => {
            if (!canAim(gameRef.current)) return;
            aimingRef.current = true;
            canvasRef.current.setPointerCapture?.(e.pointerId);
            aimAt(e);
          }}
          onPointerMove={(e) => aimingRef.current && aimAt(e)}
          onPointerUp={() => {
            if (!aimingRef.current) return;
            aimingRef.current = false;
            fireHuman();
          }}
          onPointerCancel={() => (aimingRef.current = false)}
          role="img"
          aria-label="Campo de batalla en la Antártida"
        />

        {hud && (
          <div className="cats__hudtop">
            {hud.teams.map((t, side) => (
              <div key={side} className={`cats__team cats__team--${side}${hud.turnTeam === side && hud.phase !== 'over' ? ' is-turn' : ''}`}>
                <span className="cats__team-name">
                  {t.label} · {t.name}
                </span>
                <span className="cats__team-units">
                  {t.units.map((u, i) => (
                    <span key={u.name} className={u.alive ? (hud.turnTeam === side && hud.activeUnit === i ? 'is-active' : '') : 'is-out'} title={`${u.name}: ${u.hp}`}>
                      <i style={{ '--hp': `${u.hp}%` }} />
                    </span>
                  ))}
                </span>
              </div>
            ))}
            <div className="cats__status">
              <strong>{status}</strong>
              <span>Viento {windLabel}</span>
            </div>
          </div>
        )}

        {hud && hud.phase !== 'over' && (
          <div className={myTurn ? 'cats__dock' : 'cats__dock is-idle'}>
            <div className="cats__dock-weapons" role="group" aria-label="Arma">
              {WEAPONS.map((w, i) => (
                <button
                  key={w.key}
                  type="button"
                  className="cats__wbtn"
                  aria-pressed={hud.weapon === i}
                  disabled={!myTurn || hud.ammo[i] <= 0}
                  onClick={() => pickWeapon(i)}
                  title={`${w.name} (tecla ${i + 1})`}
                  aria-label={w.name}
                >
                  <WeaponIcon kind={w.key} />
                  <span className="cats__wbtn-ammo">{Number.isFinite(hud.ammo[i]) ? hud.ammo[i] : '∞'}</span>
                </button>
              ))}
            </div>
            <div className="cats__dock-meters">
              <span className="cats__meter">
                <small>Ángulo</small>
                <b>{hud.angle}°</b>
              </span>
              <span className="cats__meter cats__meter--power">
                <small>Potencia</small>
                <i style={{ '--p': `${hud.power}%` }} />
                <b>{hud.power}</b>
              </span>
            </div>
            <button type="button" className="cats__launch" onClick={fireHuman} disabled={!myTurn}>
              Lanzar
            </button>
            <button
              type="button"
              className="cats__iconbtn"
              onClick={toggleFullscreen}
              aria-label={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
              title="Pantalla completa"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {expanded ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
              </svg>
            </button>
            <button type="button" className="cats__iconbtn" onClick={onExit} aria-label="Salir de la partida" title="Salir">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}

        {(hud?.phase === 'over' || opponentLeft) && (
          <div className="cats__over">
            <img src={fifo} alt="" className={hud?.result && hud.result.winner === mine ? 'game-intro__fifo game-intro__fifo--party' : 'game-intro__fifo'} />
            <h2>{opponentLeft ? 'Tu compañero salió de la partida' : winnerText}</h2>
            {!opponentLeft && config.mode !== 'local' && <p className="game-score">{hud.score} pts</p>}
            {!opponentLeft && config.mode !== 'local' && (
              <p>{hud.result.winner === mine ? 'Los puntos ya suman al leaderboard de la semana.' : 'Sumaste puntos por el daño que hiciste. ¡La revancha te espera!'}</p>
            )}
            <div className="cats__over-actions">
              <button type="button" className="game-btn" onClick={onExit}>
                {online ? 'Volver a las salas' : 'Jugar otra'}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="cats__help">
        Arrastra desde el personaje marcado con la flecha y suelta para lanzar. Teclado: flechas para ángulo y potencia, 1 a 4 para el arma, espacio para lanzar.
      </p>
    </div>
  );
}
