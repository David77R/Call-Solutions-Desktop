import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { useAuth } from '../../lib/AuthContext';
import { saveHockeyScore } from '../../lib/games';
import { createHockeyRoom, joinHockeyRoom, setHockeyAnswer, setHockeyOffer, setHockeyStatus, useHockeyRoom, useOpenHockeyRooms } from '../../lib/hockeyRooms';
import { guestAnswer, hostAccept, hostOffer } from '../../lib/peer';
import { newSeed } from './catArtillery';
import { CharFace, CharPicker, charOf } from './characters';
import { HOCKEY_LEVELS } from './hockeyEngine';
import HockeyArena from './HockeyArena';

const MODES = [
  { key: 'bot', title: 'Contra Fifo', text: 'Tú contra el mazo de Fifo.' },
  { key: 'local', title: '2 jugadores aquí', text: 'Mouse o W A S D contra flechas.' },
  { key: 'online', title: 'En línea', text: 'Contra un compañero desde su computadora.' },
];

const JOIN_ERRORS = {
  'not-found': 'No existe una sala con ese código.',
  taken: 'Esa sala ya empezó o se llenó.',
  'own-room': 'Esa sala es tuya. Espera a que alguien se una.',
  timeout: 'No hay conexión con el servidor. Si tienes la VPN prendida, apágala e intenta de nuevo.',
};
const CONNECT_LIMIT = 15000;
const NO_LINK = 'No se pudo conectar directo con tu compañero. Prueben los dos en la misma red y sin VPN.';

function playerOf(name, key, controller, extra = {}) {
  const c = charOf(key);
  return { name, kind: c.kind, colors: c.colors, controller, ...extra };
}

