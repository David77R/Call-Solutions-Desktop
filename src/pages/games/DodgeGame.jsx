import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { useAuth } from '../../lib/AuthContext';
import { saveDodgeScore } from '../../lib/games';
import {
  DODGE_MAX,
  createDodgeRoom,
  joinDodgeRoom,
  leaveDodgeRoom,
  setDodgeStatus,
  switchDodgeTeam,
  useDodgeRoom,
  useOpenDodgeRooms,
  watchDodgeSignal,
  writeDodgeSignal,
} from '../../lib/dodgeRooms';
import { guestAnswer, hostAccept, hostOffer } from '../../lib/peer';
import { newSeed } from './catArtillery';
import { CHARACTERS, CharFace, CharPicker, charOf } from './characters';
import { DODGE_LEVELS, DYNAMICS, TEAM_COLORS, TEAM_SIZE } from './dodgeEngine';
import DodgeArena from './DodgeArena';

const MODES = [
  { key: 'bot', title: 'Contra Fifo', text: 'Tú y 4 bots contra 5 bots de Fifo.' },
  { key: 'local', title: '2 jugadores aquí', text: 'Cada uno capitanea un equipo de 5 en esta computadora.' },
  { key: 'online', title: 'En línea', text: 'Hasta 10 compañeros; los puestos vacíos los llena Fifo.' },
];
const DYNAMIC_OPTIONS = [...Object.entries(DYNAMICS), ['mezcla', { name: 'Mezcla', text: 'Cada ronda trae una dinámica distinta al azar.' }]];
const TEAM_NAMES = ['Naranja', 'Azul'];
const JOIN_ERRORS = {
  'not-found': 'No existe una sala con ese código.',
  taken: 'Esa sala ya empezó.',
  full: 'Esa sala ya está llena.',
  timeout: 'No hay conexión con el servidor. Si tienes la VPN prendida, apágala e intenta de nuevo.',
};

function pickBots(count, exclude, seed) {
  const pool = CHARACTERS.filter((c) => !exclude.includes(c.key));
  const out = [];
  let k = seed >>> 0;
  for (let i = 0; i < count; i += 1) {
    if (!pool.length) pool.push(...CHARACTERS);
    k = (Math.imul(k, 1103515245) + 12345) >>> 0;
    out.push(pool.splice(k % pool.length, 1)[0]);
  }
  return out;
}

function rosterToConfig(roster, base, myUid) {
  const players = roster.map((r) => {
    const c = charOf(r.char);
    return { name: r.name, kind: c.kind, colors: c.colors, team: r.team, controller: r.uid ? 'human' : 'bot', uid: r.uid || null };
  });
  const humans = roster
    .map((r, i) => (r.uid ? { key: r.uid, start: i, team: r.team, keys: r.keys || 'all', local: r.local ?? r.uid === myUid, label: r.label ?? r.name } : null))
    .filter(Boolean);
  const mine = humans.find((h) => h.local);
  return { ...base, players, humans, myUid, myTeam: mine ? mine.team : 0 };
}

