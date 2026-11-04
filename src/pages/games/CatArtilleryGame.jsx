import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { saveCatScore } from '../../lib/games';
import { CAT_R, H, LEVELS, W, WATER, WEAPONS, botShot, carve, groundAt, launchVelocity, makeTerrain, previewPath, scoreFor, stepProjectile } from './catArtillery';

const PLAYER_COLORS = { body: '#f2a44b', dark: '#c97a24', scarf: '#e5484d' };
const BOT_COLORS = { body: '#b7c2d6', dark: '#7d8aa3', scarf: '#3b82f6' };

function newWind() {
  return Math.round((Math.random() * 2 - 1) * 10) / 10;
}

function initialGame(level, playerName) {
  const terrain = makeTerrain();
  const player = { x: 110, y: groundAt(terrain, 110) - CAT_R, vy: 0, hp: 100, name: playerName, colors: PLAYER_COLORS, face: 1, flash: 0 };
  const bot = { x: W - 110, y: groundAt(terrain, W - 110) - CAT_R, vy: 0, hp: 100, name: 'Michi Polar', colors: BOT_COLORS, face: -1, flash: 0 };
  return {
    level,
    terrain,
    player,
    bot,
    turn: 'player',
    phase: 'aim',
    wind: newWind(),
    angle: 45,
    power: 60,
    weapon: 0,
    ammo: { player: WEAPONS.map((w) => w.ammo), bot: WEAPONS.map((w) => w.ammo) },
    projectiles: [],
    particles: [],
    rings: [],
    shake: 0,
    settleAt: 0,
    dealt: 0,
    result: null,
    snow: Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, s: 0.4 + Math.random() * 0.8 })),
    time: 0,
  };
}

function drawSky(ctx, g) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#070b2e');
  sky.addColorStop(0.55, '#24427f');
  sky.addColorStop(1, '#9ec9ee');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let band = 0; band < 3; band += 1) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = 70 + band * 26 + Math.sin(x / 120 + g.time / 90 + band) * 22;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 26 - band * 6;
    ctx.strokeStyle = band === 1 ? '#c084fc' : '#5ef2a8';
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(214, 233, 250, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0, 300);
  [[90, 210], [200, 280], [310, 190], [430, 270], [560, 200], [690, 265], [810, 185], [960, 260]].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W, 360);
  ctx.lineTo(0, 360);
  ctx.fill();
}

function drawWater(ctx, g) {
  const water = ctx.createLinearGradient(0, WATER, 0, H);
  water.addColorStop(0, '#2b6cb0');
  water.addColorStop(1, '#0b2a55');
  ctx.fillStyle = water;
  ctx.fillRect(0, WATER, W, H - WATER);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const y = WATER + Math.sin(x / 30 + g.time / 20) * 2;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawTerrain(ctx, g) {
  const ice = ctx.createLinearGradient(0, 150, 0, H);
  ice.addColorStop(0, '#ffffff');
  ice.addColorStop(0.35, '#cfe8f8');
  ice.addColorStop(1, '#5f9fd2');
  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x < W; x += 2) ctx.lineTo(x, g.terrain[x]);
  ctx.lineTo(W, g.terrain[W - 1]);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x < W; x += 2) {
    if (g.terrain[x] > WATER) {
      ctx.moveTo(x + 2, g.terrain[Math.min(W - 1, x + 2)]);
      continue;
    }
    if (x === 0) ctx.moveTo(x, g.terrain[x]);
    else ctx.lineTo(x, g.terrain[x]);
  }
  ctx.stroke();
}

