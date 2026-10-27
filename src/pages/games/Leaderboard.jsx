import { useLeaderboard } from '../../lib/games';

export default function Leaderboard({ agentName }) {
  const rows = useLeaderboard();
  const podium = rows.slice(0, 3);
  const order = [1, 0, 2].filter((i) => podium[i]);

  if (!rows.length) {
    return <p className="lb__empty">Nadie ha jugado esta semana. ¡Sé el primero en el podio!</p>;
  }

  return (
    <div className="lb">
      <div className="lb__podium">
        {order.map((i) => (
          <div key={podium[i].name} className={`lb__step lb__step--${i + 1}`} style={{ '--i': i }}>
            <span className="lb__medal">{i + 1}</span>
            <span className="lb__name">{podium[i].name}</span>
            <span className="lb__pts">{podium[i].total} pts</span>
            <span className="lb__block" />
          </div>
        ))}
      </div>
      <table className="lb__table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Agente</th>
            <th scope="col">Trivia</th>
            <th scope="col">Laberinto</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className={r.name === agentName ? 'is-me' : ''} style={{ '--i': Math.min(i, 14) }}>
              <td>{i + 1}</td>
              <td>{r.name}</td>
              <td>{r.trivia}</td>
              <td>{r.maze}</td>
              <td>
                <strong>{r.total}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lb__note">Se reinicia cada lunes. Suma los puntos de la app móvil y de escritorio.</p>
    </div>
  );
}
