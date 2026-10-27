import { useMemo, useState } from 'react';
import AgentLine from './AgentLine';
import fifo from '../../assets/fifo.webp';

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQuestions(script, resolve) {
  const agentTexts = [...new Set(script.filter((s) => s.speaker === 'agent').map(resolve))];
  const questions = [];
  for (let i = 1; i < script.length; i++) {
    const step = script[i];
    const prev = script[i - 1];
    if (step.speaker === 'agent' && prev.speaker === 'customer') {
      const correct = resolve(step);
      const distractors = shuffle(agentTexts.filter((t) => t !== correct)).slice(0, 2);
      questions.push({ prompt: resolve(prev), correct, options: shuffle([correct, ...distractors]) });
    }
  }
  return questions;
}

export default function QuizView({ script, resolve, lang }) {
  const [round, setRound] = useState(0);
  const questions = useMemo(() => buildQuestions(script, resolve), [script, resolve, round]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  if (!questions.length) return <p className="quiz__empty">Este escenario no tiene preguntas para practicar.</p>;

  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setMistakes(0);
  };

  if (index >= questions.length) {
    const perfect = mistakes === 0;
    return (
      <div className="quiz__end">
        <img src={fifo} alt="" className="quiz__fifo" />
        <p className="quiz__end-title">{perfect ? '¡Ronda perfecta!' : 'Ronda terminada'}</p>
        <p className="quiz__end-body">
          {score} de {questions.length} respuestas correctas al primer intento.
        </p>
        <button type="button" className="flow-btn" onClick={restart}>
          Otra ronda
        </button>
      </div>
    );
  }

  const q = questions[index];
  const answered = picked === q.correct;

  const choose = (option) => {
    if (answered) return;
    setPicked(option);
    if (option === q.correct) {
      if (picked === null) setScore((s) => s + 1);
      setTimeout(() => {
        setIndex((i) => i + 1);
        setPicked(null);
      }, 900);
    } else {
      setMistakes((m) => m + 1);
    }
  };

  return (
    <div className="quiz" key={index}>
      <div className="quiz__meta">
        <span>
          Pregunta {index + 1} de {questions.length}
        </span>
        <span className="quiz__dots" aria-hidden="true">
          {questions.map((_, i) => (
            <span key={i} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
          ))}
        </span>
      </div>
      <div className="bubble bubble--customer quiz__prompt">
        <span className="bubble__who">{lang === 'en' ? 'Customer says' : 'El cliente dice'}</span>
        <p className="bubble__text">{q.prompt}</p>
      </div>
      <p className="quiz__ask">¿Qué le respondes?</p>
      <div className="quiz__options">
        {q.options.map((option, i) => {
          const state = picked === option ? (option === q.correct ? 'is-right' : 'is-wrong') : '';
          return (
            <button key={option} type="button" className={`quiz__option ${state}`} style={{ '--i': i }} onClick={() => choose(option)} disabled={answered}>
              <AgentLine text={option} lang={lang} plain />
            </button>
          );
        })}
      </div>
    </div>
  );
}