function Picker({ label, options, value, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">{label}</span>
      <div className="dodge__options" role="radiogroup" aria-label={label}>
        {options.map(([key, o]) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="cats__mode" onClick={() => onChange(key)}>
            <strong>{o.name}</strong>
            <small>{o.text}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Levels({ value, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">Dificultad de Fifo</span>
      <div className="cats__levels" role="group" aria-label="Dificultad">
        {Object.entries(DODGE_LEVELS).map(([key, l]) => (
          <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WaitingRoom({ code, room, me, connected, onStart, onLeave }) {
  const isHost = room.host === me;
  const players = room.players || [];
  const guests = players.filter((p) => p.uid !== room.host);
  const ready = guests.length > 0 && guests.every((p) => connected[p.uid]);
  return (
    <div className="game-intro cats__lobby dodge__lobby">
      <img src={fifo} alt="" className="game-intro__fifo" />
      <h2>Sala {code}</h2>
      <p className="bomb__room-meta">
        {DYNAMIC_OPTIONS.find(([k]) => k === room.dynamic)?.[1].name || 'Clásico'} · Fifo en {DODGE_LEVELS[room.level]?.label || 'Medio'}
      </p>
      <span className="cats__code">{code}</span>
      <div className="dodge__rosters">
        {[0, 1].map((team) => (
          <section key={team} style={{ '--c': TEAM_COLORS[team] }}>
            <h3>
              {TEAM_NAMES[team]} · {players.filter((p) => p.team === team).length}/{TEAM_SIZE}
            </h3>
            <ul>
              {players
                .filter((p) => p.team === team)
                .map((p) => (
                  <li key={p.uid}>
                    <CharFace char={charOf(p.char)} size={34} />
                    <strong>{p.name}</strong>
                    {p.uid === room.host ? <small>Anfitrión</small> : isHost ? <small>{connected[p.uid] ? 'Conectado' : 'Conectando…'}</small> : null}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="cats__muted">Los puestos vacíos los completa Fifo con bots.</p>
      <div className="cats__over-actions">
        <button type="button" className="sf-chip" onClick={() => switchDodgeTeam(code, me)}>
          Cambiarme de equipo
        </button>
        {isHost && (
          <button type="button" className="game-btn" disabled={!ready} onClick={onStart}>
            {guests.length === 0 ? 'Esperando compañeros…' : ready ? `Empezar con ${players.length}` : 'Conectando…'}
          </button>
        )}
        <button type="button" className="sf-chip" onClick={onLeave}>
          {isHost ? 'Cancelar sala' : 'Salir de la sala'}
        </button>
      </div>
      {!isHost && <p className="cats__muted">Esperando a que el anfitrión empiece…</p>}
    </div>
  );
}

function Lobby({ user, firstName, char, setChar, level, setLevel, dynamic, setDynamic, onStart, onBack }) {
  const rooms = useOpenDodgeRooms(true);
  const [code, setCode] = useState('');
  const [myRoom, setMyRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState({});
  const room = useDodgeRoom(myRoom);
  const me = user?.uid || 'anon';
  const player = { uid: me, name: firstName, char };
  const linksRef = useRef({});
  const pendingRef = useRef({});
  const startedRef = useRef(false);

  const reset = useCallback((message = '') => {
    Object.values(linksRef.current).forEach((l) => l.close?.());
    Object.values(pendingRef.current).forEach((u) => u?.());
    linksRef.current = {};
    pendingRef.current = {};
    startedRef.current = false;
    setConnected({});
    setMyRoom(null);
    setError(message);
  }, []);

  useEffect(() => {
    if (!room || !myRoom || startedRef.current) return;
    if (room.missing || room.status === 'left') {
      reset(room.host !== me ? 'El anfitrión cerró la sala.' : '');
      return;
    }
    if (room.host === me) {
      (room.players || [])
        .filter((p) => p.uid !== me && !pendingRef.current[p.uid])
        .forEach((p) => {
          pendingRef.current[p.uid] = () => {};
          hostOffer()
            .then(({ link, offer }) => {
              linksRef.current[p.uid] = link;
              link.on((msg) => {
                if (msg.t === 'hello') setConnected((c) => ({ ...c, [p.uid]: true }));
                if (msg.t === 'lost' || msg.t === 'leave') setConnected((c) => ({ ...c, [p.uid]: false }));
              });
              let accepted = false;
              pendingRef.current[p.uid] = watchDodgeSignal(myRoom, p.uid, (sig) => {
                if (sig.answer && !accepted) {
                  accepted = true;
                  hostAccept(link, sig.answer).catch(() => {});
                }
              });
              return writeDodgeSignal(myRoom, p.uid, { offer, answer: null });
            })
            .catch(() => setError('No se pudo preparar la conexión directa.'));
        });
      return;
    }
    if (!pendingRef.current.self) {
      let answered = false;
      pendingRef.current.self = watchDodgeSignal(myRoom, me, (sig) => {
        if (!sig.offer || answered) return;
        answered = true;
        guestAnswer(sig.offer)
          .then(({ answer, link: pending }) => {
            pending.then((link) => {
              linksRef.current.host = link;
              link.on((msg) => {
                if (msg.t !== 'start' || startedRef.current) return;
                startedRef.current = true;
                onStart({ roster: msg.roster, base: msg.base, link, host: false, code: myRoom, myUid: me });
              });
              link.ready().then(() => link.send('sure', { t: 'hello' }));
            });
            return writeDodgeSignal(myRoom, me, { answer });
          })
          .catch(() => reset('No se pudo conectar directo con el anfitrión. Prueben en la misma red y sin VPN.'));
      });
    }
  }, [room, myRoom, me, onStart, reset]);

  const start = () => {
    if (!room || startedRef.current) return;
    startedRef.current = true;
    const players = room.players || [];
    const exclude = players.map((p) => p.char);
    const fillers = pickBots(DODGE_MAX - players.length, exclude, room.seed);
    const roster = [];
    [0, 1].forEach((team) => {
      players.filter((p) => p.team === team).forEach((p) => roster.push({ name: p.name, char: p.char, team, uid: p.uid }));
      while (roster.filter((r) => r.team === team).length < TEAM_SIZE) {
        const c = fillers.shift() || CHARACTERS[roster.length % CHARACTERS.length];
        roster.push({ name: c.name, char: c.key, team, uid: null });
      }
    });
    const base = { mode: 'online', seed: room.seed, level: room.level, dynamic: room.dynamic, code: myRoom };
    Object.values(linksRef.current).forEach((link) => link.send('sure', { t: 'start', roster, base }));
    Object.values(pendingRef.current).forEach((u) => u?.());
    setDodgeStatus(myRoom, 'playing');
    onStart({ roster, base, links: { ...linksRef.current }, host: true, code: myRoom, myUid: me });
  };

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
    if (myRoom) leaveDodgeRoom(myRoom, me);
    reset();
  };

  if (myRoom && room && !room.missing && !room.error) return <WaitingRoom code={myRoom} room={room} me={me} connected={connected} onStart={start} onLeave={leave} />;

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <button type="button" className="sf-chip" onClick={onBack}>
          ← Volver
        </button>
        <h2>Dodgeball en línea</h2>
      </div>
      <CharPicker label="Tu personaje" value={char} onChange={setChar} />
      <div className="cats__online">
        <section>
          <h3>Salas abiertas</h3>
          {rooms.length ? (
            <ul className="cats__rooms">
              {rooms.map((r) => {
                const host = (r.players || []).find((p) => p.uid === r.host);
                return (
                  <li key={r.code}>
                    <span>
                      <strong>Sala de {host?.name || 'un compañero'}</strong>
                      <small>
                        {r.code} · {(r.players || []).length}/{DODGE_MAX} · {DYNAMIC_OPTIONS.find(([k]) => k === r.dynamic)?.[1].name || 'Clásico'}
                      </small>
                    </span>
                    <button type="button" className="game-btn" disabled={busy || (r.players || []).length >= DODGE_MAX} onClick={() => run(() => joinDodgeRoom(r.code, player))}>
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
          <div className="bomb__selects">
            <label className="cats__select">
              <span>Dinámica</span>
              <select className="sf-input" value={dynamic} onChange={(e) => setDynamic(e.target.value)}>
                {DYNAMIC_OPTIONS.map(([key, d]) => (
                  <option key={key} value={key}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="cats__select">
              <span>Bots de Fifo</span>
              <select className="sf-input" value={level} onChange={(e) => setLevel(e.target.value)}>
                {Object.entries(DODGE_LEVELS).map(([key, l]) => (
                  <option key={key} value={key}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" className="game-btn" disabled={busy} onClick={() => run(() => createDodgeRoom(player, newSeed(), { level, dynamic }))}>
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
            <button type="button" className="sf-chip" disabled={busy || code.length !== 4} onClick={() => run(() => joinDodgeRoom(code, player))}>
              Entrar
            </button>
          </div>
        </section>
      </div>
      {error && <p className="sf-error">{error}</p>}
    </div>
  );
}

export default function DodgeGame({ agentName }) {
  const { user } = useAuth();
  const firstName = (agentName || 'Tú').split(' ')[0];
  const [screen, setScreen] = useState('setup');
  const [mode, setMode] = useState('bot');
  const [charA, setCharA] = useState('gatos:0');
  const [charB, setCharB] = useState('perros:0');
  const [level, setLevel] = useState('medio');
  const [dynamic, setDynamic] = useState('clasico');
  const [config, setConfig] = useState(null);

  const save = useCallback((score, result) => saveDodgeScore(agentName, score, result, config?.mode === 'online' ? 'online' : config?.level), [agentName, config]);

  const startOffline = () => {
    const seed = newSeed();
    const humansChars = mode === 'local' ? [charA, charB] : [charA];
    const bots = pickBots(TEAM_SIZE * 2 - humansChars.length, humansChars, seed);
    const roster = [];
    roster.push({
      name: mode === 'local' ? 'Jugador 1' : firstName,
      char: charA,
      team: 0,
      uid: 'p1',
      keys: mode === 'local' ? 'wasd' : 'all',
      local: true,
      label: mode === 'local' ? 'J1' : 'Tú',
    });
    while (roster.length < TEAM_SIZE) {
      const c = bots.shift();
      roster.push({ name: c.name, char: c.key, team: 0, uid: null });
    }
    if (mode === 'local') roster.push({ name: 'Jugador 2', char: charB, team: 1, uid: 'p2', keys: 'arrows', local: true, label: 'J2' });
    while (roster.length < TEAM_SIZE * 2) {
      const c = bots.shift();
      roster.push({ name: c.name, char: c.key, team: 1, uid: null });
    }
    setConfig(rosterToConfig(roster, { mode, seed, level, dynamic }, 'p1'));
    setScreen('game');
  };

  const startOnline = useCallback(({ roster, base, links, link, host, myUid }) => {
    setConfig({ ...rosterToConfig(roster, base, myUid), host, links, link });
    setScreen('game');
  }, []);

  const exit = useCallback(() => {
    if (config?.mode === 'online') {
      Object.values(config.links || {}).forEach((l) => l.close());
      config.link?.close();
      if (config.host) setDodgeStatus(config.code, 'over');
    }
    setScreen(config?.mode === 'online' ? 'lobby' : 'setup');
    setConfig(null);
  }, [config]);

  if (screen === 'game' && config) return <DodgeArena key={`${config.seed}-${config.code || ''}`} config={config} onExit={exit} onSave={save} />;
  if (screen === 'lobby')
    return (
      <Lobby
        user={user}
        firstName={firstName}
        char={charA}
        setChar={setCharA}
        level={level}
        setLevel={setLevel}
        dynamic={dynamic}
        setDynamic={setDynamic}
        onStart={startOnline}
        onBack={() => setScreen('setup')}
      />
    );

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <img src={fifo} alt="" className="cats__setup-fifo" />
        <div>
          <h2>Dodgeball en el hielo</h2>
          <p>Equipos de 5 contra 5. Recoge las pelotas del centro, sácalos a todos, atrapa para revivir a un compañero y esquiva a tiempo. Gana quien se lleve 2 rondas.</p>
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

      <CharPicker label={mode === 'local' ? 'Personaje del jugador 1 (naranja)' : 'Tu personaje'} value={charA} onChange={setCharA} taken={mode === 'local' ? [charB] : []} />
      {mode === 'local' && <CharPicker label="Personaje del jugador 2 (azul)" value={charB} onChange={setCharB} taken={[charA]} />}

      {mode !== 'online' && (
        <>
          <Picker label="Dinámica" options={DYNAMIC_OPTIONS} value={dynamic} onChange={setDynamic} />
          <Levels value={level} onChange={setLevel} />
        </>
      )}

      <button type="button" className="game-btn cats__start" onClick={mode === 'online' ? () => setScreen('lobby') : startOffline}>
        {mode === 'online' ? 'Buscar sala' : 'Jugar'}
      </button>
    </div>
  );
}
