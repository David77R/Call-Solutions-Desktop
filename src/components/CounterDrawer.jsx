import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloseIcon } from './Icons';
import { shortCompanyName } from './CompanyTabs';
import { useAuth } from '../lib/AuthContext';
import { useCatalog } from '../lib/useCatalog';
import { isCombinedMessages } from '../lib/useGroomerRosters';
import { todayKey } from '../lib/summaries';
import { OPEN_COUNTER_EVENT, bump, countsOf, fieldsFor, teamCounts, totalOf, useDayCounters } from '../lib/counters';
import './CounterDrawer.css';

function Tally({ field, mine, team, onAdd, onRemove }) {
  const [pop, setPop] = useState(0);
  return (
    <div className="ctr-tally">
      <span className="ctr-tally__label">{field.short || field.label}</span>
      <div className="ctr-tally__row">
        <button type="button" className="ctr-tally__minus" onClick={onRemove} disabled={!mine} aria-label={`Restar una ${field.one}`}>
          −
        </button>
        <span key={pop} className={pop ? 'ctr-tally__value is-pop' : 'ctr-tally__value'}>
          {mine}
        </span>
        <button
          type="button"
          className="ctr-tally__plus"
          onClick={() => {
            setPop((n) => n + 1);
            onAdd();
          }}
          aria-label={`Sumar una ${field.one}`}
        >
          +1
        </button>
      </div>
      {team > mine && <span className="ctr-tally__team">Equipo: {team}</span>}
    </div>
  );
}

export default function CounterDrawer() {
  const { user } = useAuth();
  const { companies } = useCatalog();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dateKey = todayKey();
  const { bySlug, error } = useDayCounters(dateKey);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e) => {
      if (e.key === 'Escape' && openRef.current) {
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    window.addEventListener(OPEN_COUNTER_EVENT, onOpen);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener(OPEN_COUNTER_EVENT, onOpen);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  const firstName = (user?.displayName || 'Agente').split(' ')[0];
  const myTotal = companies.reduce((sum, c) => sum + totalOf(countsOf(bySlug[c.slug]?.[user?.uid])), 0);

  return (
    <div className={open ? 'ctr is-open' : 'ctr'} aria-hidden={!open}>
      <div className="ctr__backdrop" onClick={() => setOpen(false)} />
      <aside className="ctr__panel" role="dialog" aria-modal="true" aria-label="Contador del turno" inert={!open}>
        <header className="ctr__head">
          <div>
            <h2 className="ctr__title">Mi contador de hoy</h2>
            <p className="ctr__sub">
              Lo que sumes aquí se guarda a tu nombre ({firstName}) y llena tu Resumen del día de cada empresa. Llevas {myTotal} {myTotal === 1 ? 'registro' : 'registros'} hoy.
            </p>
          </div>
          <button type="button" className="ctr__close" onClick={() => setOpen(false)} aria-label="Cerrar contador">
            <CloseIcon size={20} />
          </button>
        </header>

        {error && <p className="ctr__error">No se pudo leer el contador ({error}). Si dice permission-denied, falta la regla de Firestore para dailyCounters.</p>}

        <div className="ctr__list">
          {companies.map((c, i) => {
            const agents = bySlug[c.slug] || {};
            const mine = countsOf(agents[user?.uid]);
            const team = teamCounts(agents);
            const fields = fieldsFor(isCombinedMessages(c.slug));
            return (
              <section key={c.slug} className="ctr-co" style={{ '--co': c.color_primary, '--i': i }}>
                <header className="ctr-co__head">
                  <span className="ctr-co__dot" aria-hidden="true" />
                  <h3>{shortCompanyName(c.name)}</h3>
                  {totalOf(mine) > 0 && <span className="ctr-co__total">{totalOf(mine)}</span>}
                </header>
                <div className="ctr-co__tallies" style={{ '--n': fields.length }}>
                  {fields.map((f) => (
                    <Tally
                      key={f.key}
                      field={f}
                      mine={mine[f.key]}
                      team={team[f.key]}
                      onAdd={() => bump(c.slug, dateKey, user, f.key, 1)}
                      onRemove={() => mine[f.key] > 0 && bump(c.slug, dateKey, user, f.key, -1)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="ctr__foot">
          <button
            type="button"
            className="ctr__summary"
            onClick={() => {
              setOpen(false);
              navigate('/resumen-del-dia');
            }}
          >
            Ir al Resumen del día
          </button>
        </footer>
      </aside>
    </div>
  );
}
