import { useState } from 'react';
import PricesEditor from './PricesEditor';
import DescriptionsEditor from './DescriptionsEditor';
import ScriptEditor from './ScriptEditor';
import RostersEditor from './RostersEditor';
import MessagesEditor from './MessagesEditor';
import CompanyTabs from '../../components/CompanyTabs';
import { useCatalog } from '../../lib/useCatalog';
import { useServiceDescriptionsSync } from '../../lib/useServiceDescriptions';
import { useCallFlow } from '../../lib/useCallFlow';
import { useGroomerRosters } from '../../lib/useGroomerRosters';
import { useMessageTemplates } from '../../lib/messageTemplates';
import { useAgents } from '../../lib/admin';
import { accentTokens } from '../../lib/color';
import { agentInitials } from '../../lib/agents';
import '../summary/Summary.css';
import './AdminPage.css';

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '';
const SESSION_KEY = 'ccs_admin_unlocked';

const TABS = [
  { key: 'prices', label: 'Precios' },
  { key: 'descriptions', label: 'Descripciones' },
  { key: 'script', label: 'Guion de llamada' },
  { key: 'messages', label: 'Mensajes' },
  { key: 'rosters', label: 'Groomers' },
  { key: 'agents', label: 'Agentes' },
];

function readUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'yes';
  } catch {
    return false;
  }
}

function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [visible, setVisible] = useState(false);

  if (!ADMIN_PIN) {
    return (
      <div className="pin">
        <h1 className="pin__title">Administración</h1>
        <p className="pin__body">Falta configurar el PIN. Agrega la variable VITE_ADMIN_PIN en .env.local y en Vercel.</p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      try {
        sessionStorage.setItem(SESSION_KEY, 'yes');
      } catch {
        setWrong(false);
      }
      onUnlock();
    } else {
      setWrong(true);
      setPin('');
    }
  };

  return (
    <form className={wrong ? 'pin is-wrong' : 'pin'} onSubmit={submit} onAnimationEnd={() => setWrong(false)}>
      <span className="pin__lock" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <h1 className="pin__title">Panel de administración</h1>
      <p className="pin__body">Escribe el PIN de supervisor para continuar.</p>
      <label htmlFor="admin-pin" className="sf-sr">
        PIN
      </label>
      <div className="pin__field">
        <input id="admin-pin" className="sf-input pin__input" type={visible ? 'text' : 'password'} autoFocus autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
        <button type="button" className="pin__eye" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar PIN' : 'Mostrar PIN'} aria-pressed={visible}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            <path className={visible ? 'pin__slash' : 'pin__slash is-on'} d="M4 4l16 16" />
          </svg>
        </button>
      </div>
      {wrong && <p className="pin__error">PIN incorrecto.</p>}
      <button type="submit" className="pin__submit" disabled={!pin}>
        Entrar
      </button>
    </form>
  );
}

function Agents() {
  const { agents, error, loading } = useAgents();
  if (error === 'permission-denied') {
    return (
      <p className="co-card__issue">
        Las reglas de Firestore no dejan leer la colección "agents". Hay que agregarla a las reglas en la consola de Firebase para que aparezcan los agentes y se guarden las fotos de perfil.
      </p>
    );
  }
  if (error) return <p className="co-card__issue">No se pudo cargar la lista de agentes ({error}).</p>;
  if (loading) return <p className="admin-hint">Cargando agentes…</p>;
  return (
    <ul className="agents">
      {agents.map((a, i) => (
        <li key={a.id} className="agents__item" style={{ '--i': Math.min(i, 14) }}>
          {a.photo ? <img src={a.photo} alt="" className="agents__photo" /> : <span className="agents__initials">{agentInitials({ displayName: a.displayName })}</span>}
          <span className="agents__name">{a.displayName}</span>
          <span className="agents__meta">{a.createdAt?.toDate ? `Desde ${a.createdAt.toDate().toLocaleDateString('es-VE')}` : ''}</span>
        </li>
      ))}
      {!agents.length && <li className="admin-hint">Todavía no hay agentes registrados.</li>}
    </ul>
  );
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [tab, setTab] = useState('prices');
  const [slug, setSlug] = useState(null);
  const { companies } = useCatalog();
  const { descriptions, missing } = useServiceDescriptionsSync();
  const flow = useCallFlow();
  const rosters = useGroomerRosters();
  const { items: templates } = useMessageTemplates();
  const company = companies.find((c) => c.slug === slug) || companies[0] || null;

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  const needsCompany = tab === 'prices' || tab === 'rosters';

  return (
    <div className="admin" style={accentTokens(needsCompany ? company?.color_primary : null)}>
      <div className="admin__head">
        <h1 className="admin__title">Administración</h1>
        <button
          type="button"
          className="sf-chip"
          onClick={() => {
            try {
              sessionStorage.removeItem(SESSION_KEY);
            } catch {
              setUnlocked(false);
            }
            setUnlocked(false);
          }}
        >
          Bloquear panel
        </button>
      </div>

      <div className="admin__tabs" role="tablist" aria-label="Secciones de administración">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {needsCompany && <CompanyTabs companies={companies} activeSlug={company?.slug ?? null} onChange={(s) => s && setSlug(s)} showAll={false} />}

      <div className="admin__panel" key={`${tab}-${needsCompany ? company?.slug : ''}`}>
        {tab === 'prices' && company && <PricesEditor key={company.slug + JSON.stringify(company).length} company={company} />}
        {tab === 'descriptions' && <DescriptionsEditor key={JSON.stringify(descriptions).length} descriptions={descriptions} missing={missing} companies={companies} />}
        {tab === 'script' && <ScriptEditor key={JSON.stringify(flow).length} flow={flow} />}
        {tab === 'messages' && <MessagesEditor key={JSON.stringify(templates).length} items={templates} />}
        {tab === 'rosters' && company && <RostersEditor key={company.slug + (rosters[company.slug] || []).join()} company={company} names={rosters[company.slug] || []} />}
        {tab === 'agents' && <Agents />}
      </div>
    </div>
  );
}
