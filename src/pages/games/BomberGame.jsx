import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { useAuth } from '../../lib/AuthContext';
import { saveBombScore } from '../../lib/games';
import { MAX_PLAYERS, createBombRoom, finishBombRoom, joinBombRoom, leaveBombRoom, startBombRoom, updateBombTour, useBombRoom, useOpenBombRooms } from '../../lib/bombRooms';
import { newSeed } from './catArtillery';
import { CHARACTERS, CharFace, CharPicker, charOf } from './characters';
import { BH, BOT_LEVELS, BW, MAP_KEYS, MAPS, RULES, makeBoard, resolveMap } from './bomberEngine';
import { drawBoard, drawHazards } from './bomberDraw';
import BomberArena from './BomberArena';

const TOUR_TARGET = 3;
const FORMATS = {
  single: { name: 'Partida única', text: 'Una sola partida en el mapa que elijas.' },
  tournament: { name: 'Torneo', text: `Gana quien se lleve ${TOUR_TARGET} rondas. El mapa cambia en cada ronda.` },
};

function tourMaps(seed, first) {
  const rest = MAP_KEYS.filter((k) => k !== first);
  let k = seed >>> 0;
  for (let i = rest.length - 1; i > 0; i -= 1) {
    k = (Math.imul(k, 1103515245) + 12345) >>> 0;
    const j = k % (i + 1);
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}

function roundConfig(base, round) {
  return {
    ...base,
    round,
    seed: (base.baseSeed + round * 7919) % 2147483647,
    map: base.tournament ? base.maps[round % base.maps.length] : base.map,
    channel: base.mode === 'online' && base.tournament ? `${base.code}r${round}` : undefined,
  };
}

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

const MAP_OPTIONS = [...Object.entries(MAPS), ['aleatorio', { name: 'Sorpresa', text: 'Fifo elige el mapa.' }]];

function MapPreview({ map }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = 168;
    const h = (w * BH) / BW;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform((dpr * w) / BW, 0, 0, (dpr * w) / BW, 0, 0);
    if (MAPS[map]) {
      const preview = { board: makeBoard(4242, map), fallen: [], time: 1.3, config: { seed: 4242 } };
      drawBoard(ctx, preview);
      drawHazards(ctx, preview);
    } else {
      ctx.fillStyle = '#24427f';
      ctx.fillRect(0, 0, BW, BH);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 260px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', BW / 2, BH / 2 + 90);
    }
  }, [map]);
  return <canvas ref={ref} className="cats__arena-preview bomb__map-preview" aria-hidden="true" />;
}

