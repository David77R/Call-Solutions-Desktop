import { useState } from 'react';
import { generateTrivia } from '../../lib/trivia';
import { saveTriviaScore } from '../../lib/games';
import fifo from '../../assets/fifo.png';

const COUNT = 8;

export default function TriviaGame({ companies, rosters, agentName }) {
  const [phase, setPhase] = useState('start');
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);

  const start = () => {
    setQuestions(generateTrivia(companies, rosters, COUNT));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setPhase('playing');
  };

  const q = questions[index];

  const choose = (id) => {
    if (picked) return;
    setPicked(id);
    if (id === q.correctOptionId) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setPicked(null);
    } else {
      setPhase('done');
      saveTriviaScore(agentName, score, questions.length);
    }
  };

  if (phase === 'start') {
    return (
      <div className="game-intro">
        <img src={fifo} alt="" className="game-intro__fifo" />
        <h2>Trivia de Fifo</h2>
        <p>{COUNT} preguntas rápidas sobre precios, recargos y groomers, armadas con el catálogo real. Cada acierto suma un punto al leaderboard de la semana.</p>
        <button type="button" className="game-btn" onClick={start} disabled={!companies.length}>
          Empezar
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="game-intro">
        <img src={fifo} alt="" className="game-intro__fifo game-intro__fifo--party" />
        <h2>{pct >= 80 ? '¡Eres una máquina!' : pct >= 50 ? 'Bien jugado' : 'A repasar el catálogo'}</h2>
        <p className="game-score">
          {score} / {questions.length}
        </p>
        <p>{score > 0 ? `Sumaste ${score} ${score === 1 ? 'punto' : 'puntos'} al leaderboard.` : 'Esta vez no sumaste puntos.'}</p>
        <button type="button" className="game-btn" onClick={start}>
          Jugar otra vez
        </button>
      </div>
    );
  }

  return (
    <div className="trivia" key={index}>
      <div className="trivia__meta">
        <span>
          Pregunta {index + 1} de {questions.length}
        </span>
        <span className="trivia__score">{score} pts</span>
      </div>
      <div className="trivia__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${(index + (picked ? 1 : 0)) / questions.length})` }} />
      </div>
      <h3 className="trivia__prompt">{q.prompt}</h3>
      <div className="trivia__options">
        {q.options.map((o, i) => {
          const state = picked ? (o.id === q.correctOptionId ? 'is-right' : o.id === picked ? 'is-wrong' : 'is-off') : '';
          return (
            <button key={o.id} type="button" className={`trivia__option ${state}`} style={{ '--i': i }} onClick={() => choose(o.id)} disabled={!!picked}>
              <span className="trivia__letter">{o.id.toUpperCase()}</span>
              {o.text}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="trivia__feedback">
          <p>
            <strong>{picked === q.correctOptionId ? '¡Correcto! ' : 'Casi. '}</strong>
            {q.explanation}
          </p>
          <button type="button" className="game-btn" onClick={next} autoFocus>
            {index + 1 < questions.length ? 'Siguiente' : 'Ver resultado'}
          </button>
        </div>
      )}
    </div>
  );
}
