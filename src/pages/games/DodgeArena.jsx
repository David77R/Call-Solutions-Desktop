import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { DH, DW, DYNAMICS, ROUND_TIME, TEAM_COLORS, WIN_ROUNDS, applyDodgeSnapshot, controlledFor, createDodge, dodgeScore, dodgeSnapshot, stepDodge } from './dodgeEngine';
import { drawDodge } from './dodgeDraw';

const TEAM_NAMES = ['Naranja', 'Azul'];
const KEYMAPS = {
  all: {
    move: { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' },
    throw: ['KeyF'],
    catch: ['Space', 'KeyE'],
    dash: ['ShiftLeft', 'ShiftRight'],
  },
  wasd: { move: { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right' }, throw: ['KeyF'], catch: ['KeyG'], dash: ['ShiftLeft'] },
  arrows: { move: { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' }, throw: ['Enter'], catch: ['ShiftRight'], dash: ['Period'] },
};

const freshInput = () => ({ mx: 0, my: 0, tx: null, ty: null, throwHeld: false, catch: false, dash: false, held: new Set(), mouseThrow: false, keyThrow: false });

function moveFrom(held) {
  return { mx: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), my: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0) };
}

export default function DodgeArena({ config, onExit, onSave }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const stRef = useRef(null);
  const assignRef = useRef({});
  const inputsRef = useRef({});
  const playedRef = useRef({});
  const [hud, setHud] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [lost, setLost] = useState(false);
  const online = config.mode === 'online';
  const host = !online || config.host;
  const humans = config.humans;
  const localHumans = useMemo(() => humans.filter((h) => h.local), [humans]);
  const myKey = localHumans[0]?.key;

  const syncHud = useCallback(() => {
    const st = stRef.current;
    if (!st) return;
    setHud({
      wins: [...st.wins],
      alive: [0, 1].map((team) => st.players.filter((p) => p.team === team && !p.out).length),
      round: st.round,
      phase: st.phase,
      phaseT: st.phaseT,
      roundTime: st.roundTime,
      dynKey: st.dynKey,
      roundWinner: st.roundWinner,
      winner: st.winner,
      points: st.points ?? null,
    });
  }, []);

  useEffect(() => {
    const st = createDodge(config);
    stRef.current = st;
    const assign = {};
    humans.forEach((h) => {
      assign[h.key] = h.start;
      inputsRef.current[h.key] = freshInput();
      playedRef.current[h.key] = new Set([h.start]);
      st.players[h.start].controller = 'human';
      st.players[h.start].local = h.local;
    });
    assignRef.current = assign;
    syncHud();
    const t = window.setInterval(syncHud, 150);
    return () => window.clearInterval(t);
  }, [config, humans, syncHud]);

  const finish = useCallback(
    (winner, points) => {
      const st = stRef.current;
      if (!st || st.saved) return;
      st.saved = true;
      if (config.mode !== 'local' && points != null) {
        st.points = points;
        onSave?.(points, winner === config.myTeam ? 'won' : winner === -1 ? 'draw' : 'lost');
      }
      syncHud();
    },
    [config.mode, config.myTeam, onSave, syncHud],
  );

  useEffect(() => {
    if (!online) return undefined;
    if (host) {
      const offs = Object.entries(config.links || {}).map(([uid, link]) =>
        link.on((msg) => {
          const inp = inputsRef.current[uid];
          if (msg.t === 'lost' || msg.t === 'leave') {
            const st = stRef.current;
            const id = assignRef.current[uid];
            if (st && id != null) {
              st.players[id].controller = 'bot';
              delete assignRef.current[uid];
            }
            return;
          }
          if (!inp) return;
          if (msg.t === 'i') {
            inp.mx = msg.mx;
            inp.my = msg.my;
            inp.tx = msg.tx;
            inp.ty = msg.ty;
            inp.throwHeld = !!msg.th;
          } else if (msg.t === 'e') {
            if (msg.c) inp.catch = true;
            if (msg.d) inp.dash = true;
          }
        }),
      );
      return () => offs.forEach((off) => off());
    }
    return config.link.on((msg) => {
      const st = stRef.current;
      if (!st) return;
      if (msg.t === 'lost' || msg.t === 'leave') {
        if (st.phase !== 'over') setLost(true);
        return;
      }
      if (msg.t === 's') {
        applyDodgeSnapshot(st, msg.s);
        st.ctl = msg.s.ctl;
        st.time = msg.s.tm;
      } else if (msg.t === 'final') finish(msg.winner, msg.scores?.[config.myUid] ?? 0);
    });
  }, [online, host, config, finish]);

  useEffect(() => {
    const onChange = () => setExpanded(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = DW * dpr;
    canvas.height = DH * dpr;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let last = performance.now();
    let sendClock = 0;
    const hooks = {
      onRound: () => syncHud(),
      onOver: (winner) => {
        const st = stRef.current;
        const scores = {};
        humans.forEach((h) => {
          const team = st.players[h.start].team;
          scores[h.key] = dodgeScore(st, [...(playedRef.current[h.key] || [])], team, winner === team);
        });
        if (online) Object.values(config.links || {}).forEach((link) => link.send('sure', { t: 'final', winner, scores }));
        finish(winner, myKey ? scores[myKey] : null);
      },
    };
    const tick = (now) => {
      const st = stRef.current;
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (st) {
        if (host) {
          Object.entries(assignRef.current).forEach(([key, id]) => {
            const h = humans.find((x) => x.key === key);
            let cur = id;
            if (st.players[cur].out && st.phase === 'play') {
              const taken = new Set(
                Object.entries(assignRef.current)
                  .filter(([k]) => k !== key)
                  .map(([, v]) => v),
              );
              const next = controlledFor(st, cur, h.team);
              if (next !== cur && !taken.has(next)) {
                st.players[cur].controller = 'bot';
                st.players[next].controller = 'human';
                st.players[next].local = h.local;
                assignRef.current[key] = next;
                playedRef.current[key].add(next);
                cur = next;
              }
            }
            st.players[cur].input = inputsRef.current[key];
          });
          stepDodge(st, dt, hooks);
          if (online) {
            sendClock += dt;
            if (sendClock >= 1 / 30) {
              sendClock = 0;
              const snap = { ...dodgeSnapshot(st), ctl: { ...assignRef.current }, tm: Math.round(st.time * 100) / 100 };
              Object.values(config.links || {}).forEach((link) => link.send('fast', { t: 's', s: snap }));
            }
          }
        } else {
          st.time += dt;
          sendClock += dt;
          const inp = inputsRef.current[myKey];
          if (inp && sendClock >= 1 / 30) {
            sendClock = 0;
            config.link.send('fast', { t: 'i', mx: inp.mx, my: inp.my, tx: inp.tx, ty: inp.ty, th: inp.throwHeld ? 1 : 0 });
          }
        }
        const controlled = host ? assignRef.current[myKey] : st.ctl?.[config.myUid];
        const marked = host ? localHumans.map((h) => assignRef.current[h.key]) : [controlled];
        const names = {};
        Object.entries(host ? assignRef.current : st.ctl || {}).forEach(([key, id]) => {
          const h = humans.find((x) => x.key === key);
          if (h) names[id] = h.label;
        });
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawDodge(ctx, st, controlled, { marked, names });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config, online, host, humans, localHumans, myKey, finish, syncHud]);

  useEffect(() => {
    const sendEdge = (edge) => {
      if (!host) config.link.send('sure', { t: 'e', ...edge });
    };
    const find = (code) => {
      for (const h of localHumans) {
        const map = KEYMAPS[h.keys];
        if (!map) continue;
        if (map.move[code]) return { h, move: map.move[code] };
        if (map.throw.includes(code)) return { h, kind: 'throw' };
        if (map.catch.includes(code)) return { h, kind: 'catch' };
        if (map.dash.includes(code)) return { h, kind: 'dash' };
      }
      return null;
    };
    const handle = (down) => (e) => {
      const st = stRef.current;
      if (!st || st.phase === 'over') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const hit = find(e.code);
      if (!hit) return;
      e.preventDefault();
      const inp = inputsRef.current[hit.h.key];
      if (!inp) return;
      if (hit.move) {
        if (down) inp.held.add(hit.move);
        else inp.held.delete(hit.move);
        Object.assign(inp, moveFrom(inp.held));
      } else if (hit.kind === 'throw') {
        inp.keyThrow = down;
        inp.throwHeld = inp.keyThrow || inp.mouseThrow;
      } else if (down && !e.repeat) {
        inp[hit.kind] = true;
        sendEdge(hit.kind === 'catch' ? { c: 1 } : { d: 1 });
      }
    };
    const onDown = handle(true);
    const onUp = handle(false);
    const onBlur = () =>
      Object.values(inputsRef.current).forEach((inp) => Object.assign(inp, { mx: 0, my: 0, throwHeld: false, keyThrow: false, mouseThrow: false, held: new Set() }));
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [config, host, localHumans]);

  const mouseHuman = localHumans.find((h) => h.keys === 'all');
  const pointerAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [((e.clientX - rect.left) * DW) / rect.width, ((e.clientY - rect.top) * DH) / rect.height];
  };
  const onMouseMove = (e) => {
    if (!mouseHuman) return;
    const inp = inputsRef.current[mouseHuman.key];
    [inp.tx, inp.ty] = pointerAt(e);
  };
  const onMouseDown = (e) => {
    if (!mouseHuman) return;
    const inp = inputsRef.current[mouseHuman.key];
    [inp.tx, inp.ty] = pointerAt(e);
    if (e.button === 2) {
      inp.catch = true;
      if (!host) config.link.send('sure', { t: 'e', c: 1 });
    } else if (e.button === 0) {
      inp.mouseThrow = true;
      inp.throwHeld = true;
    }
  };
  const onMouseUp = (e) => {
    if (!mouseHuman || e.button !== 0) return;
    const inp = inputsRef.current[mouseHuman.key];
    inp.mouseThrow = false;
    inp.throwHeld = inp.keyThrow;
  };

  const leave = () => {
    if (online) {
      if (host) Object.values(config.links || {}).forEach((link) => link.send('sure', { t: 'leave' }));
      else config.link.send('sure', { t: 'leave' });
    }
    onExit();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  const left = hud ? Math.max(0, ROUND_TIME - hud.roundTime) : ROUND_TIME;
  const clock = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  const dyn = DYNAMICS[hud?.dynKey];
  const myTeam = config.myTeam;
  const overTitle =
    hud?.winner == null
      ? ''
      : hud.winner === -1
        ? '¡Empate!'
        : config.mode === 'local'
          ? `¡Ganó el equipo ${TEAM_NAMES[hud.winner]}!`
          : hud.winner === myTeam
            ? '¡Tu equipo ganó!'
            : `Ganó el equipo ${TEAM_NAMES[hud.winner]}`;

  return (
    <div className={expanded ? 'dodge is-full' : 'dodge'} ref={rootRef}>
      <div className="dodge__stage">
        <canvas
          ref={canvasRef}
          className={mouseHuman ? 'dodge__canvas is-aim' : 'dodge__canvas'}
          style={{ aspectRatio: `${DW} / ${DH}` }}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          role="img"
          aria-label="Cancha de dodgeball"
        />
        {hud && (
          <div className="dodge__hud">
            {[0, 1].map((team) => (
              <div key={team} className={`dodge__team dodge__team--${team}`} style={{ '--c': TEAM_COLORS[team] }}>
                <strong>
                  {TEAM_NAMES[team]}
                  {config.mode !== 'local' && team === myTeam ? ' (tu equipo)' : ''}
                </strong>
                <span className="dodge__wins" aria-label={`${hud.wins[team]} rondas ganadas`}>
                  {Array.from({ length: WIN_ROUNDS }, (_, i) => (
                    <i key={i} className={i < hud.wins[team] ? 'is-on' : ''} />
                  ))}
                </span>
                <span className="dodge__alive" aria-label={`${hud.alive[team]} en pie`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <b key={i} className={i < hud.alive[team] ? 'is-in' : ''} />
                  ))}
                </span>
              </div>
            ))}
            <div className="dodge__center">
              <strong>Ronda {hud.round}</strong>
              <span>
                {dyn?.name} · {clock}
              </span>
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
        {hud?.phase === 'ready' && (
          <div className="dodge__banner" key={`r${hud.round}`}>
            <span>Ronda {hud.round}</span>
            <strong>{dyn?.name}</strong>
            <small>{dyn?.text}</small>
          </div>
        )}
        {hud?.phase === 'roundEnd' && (
          <div className="dodge__banner is-end" key={`e${hud.round}`} style={{ '--c': hud.roundWinner >= 0 ? TEAM_COLORS[hud.roundWinner] : '#ffffff' }}>
            <strong>{hud.roundWinner >= 0 ? `Ronda para ${TEAM_NAMES[hud.roundWinner]}` : 'Ronda empatada'}</strong>
          </div>
        )}
        {(hud?.phase === 'over' || lost) && (
          <div className="cats__over">
            <img src={fifo} alt="" className={hud?.winner === myTeam && config.mode !== 'local' && !lost ? 'game-intro__fifo game-intro__fifo--party' : 'game-intro__fifo'} />
            <h2>{lost && hud?.phase !== 'over' ? 'Se perdió la conexión con el anfitrión' : overTitle}</h2>
            {hud?.phase === 'over' && (
              <p className="hockey__final">
                {TEAM_NAMES[0]} {hud.wins[0]} – {hud.wins[1]} {TEAM_NAMES[1]}
              </p>
            )}
            {hud?.points != null && config.mode !== 'local' && <p className="game-score">{hud.points} pts</p>}
            {hud?.phase === 'over' && config.mode !== 'local' && <p>Sumas puntos por cada rival que sacas, cada pelota que atrapas y cada ronda que gana tu equipo.</p>}
            <div className="cats__over-actions">
              <button type="button" className="game-btn" onClick={onExit}>
                {online ? 'Volver a las salas' : 'Jugar otra'}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="cats__help">
        {config.mode === 'local'
          ? 'Jugador 1 (naranja): W A S D, F lanzar (mantén para cargar), G atrapar, Shift izquierdo esquivar. Jugador 2 (azul): flechas, Enter lanzar, Shift derecho atrapar, punto esquivar.'
          : 'Muévete con W A S D o flechas. Apunta con el mouse y mantén clic para cargar el lanzamiento. Clic derecho o espacio para atrapar, Shift para esquivar. Si te sacan, controlas a otro compañero.'}
      </p>
    </div>
  );
}
