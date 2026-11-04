import { useCallback, useEffect, useRef, useState } from 'react';
import fifo from '../../assets/fifo.webp';
import { useAuth } from '../../lib/AuthContext';
import { saveCatScore } from '../../lib/games';
import { createRoom, joinRoom, leaveRoom, useOpenRooms, useRoom } from '../../lib/catRooms';
import { ARENAS, H, LEVELS, TEAMS, UNIT_R, W, makeMap, newSeed, resolveArena } from './catArtillery';
import { drawObject, drawSky, drawTerrain, drawUnit, drawWater } from './catArtilleryDraw';
import CatArena from './CatArena';

const MODES = [
  { key: 'bot', title: 'Contra la máquina', text: 'Tu equipo contra el de Fifo.' },
  { key: 'local', title: '2 jugadores aquí', text: 'Se turnan en esta misma computadora.' },
  { key: 'online', title: 'En línea', text: 'Contra un compañero desde su computadora.' },
];

const JOIN_ERRORS = {
  'not-found': 'No existe una sala con ese código.',
  taken: 'Esa sala ya empezó o se llenó.',
  'own-room': 'Esa sala es tuya. Espera a que alguien se una.',
  timeout: 'No hay conexión con el servidor. Si tienes la VPN prendida, apágala e intenta de nuevo.',
};

function TeamPreview({ team }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 150 * dpr;
    canvas.height = 64 * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 150, 64);
    const def = TEAMS[team];
    def.units.forEach((u, i) => {
      drawUnit(ctx, { x: 30 + i * 45, y: 64 - UNIT_R - 4, alive: true, flash: 0, face: 1, colors: u }, def.kind, null, false, 0);
    });
  }, [team]);
  return <canvas ref={ref} className="cats__preview" style={{ width: 150, height: 64 }} aria-hidden="true" />;
}

const PREVIEW_SEED = 20261104;
const ARENA_OPTIONS = [...Object.entries(ARENAS), ['aleatorio', { name: 'Sorpresa', text: 'Fifo elige la arena.' }]];

function ArenaPreview({ arena }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = 168;
    const h = (w * H) / W;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform((dpr * w) / W, 0, 0, (dpr * w) / W, 0, 0);
    drawSky(ctx, 0);
    if (ARENAS[arena]) {
      const map = makeMap(PREVIEW_SEED, arena);
      drawTerrain(ctx, map.terrain, map.base);
      map.objects.forEach((o) => drawObject(ctx, o, 0));
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 220px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', W / 2, H / 2 + 80);
    }
    drawWater(ctx, 0);
  }, [arena]);
  return <canvas ref={ref} className="cats__arena-preview" aria-hidden="true" />;
}

