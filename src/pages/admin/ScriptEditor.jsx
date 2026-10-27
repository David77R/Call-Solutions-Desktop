import { useState } from 'react';
import SaveBar, { useSaver } from './SaveBar';
import { saveCallFlow } from '../../lib/admin';

const clone = (v) => JSON.parse(JSON.stringify(v));

function StepEditor({ step, onChange }) {
  return (
    <div className={step.speaker === 'agent' ? 'step-ed step-ed--agent' : 'step-ed'}>
      <span className="step-ed__who">{step.speaker === 'agent' ? 'Agente' : 'Cliente'}</span>
      <div className="desc-entry__langs">
        {['en', 'es'].map((lang) => (
          <label key={lang} className="sf-field">
            <span>{lang === 'en' ? 'English' : 'Español'}</span>
            <textarea className="sf-input sf-textarea" value={step[lang] || ''} onChange={(e) => onChange({ ...step, [lang]: e.target.value })} />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ScriptEditor({ flow }) {
  const [draft, setDraft] = useState(() => clone(flow));
  const [part, setPart] = useState('greeting');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const save = useSaver(saveCallFlow);
  const dirty = JSON.stringify(draft) !== JSON.stringify(flow);

  return (
    <div className="admin-block">
      <p className="admin-hint">Usa {'{{company}}'} donde va el nombre de la empresa y "" donde el agente dice un precio.</p>
      <div className="admin-scope" role="group" aria-label="Parte del guion">
        <button type="button" className="sf-chip" aria-pressed={part === 'greeting'} onClick={() => setPart('greeting')}>
          Saludo
        </button>
        {draft.branches.map((b, bi) => (
          <button key={b.key} type="button" className="sf-chip" aria-pressed={part === bi} onClick={() => setPart(bi)}>
            {b.title}
          </button>
        ))}
        <button type="button" className="sf-chip" aria-pressed={part === 'closing'} onClick={() => setPart('closing')}>
          Cierre
        </button>
      </div>

      {part === 'greeting' && <StepEditor step={draft.greeting} onChange={(s) => setDraft((d) => ({ ...d, greeting: s }))} />}
      {typeof part === 'number' &&
        draft.branches[part].steps.map((step, si) => (
          <StepEditor
            key={`${part}-${si}`}
            step={step}
            onChange={(s) =>
              setDraft((d) => {
                const next = clone(d);
                next.branches[part].steps[si] = s;
                return next;
              })
            }
          />
        ))}
      {part === 'closing' &&
        draft.closing.map((step, si) => (
          <StepEditor
            key={`c-${si}`}
            step={step}
            onChange={(s) =>
              setDraft((d) => {
                const next = clone(d);
                next.closing[si] = s;
                return next;
              })
            }
          />
        ))}
      <SaveBar dirty={dirty} status={status} error={error} onDiscard={() => setDraft(clone(flow))} onSave={() => save(setStatus, setError, draft)} />
    </div>
  );
}
