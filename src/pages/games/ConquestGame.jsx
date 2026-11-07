import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { useAuth } from '../../lib/AuthContext';
import { saveConquestScore } from '../../lib/games';
import { createConquestRoom, joinConquestRoom, setConquestAnswer, setConquestOffer, setConquestStatus, useConquestRoom, useOpenConquestRooms } from '../../lib/conquestRooms';
import { guestAnswer, hostAccept, hostOffer } from '../../lib/peer';
import { newSeed } from './catArtillery';
import { CONQUEST_LEVELS, CONQUEST_MAPS, CONQUEST_MAP_KEYS, PLAYER_COLORS, TRIBES, TRIBE_KEYS, previewConquestMap } from './conquestEngine';
import { drawMapPreview, unitSprite } from './conquestDraw';
import ConquestArena from './ConquestArena';

const MODES = [
  {
    key: 'bot',
    title: 'Contra Fifo',
    text: 'Tú contra el reino de Fifo, con la dificultad que elijas.',
  },
  {
    key: 'online',
    title: 'En línea 1 vs 1',
    text: 'Contra un compañero desde su computadora.',
  },
];
const JOIN_ERRORS = {
  'not-found': 'No existe una sala con ese código.',
  taken: 'Esa sala ya empezó o se llenó.',
  'own-room': 'Esa sala es tuya. Espera a que alguien se una.',
  timeout: 'No hay conexión con el servidor. Si tienes la VPN prendida, apágala e intenta de nuevo.',
};
const CONNECT_LIMIT = 15000;
const NO_LINK = 'No se pudo conectar directo con tu compañero. Prueben los dos en la misma red y sin VPN.';
const PREVIEW_SEED = 2026;

