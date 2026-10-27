import { useCallback, useEffect, useRef, useState } from 'react';
import { MAZE_LEVELS } from '../../data/mazeLevels';
import { saveMazeScore } from '../../lib/games';
import fifo from '../../assets/fifo.png';

const FLEA_TICK_MS = 520;
const START_LIVES = 3;
const DIRS = [
  { dy: -1, dx: 0 },
  { dy: 1, dx: 0 },
  { dy: 0, dx: -1 },
  { dy: 0, dx: 1 },
];
const KEYS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  w: [-1, 0],
  s: [1, 0],
  a: [0, -1],
  d: [0, 1],
};

const k = (y, x) => `${y},${x}`;

function levelState(index, lives, score) {
  const level = MAZE_LEVELS[index];
  return {
    index,
    lives,
    score,
    walls: new Set(level.walls.map(([y, x]) => k(y, x))),
    width: level.width,
    height: level.height,
    player: { y: level.player_start[0], x: level.player_start[1] },
    fleas: level.fleas.map(([y, x], i) => ({ y, x, ...DIRS[i % 4] })),
    bones: new Set(level.bones.map(([y, x]) => k(y, x))),
    status: 'playing',
    hitAt: 0,
  };
}

function afterHit(g) {
  const lives = g.lives - 1;
  if (lives <= 0) return { ...g, lives: 0, status: 'lost' };
  const fresh = levelState(g.index, lives, g.score);
  return { ...fresh, bones: g.bones, hitAt: Date.now() };
}

