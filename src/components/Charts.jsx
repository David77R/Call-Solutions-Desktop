import { mix, PANEL } from '../lib/color';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import './Charts.css';

export function Donut({ value, total, color, size = 84, label }) {
  const pct = total > 0 ? value / total : 0;
  const animated = useAnimatedNumber(pct, 900);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={mix(color, PANEL, 0.7)} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - animated)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="donut__value">{Math.round(animated * 100)}%</span>
    </div>
  );
}

export function TrendBars({ data, color, title }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="trend">
      {title && <figcaption className="trend__title">{title}</figcaption>}
      <div className="trend__bars" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
        {data.map((d, i) => (
          <div key={d.label + i} className="trend__col">
            <span className="trend__num">{d.value}</span>
            <span className="trend__bar" style={{ height: `${(d.value / max) * 100}%`, background: color, animationDelay: `${i * 70}ms` }} />
            <span className="trend__label">{d.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function CountUp({ value }) {
  return <>{Math.round(useAnimatedNumber(value, 800))}</>;
}
