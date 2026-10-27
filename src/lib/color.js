export const NIGHT = '#050320';
export const PANEL = '#0e0c45';
export const MOON = '#7f97e8';

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function readableOn(hex) {
  return contrast(hex, NIGHT) >= contrast(hex, '#ffffff') ? NIGHT : '#ffffff';
}

export function mix(from, to, ratio) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * ratio));
}

export function accentTokens(hex) {
  const accent = hex || MOON;
  return {
    '--accent': accent,
    '--on-accent': readableOn(accent),
    '--accent-soft': mix(accent, PANEL, 0.72),
    '--accent-text': contrast(accent, PANEL) >= 4.5 ? accent : mix(accent, '#ffffff', 0.45),
  };
}
