import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { BH, BW, CONQUEST_TIME, MAPS, RESPAWN, SLOT_COLORS, SUDDEN_AT, applyRemote, bomberScore, createState, encodePaint, paintCounts, placeBomb, step } from './bomberEngine';
import { drawScene } from './bomberDraw';
import { finishBombRoom, pushBombPlayer, watchBombPlayer } from '../../lib/bombRooms';

const COUNTDOWN = 2.4;
const KEYSETS = {
  wasd: { dirs: { w: 'up', a: 'left', s: 'down', d: 'right' }, bomb: [' '] },
  arrows: { dirs: { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' }, bomb: ['Enter'] },
};
KEYSETS.all = { dirs: { ...KEYSETS.wasd.dirs, ...KEYSETS.arrows.dirs }, bomb: [' ', 'Enter'] };

const normKey = (k) => (k.length === 1 ? k.toLowerCase() : k);

function Stat({ kind, value }) {
  const label = kind === 'bomb' ? 'Bombas' : kind === 'fire' ? 'Alcance' : 'Velocidad';
  return (
    <span className={`bomb__stat bomb__stat--${kind}`} title={label} aria-label={`${label}: ${value}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        {kind === 'bomb' && <circle cx="12" cy="14" r="8" fill="currentColor" />}
        {kind === 'fire' && <path d="M12 2c5 6 7 9 5 15-1 3-4 5-5 5s-4-2-5-5C5 11 7 8 12 2z" fill="currentColor" />}
        {kind === 'speed' && <path d="M14 2 5 14h6l-2 8 9-12h-6z" fill="currentColor" />}
      </svg>
      {value}
    </span>
  );
}

const HAZARD_HELP = {
  piranhas: 'Cuidado en los puentes: cuando el agua burbujea, las pirañas están por saltar.',
  seals: 'Cuando parpadea la flecha roja, una foca viene deslizándose por ese carril.',
  bear: 'El oso polar da vueltas por el centro: no te le cruces.',
};

function Trophy({ count }) {
  return (
    <span className="bomb__trophy" title={`${count} rondas ganadas`} aria-label={`${count} rondas ganadas`}>
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10v3h3a3 3 0 0 1-3 5 5 5 0 0 1-4 4v3h3v3H8v-3h3v-3a5 5 0 0 1-4-4 3 3 0 0 1-3-5h3z" fill="currentColor" />
      </svg>
      {count}
    </span>
  );
}

export default function BomberArena({ config, onExit, onSave, tour, onRoundOver, onNext }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const stRef = useRef(null);
  const pubRef = useRef({ seq: 0, bombs: [], picks: [], last: 0, timer: 0, beat: 0, paintBeat: 0 });
  const finalizeRef = useRef(null);
  const [hud, setHud] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const online = config.mode === 'online';
  const mine = online ? config.me : 0;

  const publish = useCallback(
    (now = false) => {
      if (!online) return;
      const st = stRef.current;
      const pub = pubRef.current;
      const p = st?.players[mine];
      if (!p) return;
      const send = () => {
        pub.last = Date.now();
        pub.timer = 0;
        pub.seq += 1;
        pushBombPlayer(config.channel || config.code, mine, {
          slot: mine,
          uid: p.uid || null,
          x: Math.round(p.x * 1000) / 1000,
          y: Math.round(p.y * 1000) / 1000,
          dir: p.dir,
          alive: p.alive,
          by: p.by,
          left: !!pub.left,
          fire: p.fire,
          maxBombs: p.maxBombs,
          speed: p.speed,
          bombs: pub.bombs.slice(-10),
          picks: pub.picks.slice(-40),
          seq: pub.seq,
          ...(st.conquest && mine === 0 ? { paint: encodePaint(st) } : {}),
          ...(pub.final ? { final: pub.final } : {}),
        });
      };
      window.clearTimeout(pub.timer);
      const wait = 110 - (Date.now() - pub.last);
      if (now || wait <= 0) send();
      else pub.timer = window.setTimeout(send, wait);
    },
    [online, config.code, config.channel, mine],
  );

  const syncHud = useCallback(() => {
    const st = stRef.current;
    if (!st) return;
    const counts = st.conquest ? paintCounts(st) : null;
    const me = st.players[mine];
    setHud({
      players: st.players.map((p) => ({
        name: p.name,
        alive: p.alive,
        left: !!p.left,
        bomb: p.maxBombs,
        fire: p.fire,
        speed: p.speed,
        color: st.conquest ? SLOT_COLORS[p.slot] : p.colors?.body,
        accent: st.conquest ? '#ffffff' : p.colors?.accent,
        tiles: counts?.[p.slot] ?? 0,
      })),
      conquest: st.conquest,
      paintable: st.paintable,
      respawnIn: st.conquest && me && !me.alive && !me.left && config.players[mine]?.controller === 'human' ? Math.max(0, RESPAWN - (st.time - me.deadAt)) : 0,
      clock: st.time,
      ready: st.ready,
      over: st.over && !st.waitingFinal,
      counting: !!st.waitingFinal,
      winner: st.winner,
      score: st.score || 0,
    });
  }, [config, mine]);

  useEffect(() => {
    const st = createState(config);
    st.ready = COUNTDOWN;
    st.score = 0;
    stRef.current = st;
    pubRef.current = { seq: 0, bombs: [], picks: [], last: 0, timer: 0, beat: 0, paintBeat: 0 };
    syncHud();
    const t = window.setInterval(syncHud, 200);
    return () => window.clearInterval(t);
  }, [config, syncHud]);

  useEffect(() => {
    if (!online) return undefined;
    const unsubs = config.players.map((pl, slot) =>
      pl.controller === 'remote'
        ? watchBombPlayer(config.channel || config.code, slot, (data) => {
            const st = stRef.current;
            if (!st) return;
            applyRemote(st, slot, data);
            if (data.left && st.players[slot].alive) {
              st.players[slot].alive = false;
              st.players[slot].deadAt = st.time;
            }
            if (slot === 0 && data.final && st.conquest) {
              st.over = true;
              st.winner = data.final.winner;
              finalizeRef.current?.(st.winner);
            }
          })
        : null,
    );
    publish(true);
    return () => unsubs.forEach((u) => u && u());
  }, [online, config, publish]);

  useEffect(() => {
    const onChange = () => setExpanded(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = BW * dpr;
    canvas.height = BH * dpr;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let last = performance.now();
    const hooks = {
      onPick: (p, i) => {
        if (online && p.slot === mine) {
          pubRef.current.picks.push(i);
          publish();
        }
      },
      onDeath: (p) => {
        if (online && p.slot === mine) publish(true);
      },
      onRevive: (p) => {
        if (online && p.slot === mine) publish(true);
      },
      onOver: (winner) => {
        const st = stRef.current;
        if (online && mine === 0) {
          pubRef.current.final = { winner };
          publish(true);
          if (!config.tournament) finishBombRoom(config.code, winner);
        }
        if (online && st.conquest && mine !== 0) {
          st.waitingFinal = true;
          window.setTimeout(() => finalizeRef.current?.(st.winner), 3000);
          syncHud();
          return;
        }
        finalizeRef.current?.(winner);
      },
    };
    let finalized = false;
    finalizeRef.current = (winner) => {
      const st = stRef.current;
      if (finalized || !st) return;
      finalized = true;
      st.waitingFinal = false;
      st.winner = winner;
      if (config.mode !== 'local') {
        const won = winner === mine;
        st.score = bomberScore(st, mine, won);
        onSave?.(st.score, won ? 'won' : 'lost');
      }
      onRoundOver?.(winner);
      syncHud();
    };
    const tick = (now) => {
      const st = stRef.current;
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      if (st) {
        if (st.ready > 0) st.ready = Math.max(0, st.ready - dt);
        else step(st, dt, hooks);
        if (online && !st.over) {
          const pub = pubRef.current;
          pub.beat += dt;
          const me = st.players[mine];
          if (me?.alive && me.dir && pub.beat > 1.2) {
            pub.beat = 0;
            publish();
          }
          if (st.conquest && mine === 0 && st.ready <= 0) {
            pub.paintBeat += dt;
            if (pub.paintBeat > 2) {
              pub.paintBeat = 0;
              publish();
            }
          }
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (st.shake > 0.3) ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
        drawScene(ctx, st, true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config, online, mine, publish, onSave, onRoundOver, syncHud]);

  useEffect(() => {
    const humans = config.players.map((pl, slot) => ({ slot, keys: KEYSETS[pl.keys] })).filter((h) => h.keys && config.players[h.slot].controller === 'human');
    const find = (key) => {
      for (const h of humans) {
        if (h.keys.dirs[key]) return { h, dir: h.keys.dirs[key] };
        if (h.keys.bomb.includes(key)) return { h, bomb: true };
      }
      return null;
    };
    const onDown = (e) => {
      const st = stRef.current;
      if (!st || st.over) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const hit = find(normKey(e.key));
      if (!hit) return;
      e.preventDefault();
      if (st.ready > 0) return;
      const p = st.players[hit.h.slot];
      if (!p.alive) return;
      if (hit.bomb) {
        if (e.repeat) return;
        const b = placeBomb(st, p);
        if (b && online && p.slot === mine) {
          pubRef.current.bombs.push(b);
          publish(true);
        }
        return;
      }
      p.held = p.held.filter((d) => d !== hit.dir);
      p.held.push(hit.dir);
      const before = p.dir;
      p.dir = hit.dir;
      if (online && p.slot === mine && before !== p.dir) publish();
    };
    const onUp = (e) => {
      const st = stRef.current;
      if (!st) return;
      const hit = find(normKey(e.key));
      if (!hit || hit.bomb) return;
      const p = st.players[hit.h.slot];
      p.held = p.held.filter((d) => d !== hit.dir);
      const before = p.dir;
      p.dir = p.held[p.held.length - 1] || null;
      if (online && p.slot === mine && before !== p.dir) publish();
    };
    const onBlur = () => {
      const st = stRef.current;
      if (!st) return;
      st.players.forEach((p) => {
        if (p.controller !== 'human') return;
        p.held = [];
        if (p.dir) {
          p.dir = null;
          if (online && p.slot === mine) publish();
        }
      });
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [config, online, mine, publish]);

  const leave = () => {
    if (online) {
      pubRef.current.left = true;
      const p = stRef.current?.players[mine];
      if (p) {
        p.alive = false;
        p.left = true;
      }
      publish(true);
    }
    onExit();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  const conquest = config.rules === 'conquest';
  const limit = conquest ? CONQUEST_TIME : SUDDEN_AT;
  const remaining = hud ? Math.max(0, limit - hud.clock) : limit;
  const clock = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, '0')}`;
  const pct = (n) => (hud?.paintable ? Math.round((n / hud.paintable) * 100) : 0);
  const winnerName = hud?.over && hud.winner >= 0 ? hud.players[hud.winner]?.name : null;
  const title = !hud?.over
    ? ''
    : hud.winner === -1
      ? '¡Empate!'
      : config.mode === 'local'
        ? `¡Ganó ${winnerName}!`
        : hud.winner === mine
          ? '¡Ganaste!'
          : `${winnerName} ganó esta vez`;

  return (
    <div className={expanded ? 'bomb is-full' : 'bomb'} ref={rootRef}>
      <div className="bomb__stage">
        <canvas ref={canvasRef} className="bomb__canvas" style={{ aspectRatio: `${BW} / ${BH}` }} role="img" aria-label="Laberinto de hielo con bombas" />
        {hud && (
          <div className="bomb__hud">
            <div className="bomb__players">
              {hud.players.map((p, slot) => (
                <span key={slot} className={p.alive || (conquest && !p.left) ? 'bomb__chip' : 'bomb__chip is-out'} style={{ '--c': p.color, '--a': p.accent }}>
                  <i aria-hidden="true" />
                  <strong>
                    {p.name}
                    {online && slot === mine ? ' (tú)' : ''}
                  </strong>
                  {tour && <Trophy count={tour.wins[slot] || 0} />}
                  {conquest && <span className="bomb__pct">{pct(p.tiles)}%</span>}
                  <Stat kind="bomb" value={p.bomb} />
                  <Stat kind="fire" value={p.fire} />
                  <Stat kind="speed" value={p.speed} />
                </span>
              ))}
            </div>
            <span className={remaining === 0 && !conquest ? 'bomb__clock is-sudden' : remaining <= 10 && conquest ? 'bomb__clock is-sudden' : 'bomb__clock'}>
              {remaining === 0 ? (conquest ? '¡Tiempo!' : '¡Muerte súbita!') : clock}
            </span>
            <div className="bomb__tools">
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
              <button type="button" className="cats__iconbtn" onClick={leave} aria-label="Salir de la partida" title="Salir">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {hud && conquest && (
          <div className="bomb__territory" aria-label="Territorio pintado">
            {hud.players.map((p, slot) => (
              <i key={slot} style={{ flexGrow: p.tiles, background: p.color }} />
            ))}
            <i style={{ flexGrow: Math.max(0, hud.paintable - hud.players.reduce((a, p) => a + p.tiles, 0)), background: 'rgba(255,255,255,0.18)' }} />
          </div>
        )}
        {hud?.respawnIn > 0 && !hud.over && <div className="bomb__respawn">Vuelves en {Math.ceil(hud.respawnIn)}…</div>}
        {hud?.counting && <div className="bomb__respawn">Contando cuadros…</div>}
        {hud && hud.ready > 0 && (
          <div className="bomb__count" key={Math.ceil(hud.ready / 0.8)}>
            {Math.ceil(hud.ready / 0.8)}
          </div>
        )}
        {hud?.over && (
          <div className="cats__over">
            <img src={fifo} alt="" className={hud.winner === mine && config.mode !== 'local' ? 'game-intro__fifo game-intro__fifo--party' : 'game-intro__fifo'} />
            {tour && <span className="bomb__round-tag">{tour.champion != null ? 'Torneo terminado' : `Ronda ${tour.round + 1}`}</span>}
            <h2>{tour?.champion != null ? `¡${hud.players[tour.champion]?.name} es campeón del torneo!` : title}</h2>
            {config.mode !== 'local' && <p className="game-score">{hud.score} pts</p>}
            {tour && (
              <ul className="bomb__final bomb__standings">
                {hud.players
                  .map((p, slot) => ({ ...p, slot, w: tour.wins[slot] || 0 }))
                  .sort((a, b) => b.w - a.w)
                  .map((p) => (
                    <li key={p.slot} style={{ '--c': SLOT_COLORS[p.slot] }} className={tour.champion === p.slot ? 'is-champion' : ''}>
                      <i aria-hidden="true" />
                      {p.name}
                      <b>
                        {p.w}/{tour.target}
                      </b>
                    </li>
                  ))}
              </ul>
            )}
            {conquest && (
              <ul className="bomb__final">
                {hud.players
                  .map((p, slot) => ({ ...p, slot }))
                  .sort((a, b) => b.tiles - a.tiles)
                  .map((p) => (
                    <li key={p.slot} style={{ '--c': p.color }}>
                      <i aria-hidden="true" />
                      {p.name}
                      <b>{pct(p.tiles)}%</b>
                    </li>
                  ))}
              </ul>
            )}
            {config.mode !== 'local' && (
              <p>
                {hud.winner === mine
                  ? 'Los puntos ya suman al leaderboard de la semana.'
                  : conquest
                    ? 'Sumaste puntos por cada cuadro pintado. ¡La revancha te espera!'
                    : 'Sumaste puntos por los bloques que rompiste. ¡La revancha te espera!'}
              </p>
            )}
            <div className="cats__over-actions">
              {tour && tour.champion == null ? (
                <>
                  {onNext ? (
                    <button type="button" className="game-btn" onClick={onNext}>
                      {tour.auto ? `Siguiente ronda en ${tour.auto}…` : 'Siguiente ronda'}
                    </button>
                  ) : (
                    <p className="cats__muted">{tour.pending ? 'Contando la ronda…' : 'La siguiente ronda empieza en un momento…'}</p>
                  )}
                  <button type="button" className="sf-chip" onClick={leave}>
                    Salir del torneo
                  </button>
                </>
              ) : (
                <button type="button" className="game-btn" onClick={onExit}>
                  {online ? 'Volver a las salas' : 'Jugar otra'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="cats__help">
        {config.mode === 'local'
          ? 'Jugador 1: W A S D para moverse y espacio para la bomba. Jugador 2: flechas y Enter.'
          : 'Muévete con las flechas o W A S D y suelta bombas con espacio. Recoge poderes: bomba extra, más alcance y velocidad.'}{' '}
        {conquest
          ? 'Conquista: tus explosiones pintan el piso de tu color. Si te atrapan vuelves a los 3 segundos. Al terminar el tiempo gana quien tenga más cuadros.'
          : `A los ${Math.floor(SUDDEN_AT / 60)}:${String(SUDDEN_AT % 60).padStart(2, '0')} empieza la muerte súbita y el hielo cierra el mapa.`}
        {MAPS[config.map]?.hazard ? ` ${HAZARD_HELP[MAPS[config.map].hazard]}` : ''}
      </p>
    </div>
  );
}