function ArenaPicker({ value, onChange }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">Arena</span>
      <div className="cats__arenas" role="radiogroup" aria-label="Arena">
        {ARENA_OPTIONS.map(([key, a]) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="cats__arenacard" onClick={() => onChange(key)}>
            <ArenaPreview arena={key} />
            <strong>{a.name}</strong>
            <small>{a.text}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamPicker({ label, value, onChange, exclude }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">{label}</span>
      <div className="cats__teams" role="radiogroup" aria-label={label}>
        {Object.entries(TEAMS).map(([key, t]) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} className="cats__teamcard" disabled={exclude === key} onClick={() => onChange(key)}>
            <TeamPreview team={key} />
            <strong>{t.name}</strong>
            <small>{t.units.map((u) => u.name).join(', ')}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Lobby({ user, firstName, team, setTeam, arena, setArena, onStart, onBack }) {
  const rooms = useOpenRooms(true);
  const [code, setCode] = useState('');
  const [myRoom, setMyRoom] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const room = useRoom(myRoom);
  const player = { uid: user?.uid || 'anon', name: firstName, team };

  useEffect(() => {
    if (!room || !myRoom) return;
    if (room.status === 'playing' && room.guest) onStart(room, 0);
  }, [room, myRoom, onStart]);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const seed = newSeed();
      setMyRoom(await createRoom(player, seed, resolveArena(arena, seed)));
    } catch (err) {
      setError(err?.message === 'timeout' ? JOIN_ERRORS.timeout : 'No se pudo crear la sala. Revisa la conexión o la regla de catRooms en Firestore.');
    } finally {
      setBusy(false);
    }
  };

  const join = async (target) => {
    setBusy(true);
    setError('');
    try {
      const joined = await joinRoom(target, player);
      onStart({ code: joined, waitForRoom: true }, 1);
    } catch (err) {
      setError(JOIN_ERRORS[err?.message] || 'No se pudo entrar a la sala. Revisa la conexión.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (myRoom) leaveRoom(myRoom, player.uid);
    setMyRoom(null);
  };

  if (myRoom) {
    return (
      <div className="game-intro cats__lobby">
        <img src={fifo} alt="" className="game-intro__fifo" />
        <h2>Sala {myRoom}</h2>
        <p>Esperando a un compañero… Dile que entre a Juegos de Fifo → Gatos → En línea, o que use el código.</p>
        <span className="cats__code">{myRoom}</span>
        <button type="button" className="sf-chip" onClick={cancel}>
          Cancelar sala
        </button>
      </div>
    );
  }

  const others = rooms.filter((r) => r.host?.uid !== player.uid);

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <button type="button" className="sf-chip" onClick={onBack}>
          ← Volver
        </button>
        <h2>Jugar en línea</h2>
      </div>
      <TeamPicker label="Tu equipo" value={team} onChange={setTeam} />
      <div className="cats__online">
        <section>
          <h3>Salas abiertas</h3>
          {others.length ? (
            <ul className="cats__rooms">
              {others.map((r) => (
                <li key={r.code}>
                  <span>
                    <strong>{r.host?.name}</strong> con {TEAMS[r.host?.team]?.name || 'su equipo'}
                    <small>
                      Sala {r.code}
                      {ARENAS[r.arena] ? ` · ${ARENAS[r.arena].name}` : ''}
                    </small>
                  </span>
                  <button type="button" className="game-btn" disabled={busy} onClick={() => join(r.code)}>
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
          <label className="cats__select">
            <span>Arena de tu sala</span>
            <select className="sf-input" value={arena} onChange={(e) => setArena(e.target.value)}>
              {ARENA_OPTIONS.map(([key, a]) => (
                <option key={key} value={key}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="game-btn" disabled={busy} onClick={create}>
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
            <button type="button" className="sf-chip" disabled={busy || code.length !== 4} onClick={() => join(code)}>
              Entrar
            </button>
          </div>
        </section>
      </div>
      {error && <p className="sf-error">{error}</p>}
    </div>
  );
}

function GuestWait({ code, onReady, onBack }) {
  const room = useRoom(code);
  useEffect(() => {
    if (room?.status === 'playing' && room.guest) onReady(room);
  }, [room, onReady]);
  return (
    <div className="game-intro">
      <img src={fifo} alt="" className="game-intro__fifo" />
      <h2>Entrando a la sala {code}…</h2>
      <button type="button" className="sf-chip" onClick={onBack}>
        Volver
      </button>
    </div>
  );
}

export default function CatArtilleryGame({ agentName }) {
  const { user } = useAuth();
  const firstName = (agentName || 'Tú').split(' ')[0];
  const [screen, setScreen] = useState('setup');
  const [mode, setMode] = useState('bot');
  const [teamA, setTeamA] = useState('gatos');
  const [teamB, setTeamB] = useState('perros');
  const [level, setLevel] = useState('medio');
  const [arena, setArena] = useState('aleatorio');
  const [config, setConfig] = useState(null);
  const [guestCode, setGuestCode] = useState(null);

  const save = useCallback((score, result) => saveCatScore(agentName, score, result, config?.mode === 'online' ? 'online' : config?.level), [agentName, config]);

  const startOffline = () => {
    const seed = newSeed();
    setConfig({
      mode,
      level,
      seed,
      arena: resolveArena(arena, seed),
      teams: [
        { team: teamA, label: mode === 'local' ? 'Jugador 1' : firstName, controller: 'human' },
        { team: teamB, label: mode === 'local' ? 'Jugador 2' : 'Fifo', controller: mode === 'local' ? 'human' : 'bot' },
      ],
    });
    setScreen('game');
  };

  const startOnline = useCallback(
    (room, side) => {
      if (room.waitForRoom) {
        setGuestCode(room.code);
        setScreen('guest');
        return;
      }
      setConfig({
        mode: 'online',
        code: room.code,
        side,
        seed: room.seed,
        arena: resolveArena(room.arena, room.seed),
        teams: [
          { team: room.host.team, label: side === 0 ? firstName : room.host.name, controller: side === 0 ? 'human' : 'remote' },
          { team: room.guest.team, label: side === 1 ? firstName : room.guest.name, controller: side === 1 ? 'human' : 'remote' },
        ],
      });
      setScreen('game');
    },
    [firstName],
  );

  const guestReady = useCallback((room) => startOnline(room, 1), [startOnline]);

  const exit = useCallback(() => {
    if (config?.mode === 'online') {
      leaveRoom(config.code, user?.uid);
      setScreen('lobby');
    } else {
      setScreen('setup');
    }
    setConfig(null);
  }, [config, user]);

  if (screen === 'game' && config) return <CatArena key={`${config.seed}-${config.code || ''}`} config={config} onExit={exit} onSave={save} />;
  if (screen === 'guest' && guestCode) return <GuestWait code={guestCode} onReady={guestReady} onBack={() => setScreen('lobby')} />;
  if (screen === 'lobby')
    return <Lobby user={user} firstName={firstName} team={teamA} setTeam={setTeamA} arena={arena} setArena={setArena} onStart={startOnline} onBack={() => setScreen('setup')} />;

  return (
    <div className="cats__setup">
      <div className="cats__setup-head">
        <img src={fifo} alt="" className="cats__setup-fifo" />
        <div>
          <h2>Batalla en la Antártida</h2>
          <p>
            Equipos de tres por turnos. Camina, apunta y elige la potencia. Usa las murallas para cubrirte, revienta barriles cerca del rival y rompe las cajas que caen del cielo.
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

      <TeamPicker label={mode === 'local' ? 'Equipo del jugador 1' : 'Tu equipo'} value={teamA} onChange={setTeamA} exclude={mode === 'online' ? null : teamB} />
      {mode !== 'online' && <TeamPicker label={mode === 'local' ? 'Equipo del jugador 2' : 'Equipo rival'} value={teamB} onChange={setTeamB} exclude={teamA} />}
      {mode !== 'online' && <ArenaPicker value={arena} onChange={setArena} />}

      {mode === 'bot' && (
        <div className="cats__picker">
          <span className="cats__picker-label">Dificultad</span>
          <div className="cats__levels" role="group" aria-label="Dificultad">
            {Object.entries(LEVELS).map(([key, l]) => (
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
