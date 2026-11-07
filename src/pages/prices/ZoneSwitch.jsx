import { PinIcon } from '../../components/Icons';

export default function ZoneSwitch({ zones, value, color, onChange }) {
  const index = Math.max(0, zones.indexOf(value));
  return (
    <div className="zone-switch" role="radiogroup" aria-label="Zona de precios" style={{ '--zone-count': zones.length, '--zone-color': color || '#2a9c9b' }}>
      <span className={index === 0 ? 'zone-switch__thumb' : 'zone-switch__thumb is-alt'} style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
      {zones.map((z) => (
        <button key={z} type="button" role="radio" aria-checked={value === z} className="zone-switch__opt" onClick={() => onChange(z)}>
          <PinIcon size={14} />
          {z}
        </button>
      ))}
    </div>
  );
}
