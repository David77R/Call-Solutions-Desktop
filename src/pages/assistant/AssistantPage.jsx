import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { CheckIcon, CopyIcon } from '../../components/Icons';
import fifo from '../../assets/fifo.webp';
import './AssistantPage.css';

const API_URL = import.meta.env.VITE_AI_URL || 'https://cccs-ai-backend.vercel.app/api/chat';
const STORAGE_KEY = 'ccs_assistant_chat_v1';
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_STEPS_MS = [3000, 6000, 12000, 20000, 30000];
const HISTORY_LIMIT = 20;

const newId = () => `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const retryDelay = (attempt) => RETRY_STEPS_MS[Math.min(attempt - 1, RETRY_STEPS_MS.length - 1)];
const SUGGESTIONS = [
  '¿Cuánto cobra Famous por un Husky de 70 lbs?',
  '¿Qué recargo tiene Mayami por un Poodle?',
  'Tengo una queja de un cliente',
  '¿Qué incluye el Full Grooming de Cute Paws?',
];

function readHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((m) => ({ ...m, id: m.id || newId() }));
  } catch {
    return [];
  }
}

function Linkified({ text }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noreferrer">
        {p.includes('tbm=isch') ? 'Ver fotos de la raza' : p}
      </a>
    ) : (
      <span key={i}>{p.replace(/\*\*(.+?)\*\*/g, '$1')}</span>
    )
  );
}

function Message({ msg, index, retryIn, onRetry }) {
  const [copied, setCopied] = useState(false);
  const isFifo = msg.role === 'assistant';
  const waiting = msg.status === 'waiting';
  return (
    <div className={`msg ${isFifo ? 'msg--fifo' : 'msg--me'}${waiting ? ' is-waiting' : ''}`} style={{ '--i': index }}>
      {isFifo && <img src={fifo} alt="" className="msg__avatar" />}
      <div className="msg__bubble">
        <p className="msg__text">
          <Linkified text={msg.content} />
        </p>
        {isFifo && (
          <button
            type="button"
            className="msg__copy"
            onClick={async () => {
              await navigator.clipboard.writeText(msg.content).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>
      {waiting && (
        <div className="msg__standby" role="status">
          <span className="msg__standby-dot" aria-hidden="true" />
          {retryIn > 0 ? `En espera, se envía de nuevo en ${retryIn} s` : 'Enviando de nuevo…'}
          {retryIn > 0 && onRetry && (
            <button type="button" onClick={onRetry}>
              Enviar ahora
            </button>
          )}
        </div>
      )}
    </div>
  );
}

async function askFifo(content, history) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, history }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.reply) throw new Error(data.error || `HTTP ${res.status}`);
    return data.reply;
  } finally {
    clearTimeout(timer);
  }
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(readHistory);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [retryAt, setRetryAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const attemptsRef = useRef(0);
  const messagesRef = useRef(messages);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const firstName = (user?.displayName || '').split(' ')[0];
  const queued = messages.find((m) => m.role === 'user' && (m.status === 'pending' || m.status === 'waiting'));
  const queuedId = queued?.id;

  useEffect(() => {
    messagesRef.current = messages;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      return;
    }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  useEffect(() => {
    if (!retryAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [retryAt]);

  useEffect(() => {
    const retryNow = () => setRetryAt((at) => (at ? Date.now() : at));
    window.addEventListener('online', retryNow);
    return () => window.removeEventListener('online', retryNow);
  }, []);

  useEffect(() => {
    if (!queuedId || thinking) return undefined;
    const wait = retryAt ? Math.max(0, retryAt - Date.now()) : 0;
    const t = setTimeout(async () => {
      const list = messagesRef.current;
      const index = list.findIndex((m) => m.id === queuedId);
      if (index < 0) return;
      const history = list
        .slice(0, index + 1)
        .filter((m) => m.role === 'assistant' || m.status === 'sent' || !m.status || m.id === queuedId)
        .map(({ role, content }) => ({ role, content }))
        .slice(-HISTORY_LIMIT);
      setThinking(true);
      try {
        const reply = await askFifo(list[index].content, history);
        attemptsRef.current = 0;
        setRetryAt(null);
        setMessages((ms) => {
          const at = ms.findIndex((m) => m.id === queuedId);
          if (at < 0) return ms;
          const next = ms.map((m) => (m.id === queuedId ? { ...m, status: 'sent' } : m));
          next.splice(at + 1, 0, { id: newId(), role: 'assistant', content: reply });
          return next;
        });
      } catch {
        attemptsRef.current += 1;
        setMessages((ms) => ms.map((m) => (m.id === queuedId ? { ...m, status: 'waiting' } : m)));
        setRetryAt(Date.now() + retryDelay(attemptsRef.current));
        setNow(Date.now());
      } finally {
        setThinking(false);
      }
    }, wait);
    return () => clearTimeout(t);
  }, [queuedId, thinking, retryAt]);

  const send = (text) => {
    const content = text.trim();
    if (!content) return;
    setMessages((ms) => [...ms, { id: newId(), role: 'user', content, status: 'pending' }]);
    setInput('');
    inputRef.current?.focus();
  };

  const clear = () => {
    attemptsRef.current = 0;
    setRetryAt(null);
    setMessages([]);
  };

  const retryIn = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;

  return (
    <div className="assistant">
      <header className="assistant__head">
        <img src={fifo} alt="" className="assistant__fifo" />
        <div>
          <h1 className="assistant__title">Pregúntale a Fifo</h1>
          <p className="assistant__sub">Precios, recargos, políticas y quejas de las 6 empresas. Responde con el catálogo oficial.</p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="sf-chip assistant__clear" onClick={clear}>
            Nueva conversación
          </button>
        )}
      </header>

      <div className="assistant__chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="assistant__empty">
            <p>{firstName ? `Hola, ${firstName}. ` : ''}¿En qué te ayudo? Prueba con una de estas:</p>
            <div className="assistant__suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={s} type="button" className="suggestion-chip" style={{ '--i': i }} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} msg={m} index={0} retryIn={retryIn} onRetry={() => setRetryAt(Date.now())} />
        ))}
        {thinking && (
          <div className="msg msg--fifo">
            <img src={fifo} alt="" className="msg__avatar" />
            <div className="msg__bubble msg__typing" aria-label="Fifo está escribiendo">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {queued?.status === 'waiting' && (
          <p className="assistant__standby">Fifo no responde en este momento. Tu pregunta queda en espera y se envía sola apenas vuelva la conexión.</p>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="assistant__composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="assistant-input" className="sf-sr">
          Pregunta para Fifo
        </label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          rows={1}
          value={input}
          placeholder="Escribe tu pregunta…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          autoFocus
        />
        <button type="submit" disabled={!input.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
