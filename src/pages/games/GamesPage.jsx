import { useState } from 'react';
import { GameActiveContext } from './gameActivity';
import TriviaGame from './TriviaGame';
import MazeGame from './MazeGame';
import CatArtilleryGame from './CatArtilleryGame';
import BomberGame from './BomberGame';
import HockeyGame from './HockeyGame';
import DodgeGame from './DodgeGame';
import ConquestGame from './ConquestGame';
import Leaderboard from './Leaderboard';
import { useCatalog } from '../../lib/useCatalog';
import { useGroomerRosters } from '../../lib/useGroomerRosters';
import { useAuth } from '../../lib/AuthContext';
import './Games.css';

const TABS = [
  { key: 'trivia', label: 'Trivia' },
  { key: 'maze', label: 'Laberinto' },
  { key: 'cats', label: 'Gatos' },
  { key: 'bombs', label: 'Bombas' },
  { key: 'hockey', label: 'Hockey' },
  { key: 'dodge', label: 'Dodge' },
  { key: 'conquest', label: 'Conquista' },
  { key: 'board', label: 'Leaderboard' },
];

export default function GamesPage({ active = true }) {
  const [tab, setTab] = useState('trivia');
  const [opened, setOpened] = useState(['trivia']);
  const { companies } = useCatalog();
  const rosters = useGroomerRosters();
  const { user } = useAuth();
  const agentName = user?.displayName || '';
  const index = TABS.findIndex((t) => t.key === tab);

  return (
    <div className="games">
      <div className="games__head">
        <h1 className="games__title">Juegos de Fifo</h1>
        <div className="games__tabs" role="tablist" aria-label="Juego">
          <span className="games__thumb" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => {
                setTab(t.key);
                setOpened((list) => (list.includes(t.key) ? list : [...list, t.key]));
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {opened.map((key) => (
        <div key={key} className={tab === key ? 'games__stage' : undefined} hidden={tab !== key}>
          <GameActiveContext.Provider value={active && tab === key}>
            {key === 'trivia' && <TriviaGame companies={companies} rosters={rosters} agentName={agentName} />}
            {key === 'maze' && <MazeGame agentName={agentName} />}
            {key === 'cats' && <CatArtilleryGame agentName={agentName} />}
            {key === 'bombs' && <BomberGame agentName={agentName} />}
            {key === 'hockey' && <HockeyGame agentName={agentName} />}
            {key === 'dodge' && <DodgeGame agentName={agentName} />}
            {key === 'conquest' && <ConquestGame agentName={agentName} />}
            {key === 'board' && <Leaderboard agentName={agentName} />}
          </GameActiveContext.Provider>
        </div>
      ))}
    </div>
  );
}
