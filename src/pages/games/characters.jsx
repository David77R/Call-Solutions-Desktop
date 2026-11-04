import { useEffect, useRef } from 'react';
import { TEAMS } from './catArtillery';
import { drawUnit } from './catArtilleryDraw';

export const CHARACTERS = Object.entries(TEAMS).flatMap(([team, t]) => t.units.map((u, i) => ({ key: `${team}:${i}`, team, kind: t.kind, name: u.name, colors: u })));
export const charOf = (key) => CHARACTERS.find((c) => c.key === key) || CHARACTERS[0];

export function CharFace({ char, size = 54 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size * 0.66);
    ctx.scale(size / 58, size / 58);
    drawUnit(ctx, { x: 0, y: 0, alive: true, flash: 0, face: 1, colors: char.colors }, char.kind, null, false, 0);
  }, [char, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function CharPicker({ label, value, onChange, taken = [] }) {
  return (
    <div className="cats__picker">
      <span className="cats__picker-label">{label}</span>
      <div className="bomb__chars" role="radiogroup" aria-label={label}>
        {CHARACTERS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={value === c.key}
            className="bomb__char"
            disabled={taken.includes(c.key)}
            onClick={() => onChange(c.key)}
            title={`${c.name} (${TEAMS[c.team].name})`}
          >
            <CharFace char={c} />
            <small>{c.name}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
