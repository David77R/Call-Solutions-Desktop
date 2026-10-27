import { useEffect, useState } from 'react';
import AgentLine from './AgentLine';

function Typewriter({ text }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(text.length);
      return undefined;
    }
    setCount(0);
    const step = Math.max(1, Math.round(text.length / 60));
    const timer = setInterval(() => {
      setCount((c) => {
        if (c + step >= text.length) {
          clearInterval(timer);
          return text.length;
        }
        return c + step;
      });
    }, 18);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <>
      {text.slice(0, count)}
      {count < text.length && <span className="bubble__caret" aria-hidden="true" />}
    </>
  );
}

export default function Bubble({ step, text, lang, typing, index = 0 }) {
  const isAgent = step.speaker === 'agent';
  return (
    <div className={isAgent ? 'bubble bubble--agent' : 'bubble bubble--customer'} style={{ '--i': index }}>
      <span className="bubble__who">{isAgent ? (lang === 'en' ? 'You' : 'Tú') : lang === 'en' ? 'Customer' : 'Cliente'}</span>
      <p className="bubble__text">{isAgent ? <AgentLine text={text} lang={lang} /> : typing ? <Typewriter text={text} /> : text}</p>
    </div>
  );
}