function MapPicker({ value, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">Mapa</span>
      <div className="cats__arenas bomb__maps" role="radiogroup" aria-label="Mapa">
        {MAP_OPTIONS.map(([key, m]) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="cats__arenacard" onClick={() => onChange(key)}>
            <MapPreview map={key} />
            <strong>{m.name}</strong>
            <small>{m.text}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function FormatPicker({ value, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">Formato</span>
      <div className="bomb__rules" role="radiogroup" aria-label="Formato">
        {Object.entries(FORMATS).map(([key, f]) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="cats__mode" onClick={() => onChange(key)}>
            <strong>{f.name}</strong>
            <small>{f.text}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function RulesPicker({ value, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">Reglas</span>
      <div className="bomb__rules" role="radiogroup" aria-label="Reglas">
        {Object.entries(RULES).map(([key, r]) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="cats__mode" onClick={() => onChange(key)}>
            <strong>{r.name}</strong>
            <small>{r.text}</small>
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
      <p className="bomb__room-meta">
        {room?.format === 'tournament' ? `Torneo a ${TOUR_TARGET} rondas · ` : ''}
        {RULES[room?.rules]?.name || 'Supervivencia'} · {MAPS[room?.map]?.name || 'Mapa sorpresa'}
      </p>
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

function Lobby({ user, firstName, char, setChar, map, setMap, rules, setRules, format, setFormat, onStart, onBack }) {
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
                        {r.code} · {count}/{MAX_PLAYERS} jugadores · {r.format === 'tournament' ? 'Torneo · ' : ''}
                        {RULES[r.rules]?.name || 'Supervivencia'} · {MAPS[r.map]?.name || 'Clásico'}
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
          <div className="bomb__selects">
            <label className="cats__select bomb__select-wide">
              <span>Formato</span>
              <select className="sf-input" value={format} onChange={(e) => setFormat(e.target.value)}>
                {Object.entries(FORMATS).map(([key, f]) => (
                  <option key={key} value={key}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="cats__select">
              <span>Reglas</span>
              <select className="sf-input" value={rules} onChange={(e) => setRules(e.target.value)}>
                {Object.entries(RULES).map(([key, r]) => (
                  <option key={key} value={key}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="cats__select">
              <span>Mapa</span>
              <select className="sf-input" value={map} onChange={(e) => setMap(e.target.value)}>
                {MAP_OPTIONS.map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="game-btn"
            disabled={busy}
            onClick={() =>
              run(() => {
                const seed = newSeed();
                const first = resolveMap(map, seed);
                return createBombRoom(player, seed, { map: first, rules, format, maps: format === 'tournament' ? tourMaps(seed, first) : null });
              })
            }
          >
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
  const [map, setMap] = useState('clasico');
  const [rules, setRules] = useState('survival');
  const [format, setFormat] = useState('single');
  const [config, setConfig] = useState(null);
  const [tour, setTour] = useState(null);
  const baseRef = useRef(null);
  const timerRef = useRef(0);
  const liveRoom = useBombRoom(config?.mode === 'online' && config.tournament ? config.code : null);

  const save = useCallback((score, result) => saveBombScore(agentName, score, result, config?.mode === 'online' ? 'online' : config?.level), [agentName, config]);

  const mineSlot = config?.mode === 'online' ? config.me : 0;
  const isHost = config?.mode !== 'online' || config?.me === 0;

  const tourRef = useRef(null);
  tourRef.current = tour;

  const advance = useCallback(() => {
    window.clearTimeout(timerRef.current);
    const base = baseRef.current;
    const t = tourRef.current;
    if (!base || !t || t.champion != null) return;
    const next = t.round + 1;
    if (base.mode === 'online') {
      updateBombTour(base.code, { current: next, wins: t.wins, champion: null, done: false });
      setTour({ ...t, auto: 0 });
      return;
    }
    setTour({ ...t, round: next, auto: 0, pending: false });
    setConfig(roundConfig(base, next));
  }, []);

  const onRoundOver = useCallback(
    (winner) => {
      const base = baseRef.current;
      const t = tourRef.current;
      if (!base?.tournament || !t) return;
      if (base.mode === 'online' && !isHost) {
        setTour({ ...t, pending: true });
        return;
      }
      const wins = [...t.wins];
      if (winner >= 0) wins[winner] = (wins[winner] || 0) + 1;
      const champion = winner >= 0 && wins[winner] >= TOUR_TARGET ? winner : null;
      if (champion != null && champion === mineSlot && base.mode !== 'local') saveBombScore(agentName, 150, 'campeon', base.mode === 'online' ? 'online' : base.level);
      if (base.mode === 'online') {
        updateBombTour(base.code, { current: t.round, wins, champion, done: true });
        if (champion != null) finishBombRoom(base.code, champion);
      }
      setTour({ ...t, wins, champion, auto: champion == null ? 5 : 0 });
      if (champion != null) return;
      let left = 5;
      const tickDown = () => {
        left -= 1;
        if (left <= 0) advance();
        else {
          setTour((x) => (x ? { ...x, auto: left } : x));
          timerRef.current = window.setTimeout(tickDown, 1000);
        }
      };
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(tickDown, 1000);
    },
    [isHost, mineSlot, agentName, advance],
  );

  useEffect(() => {
    const base = baseRef.current;
    const remote = liveRoom?.tour;
    if (!base || !remote || !config) return;
    if (remote.current > config.round) {
      setTour({ round: remote.current, wins: remote.wins, champion: null, target: TOUR_TARGET, auto: 0 });
      setConfig(roundConfig(base, remote.current));
      return;
    }
    if (!isHost && remote.current === config.round && remote.done) {
      const t = tourRef.current;
      if (t && t.champion == null && remote.champion != null && remote.champion === mineSlot) saveBombScore(agentName, 150, 'campeon', 'online');
      if (!t || t.pending || t.champion !== remote.champion || JSON.stringify(t.wins) !== JSON.stringify(remote.wins))
        setTour({ round: remote.current, wins: remote.wins, champion: remote.champion, target: TOUR_TARGET, pending: false });
    }
  }, [liveRoom, config, isHost, mineSlot, agentName]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

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
    const first = resolveMap(map, seed);
    const players = [...humans, ...botPlayers(mode === 'local' ? extraBots : bots, taken, seed)];
    const tournament = format === 'tournament';
    const base = { mode, level, baseSeed: seed, map: first, rules, players, tournament, maps: tournament ? tourMaps(seed, first) : null };
    baseRef.current = base;
    setTour(tournament ? { round: 0, wins: players.map(() => 0), champion: null, target: TOUR_TARGET } : null);
    setConfig(roundConfig(base, 0));
    setScreen('game');
  };

  const startOnline = useCallback(
    (room) => {
      const me = user?.uid || 'anon';
      const list = [...(room.players || [])].sort((x, y) => x.slot - y.slot);
      const tournament = room.format === 'tournament' && Array.isArray(room.maps);
      const base = {
        mode: 'online',
        code: room.code,
        baseSeed: room.seed,
        map: resolveMap(room.map, room.seed),
        maps: tournament ? room.maps : null,
        tournament,
        rules: room.rules || 'survival',
        me: list.findIndex((p) => p.uid === me),
        players: list.map((p) => {
          const c = charOf(p.char);
          return { name: p.name, uid: p.uid, kind: c.kind, colors: c.colors, controller: p.uid === me ? 'human' : 'remote', keys: 'all' };
        }),
      };
      baseRef.current = base;
      setTour(tournament ? { round: 0, wins: list.map(() => 0), champion: null, target: TOUR_TARGET } : null);
      setConfig(roundConfig(base, 0));
      setScreen('game');
    },
    [user],
  );

  const exit = useCallback(() => {
    window.clearTimeout(timerRef.current);
    baseRef.current = null;
    setTour(null);
    setScreen(config?.mode === 'online' ? 'lobby' : 'setup');
    setConfig(null);
  }, [config]);

  if (screen === 'game' && config)
    return (
      <BomberArena
        key={`${config.seed}-${config.code || ''}-${config.round || 0}`}
        config={config}
        onExit={exit}
        onSave={save}
        tour={tour}
        onRoundOver={config.tournament ? onRoundOver : undefined}
        onNext={config.tournament && isHost ? advance : undefined}
      />
    );
  if (screen === 'lobby')
    return (
      <Lobby
        user={user}
        firstName={firstName}
        char={charA}
        setChar={setCharA}
        map={map}
        setMap={setMap}
        rules={rules}
        setRules={setRules}
        format={format}
        setFormat={setFormat}
        onStart={startOnline}
        onBack={() => setScreen('setup')}
      />
    );

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <img src={fifo} alt="" className="cats__setup-fifo" />
        <div>
          <h2>Bombas en el hielo</h2>
          <p>Rompe los bloques de nieve, recoge poderes y atrapa a los demás con tus bombas. Juega a quedar en pie o a conquistar el mapa pintándolo de tu color.</p>
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

      {mode !== 'online' && <FormatPicker value={format} onChange={setFormat} />}
      {mode !== 'online' && <RulesPicker value={rules} onChange={setRules} />}
      {mode !== 'online' && <MapPicker value={map} onChange={setMap} />}

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
