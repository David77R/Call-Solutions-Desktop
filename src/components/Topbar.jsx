import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BellIcon, ClockIcon, NoteIcon, SearchIcon } from './Icons';
import { shortCompanyName } from './CompanyTabs';
import { useAuth } from '../lib/AuthContext';
import { useCatalog } from '../lib/useCatalog';
import { useNow, useProtocol } from '../lib/protocol';
import { STATUS, formatDateTime, updateReminder, useReminders } from '../lib/reminders';
import fifo from '../assets/fifo.webp';
import './Topbar.css';

function greeting(hour) {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function BellMenu({ open, onClose, items, companies, agentName, onSeeAll }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.parentElement.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bell-menu" ref={ref} role="dialog" aria-label="Recordatorios abiertos">
      <div className="bell-menu__head">
        <strong>Recordatorios abiertos</strong>
        <span>{items.length}</span>
      </div>
      {items.length ? (
        <ul className="bell-menu__list">
          {items.slice(0, 6).map((r, i) => {
            const company = companies.find((c) => c.slug === r.company_slug);
            const next = r.status === 'pending' ? 'en_proceso' : 'listo';
            return (
              <li key={r.id} className="bell-menu__item" style={{ '--co': company?.color_primary || 'var(--moon)', '--i': i }}>
                <div className="bell-menu__top">
                  <span>{company ? shortCompanyName(company.name) : 'General'}</span>
                  <span className="bell-menu__status" style={{ color: STATUS[r.status]?.color }}>
                    {STATUS[r.status]?.label}
                  </span>
                </div>
                <p className="bell-menu__text">{r.text}</p>
                <div className="bell-menu__foot">
                  <span>{formatDateTime(r.created_at)}</span>
                  <button type="button" className="sf-chip" onClick={() => updateReminder(r.id, { status: next }, agentName)}>
                    {next === 'listo' ? 'Marcar listo' : 'Empezar'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="bell-menu__empty">Todo al día. No hay recordatorios abiertos.</p>
      )}
      <button type="button" className="bell-menu__all" onClick={onSeeAll}>
        Ver tablero completo
      </button>
    </div>
  );
}

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { companies } = useCatalog();
  const { items } = useReminders();
  const { overdue } = useProtocol();
  const now = useNow(15000);
  const [bellOpen, setBellOpen] = useState(false);
  const open = items.filter((r) => r.status === 'pending' || r.status === 'en_proceso');
  const firstName = (user?.displayName || '').split(' ')[0];
  const lastCount = useRef(open.length);
  const [ring, setRing] = useState(0);

  useEffect(() => {
    if (open.length > lastCount.current) setRing((n) => n + 1);
    lastCount.current = open.length;
  }, [open.length]);

  useEffect(() => {
    const onRing = () => setRing((n) => n + 1);
    window.addEventListener('ccs-reminder-ring', onRing);
    return () => window.removeEventListener('ccs-reminder-ring', onRing);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && location.pathname !== '/precios') {
        e.preventDefault();
        navigate('/precios');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [location.pathname, navigate]);

  return (
    <header className="topbar">
      <div className="topbar__hello">
        <span className="topbar__greet">
          {greeting(now.getHours())}
          {firstName ? `, ${firstName}` : ''}
        </span>
        <span className="topbar__time">
          {now.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}, {now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <nav className="topbar__actions" aria-label="Accesos rápidos">
        <button type="button" className="topbar__search" onClick={() => navigate('/precios')}>
          <SearchIcon size={18} />
          <span>Buscar precio</span>
          <kbd>/</kbd>
        </button>

        <button type="button" className="topbar__btn" onClick={() => navigate('/resumen-del-dia')} aria-label="Resumen del día" data-tip="Resumen del día">
          <NoteIcon size={20} />
        </button>

        <button type="button" className="topbar__btn" onClick={() => navigate('/protocolo')} aria-label={`Protocolo del día, ${overdue} atrasadas`} data-tip="Protocolo del día">
          <ClockIcon size={20} className={overdue ? 'topbar__tick' : undefined} />
          {overdue > 0 && (
            <span key={overdue} className="topbar__badge topbar__badge--warn">
              {overdue}
            </span>
          )}
        </button>

        <button type="button" className="topbar__btn topbar__btn--fifo" onClick={() => navigate('/asistente')} aria-label="Preguntarle a Fifo" data-tip="Pregúntale a Fifo">
          <img src={fifo} alt="" />
        </button>

        <div className="topbar__bell-wrap">
          <button
            type="button"
            className={bellOpen ? 'topbar__btn is-open' : 'topbar__btn'}
            onClick={() => setBellOpen((o) => !o)}
            aria-label={`Recordatorios, ${open.length} abiertos`}
            aria-expanded={bellOpen}
          >
            <BellIcon key={ring} size={21} className={open.length ? 'topbar__bell is-ringing' : 'topbar__bell'} />
            {open.length > 0 && (
              <span key={open.length} className="topbar__badge">
                {open.length}
              </span>
            )}
          </button>
          <BellMenu
            open={bellOpen}
            onClose={() => setBellOpen(false)}
            items={open}
            companies={companies}
            agentName={user?.displayName}
            onSeeAll={() => {
              setBellOpen(false);
              navigate('/recordatorios');
            }}
          />
        </div>
      </nav>
    </header>
  );
}
