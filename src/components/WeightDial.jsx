import { mix, PANEL, readableOn } from '../lib/color';
import { titleCase } from '../lib/search';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import './WeightDial.css';

const MAX_LBS = 150;
const CX = 300;
const CY = 300;
const BAND_R = 222;
const BAND_W = 56;
const RANGE_R = 268;
const TICK_OUTER = 180;
const NEEDLE_INNER = 150;
const NEEDLE_OUTER = 262;

function point(value, r) {
  const t = ((180 - (Math.min(value, MAX_LBS) / MAX_LBS) * 180) * Math.PI) / 180;
  return [CX + r * Math.cos(t), CY - r * Math.sin(t)];
}

function arc(from, to, r) {
  const [x0, y0] = point(from, r);
  const [x1, y1] = point(to, r);
  const large = ((to - from) / MAX_LBS) * 180 > 180 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

function bandShades(color, count) {
  return Array.from({ length: count }, (_, i) => {
    const ratio = count === 1 ? 0 : 0.62 * (1 - i / (count - 1));
    return mix(color, PANEL, ratio);
  });
}

export default function WeightDial({ bands, color, weight, breed, companyKey }) {
  const visibleBands = bands.filter((b) => b.min < MAX_LBS);
  const shades = bandShades(color, visibleBands.length);
  const lastMax = visibleBands.length ? Math.min(MAX_LBS, visibleBands[visibleBands.length - 1].max) : 0;
  const hasWeight = weight != null;
  const animatedWeight = useAnimatedNumber(hasWeight ? weight : breed ? (breed.min + breed.max) / 2 : 0, 900);
  const angle = (Math.min(hasWeight ? weight : 0, MAX_LBS) / MAX_LBS) * 180;
  const currentBand = hasWeight ? visibleBands.find((b) => weight >= b.min && weight <= b.max) : null;
  const outOfRange = hasWeight && breed && (weight < breed.min || weight > breed.max);
  const breedName = breed ? titleCase(breed.breed) : null;

  const description = [
    hasWeight ? `Peso indicado ${weight} libras${currentBand ? `, talla ${currentBand.name}` : ''}.` : '',
    breed ? `Rango típico de ${breedName}: ${breed.min} a ${breed.max} libras.` : '',
  ].join(' ');

  return (
    <figure className="weight-dial" style={{ '--dial-accent': color }}>
      <svg viewBox="0 0 600 316" className="weight-dial__svg" role="img" aria-label={description}>
        <g key={companyKey} fill="none" strokeWidth={BAND_W}>
          {visibleBands.map((band, i) => (
            <path
              key={`${band.name}-${band.min}`}
              d={arc(band.min === 0 ? 0 : band.min + 0.5, Math.min(band.max, MAX_LBS) - 0.5, BAND_R)}
              stroke={shades[i]}
              pathLength="1"
              className={currentBand === band ? 'weight-dial__band is-current' : 'weight-dial__band'}
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
          {lastMax < MAX_LBS && (
            <path
              d={arc(lastMax + 0.5, MAX_LBS, BAND_R)}
              stroke="#17165c"
              pathLength="1"
              className="weight-dial__band"
              style={{ animationDelay: `${visibleBands.length * 70}ms` }}
            />
          )}
        </g>

        <g key={`${companyKey}-labels`} className="weight-dial__labels">
          {visibleBands.map((band, i) => {
            const span = Math.min(band.max, MAX_LBS) - band.min;
            if (span < 8) return null;
            const [x, y] = point(band.min + span / 2, BAND_R);
            const label = band.name === 'Extra Large' && span < 25 ? 'XL' : band.name;
            return (
              <text key={band.name + band.min} x={x} y={y} fill={readableOn(shades[i])} style={{ animationDelay: `${300 + i * 70}ms` }}>
                {label}
              </text>
            );
          })}
        </g>

        <g className="weight-dial__ticks">
          {Array.from({ length: 16 }, (_, i) => {
            const v = i * 10;
            const [x1, y1] = point(v, TICK_OUTER);
            const [x2, y2] = point(v, v % 50 === 0 ? TICK_OUTER - 16 : TICK_OUTER - 8);
            return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        <g className="weight-dial__scale">
          {[0, 50, 100, 150].map((v) => {
            const [x, y] = point(v, 146);
            return (
              <text key={v} x={x} y={v === 0 || v === 150 ? y - 10 : y}>
                {v}
              </text>
            );
          })}
        </g>

        {breed && (
          <g className="weight-dial__range" key={`${breed.breed}-${breed.min}`}>
            <path d={arc(breed.min, Math.min(breed.max, MAX_LBS), RANGE_R)} pathLength="1" />
            <line x1={point(breed.min, RANGE_R)[0]} y1={point(breed.min, RANGE_R)[1]} x2={point(breed.min, RANGE_R - 12)[0]} y2={point(breed.min, RANGE_R - 12)[1]} />
            <line
              x1={point(Math.min(breed.max, MAX_LBS), RANGE_R)[0]}
              y1={point(Math.min(breed.max, MAX_LBS), RANGE_R)[1]}
              x2={point(Math.min(breed.max, MAX_LBS), RANGE_R - 12)[0]}
              y2={point(Math.min(breed.max, MAX_LBS), RANGE_R - 12)[1]}
            />
          </g>
        )}

        <g className={hasWeight ? 'weight-dial__needle is-on' : 'weight-dial__needle'} style={{ transform: `rotate(${angle}deg)` }}>
          <line x1={CX - NEEDLE_INNER} y1={CY} x2={CX - NEEDLE_OUTER} y2={CY} />
          <circle cx={CX - NEEDLE_OUTER} cy={CY} r="7" />
        </g>

        <text x={CX} y={CY - 44} className="weight-dial__readout">
          {hasWeight ? `${Math.round(animatedWeight)} lbs` : breed ? `${breed.min}–${breed.max}` : '—'}
        </text>
        <text x={CX} y={CY - 12} className="weight-dial__size">
          {hasWeight ? (currentBand ? `Talla ${currentBand.name}` : 'Fuera de las tallas de la lista') : breed ? 'lbs típicos de la raza' : ''}
        </text>
      </svg>

      {breed && (
        <figcaption className={outOfRange ? 'weight-dial__caption is-warning' : 'weight-dial__caption'}>
          {outOfRange
            ? `El cliente dice ${weight} lbs, pero un ${breedName} suele pesar entre ${breed.min} y ${breed.max}. Confirma el peso antes de cotizar.`
            : hasWeight
              ? `${weight} lbs está dentro del rango típico de un ${breedName}.`
              : `Un ${breedName} suele pesar entre ${breed.min} y ${breed.max} lbs. Pregunta el peso exacto para afinar la talla.`}
        </figcaption>
      )}
    </figure>
  );
}