function drawCat(ctx, cat, aimAngle, active, time) {
  const { x, y, colors, face } = cat;
  const bob = active ? Math.sin(time / 8) * 1.2 : 0;
  ctx.save();
  ctx.translate(x, y + bob);
  if (cat.flash > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(cat.flash);
  ctx.fillStyle = colors.dark;
  ctx.beginPath();
  ctx.moveTo(-face * 12, 6);
  ctx.quadraticCurveTo(-face * 28, 0, -face * 24, -16);
  ctx.lineWidth = 5;
  ctx.strokeStyle = colors.dark;
  ctx.lineCap = 'round';
  ctx.stroke();
  if (aimAngle != null) {
    const a = (aimAngle * Math.PI) / 180;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 7;
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
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(face * 4, -12, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(face * 4 - 10, -17);
  ctx.lineTo(face * 4 - 7, -29);
  ctx.lineTo(face * 4 - 1, -21);
  ctx.moveTo(face * 4 + 10, -17);
  ctx.lineTo(face * 4 + 7, -29);
  ctx.lineTo(face * 4 + 1, -21);
  ctx.fill();
  ctx.fillStyle = '#1a1033';
  ctx.beginPath();
  ctx.arc(face * 4 - 4 + face * 2, -13, 1.9, 0, Math.PI * 2);
  ctx.arc(face * 4 + 4 + face * 2, -13, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8fb1';
  ctx.beginPath();
  ctx.arc(face * 4 + face * 2, -9, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.scarf;
  ctx.fillRect(-9, -4, 18, 5);
  ctx.fillRect(face * -6, 0, 5, 9);
  ctx.restore();
}

function drawHud(ctx, cat) {
  const w = 54;
  const x = cat.x - w / 2;
  const y = cat.y - 52;
  ctx.fillStyle = 'rgba(5, 3, 32, 0.6)';
  ctx.fillRect(x - 2, y - 2, w + 4, 9);
  ctx.fillStyle = cat.hp > 50 ? '#5fd39a' : cat.hp > 25 ? '#f2c94c' : '#ff8a7a';
  ctx.fillRect(x, y, (w * Math.max(0, cat.hp)) / 100, 5);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(cat.name, cat.x, y - 6);
}

function drawProjectile(ctx, p) {
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

export default function CatArtilleryGame({ agentName }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const gameRef = useRef(null);
  const aimingRef = useRef(false);
  const savedRef = useRef(false);
  const [level, setLevel] = useState('medio');
  const [hud, setHud] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const firstName = (agentName || 'Tú').split(' ')[0];

  const sync = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    setHud({
      turn: g.turn,
      phase: g.phase,
      wind: g.wind,
      angle: Math.round(g.angle),
      power: Math.round(g.power),
      weapon: g.weapon,
      ammo: [...g.ammo.player],
      playerHp: Math.max(0, Math.round(g.player.hp)),
      botHp: Math.max(0, Math.round(g.bot.hp)),
      result: g.result,
      score: g.score || 0,
    });
  }, []);

  useEffect(() => {
    const onChange = () => setExpanded(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const start = () => {
    savedRef.current = false;
    gameRef.current = initialGame(level, firstName);
    sync();
  };

  const fire = useCallback(
    (shooterKey, angle, power, weaponIndex) => {
      const g = gameRef.current;
      if (!g || g.phase !== 'aim') return;
      const shooter = g[shooterKey];
      const weapon = WEAPONS[weaponIndex];
      if (g.ammo[shooterKey][weaponIndex] <= 0) return;
      g.ammo[shooterKey][weaponIndex] -= 1;
      if (shooterKey === 'player' && g.ammo.player[weaponIndex] <= 0) g.weapon = 0;
      const { vx, vy } = launchVelocity(angle, power);
      const spread = weapon.split ? [-1.2, 0, 1.2] : [0];
      g.projectiles = spread.map((d) => ({ x: shooter.x, y: shooter.y - CAT_R, vx: vx + d * 0.6, vy: vy - Math.abs(d) * 0.3, age: 0, kind: weapon.key, weapon, owner: shooterKey }));
      g.phase = 'flying';
      sync();
    },
    [sync]
  );

  const firePlayer = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.turn !== 'player' || g.phase !== 'aim') return;
    const weapon = g.ammo.player[g.weapon] > 0 ? g.weapon : 0;
    fire('player', g.angle, g.power, weapon);
  }, [fire]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hud) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let botTimer = 0;

    const explode = (g, x, y, weapon, owner) => {
      carve(g.terrain, x, y, weapon.radius);
      g.shake = Math.min(14, 4 + weapon.radius / 5);
      g.rings.push({ x, y, r: 4, max: weapon.radius * 1.3, life: 1 });
      for (let i = 0; i < 26; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * 4;
        g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 40 + Math.random() * 30, c: Math.random() < 0.5 ? '#ffffff' : '#9fd0f5' });
      }
      ['player', 'bot'].forEach((key) => {
        const cat = g[key];
        const d = Math.hypot(cat.x - x, cat.y - y);
        if (d < weapon.radius + CAT_R) {
          const dmg = weapon.damage * (1 - (d / (weapon.radius + CAT_R)) * 0.6);
          cat.hp -= dmg;
          cat.flash = 30;
          cat.vy -= 2;
          cat.x += Math.sign(cat.x - x || 1) * Math.min(18, (weapon.radius - Math.min(d, weapon.radius)) * 0.5);
          cat.x = Math.max(20, Math.min(W - 20, cat.x));
          if (owner === 'player' && key === 'bot') g.dealt += dmg;
        }
      });
    };

    const finish = (g) => {
      const playerOut = g.player.hp <= 0 || g.player.y > WATER;
      const botOut = g.bot.hp <= 0 || g.bot.y > WATER;
      if (!playerOut && !botOut) return false;
      g.result = botOut && !playerOut ? 'won' : 'lost';
      if (playerOut) g.player.hp = Math.min(g.player.hp, 0);
      if (botOut) g.bot.hp = Math.min(g.bot.hp, 0);
      g.phase = 'over';
      g.score = scoreFor(g.result, Math.max(0, g.player.hp), g.level, g.dealt);
      if (!savedRef.current) {
        savedRef.current = true;
        saveCatScore(agentName, g.score, g.result, g.level);
      }
      return true;
    };

    const nextTurn = (g) => {
      if (finish(g)) {
        sync();
        return;
      }
      g.turn = g.turn === 'player' ? 'bot' : 'player';
      g.wind = newWind();
      g.phase = 'aim';
      if (g.turn === 'bot') {
        g.phase = 'thinking';
        const shot = botShot(g.bot, g.player, g.wind, g.terrain, g.level, g.ammo.bot);
        g.botAim = { angle: 135, target: shot };
        botTimer = window.setTimeout(() => {
          const cur = gameRef.current;
          if (!cur || cur !== g || cur.phase !== 'thinking') return;
          cur.phase = 'aim';
          fire('bot', shot.angle, shot.power, shot.weapon);
        }, 1300);
      }
      sync();
    };

    const settleCats = (g) => {
      let moving = false;
      ['player', 'bot'].forEach((key) => {
        const cat = g[key];
        const ground = groundAt(g.terrain, cat.x) - CAT_R;
        if (cat.y < ground - 0.5 || cat.vy < 0) {
          cat.vy += 0.35;
          cat.y = Math.min(ground, cat.y + cat.vy);
          if (cat.y >= ground) cat.vy = 0;
          moving = true;
        } else {
          cat.y = ground;
          cat.vy = 0;
        }
        if (cat.flash > 0) cat.flash -= 1;
      });
      return moving;
    };

    const tick = () => {
      const g = gameRef.current;
      if (!g) return;
      g.time += 1;
      g.snow.forEach((f) => {
        f.y += f.s;
        f.x += g.wind * 0.6 + Math.sin((g.time + f.y) / 40) * 0.2;
        if (f.y > H) f.y = -4;
        if (f.x > W) f.x = 0;
        if (f.x < 0) f.x = W;
      });
      if (g.phase === 'thinking' && g.botAim) {
        g.botAim.angle += (g.botAim.target.angle - g.botAim.angle) * 0.06;
      }

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
              explode(g, p.x, p.y, p.weapon, p.owner);
              return;
            }
            ['player', 'bot'].forEach((key) => {
              const cat = g[key];
              if (!p.done && p.age > 6 && Math.hypot(p.x - cat.x, p.y - cat.y) < CAT_R + 4) {
                p.done = true;
                explode(g, p.x, p.y, p.weapon, p.owner);
              }
            });
          });
        }
        if (g.projectiles.every((p) => p.done)) {
          g.phase = 'settling';
          g.settleAt = g.time;
        }
      }

      const moving = settleCats(g);
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
        nextTurn(g);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (g.shake > 0.3) {
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
        g.shake *= 0.88;
      }
      drawSky(ctx, g);
      drawTerrain(ctx, g);
      drawWater(ctx, g);

      const aiming = g.turn === 'player' && g.phase === 'aim';
      if (aiming) {
        const pts = previewPath(g.player.x, g.player.y - CAT_R, g.angle, g.power, g.wind, g.terrain, 18);
        ctx.fillStyle = '#ffd166';
        ctx.shadowColor = '#ffb703';
        ctx.shadowBlur = 6;
        pts.forEach((pt, i) => {
          ctx.globalAlpha = 1 - (i / pts.length) * 0.85;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.4 - (i / pts.length) * 1.6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      drawCat(ctx, g.player, aiming || (g.turn === 'player' && g.phase === 'flying') ? g.angle : 40, g.turn === 'player', g.time);
      drawCat(ctx, g.bot, g.botAim ? g.botAim.angle : 140, g.turn === 'bot', g.time);
      drawHud(ctx, g.player);
      drawHud(ctx, g.bot);
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
      if (g.phase === 'thinking') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 15px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Michi Polar está apuntando…', g.bot.x - 30, g.bot.y - 78);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(botTimer);
    };
  }, [hud === null, fire, sync, agentName]);

  const pointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * W) / rect.width, y: ((e.clientY - rect.top) * H) / rect.height };
  };

  const aimAt = (e) => {
    const g = gameRef.current;
    if (!g || g.turn !== 'player' || g.phase !== 'aim') return;
    const { x, y } = pointerPos(e);
    const dx = x - g.player.x;
    const dy = g.player.y - CAT_R - y;
    g.angle = Math.max(2, Math.min(178, (Math.atan2(dy, dx) * 180) / Math.PI));
    g.power = Math.max(10, Math.min(100, Math.hypot(dx, dy) / 3.2));
    sync();
  };

  const onDown = (e) => {
    const g = gameRef.current;
    if (!g || g.turn !== 'player' || g.phase !== 'aim') return;
    aimingRef.current = true;
    canvasRef.current.setPointerCapture?.(e.pointerId);
    aimAt(e);
  };

  const onMove = (e) => {
    if (aimingRef.current) aimAt(e);
  };

  const onUp = () => {
    if (!aimingRef.current) return;
    aimingRef.current = false;
    firePlayer();
  };

  useEffect(() => {
    const onKey = (e) => {
      const g = gameRef.current;
      if (!g || g.turn !== 'player' || g.phase !== 'aim') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft') g.angle = Math.min(178, g.angle + step);
      else if (e.key === 'ArrowRight') g.angle = Math.max(2, g.angle - step);
      else if (e.key === 'ArrowUp') g.power = Math.min(100, g.power + step);
      else if (e.key === 'ArrowDown') g.power = Math.max(10, g.power - step);
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        firePlayer();
        return;
      } else if (['1', '2', '3'].includes(e.key)) {
        const i = Number(e.key) - 1;
        if (g.ammo.player[i] > 0) g.weapon = i;
      } else return;
      e.preventDefault();
      sync();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [firePlayer, sync]);

  const pickWeapon = (i) => {
    const g = gameRef.current;
    if (!g || g.ammo.player[i] <= 0) return;
    g.weapon = i;
    sync();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  if (!hud) {
    return (
      <div className="game-intro">
        <img src={fifo} alt="" className="game-intro__fifo" />
        <h2>Gatos en la Antártida</h2>
        <p>Por turnos: apunta, elige la potencia y lanza antes de que Michi Polar te tumbe del hielo. Cuidado con el viento y con caer al agua.</p>
        <div className="cats__levels" role="group" aria-label="Dificultad">
          {Object.entries(LEVELS).map(([key, l]) => (
            <button key={key} type="button" aria-pressed={level === key} onClick={() => setLevel(key)}>
              {l.label}
            </button>
          ))}
        </div>
        <button type="button" className="game-btn" onClick={start}>
          Jugar
        </button>
        <p className="cats__help">Arrastra desde tu gato hacia donde quieres disparar y suelta. También: flechas para ángulo y potencia, 1-2-3 para el arma y espacio para lanzar.</p>
      </div>
    );
  }

  const myTurn = hud.turn === 'player' && hud.phase === 'aim';
  const windLabel = hud.wind === 0 ? 'Sin viento' : `${Math.abs(hud.wind).toFixed(1)} ${hud.wind > 0 ? '→' : '←'}`;

  return (
    <div className={expanded ? 'cats is-full' : 'cats'} ref={rootRef}>
      <div className="cats__top">
        <div className="cats__hp">
          <span>{firstName}</span>
          <i style={{ '--hp': `${hud.playerHp}%`, '--c': PLAYER_COLORS.scarf }} />
          <b>{hud.playerHp}</b>
        </div>
        <div className="cats__turn">
          {hud.phase === 'over' ? 'Fin de la partida' : myTurn ? 'Tu turno' : hud.turn === 'player' ? 'Volando…' : 'Turno de Michi Polar'}
          <span className="cats__wind">Viento: {windLabel}</span>
        </div>
        <div className="cats__hp cats__hp--bot">
          <b>{hud.botHp}</b>
          <i style={{ '--hp': `${hud.botHp}%`, '--c': BOT_COLORS.scarf }} />
          <span>Michi Polar</span>
        </div>
      </div>

      <div className="cats__stage">
        <canvas
          ref={canvasRef}
          className={myTurn ? 'cats__canvas is-aiming' : 'cats__canvas'}
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (aimingRef.current = false)}
          aria-label="Campo de batalla en la Antártida"
          role="img"
        />
        {hud.phase === 'over' && (
          <div className="cats__over">
            <img src={fifo} alt="" className={hud.result === 'won' ? 'game-intro__fifo game-intro__fifo--party' : 'game-intro__fifo'} />
            <h2>{hud.result === 'won' ? '¡Ganaste!' : 'Michi Polar ganó esta vez'}</h2>
            <p className="game-score">{hud.score} pts</p>
            <p>{hud.result === 'won' ? 'Los puntos ya suman al leaderboard de la semana.' : 'Sumaste puntos por el daño que hiciste. ¡La revancha te espera!'}</p>
            <div className="cats__over-actions">
              <button type="button" className="game-btn" onClick={start}>
                Revancha
              </button>
              <button type="button" className="sf-chip" onClick={() => setHud(null)}>
                Cambiar dificultad
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="cats__controls">
        <div className="cats__weapons" role="group" aria-label="Arma">
          {WEAPONS.map((w, i) => (
            <button key={w.key} type="button" aria-pressed={hud.weapon === i} disabled={!myTurn || hud.ammo[i] <= 0} onClick={() => pickWeapon(i)}>
              <span className={`cats__ammo-icon cats__ammo-icon--${w.key}`} aria-hidden="true" />
              {w.name}
              <small>{Number.isFinite(hud.ammo[i]) ? `×${hud.ammo[i]}` : '∞'}</small>
            </button>
          ))}
        </div>
        <div className="cats__readout">
          <span>
            Ángulo <b>{hud.angle}°</b>
          </span>
          <span className="cats__power">
            Potencia <b>{hud.power}</b>
            <i style={{ '--p': `${hud.power}%` }} />
          </span>
        </div>
        <button type="button" className="game-btn cats__fire" onClick={firePlayer} disabled={!myTurn}>
          Lanzar
        </button>
        <button type="button" className="sf-chip cats__full" onClick={toggleFullscreen}>
          {expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
        </button>
      </div>
    </div>
  );
}
