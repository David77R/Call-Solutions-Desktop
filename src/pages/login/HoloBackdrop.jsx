import { US_BORDERS, US_NATION, US_PINS, US_VIEWBOX } from '../../data/usMap';

export default function HoloBackdrop() {
  return (
    <div className="holo" aria-hidden="true">
      <div className="holo__pets" />
      <svg className="holo__map" viewBox={US_VIEWBOX} preserveAspectRatio="xMidYMid meet">
        <path className="holo__nation" d={US_NATION} pathLength="1" />
        <path className="holo__borders" d={US_BORDERS} />
        {US_PINS.map((pin, i) => (
          <g key={pin.id} className="holo__pin" style={{ '--i': i }}>
            <circle cx={pin.x} cy={pin.y} r="22" className="holo__pin-ring" />
            <circle cx={pin.x} cy={pin.y} r="22" className="holo__pin-ring holo__pin-ring--late" />
            <circle cx={pin.x} cy={pin.y} r="5" className="holo__pin-dot" />
            <text x={pin.side === 'right' ? pin.x + 12 : pin.x - 12} y={pin.y + 4} textAnchor={pin.side === 'right' ? 'start' : 'end'} className="holo__pin-label">
              {pin.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="holo__grid" />
      <div className="holo__scan" />
      <div className="holo__vignette" />
    </div>
  );
}
