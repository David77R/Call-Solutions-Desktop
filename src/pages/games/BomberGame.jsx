import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { useAuth } from '../../lib/AuthContext';
import { saveBombScore } from '../../lib/games';
import { MAX_PLAYERS, createBombRoom, joinBombRoom, leaveBombRoom, startBombRoom, useBombRoom, useOpenBombRooms } from '../../lib/bombRooms';
import { TEAMS, newSeed } from './catArtillery';
import { drawUnit } from './catArtilleryDraw';
import { BOT_LEVELS } from './bomberEngine';
import BomberArena from './BomberArena';

const CHARACTERS = Object.entries(TEAMS).flatMap(([team, t]) => t.units.map((u, i) => ({ key: `${team}:${i}`, team, kind: t.kind, name: u.name, colors: u })));
const charOf = (key) => CHARACTERS.find((c) => c.key === key) || CHARACTERS[0];

const MODES = [
  { key: 'bot', title: 'Contra Fifo', text: 'Tú contra 1 a 3 bots.' },
  { key: 'local', title: '2 jugadores aquí', text: 'W A S D contra flechas en esta computadora.' },
  { key: 'online', title: 'En línea', text: 'Hasta 4 compañeros, cada uno en su computadora.' },
];

const JOIN_ERRORS = {
  'not-found': 'No existe una sala con ese código.',
  taken: 'Esa sala ya empezó.',
  full: 'Esa sala ya tiene 4 jugadores.',
  timeout: 'No hay conexión con el servidor. Si tienes la VPN prendida, apágala e intenta de nuevo.',
};

