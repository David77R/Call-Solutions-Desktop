import { NavLink } from 'react-router-dom';
import { SECTION_GROUPS, GAMES_SECTION } from '../sections';
import logo from '../assets/ccs-logo.webp';
import fifo from '../assets/fifo.webp';
import AgentCard from './AgentCard';
import NavIcon from './NavIcons';
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

      <div className="sidebar__scroll">
        {SECTION_GROUPS.map((group) => (
          <div className="sidebar__group" key={group.label}>
            <span className="sidebar__group-label">{group.label}</span>
            {group.items.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'sidebar__link is-active' : 'sidebar__link')}>
                <span className="sidebar__icon">
                  <NavIcon path={item.path} />
                </span>
                <span className="sidebar__label">{item.label}</span>
                {badges[item.path] > 0 && (
                  <span key={badges[item.path]} className={item.path === '/protocolo' ? 'sidebar__badge sidebar__badge--warn' : 'sidebar__badge'}>
                    {badges[item.path]}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
        <NavLink to={GAMES_SECTION.path} className={({ isActive }) => (isActive ? 'sidebar__link sidebar__link--games is-active' : 'sidebar__link sidebar__link--games')}>
          <span className="sidebar__icon">
            <img src={fifo} alt="" className="sidebar__games-face" />
          </span>
          <span className="sidebar__label">{GAMES_SECTION.label}</span>
        </NavLink>
      </div>

    </nav>
  );
}