export default function MazeGame({ agentName }) {
  const [g, setG] = useState(null);
  const savedRef = useRef(false);
  const rootRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const sync = () => setExpanded(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const start = () => {
    savedRef.current = false;
    setG(levelState(0, START_LIVES, 0));
  };

  const move = useCallback((dy, dx) => {
    setG((prev) => {
      if (!prev || prev.status !== 'playing') return prev;
      const ny = prev.player.y + dy;
      const nx = prev.player.x + dx;
      if (prev.walls.has(k(ny, nx))) return prev;
      let next = { ...prev, player: { y: ny, x: nx } };
      if (prev.bones.has(k(ny, nx))) {
        const bones = new Set(prev.bones);
        bones.delete(k(ny, nx));
        next = { ...next, bones, score: prev.score + 10, status: bones.size === 0 ? 'clear' : 'playing' };
      }
      if (next.status === 'playing' && prev.fleas.some((f) => f.y === ny && f.x === nx)) return afterHit(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!g || g.status !== 'playing') return undefined;
    const t = setInterval(() => {
      setG((prev) => {
        if (!prev || prev.status !== 'playing') return prev;
        const open = (y, x) => !prev.walls.has(k(y, x));
        const fleas = prev.fleas.map((f) => {
          let { dy, dx } = f;
          const blocked = !open(f.y + dy, f.x + dx);
          if (blocked || Math.random() < 0.15) {
            const choices = DIRS.filter((d) => open(f.y + d.dy, f.x + d.dx));
            if (!choices.length) return f;
            ({ dy, dx } = choices[Math.floor(Math.random() * choices.length)]);
          }
          return { y: f.y + dy, x: f.x + dx, dy, dx };
        });
        const next = { ...prev, fleas };
        return fleas.some((f) => f.y === prev.player.y && f.x === prev.player.x) ? afterHit(next) : next;
      });
    }, FLEA_TICK_MS);
    return () => clearInterval(t);
  }, [g?.status, g?.index]);

  useEffect(() => {
    if (g?.status !== 'clear') return undefined;
    const t = setTimeout(() => {
      setG((prev) => (prev.index + 1 < MAZE_LEVELS.length ? levelState(prev.index + 1, prev.lives, prev.score) : { ...prev, status: 'won' }));
    }, 1400);
    return () => clearTimeout(t);
  }, [g?.status]);

  useEffect(() => {
    if ((g?.status === 'won' || g?.status === 'lost') && !savedRef.current) {
      savedRef.current = true;
      saveMazeScore(agentName, g.score);
    }
  }, [g?.status, g?.score, agentName]);

  useEffect(() => {
    const onKey = (e) => {
      const dir = KEYS[e.key] || KEYS[e.key?.toLowerCase()];
      if (!dir || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      move(dir[0], dir[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  if (!g) {
    return (
      <div className="game-intro">
        <img src={fifo} alt="" className="game-intro__fifo" />
        <h2>Laberinto de Fifo</h2>
        <p>Recoge todos los huesos y esquiva las pulgas. Usa las flechas o W A S D. Cada hueso vale 10 puntos y tienes 3 vidas para los 3 niveles.</p>
        <button type="button" className="game-btn" onClick={start}>
          Empezar
        </button>
      </div>
    );
  }

  if (g.status === 'won' || g.status === 'lost') {
    return (
      <div className="game-intro">
        <img src={fifo} alt="" className={g.status === 'won' ? 'game-intro__fifo game-intro__fifo--party' : 'game-intro__fifo'} />
        <h2>{g.status === 'won' ? '¡Laberinto completado!' : 'Las pulgas ganaron esta vez'}</h2>
        <p className="game-score">{g.score} pts</p>
        <p>{g.score > 0 ? 'Tus puntos ya están en el leaderboard de la semana.' : 'Inténtalo otra vez.'}</p>
        <button type="button" className="game-btn" onClick={start}>
          Jugar otra vez
        </button>
      </div>
    );
  }

  const toggleExpanded = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  const cells = [];
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const wall = g.walls.has(k(y, x));
      cells.push(<span key={k(y, x)} className={wall ? 'maze__cell is-wall' : 'maze__cell'} />);
    }
  }

  const pos = (y, x) => ({ transform: `translate(${x * 100}%, ${y * 100}%)` });

  return (
    <div className="maze" ref={rootRef}>
      <div className="maze__board" style={{ '--w': g.width, '--h': g.height }} key={g.hitAt}>
        <div className="maze__grid">{cells}</div>
        <div className="maze__layer">
          {[...g.bones].map((b) => {
            const [y, x] = b.split(',').map(Number);
            return <span key={`b-${b}`} className="maze__sprite maze__bone" style={pos(y, x)} />;
          })}
          {g.fleas.map((f, i) => (
            <span key={`f-${i}`} className="maze__sprite maze__flea" style={pos(f.y, f.x)} />
          ))}
          <span className="maze__sprite maze__player" style={pos(g.player.y, g.player.x)}>
            <img src={fifo} alt="Fifo" />
          </span>
        </div>
        {g.status === 'clear' && <div className="maze__banner">¡Nivel {g.index + 1} superado!</div>}
      </div>

      <div className="maze__side">
        <div className="maze__hud">
          <span>Nivel {g.index + 1}</span>
          <span className="maze__lives" aria-label={`${g.lives} vidas`}>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <span key={i} className={i < g.lives ? 'maze__heart' : 'maze__heart is-lost'} />
            ))}
          </span>
          <span className="maze__score">{g.score} pts</span>
        </div>

      <div className="maze__pad" aria-label="Controles">
        <button type="button" className="maze__key maze__key--up" aria-label="Arriba" onClick={() => move(-1, 0)}>
          ▲
        </button>
        <button type="button" className="maze__key maze__key--left" aria-label="Izquierda" onClick={() => move(0, -1)}>
          ◀
        </button>
        <button type="button" className="maze__key maze__key--down" aria-label="Abajo" onClick={() => move(1, 0)}>
          ▼
        </button>
        <button type="button" className="maze__key maze__key--right" aria-label="Derecha" onClick={() => move(0, 1)}>
          ▶
        </button>
      </div>

        <button type="button" className="maze__expand" aria-pressed={expanded} onClick={toggleExpanded}>
          {expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
        </button>
        <p className="maze__help">Muévete con las flechas o W A S D.</p>
      </div>
    </div>
  );
}