function CharFace({ char, size = 54 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size * 0.66);
    ctx.scale(size / 58, size / 58);
    drawUnit(ctx, { x: 0, y: 0, alive: true, flash: 0, face: 1, colors: char.colors }, char.kind, null, false, 0);
  }, [char, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

function CharPicker({ label, value, onChange, taken = [] }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">{label}</span>
      <div className="bomb__chars" role="radiogroup" aria-label={label}>
        {CHARACTERS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={value === c.key}
            className="bomb__char"
            disabled={taken.includes(c.key)}
            onClick={() => onChange(c.key)}
            title={`${c.name} (${TEAMS[c.team].name})`}
          >
            <CharFace char={c} />
            <small>{c.name}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Count({ label, value, min, max, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">{label}</span>
      <div className="cats__levels" role="group" aria-label={label}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function botPlayers(count, exclude, seed) {
  const pool = CHARACTERS.filter((c) => !exclude.includes(c.key));
  const picked = [];
  let k = seed;
  while (picked.length < count && pool.length) {
    k = (k * 1103515245 + 12345) >>> 0;
    picked.push(pool.splice(k % pool.length, 1)[0]);
  }
  return picked.map((c) => ({ name: c.name, kind: c.kind, colors: c.colors, controller: 'bot' }));
}

function WaitingRoom({ code, room, me, onLeave }) {
  const isHost = room?.host === me;
  const players = [...(room?.players || [])].sort((a, b) => a.slot - b.slot);
  const hostName = players.find((p) => p.uid === room?.host)?.name;
  return (
    <div className="game-intro cats__lobby">
      <img src={fifo} alt="" className="game-intro__fifo" />
      <h2>Sala {code}</h2>
      <p>{isHost ? 'Cuando estén todos, dale a Empezar. Pueden entrar hasta 4.' : `Esperando a que ${hostName || 'el anfitrión'} empiece la partida…`}</p>
      <span className="cats__code">{code}</span>
      <ul className="bomb__roster">
        {players.map((p) => (
          <li key={p.uid}>
            <CharFace char={charOf(p.char)} size={40} />
            <strong>{p.name}</strong>
            {p.uid === room.host && <small>Anfitrión</small>}
          </li>
        ))}
      </ul>
      <div className="cats__over-actions">
        {isHost && (
          <button type="button" className="game-btn" disabled={players.length < 2} onClick={() => startBombRoom(code)}>
            {players.length < 2 ? 'Esperando jugadores…' : `Empezar con ${players.length}`}
          </button>
        )}
        <button type="button" className="sf-chip" onClick={onLeave}>
          {isHost ? 'Cancelar sala' : 'Salir de la sala'}
        </button>
      </div>
    </div>
  );
}

function Lobby({ user, firstName, char, setChar, onStart, onBack }) {
  const rooms = useOpenBombRooms(true);
  const [code, setCode] = useState('');
  const [myRoom, setMyRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const room = useBombRoom(myRoom);
  const me = user?.uid || 'anon';
  const player = { uid: me, name: firstName, char };

  useEffect(() => {
    if (!room || !myRoom) return;
    if (room.status === 'playing' && (room.players || []).some((p) => p.uid === me)) onStart(room);
    if (room.status === 'left' || room.missing) {
      setMyRoom(null);
      setError(room.status === 'left' ? 'El anfitrión cerró la sala.' : '');
    }
  }, [room, myRoom, me, onStart]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      setMyRoom(await fn());
    } catch (err) {
      setError(JOIN_ERRORS[err?.message] || 'No se pudo conectar con la sala. Revisa la conexión o la regla de catRooms en Firestore.');
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    if (myRoom) leaveBombRoom(myRoom, me);
    setMyRoom(null);
  };

  if (myRoom && room && !room.missing) return <WaitingRoom code={myRoom} room={room} me={me} onLeave={leave} />;

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <button type="button" className="sf-chip" onClick={onBack}>
          ← Volver
        </button>
        <h2>Bombas en línea</h2>
      </div>
      <CharPicker label="Tu personaje" value={char} onChange={setChar} />
      <div className="cats__online">
        <section>
          <h3>Salas abiertas</h3>
          {rooms.length ? (
            <ul className="cats__rooms">
              {rooms.map((r) => {
                const host = (r.players || []).find((p) => p.uid === r.host);
                const count = (r.players || []).length;
                return (
                  <li key={r.code}>
                    <span>
                      <strong>Sala de {host?.name || 'un compañero'}</strong>
                      <small>
                        {r.code} · {count}/{MAX_PLAYERS} jugadores
                      </small>
                    </span>
                    <button type="button" className="game-btn" disabled={busy || count >= MAX_PLAYERS} onClick={() => run(() => joinBombRoom(r.code, player))}>
                      Unirme
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="cats__muted">No hay salas abiertas ahora. Crea una y avísale a tus compañeros.</p>
          )}
        </section>
        <section>
          <h3>Crear o entrar con código</h3>
          <button type="button" className="game-btn" disabled={busy} onClick={() => run(() => createBombRoom(player, newSeed()))}>
            {busy ? 'Conectando…' : 'Crear sala'}
          </button>
          <div className="cats__join">
            <input
              className="sf-input"
              value={code}
              maxLength={4}
              placeholder="Código"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              aria-label="Código de sala"
            />
            <button type="button" className="sf-chip" disabled={busy || code.length !== 4} onClick={() => run(() => joinBombRoom(code, player))}>
              Entrar
            </button>
          </div>
        </section>
      </div>
      {error && <p className="sf-error">{error}</p>}
    </div>
  );
}

export default function BomberGame({ agentName }) {
  const { user } = useAuth();
  const firstName = (agentName || 'Tú').split(' ')[0];
  const [screen, setScreen] = useState('setup');
  const [mode, setMode] = useState('bot');
  const [charA, setCharA] = useState('gatos:0');
  const [charB, setCharB] = useState('perros:0');
  const [bots, setBots] = useState(3);
  const [extraBots, setExtraBots] = useState(0);
  const [level, setLevel] = useState('medio');
  const [config, setConfig] = useState(null);

  const save = useCallback((score, result) => saveBombScore(agentName, score, result, config?.mode === 'online' ? 'online' : config?.level), [agentName, config]);

  const startOffline = () => {
    const seed = newSeed();
    const a = charOf(charA);
    const humans =
      mode === 'local'
        ? [
            { name: 'Jugador 1', kind: a.kind, colors: a.colors, controller: 'human', keys: 'wasd' },
            { name: 'Jugador 2', kind: charOf(charB).kind, colors: charOf(charB).colors, controller: 'human', keys: 'arrows' },
          ]
        : [{ name: firstName, kind: a.kind, colors: a.colors, controller: 'human', keys: 'all' }];
    const taken = mode === 'local' ? [charA, charB] : [charA];
    setConfig({ mode, level, seed, players: [...humans, ...botPlayers(mode === 'local' ? extraBots : bots, taken, seed)] });
    setScreen('game');
  };

  const startOnline = useCallback(
    (room) => {
      const me = user?.uid || 'anon';
      const list = [...(room.players || [])].sort((x, y) => x.slot - y.slot);
      setConfig({
        mode: 'online',
        code: room.code,
        seed: room.seed,
        me: list.findIndex((p) => p.uid === me),
        players: list.map((p) => {
          const c = charOf(p.char);
          return { name: p.name, uid: p.uid, kind: c.kind, colors: c.colors, controller: p.uid === me ? 'human' : 'remote', keys: 'all' };
        }),
      });
      setScreen('game');
    },
    [user],
  );

  const exit = useCallback(() => {
    setScreen(config?.mode === 'online' ? 'lobby' : 'setup');
    setConfig(null);
  }, [config]);

  if (screen === 'game' && config) return <BomberArena key={`${config.seed}-${config.code || ''}`} config={config} onExit={exit} onSave={save} />;
  if (screen === 'lobby') return <Lobby user={user} firstName={firstName} char={charA} setChar={setCharA} onStart={startOnline} onBack={() => setScreen('setup')} />;

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <img src={fifo} alt="" className="cats__setup-fifo" />
        <div>
          <h2>Bombas en el hielo</h2>
          <p>Rompe los bloques de nieve, recoge poderes y atrapa a los demás con tus bombas. El último en pie gana.</p>
        </div>
      </div>

      <div className="cats__modes" role="radiogroup" aria-label="Modo de juego">
        {MODES.map((m) => (
          <button key={m.key} type="button" role="radio" aria-checked={mode === m.key} className="cats__mode" onClick={() => setMode(m.key)}>
            <strong>{m.title}</strong>
            <small>{m.text}</small>
          </button>
        ))}
      </div>

      <CharPicker label={mode === 'local' ? 'Personaje del jugador 1' : 'Tu personaje'} value={charA} onChange={setCharA} taken={mode === 'local' ? [charB] : []} />
      {mode === 'local' && <CharPicker label="Personaje del jugador 2" value={charB} onChange={setCharB} taken={[charA]} />}

      {mode !== 'online' && (
        <div className="bomb__options">
          {mode === 'bot' ? (
            <Count label="Bots" value={bots} min={1} max={3} onChange={setBots} />
          ) : (
            <Count label="Bots extra" value={extraBots} min={0} max={2} onChange={setExtraBots} />
          )}
          {(mode === 'bot' || extraBots > 0) && (
            <div className="cats__picker">
              <span className="cats__picker-label">Dificultad</span>
              <div className="cats__levels" role="group" aria-label="Dificultad">
                {Object.entries(BOT_LEVELS).map(([key, l]) => (
                  <button key={key} type="button" aria-pressed={level === key} onClick={() => setLevel(key)}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button type="button" className="game-btn cats__start" onClick={mode === 'online' ? () => setScreen('lobby') : startOffline}>
        {mode === 'online' ? 'Buscar sala' : 'Jugar'}
      </button>
    </div>
  );
}
