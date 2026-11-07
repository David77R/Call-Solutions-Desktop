import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameActiveRef } from './gameActivity';
import fifo from '../../assets/fifo.webp';
import { HH, HW, MATCH_TIME, WIN_GOALS, applySnapshot, createMatch, hockeyScore, setKey, setPointer, setRemoteMallet, snapshot, stepLocalOnly, stepMatch } from './hockeyEngine';
import { drawMatch } from './hockeyDraw';

export const SIDE_COLORS = ['#ff8a5c', '#4fc3ff'];
const COUNTDOWN = 2.4;
const KEYSETS = {
  wasd: { w: 'up', a: 'left', s: 'down', d: 'right' },
  arrows: { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' },
};
KEYSETS.all = { ...KEYSETS.wasd, ...KEYSETS.arrows };
const normKey = (k) => (k.length === 1 ? k.toLowerCase() : k);

export default function HockeyArena({ config, onExit, onSave }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const stRef = useRef(null);
  const [hud, setHud] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [lost, setLost] = useState(false);
  const online = config.mode === 'online';
  const activeRef = useGameActiveRef();
  const host = !online || config.side === 0;
  const mine = online ? config.side : 0;
  const link = config.link;

  const syncHud = useCallback(() => {
    const st = stRef.current;
    if (!st) return;
    setHud({
      score: [...st.score],
      time: st.time,
      golden: st.golden,
      ready: st.ready,
      over: st.over,
      winner: st.winner,
      points: st.points || 0,
      goal: st.flash > 0 && st.lastGoal ? st.lastGoal.scorer : null,
    });
  }, []);

  const finish = useCallback(
    (winner) => {
      const st = stRef.current;
      if (!st || st.saved) return;
      st.saved = true;
      st.over = true;
      st.winner = winner;
      if (config.mode !== 'local') {
        const won = winner === mine;
        st.points = hockeyScore(st, mine, won);
        onSave?.(st.points, won ? 'won' : winner === -1 ? 'draw' : 'lost');
      }
      syncHud();
    },
    [config.mode, mine, onSave, syncHud],
  );

  useEffect(() => {
    const st = createMatch(config);
    st.ready = COUNTDOWN;
    stRef.current = st;
    syncHud();
    const t = window.setInterval(syncHud, 150);
    return () => window.clearInterval(t);
  }, [config, syncHud]);

  useEffect(() => {
    if (!link) return undefined;
    return link.on((msg) => {
      const st = stRef.current;
      if (!st) return;
      if (msg.t === 'lost' || msg.t === 'leave') {
        if (!st.over) setLost(true);
        return;
      }
      if (host && msg.t === 'm') {
        const now = performance.now();
        setRemoteMallet(st, 1 - mine, msg.x, msg.y, (now - (st.lastRemote || now)) / 1000);
        st.lastRemote = now;
        return;
      }
      if (!host && msg.t === 's') {
        applySnapshot(st, msg.s, mine);
        if (st.ready > 0 && msg.s.t > 0) st.ready = 0;
        return;
      }
      if (!host && msg.t === 'goal') {
        st.lastGoal = { scorer: msg.scorer };
        st.flash = 1.2;
        return;
      }
      if (!host && msg.t === 'over') finish(msg.winner);
    });
  }, [link, host, mine, finish]);

  useEffect(() => {
    const onChange = () => setExpanded(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = HW * dpr;
    canvas.height = HH * dpr;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let last = performance.now();
    let sendClock = 0;
    const hooks = {
      onGoal: (scorer) => {
        if (online) link?.send('sure', { t: 'goal', scorer });
        syncHud();
      },
      onGolden: () => syncHud(),
      onOver: (winner) => {
        if (online) link?.send('sure', { t: 'over', winner });
        finish(winner);
      },
    };
    const tick = (now) => {
      const st = stRef.current;
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (!activeRef.current && !online) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (st) {
        if (st.ready > 0) st.ready = Math.max(0, st.ready - dt);
        if (!st.over && st.ready <= 0) {
          if (host) stepMatch(st, dt, hooks);
          else stepLocalOnly(st, dt, mine);
        }
        if (online && !st.over) {
          sendClock += dt;
          if (host && sendClock >= 1 / 30) {
            sendClock = 0;
            link?.send('fast', { t: 's', s: snapshot(st) });
          } else if (!host && sendClock >= 1 / 40) {
            sendClock = 0;
            const m = st.mallets[mine];
            link?.send('fast', { t: 'm', x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10 });
          }
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawMatch(ctx, st, config.players, SIDE_COLORS, now / 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config, online, host, mine, link, finish, syncHud]);

  useEffect(() => {
    const humans = config.players.map((pl, side) => ({ side, keys: KEYSETS[pl.keys] })).filter((h) => h.keys && config.players[h.side].controller === 'human');
    const find = (key) => {
      for (const h of humans) if (h.keys[key]) return { side: h.side, dir: h.keys[key] };
      return null;
    };
    const handle = (down) => (e) => {
      const st = stRef.current;
      if (!st || st.over || (down && !activeRef.current)) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const hit = find(normKey(e.key));
      if (!hit) return;
      e.preventDefault();
      setKey(st, hit.side, hit.dir, down);
    };
    const onDown = handle(true);
    const onUp = handle(false);
    const onBlur = () => {
      const st = stRef.current;
      st?.mallets.forEach((m) => Object.keys(m.keys).forEach((k) => (m.keys[k] = false)));
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [config]);

  const pointerSide = config.players.findIndex((p) => p.controller === 'human' && p.pointer);

  const onPointerMove = (e) => {
    const st = stRef.current;
    if (!st || pointerSide < 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPointer(st, pointerSide, ((e.clientX - rect.left) * HW) / rect.width, ((e.clientY - rect.top) * HH) / rect.height);
  };

  const leave = () => {
    link?.send('sure', { t: 'leave' });
    onExit();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  const left = hud ? Math.max(0, MATCH_TIME - hud.time) : MATCH_TIME;
  const clock = hud?.golden ? 'Gol de oro' : `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  const names = config.players.map((p) => p.name);
  const title = !hud?.over
    ? ''
    : hud.winner === -1
      ? '¡Empate!'
      : config.mode === 'local'
        ? `¡Ganó ${names[hud.winner]}!`
        : hud.winner === mine
          ? '¡Ganaste!'
          : `${names[hud.winner]} ganó esta vez`;

  return (
    <div className={expanded ? 'hockey is-full' : 'hockey'} ref={rootRef}>
      <div className="hockey__stage">
        <canvas
          ref={canvasRef}
          className={pointerSide >= 0 ? 'hockey__canvas is-pointer' : 'hockey__canvas'}
          style={{ aspectRatio: `${HW} / ${HH}` }}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerMove}
          role="img"
          aria-label="Pista de hockey sobre hielo"
        />
        {hud && (
          <div className="hockey__hud">
            <div className="hockey__board">
              <span className="hockey__name" style={{ '--c': SIDE_COLORS[0] }}>
                {names[0]}
                {online && mine === 0 ? ' (tú)' : ''}
              </span>
              <b className="hockey__score">
                {hud.score[0]}
                <i>–</i>
                {hud.score[1]}
              </b>
              <span className="hockey__name" style={{ '--c': SIDE_COLORS[1] }}>
                {names[1]}
                {online && mine === 1 ? ' (tú)' : ''}
              </span>
              <small className={hud.golden ? 'hockey__clock is-golden' : 'hockey__clock'}>{clock}</small>
            </div>
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
        {hud?.goal != null && !hud.over && (
          <div className="hockey__goal" key={`${hud.score.join('-')}`} style={{ '--c': SIDE_COLORS[hud.goal] }}>
            ¡GOL de {names[hud.goal]}!
          </div>
        )}
        {hud && hud.ready > 0 && (
          <div className="bomb__count" key={Math.ceil(hud.ready / 0.8)}>
            {Math.ceil(hud.ready / 0.8)}
          </div>
        )}
        {(hud?.over || lost) && (
          <div className="cats__over">
            <img src={fifo} alt="" className={hud?.winner === mine && config.mode !== 'local' && !lost ? 'game-intro__fifo game-intro__fifo--party' : 'game-intro__fifo'} />
            <h2>{lost && !hud?.over ? 'Tu compañero salió de la partida' : title}</h2>
            {hud?.over && (
              <p className="hockey__final">
                {names[0]} {hud.score[0]} – {hud.score[1]} {names[1]}
              </p>
            )}
            {hud?.over && config.mode !== 'local' && <p className="game-score">{hud.points} pts</p>}
            {hud?.over && config.mode !== 'local' && (
              <p>{hud.winner === mine ? 'Los puntos ya suman al leaderboard de la semana.' : 'Sumaste puntos por cada gol que metiste. ¡La revancha te espera!'}</p>
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
        {config.mode === 'local' ? 'Jugador 1: mouse o W A S D. Jugador 2: flechas.' : 'Mueve tu mazo con el mouse sobre la pista (o con W A S D / flechas). Gana quien llegue a'}
        {config.mode === 'local' ? ` Gana quien llegue a ${WIN_GOALS} goles` : ` ${WIN_GOALS} goles`} o quien vaya ganando a los {MATCH_TIME / 60} minutos. Si hay empate, gol de
        oro.
      </p>
    </div>
  );
}
