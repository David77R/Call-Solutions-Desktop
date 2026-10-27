import { useState } from 'react';
import TriviaGame from './TriviaGame';
import MazeGame from './MazeGame';
import Leaderboard from './Leaderboard';
import { useCatalog } from '../../lib/useCatalog';
import { useGroomerRosters } from '../../lib/useGroomerRosters';
import { useAuth } from '../../lib/AuthContext';
import './Games.css';

const TABS = [
  { key: 'trivia', label: 'Trivia' },
  { key: 'maze', label: 'Laberinto' },
  { key: 'board', label: 'Leaderboard' },
];

export default function GamesPage() {
  const [tab, setTab] = useState('trivia');
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
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="games__stage" key={tab}>
        {tab === 'trivia' && <TriviaGame companies={companies} rosters={rosters} agentName={agentName} />}
        {tab === 'maze' && <MazeGame agentName={agentName} />}
        {tab === 'board' && <Leaderboard agentName={agentName} />}
      </div>
    </div>
  );
}
