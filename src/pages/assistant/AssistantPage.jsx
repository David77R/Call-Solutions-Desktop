import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { CheckIcon, CopyIcon } from '../../components/Icons';
import fifo from '../../assets/fifo.png';
import './AssistantPage.css';

const API_URL = import.meta.env.VITE_AI_URL || 'https://cccs-ai-backend.vercel.app/api/chat';
const STORAGE_KEY = 'ccs_assistant_chat_v1';
const SUGGESTIONS = [
  '¿Cuánto cobra Famous por un Husky de 70 lbs?',
  '¿Qué recargo tiene Mayami por un Poodle?',
  'Tengo una queja de un cliente',
  '¿Qué incluye el Full Grooming de Cute Paws?',
];

function readHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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

function Message({ msg, index }) {
  const [copied, setCopied] = useState(false);
  const isFifo = msg.role === 'assistant';
  return (
    <div className={isFifo ? 'msg msg--fifo' : 'msg msg--me'} style={{ '--i': index }}>
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
    </div>
  );
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(readHistory);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const firstName = (user?.displayName || '').split(' ')[0];

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      return;
    }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  const send = async (text) => {
    const content = text.trim();
    if (!content || thinking) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setThinking(true);
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history: next.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Fifo no pudo responder. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="assistant">
      <header className="assistant__head">
        <img src={fifo} alt="" className="assistant__fifo" />
        <div>
          <h1 className="assistant__title">Pregúntale a Fifo</h1>
          <p className="assistant__sub">Precios, recargos, políticas y quejas de las 6 empresas. Responde con el catálogo oficial.</p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="sf-chip assistant__clear" onClick={() => setMessages([])}>
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
        {messages.map((m, i) => (
          <Message key={i} msg={m} index={0} />
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
        {error && <p className="assistant__error">{error}</p>}
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
        <button type="submit" disabled={!input.trim() || thinking}>
          Enviar
        </button>
      </form>
    </div>
  );
}