function TribeFace({ tribe, color, size = 44 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const sp = unitSprite('aldeano', color, 0, tribe);
    const dpr = 2;
    c.width = size * dpr;
    c.height = size * dpr;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const scale = (size * dpr) / (sp.h * 0.7);
    g.drawImage(sp.c, (size * dpr) / 2 - sp.ax * scale, 0, sp.w * scale, sp.h * scale);
  }, [tribe, color, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

function TribePicker({ label, value, onChange, color, allowRandom }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">{label}</span>
      <div className="conq-setup__tribes" role="radiogroup" aria-label={label}>
        {allowRandom && (
          <button type="button" role="radio" aria-checked={value === 'random'} className="conq-setup__tribe" onClick={() => onChange('random')}>
            <span className="conq-setup__dice" aria-hidden="true">
              ?
            </span>
            <strong>Al azar</strong>
            <small>Fifo elige una tribu.</small>
          </button>
        )}
        {TRIBE_KEYS.map((key) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="conq-setup__tribe" onClick={() => onChange(key)}>
            <TribeFace tribe={key} color={color} />
            <strong>{TRIBES[key].name}</strong>
            <small>{TRIBES[key].perk}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function MapPreview({ mapKey }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    c.width = 144;
    c.height = 96;
    drawMapPreview(c.getContext('2d'), previewConquestMap(PREVIEW_SEED, mapKey), 144, 96);
  }, [mapKey]);
  return <canvas ref={ref} className="conq-setup__map-img" aria-hidden="true" />;
}

function MapPicker({ value, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">Mapa</span>
      <div className="conq-setup__maps" role="radiogroup" aria-label="Mapa">
        {CONQUEST_MAP_KEYS.map((key) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="conq-setup__map" onClick={() => onChange(key)}>
            <MapPreview mapKey={key} />
            <strong>{CONQUEST_MAPS[key].name}</strong>
            <small>{CONQUEST_MAPS[key].text}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Lobby({ user, firstName, tribe, setTribe, map, setMap, onStart, onBack }) {
  const rooms = useOpenConquestRooms(true);
  const [code, setCode] = useState('');
  const [myRoom, setMyRoom] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const room = useConquestRoom(myRoom);
  const linkRef = useRef(null);
  const stepRef = useRef({
    offered: false,
    answered: false,
    accepted: false,
    started: false,
  });
  const me = user?.uid || 'anon';
  const player = { uid: me, name: firstName, tribe };

  const reset = useCallback((message = '') => {
    linkRef.current?.close?.();
    linkRef.current = null;
    stepRef.current = {
      offered: false,
      answered: false,
      accepted: false,
      started: false,
    };
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
            setConquestStatus(myRoom, 'playing');
            onStart({ room, side: 0, link });
          });
          return setConquestOffer(myRoom, offer);
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
          return setConquestAnswer(myRoom, answer);
        })
        .catch(() => reset(NO_LINK));
    }
  }, [room, myRoom, role, onStart, reset]);

  useEffect(() => {
    if (!phase) return undefined;
    const t = window.setTimeout(() => {
      if (stepRef.current.started) return;
      if (myRoom) setConquestStatus(myRoom, 'left');
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
    if (myRoom) setConquestStatus(myRoom, 'left');
    reset();
  };

  if (myRoom) {
    return (
      <div className="game-intro cats__lobby">
        <img src={fifo} alt="" className="game-intro__fifo" />
        <h2>Sala {myRoom}</h2>
        <p>{phase || 'Esperando a un compañero… Dile que entre a Juegos de Fifo → Conquista → En línea, o que use el código.'}</p>
        <span className="cats__code">{myRoom}</span>
        {room?.map && <p className="cats__muted">Mapa: {CONQUEST_MAPS[room.map]?.name}</p>}
        <ul className="bomb__roster">
          {[room?.host, room?.guest].filter(Boolean).map((p, i) => (
            <li key={p.uid}>
              <TribeFace tribe={p.tribe} color={PLAYER_COLORS[i]} size={40} />
              <strong>
                {p.name} · {TRIBES[p.tribe]?.name}
              </strong>
            </li>
          ))}
        </ul>
        <button type="button" className="sf-chip" onClick={cancel}>
          {role === 'host' ? 'Cancelar sala' : 'Salir de la sala'}
        </button>
      </div>
    );
  }

  const open = rooms.filter((r) => r.host?.uid !== me);
  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <button type="button" className="sf-chip" onClick={onBack}>
          ← Volver
        </button>
        <h2>Conquista en línea</h2>
      </div>
      <TribePicker label="Tu tribu" value={tribe} onChange={setTribe} color={PLAYER_COLORS[0]} />
      <MapPicker value={map} onChange={setMap} />
      <div className="cats__online">
        <section>
          <h3>Salas abiertas</h3>
          {open.length ? (
            <ul className="cats__rooms">
              {open.map((r) => (
                <li key={r.code}>
                  <span>
                    <strong>
                      Sala de {r.host?.name} · {TRIBES[r.host?.tribe]?.name}
                    </strong>
                    <small>
                      {r.code} · {CONQUEST_MAPS[r.map]?.name || 'Pradera'}
                    </small>
                  </span>
                  <button type="button" className="game-btn" disabled={busy} onClick={() => run(() => joinConquestRoom(r.code, player), 'guest')}>
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
          <button type="button" className="game-btn" disabled={busy} onClick={() => run(() => createConquestRoom(player, newSeed(), map), 'host')}>
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
            <button type="button" className="sf-chip" disabled={busy || code.length !== 4} onClick={() => run(() => joinConquestRoom(code, player), 'guest')}>
              Entrar
            </button>
          </div>
        </section>
      </div>
      {error && <p className="sf-error">{error}</p>}
    </div>
  );
}

export default function ConquestGame({ agentName }) {
  const { user } = useAuth();
  const firstName = (agentName || 'Tú').split(' ')[0];
  const [screen, setScreen] = useState('setup');
  const [mode, setMode] = useState('bot');
  const [tribe, setTribe] = useState('gatos');
  const [foeTribe, setFoeTribe] = useState('random');
  const [map, setMap] = useState('pradera');
  const [level, setLevel] = useState('facil');
  const [config, setConfig] = useState(null);

  const save = useCallback((score, result) => saveConquestScore(agentName, score, result, config?.mode === 'online' ? 'online' : config?.level), [agentName, config]);

  const startOffline = () => {
    const pool = TRIBE_KEYS.filter((k) => k !== tribe);
    const enemy = foeTribe === 'random' ? pool[Math.floor(Math.random() * pool.length)] : foeTribe;
    setConfig({
      mode: 'bot',
      level,
      map,
      seed: newSeed(),
      players: [
        { name: firstName, controller: 'human', tribe },
        { name: 'Fifo', controller: 'bot', level, tribe: enemy },
      ],
    });
    setScreen('game');
  };

  const startOnline = useCallback(({ room, side, link }) => {
    setConfig({
      mode: 'online',
      seed: room.seed,
      map: room.map || 'pradera',
      side,
      link,
      code: room.code,
      players: [
        {
          name: room.host.name,
          controller: side === 0 ? 'human' : 'remote',
          tribe: room.host.tribe,
        },
        {
          name: room.guest.name,
          controller: side === 1 ? 'human' : 'remote',
          tribe: room.guest.tribe,
        },
      ],
    });
    setScreen('game');
  }, []);

  const exit = useCallback(() => {
    if (config?.mode === 'online') {
      config.link?.close();
      if (config.side === 0) setConquestStatus(config.code, 'over');
    }
    setScreen(config?.mode === 'online' ? 'lobby' : 'setup');
    setConfig(null);
  }, [config]);

  if (screen === 'game' && config) return <ConquestArena key={`${config.seed}-${config.code || ''}`} config={config} onExit={exit} onSave={save} />;
  if (screen === 'lobby')
    return <Lobby user={user} firstName={firstName} tribe={tribe} setTribe={setTribe} map={map} setMap={setMap} onStart={startOnline} onBack={() => setScreen('setup')} />;

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <img src={fifo} alt="" className="cats__setup-fifo" />
        <div>
          <h2>Conquista de tribus</h2>
          <p>
            Tus aldeanos recolectan comida, madera y oro. Construye casas, granjas y cuarteles, sube de edad, entrena lanceros, arqueros, caballeros y catapultas, y derriba el
            castillo enemigo antes de que caiga el tuyo.
          </p>
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

      <TribePicker label="Tu tribu" value={tribe} onChange={setTribe} color={PLAYER_COLORS[0]} />
      {mode === 'bot' && (
        <>
          <TribePicker label="Tribu de Fifo" value={foeTribe} onChange={setFoeTribe} color={PLAYER_COLORS[1]} allowRandom />
          <MapPicker value={map} onChange={setMap} />
          <div className="cats__picker">
            <span className="cats__picker-label">Dificultad</span>
            <div className="cats__levels" role="group" aria-label="Dificultad">
              {Object.entries(CONQUEST_LEVELS).map(([key, l]) => (
                <button key={key} type="button" aria-pressed={level === key} onClick={() => setLevel(key)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button type="button" className="game-btn cats__start" onClick={mode === 'online' ? () => setScreen('lobby') : startOffline}>
        {mode === 'online' ? 'Buscar sala' : 'Empezar la conquista'}
      </button>
      <p className="cats__help">
        Clic para seleccionar, arrastra para elegir varios y clic derecho para mover, recolectar o atacar. Las casas suben la población, la granja da comida infinita y el castillo
        sube de edad. Lanceros ganan a caballeros, caballeros a arqueros y arqueros a lanceros. Una partida dura entre 10 y 20 minutos.
      </p>
    </div>
  );
}
