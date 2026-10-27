import { NavLink } from 'react-router-dom';
import { SECTION_GROUPS, GAMES_SECTION } from '../sections';
import logo from '../assets/ccs-logo.webp';
import fifo from '../assets/fifo.webp';
import AgentCard from './AgentCard';
import { useOpenRemindersCount } from '../lib/reminders';
import { useProtocol } from '../lib/protocol';
import './Sidebar.css';

export default function Sidebar() {
  const openReminders = useOpenRemindersCount();
  const { overdue } = useProtocol();
  const badges = { '/recordatorios': openReminders, '/protocolo': overdue };

  return (
    <nav className="sidebar" aria-label="Secciones">
      <img className="sidebar__logo" src={logo} alt="CC+CS Solutions" />
      <AgentCard />

      {SECTION_GROUPS.map((group) => (
        <div className="sidebar__group" key={group.label}>
          <span className="sidebar__group-label">{group.label}</span>
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'sidebar__link is-active' : 'sidebar__link')}
            >
              <span>{item.label}</span>
              {badges[item.path] > 0 && (
                <span key={badges[item.path]} className={item.path === '/protocolo' ? 'sidebar__badge sidebar__badge--warn' : 'sidebar__badge'}>
                  {badges[item.path]}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}

      <NavLink
        to={GAMES_SECTION.path}
        className={({ isActive }) => (isActive ? 'sidebar__fifo is-active' : 'sidebar__fifo')}
      >
        <img src={fifo} alt="" className="sidebar__fifo-face" />
        <span className="sidebar__fifo-text">
          <span className="sidebar__fifo-title">{GAMES_SECTION.label}</span>
          <span className="sidebar__fifo-sub">Trivia, laberinto y leaderboard</span>
        </span>
      </NavLink>
    </nav>
  );
}