function Lobby({ user, firstName, char, setChar, onStart, onBack }) {
  const rooms = useOpenHockeyRooms(true);
  const [code, setCode] = useState('');
  const [myRoom, setMyRoom] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const room = useHockeyRoom(myRoom);
  const linkRef = useRef(null);
  const stepRef = useRef({ offered: false, answered: false, accepted: false, started: false });
  const me = user?.uid || 'anon';
  const player = { uid: me, name: firstName, char };

  const reset = useCallback((message = '') => {
    linkRef.current?.close?.();
    linkRef.current = null;
    stepRef.current = { offered: false, answered: false, accepted: false, started: false };
    setMyRoom(null);
    setRole(null);
    setPhase('');
    setError(message);
  }, []);

  useEffect(() => {
    if (!room || !myRoom || stepRef.current.started) return;
    if (room.missing || room.status === 'left') {
      reset(role === 'guest' ? 'El anfitrión cerró la sala.' : '');
      return;
    }
    const steps = stepRef.current;
    if (role === 'host' && room.guest && !steps.offered) {
      steps.offered = true;
      setPhase(`Conectando con ${room.guest.name}…`);
      hostOffer()
        .then(({ link, offer }) => {
          linkRef.current = link;
          const off = link.on((msg) => {
            if (msg.t !== 'hello' || stepRef.current.started) return;
            stepRef.current.started = true;
            off();
            link.send('sure', { t: 'start' });
            setHockeyStatus(myRoom, 'playing');
            onStart({ room, side: 0, link });
          });
          return setHockeyOffer(myRoom, offer);
        })
        .catch(() => reset(NO_LINK));
    }
    if (role === 'host' && room.answer && linkRef.current && !steps.accepted) {
      steps.accepted = true;
      hostAccept(linkRef.current, room.answer).catch(() => reset(NO_LINK));
    }
    if (role === 'guest' && room.offer && !steps.answered) {
      steps.answered = true;
      setPhase(`Conectando con ${room.host?.name}…`);
      guestAnswer(room.offer)
        .then(({ answer, link: pending, pc }) => {
          linkRef.current = { close: () => pc.close() };
          pending.then((link) => {
            linkRef.current = link;
            const off = link.on((msg) => {
              if (msg.t !== 'start' || stepRef.current.started) return;
              stepRef.current.started = true;
              off();
              onStart({ room, side: 1, link });
            });
            link.ready().then(() => link.send('sure', { t: 'hello' }));
          });
          return setHockeyAnswer(myRoom, answer);
        })
        .catch(() => reset(NO_LINK));
    }
  }, [room, myRoom, role, onStart, reset]);

  useEffect(() => {
    if (!phase) return undefined;
    const t = window.setTimeout(() => {
      if (stepRef.current.started) return;
      if (myRoom) setHockeyStatus(myRoom, 'left');
      reset(NO_LINK);
    }, CONNECT_LIMIT);
    return () => window.clearTimeout(t);
  }, [phase, myRoom, reset]);

  const run = async (fn, as) => {
    setBusy(true);
    setError('');
    try {
      const joined = await fn();
      setRole(as);
      setMyRoom(joined);
    } catch (err) {
      setError(JOIN_ERRORS[err?.message] || 'No se pudo conectar con la sala. Revisa la conexión o la regla de catRooms en Firestore.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (myRoom) setHockeyStatus(myRoom, 'left');
    reset();
  };

  if (myRoom) {
    return (
      <div className="game-intro cats__lobby">
        <img src={fifo} alt="" className="game-intro__fifo" />
        <h2>Sala {myRoom}</h2>
        <p>{phase || 'Esperando a un compañero… Dile que entre a Juegos de Fifo → Hockey → En línea, o que use el código.'}</p>
        <span className="cats__code">{myRoom}</span>
        <ul className="bomb__roster">
          {[room?.host, room?.guest].filter(Boolean).map((p) => (
            <li key={p.uid}>
              <CharFace char={charOf(p.char)} size={40} />
              <strong>{p.name}</strong>
            </li>
          ))}
        </ul>
        <button type="button" className="sf-chip" onClick={cancel}>
          {role === 'host' ? 'Cancelar sala' : 'Salir de la sala'}
        </button>
      </div>
    );
  }

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <button type="button" className="sf-chip" onClick={onBack}>
          ← Volver
        </button>
        <h2>Hockey en línea</h2>
      </div>
      <CharPicker label="Tu personaje" value={char} onChange={setChar} />
      <div className="cats__online">
        <section>
          <h3>Salas abiertas</h3>
          {rooms.filter((r) => r.host?.uid !== me).length ? (
            <ul className="cats__rooms">
              {rooms
                .filter((r) => r.host?.uid !== me)
                .map((r) => (
                  <li key={r.code}>
                    <span>
                      <strong>Sala de {r.host?.name}</strong>
                      <small>{r.code}</small>
                    </span>
                    <button type="button" className="game-btn" disabled={busy} onClick={() => run(() => joinHockeyRoom(r.code, player), 'guest')}>
                      Unirme
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="cats__muted">No hay salas abiertas ahora. Crea una y avísale a un compañero.</p>
          )}
        </section>
        <section>
          <h3>Crear o entrar con código</h3>
          <button type="button" className="game-btn" disabled={busy} onClick={() => run(() => createHockeyRoom(player, newSeed()), 'host')}>
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
            <button type="button" className="sf-chip" disabled={busy || code.length !== 4} onClick={() => run(() => joinHockeyRoom(code, player), 'guest')}>
              Entrar
            </button>
          </div>
        </section>
      </div>
      {error && <p className="sf-error">{error}</p>}
    </div>
  );
}

export default function HockeyGame({ agentName }) {
  const { user } = useAuth();
  const firstName = (agentName || 'Tú').split(' ')[0];
  const [screen, setScreen] = useState('setup');
  const [mode, setMode] = useState('bot');
  const [charA, setCharA] = useState('gatos:0');
  const [charB, setCharB] = useState('pinguinos:0');
  const [level, setLevel] = useState('medio');
  const [config, setConfig] = useState(null);

  const save = useCallback((score, result) => saveHockeyScore(agentName, score, result, config?.mode === 'online' ? 'online' : config?.level), [agentName, config]);

  const startOffline = () => {
    const seed = newSeed();
    const players =
      mode === 'local'
        ? [playerOf('Jugador 1', charA, 'human', { keys: 'wasd', pointer: true }), playerOf('Jugador 2', charB, 'human', { keys: 'arrows' })]
        : [playerOf(firstName, charA, 'human', { keys: 'all', pointer: true }), playerOf('Fifo', charB, 'bot')];
    setConfig({ mode, level, seed, players });
    setScreen('game');
  };

  const startOnline = useCallback(({ room, side, link }) => {
    const host = room.host;
    const guest = room.guest;
    setConfig({
      mode: 'online',
      seed: room.seed,
      side,
      link,
      code: room.code,
      players: [
        playerOf(host.name, host.char, side === 0 ? 'human' : 'remote', side === 0 ? { keys: 'all', pointer: true } : {}),
        playerOf(guest.name, guest.char, side === 1 ? 'human' : 'remote', side === 1 ? { keys: 'all', pointer: true } : {}),
      ],
    });
    setScreen('game');
  }, []);

  const exit = useCallback(() => {
    if (config?.mode === 'online') {
      config.link?.close();
      if (config.side === 0) setHockeyStatus(config.code, 'over');
    }
    setScreen(config?.mode === 'online' ? 'lobby' : 'setup');
    setConfig(null);
  }, [config]);

  if (screen === 'game' && config) return <HockeyArena key={`${config.seed}-${config.code || ''}`} config={config} onExit={exit} onSave={save} />;
  if (screen === 'lobby') return <Lobby user={user} firstName={firstName} char={charA} setChar={setCharA} onStart={startOnline} onBack={() => setScreen('setup')} />;

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <img src={fifo} alt="" className="cats__setup-fifo" />
        <div>
          <h2>Hockey en el hielo</h2>
          <p>Mueve tu mazo con el mouse, pega el pescado y mételo en el arco rival. Gana quien llegue a 7 goles o quien vaya ganando a los 3 minutos.</p>
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

      <CharPicker label={mode === 'local' ? 'Personaje del jugador 1' : 'Tu personaje'} value={charA} onChange={setCharA} taken={mode === 'online' ? [] : [charB]} />
      {mode !== 'online' && <CharPicker label={mode === 'local' ? 'Personaje del jugador 2' : 'Personaje de Fifo'} value={charB} onChange={setCharB} taken={[charA]} />}

      {mode === 'bot' && (
        <div className="cats__picker">
          <span className="cats__picker-label">Dificultad</span>
          <div className="cats__levels" role="group" aria-label="Dificultad">
            {Object.entries(HOCKEY_LEVELS).map(([key, l]) => (
              <button key={key} type="button" aria-pressed={level === key} onClick={() => setLevel(key)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="game-btn cats__start" onClick={mode === 'online' ? () => setScreen('lobby') : startOffline}>
        {mode === 'online' ? 'Buscar sala' : 'Jugar'}
      </button>
    </div>
  );
}
