import { useCallback, useMemo, useState } from 'react';
import CompanyTabs from '../../components/CompanyTabs';
import Bubble from './Bubble';
import SimulateView from './SimulateView';
import QuizView from './QuizView';
import { useCallFlow } from '../../lib/useCallFlow';
import { useCatalog } from '../../lib/useCatalog';
import { useAuth } from '../../lib/AuthContext';
import { accentTokens } from '../../lib/color';
import './CallFlowPage.css';

const MODES = [
  { key: 'script', label: 'Guion completo' },
  { key: 'simulate', label: 'Simular llamada' },
  { key: 'quiz', label: 'Modo prueba' },
];

export default function CallFlowPage() {
  const flow = useCallFlow();
  const { companies } = useCatalog();
  const { user } = useAuth();
  const [companySlug, setCompanySlug] = useState(null);
  const [branchKey, setBranchKey] = useState(null);
  const [mode, setMode] = useState('script');
  const [lang, setLang] = useState('en');

  const company = companies.find((c) => c.slug === companySlug) || companies[0] || null;
  const branch = flow.branches.find((b) => b.key === branchKey) || flow.branches[0];
  const agentFirstName = (user?.displayName || '').trim().split(/\s+/)[0] || 'David';
  const companyName = company?.name || (lang === 'en' ? 'our company' : 'nuestra empresa');

  const script = useMemo(() => [flow.greeting, ...(branch?.steps || []), ...flow.closing], [flow, branch]);
  const resolve = useCallback(
    (step) => (step[lang] || step.en || '').replaceAll('{{company}}', companyName).replace(/\bDavid\b/g, agentFirstName),
    [lang, companyName, agentFirstName]
  );

  const modeIndex = MODES.findIndex((m) => m.key === mode);
  const stageKey = `${branch?.key}-${mode}-${lang}-${company?.slug}`;

  return (
    <div className="flow" style={accentTokens(company?.color_primary)}>
      <div className="flow__top">
        <CompanyTabs companies={companies} activeSlug={company?.slug ?? null} onChange={(slug) => slug && setCompanySlug(slug)} showAll={false} />
        <div className="seg seg--lang" role="group" aria-label="Idioma del guion">
          <span className="seg__thumb" style={{ transform: lang === 'es' ? 'translateX(100%)' : 'none' }} aria-hidden="true" />
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
          <button type="button" aria-pressed={lang === 'es'} onClick={() => setLang('es')}>
            Español
          </button>
        </div>
      </div>

      <div className="flow__layout">
        <aside className="flow__side">
          <h2 className="flow__side-title">Escenario</h2>
          <div className="flow__branches">
            {flow.branches.map((b, i) => (
              <button
                key={b.key}
                type="button"
                className={b.key === branch?.key ? 'branch is-active' : 'branch'}
                style={{ '--i': i }}
                onClick={() => setBranchKey(b.key)}
              >
                <span className="branch__title">{b.title}</span>
                <span className="branch__meta">{b.steps.length + flow.closing.length + 1} intervenciones</span>
              </button>
            ))}
          </div>

          <h2 className="flow__side-title">Cómo quieres verlo</h2>
          <div className="seg seg--modes" role="tablist" aria-label="Modo">
            <span className="seg__thumb" style={{ transform: `translateY(${modeIndex * 100}%)` }} aria-hidden="true" />
            {MODES.map((m) => (
              <button key={m.key} type="button" role="tab" aria-selected={m.key === mode} onClick={() => setMode(m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          <p className="flow__note">
            Donde veas <mark className="flow-price">{lang === 'en' ? 'price' : 'precio'}</mark>, di el precio que te da la pantalla de Precios.
          </p>
        </aside>

        <section className="flow__stage" key={stageKey} aria-live="polite">
          {mode === 'script' && (
            <div className="conversation">
              {script.map((step, i) => (
                <Bubble key={i} step={step} text={resolve(step)} lang={lang} index={Math.min(i, 16)} />
              ))}
            </div>
          )}
          {mode === 'simulate' && <SimulateView script={script} resolve={resolve} lang={lang} />}
          {mode === 'quiz' && <QuizView script={script} resolve={resolve} lang={lang} />}
        </section>
      </div>
    </div>
  );
}
