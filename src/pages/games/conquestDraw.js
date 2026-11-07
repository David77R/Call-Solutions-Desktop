import { BERRY, BUILDINGS, GOLD, GRASS, MH, MW, TILE, TREE, UNITS, VH, VW, WATER, WORLD_H, WORLD_W, buildingMaxHp, idx, unitMaxHp } from './conquestEngine';

const S = 2;
const TAU = Math.PI * 2;
const FURS = [
  { fur: '#f2a65a', dark: '#c97a35', light: '#fde3c4' },
  { fur: '#aab3c2', dark: '#7c8597', light: '#e6eaf0' },
  { fur: '#46424f', dark: '#2b2833', light: '#77728a' },
  { fur: '#f1e3c8', dark: '#cdb994', light: '#fffaf0' },
];
const TRIBE_FURS = {
  gatos: FURS,
  perros: [
    { fur: '#c99a63', dark: '#8f6436', light: '#f3dfbf', ear: '#8f6436' },
    { fur: '#7a5236', dark: '#4f3220', light: '#c9a27a', ear: '#4f3220' },
    { fur: '#f0ebe2', dark: '#c9bfae', light: '#ffffff', ear: '#3a3640' },
    { fur: '#3a3640', dark: '#211f26', light: '#b5794a', ear: '#211f26' },
  ],
  zorros: [
    { fur: '#e9792f', dark: '#b4531c', light: '#fff3e6', ear: '#3a2620' },
    { fur: '#c9542a', dark: '#8e3517', light: '#fde9da', ear: '#2b1c18' },
    { fur: '#ecebe6', dark: '#bdbab2', light: '#ffffff', ear: '#8a8a94' },
    { fur: '#9aa0ab', dark: '#6b717d', light: '#eef0f3', ear: '#3a3d46' },
  ],
  conejos: [
    { fur: '#f4f1ec', dark: '#cfc8bd', light: '#ffffff', ear: '#f6a6b8' },
    { fur: '#b9b1a6', dark: '#8d857a', light: '#ece6dd', ear: '#f6a6b8' },
    { fur: '#9b7653', dark: '#6e5136', light: '#e6d2b8', ear: '#e7a0a8' },
    { fur: '#e9d9bf', dark: '#c4b08e', light: '#fffaf0', ear: '#f6a6b8' },
  ],
  osos: [
    { fur: '#8a5a3c', dark: '#5e3b25', light: '#d8b48c', ear: '#5e3b25' },
    { fur: '#3d3437', dark: '#241e20', light: '#a0928f', ear: '#241e20' },
    {
      fur: '#f4f1ec',
      dark: '#2a2a30',
      light: '#ffffff',
      ear: '#2a2a30',
      panda: true,
    },
    { fur: '#ecebe6', dark: '#c6c3ba', light: '#ffffff', ear: '#c6c3ba' },
  ],
};
let curTribe = 'gatos';
const MINI = {
  [GRASS]: [104, 158, 76],
  [WATER]: [58, 132, 204],
  [TREE]: [38, 96, 48],
  [GOLD]: [232, 196, 72],
  [BERRY]: [196, 72, 112],
};

function hash(n) {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function canvasOf(w, h, scale = S) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  return [c, g];
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function tri(g, a, b, c, fill) {
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.lineTo(c[0], c[1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

function animalHead(g, f, x, y, r = 6.5) {
  if (curTribe === 'perros') {
    g.fillStyle = f.fur;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.9, 0, 0, TAU);
    g.fill();
    g.fillStyle = f.light;
    g.beginPath();
    g.ellipse(x + r * 0.75, y + r * 0.3, r * 0.62, r * 0.45, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#1b1030';
    g.beginPath();
    g.ellipse(x + r * 1.28, y + r * 0.12, r * 0.22, r * 0.18, 0, 0, TAU);
    g.arc(x + r * 0.2, y - r * 0.2, r * 0.16, 0, TAU);
    g.arc(x + r * 0.62, y - r * 0.24, r * 0.16, 0, TAU);
    g.fill();
    g.fillStyle = f.ear;
    g.beginPath();
    g.ellipse(x - r * 0.62, y - r * 0.05, r * 0.36, r * 0.8, 0.35, 0, TAU);
    g.fill();
    g.fillStyle = '#ff7f9c';
    g.beginPath();
    g.ellipse(x + r * 0.95, y + r * 0.72, r * 0.18, r * 0.14, 0, 0, TAU);
    g.fill();
    return;
  }
  if (curTribe === 'zorros') {
    tri(g, [x - r * 0.95, y - r * 0.2], [x - r * 0.65, y - r * 1.85], [x - r * 0.05, y - r * 0.75], f.fur);
    tri(g, [x + r * 0.85, y - r * 0.3], [x + r * 0.7, y - r * 1.85], [x + r * 0.05, y - r * 0.8], f.fur);
    tri(g, [x - r * 0.8, y - r * 1.25], [x - r * 0.65, y - r * 1.85], [x - r * 0.42, y - r * 1.25], f.ear);
    tri(g, [x + r * 0.78, y - r * 1.25], [x + r * 0.7, y - r * 1.85], [x + r * 0.45, y - r * 1.25], f.ear);
    g.fillStyle = f.fur;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.82, 0, 0, TAU);
    g.fill();
    g.fillStyle = f.light;
    g.beginPath();
    g.moveTo(x - r * 0.2, y + r * 0.1);
    g.lineTo(x + r * 1.45, y + r * 0.15);
    g.lineTo(x + r * 0.2, y + r * 0.8);
    g.closePath();
    g.fill();
    g.fillStyle = '#1b1030';
    g.beginPath();
    g.arc(x + r * 1.42, y + r * 0.12, r * 0.18, 0, TAU);
    g.arc(x + r * 0.1, y - r * 0.15, r * 0.15, 0, TAU);
    g.arc(x + r * 0.62, y - r * 0.18, r * 0.15, 0, TAU);
    g.fill();
    return;
  }
  if (curTribe === 'conejos') {
    [
      [-0.45, -0.18],
      [0.3, 0.12],
    ].forEach(([dx, rot]) => {
      g.fillStyle = f.fur;
      g.beginPath();
      g.ellipse(x + dx * r, y - r * 1.55, r * 0.34, r * 1.05, rot, 0, TAU);
      g.fill();
      g.fillStyle = f.ear;
      g.beginPath();
      g.ellipse(x + dx * r, y - r * 1.5, r * 0.16, r * 0.75, rot, 0, TAU);
      g.fill();
    });
    g.fillStyle = f.fur;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.92, 0, 0, TAU);
    g.fill();
    g.fillStyle = f.light;
    g.beginPath();
    g.ellipse(x + r * 0.4, y + r * 0.35, r * 0.48, r * 0.36, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#1b1030';
    g.beginPath();
    g.arc(x + r * 0.05, y - r * 0.1, r * 0.17, 0, TAU);
    g.arc(x + r * 0.62, y - r * 0.1, r * 0.17, 0, TAU);
    g.fill();
    g.fillStyle = '#ff7f9c';
    g.beginPath();
    g.arc(x + r * 0.45, y + r * 0.2, r * 0.13, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(x + r * 0.33, y + r * 0.36, r * 0.24, r * 0.26);
    return;
  }
  if (curTribe === 'osos') {
    g.fillStyle = f.ear;
    g.beginPath();
    g.arc(x - r * 0.68, y - r * 0.72, r * 0.36, 0, TAU);
    g.arc(x + r * 0.68, y - r * 0.72, r * 0.36, 0, TAU);
    g.fill();
    g.fillStyle = f.fur;
    g.beginPath();
    g.ellipse(x, y, r * 1.02, r * 0.95, 0, 0, TAU);
    g.fill();
    if (f.panda) {
      g.fillStyle = f.dark;
      g.beginPath();
      g.ellipse(x + r * 0.02, y - r * 0.08, r * 0.28, r * 0.34, -0.4, 0, TAU);
      g.ellipse(x + r * 0.62, y - r * 0.08, r * 0.28, r * 0.34, 0.4, 0, TAU);
      g.fill();
    }
    g.fillStyle = f.light;
    g.beginPath();
    g.ellipse(x + r * 0.35, y + r * 0.38, r * 0.48, r * 0.36, 0, 0, TAU);
    g.fill();
    g.fillStyle = f.panda ? '#ffffff' : '#1b1030';
    g.beginPath();
    g.arc(x + r * 0.05, y - r * 0.1, r * 0.13, 0, TAU);
    g.arc(x + r * 0.6, y - r * 0.1, r * 0.13, 0, TAU);
    g.fill();
    g.fillStyle = '#1b1030';
    g.beginPath();
    g.ellipse(x + r * 0.4, y + r * 0.22, r * 0.2, r * 0.14, 0, 0, TAU);
    g.fill();
    return;
  }
  catHead(g, f, x, y, r);
}

function catHead(g, f, x, y, r = 6.5) {
  tri(g, [x - r * 0.9, y - r * 0.35], [x - r * 0.75, y - r * 1.55], [x - r * 0.05, y - r * 0.85], f.fur);
  tri(g, [x + r * 0.9, y - r * 0.35], [x + r * 0.75, y - r * 1.55], [x + r * 0.05, y - r * 0.85], f.fur);
  tri(g, [x - r * 0.68, y - r * 0.55], [x - r * 0.62, y - r * 1.2], [x - r * 0.25, y - r * 0.8], '#f6a6b8');
  tri(g, [x + r * 0.68, y - r * 0.55], [x + r * 0.62, y - r * 1.2], [x + r * 0.25, y - r * 0.8], '#f6a6b8');
  g.fillStyle = f.fur;
  g.beginPath();
  g.ellipse(x, y, r, r * 0.88, 0, 0, TAU);
  g.fill();
  g.fillStyle = f.light;
  g.beginPath();
  g.ellipse(x + r * 0.3, y + r * 0.35, r * 0.5, r * 0.38, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(x + r * 0.05, y - r * 0.08, r * 0.17, 0, TAU);
  g.arc(x + r * 0.6, y - r * 0.08, r * 0.17, 0, TAU);
  g.fill();
  g.fillStyle = '#ff7f9c';
  g.beginPath();
  g.arc(x + r * 0.38, y + r * 0.22, r * 0.12, 0, TAU);
  g.fill();
}

function catBody(g, f, color, opts = {}) {
  if (curTribe === 'conejos' || curTribe === 'osos') {
    g.fillStyle = curTribe === 'conejos' ? f.light : f.dark;
    g.beginPath();
    g.arc(-7, -8, curTribe === 'conejos' ? 3.2 : 2.4, 0, TAU);
    g.fill();
  } else if (curTribe === 'zorros') {
    g.fillStyle = f.fur;
    g.beginPath();
    g.moveTo(-5, -7);
    g.quadraticCurveTo(-17, -5, -15, -17);
    g.quadraticCurveTo(-10, -11, -5, -11);
    g.closePath();
    g.fill();
    g.fillStyle = f.light;
    g.beginPath();
    g.arc(-15, -16, 2.4, 0, TAU);
    g.fill();
  } else {
    g.strokeStyle = f.fur;
    g.lineWidth = 2.6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-5, -6);
    if (curTribe === 'perros') g.quadraticCurveTo(-12, -9, -12, -15);
    else g.quadraticCurveTo(-13, -7, -11, -17);
    g.stroke();
  }
  g.fillStyle = f.dark;
  rr(g, -5.5, -5, 3.6, 5, 1.4);
  g.fill();
  rr(g, 1.9, -5, 3.6, 5, 1.4);
  g.fill();
  g.fillStyle = color;
  rr(g, -7, -15.5, 14, 12, 4.5);
  g.fill();
  g.strokeStyle = shade(color, -0.35);
  g.lineWidth = 1;
  g.stroke();
  if (!opts.noBelt) {
    g.fillStyle = '#5a3a22';
    g.fillRect(-7, -9, 14, 2);
    g.fillStyle = '#e8c35a';
    g.fillRect(-1, -9.3, 2.4, 2.6);
  }
  animalHead(g, f, 1, -21);
}

function drawAldeano(g, f, color) {
  catBody(g, f, color);
  g.fillStyle = '#e9c45c';
  g.beginPath();
  g.ellipse(1, -26.5, 9, 2.6, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#d4a940';
  g.beginPath();
  g.ellipse(1, -28.5, 5, 3.2, 0, Math.PI, TAU);
  g.fill();
  g.fillStyle = color;
  g.fillRect(-4, -28, 10, 1.6);
  g.strokeStyle = '#7a4a2a';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(5, -9);
  g.lineTo(10, -17);
  g.stroke();
  g.fillStyle = '#9aa3b5';
  rr(g, 7.5, -20, 6, 3.6, 1);
  g.fill();
}

function drawLancero(g, f, color) {
  g.strokeStyle = '#7a4a2a';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(9, -1);
  g.lineTo(9, -37);
  g.stroke();
  tri(g, [6.6, -36], [11.4, -36], [9, -43], '#dfe6f2');
  catBody(g, f, color);
  g.fillStyle = '#b7c0d0';
  g.beginPath();
  g.arc(1, -22.5, 7.4, Math.PI, TAU);
  g.fill();
  g.fillStyle = '#8a93a6';
  g.fillRect(-6.6, -23.5, 15.2, 2);
  g.fillRect(3.4, -23.5, 1.6, 5);
  g.fillStyle = shade(color, -0.2);
  g.beginPath();
  g.arc(-6.5, -10, 5.2, 0, TAU);
  g.fill();
  g.strokeStyle = '#e8c35a';
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = '#e8c35a';
  g.beginPath();
  g.arc(-6.5, -10, 1.4, 0, TAU);
  g.fill();
}

function drawArquero(g, f, color) {
  catBody(g, f, color);
  g.fillStyle = shade(color, -0.25);
  g.beginPath();
  g.moveTo(-7, -19);
  g.quadraticCurveTo(1, -33, 9, -19);
  g.lineTo(7, -22);
  g.quadraticCurveTo(1, -29, -5, -22);
  g.closePath();
  g.fill();
  tri(g, [-6, -23], [-10, -18], [-4, -18], shade(color, -0.25));
  g.strokeStyle = '#8b5a2b';
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(9, -12, 8, -1.25, 1.25);
  g.stroke();
  g.strokeStyle = '#efe6d2';
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(9 + 8 * Math.cos(-1.25), -12 + 8 * Math.sin(-1.25));
  g.lineTo(9 + 8 * Math.cos(1.25), -12 + 8 * Math.sin(1.25));
  g.stroke();
  g.fillStyle = '#7a4a2a';
  g.fillRect(-9.5, -17, 3, 9);
  g.fillStyle = '#e6e6e6';
  g.fillRect(-9, -19, 0.8, 3);
  g.fillRect(-7.6, -19.5, 0.8, 3);
}

function drawCaballero(g, f, color) {
  g.fillStyle = '#6b4128';
  [-9, -4, 5, 10].forEach((x) => {
    rr(g, x - 1.6, -9, 3.2, 9, 1.2);
    g.fill();
  });
  g.strokeStyle = '#3b2416';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-13, -14);
  g.quadraticCurveTo(-18, -10, -16, -4);
  g.stroke();
  g.fillStyle = '#8a5a3c';
  g.beginPath();
  g.ellipse(0, -13, 13, 6.5, 0, 0, TAU);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(-1, -14, 8, 5.4, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#e8c35a';
  g.fillRect(-9, -11, 16, 1.4);
  g.fillStyle = '#8a5a3c';
  g.beginPath();
  g.moveTo(9, -16);
  g.quadraticCurveTo(15, -27, 19, -24);
  g.lineTo(20, -19);
  g.quadraticCurveTo(15, -17, 13, -12);
  g.closePath();
  g.fill();
  g.fillStyle = '#3b2416';
  g.beginPath();
  g.moveTo(11, -18);
  g.quadraticCurveTo(13, -27, 18, -26);
  g.lineTo(15, -22);
  g.closePath();
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(17.5, -22.5, 0.9, 0, TAU);
  g.fill();
  g.save();
  g.translate(-1, -10);
  g.scale(0.9, 0.9);
  g.fillStyle = color;
  rr(g, -6, -17, 12, 9, 4);
  g.fill();
  animalHead(g, f, 1, -21, 6);
  g.fillStyle = '#c3cbd9';
  g.beginPath();
  g.arc(1, -22.5, 6.8, Math.PI, TAU);
  g.fill();
  g.fillStyle = '#e8c35a';
  g.fillRect(-5.8, -23.4, 13.6, 1.6);
  g.fillStyle = shade(color, 0.2);
  g.beginPath();
  g.moveTo(0, -29);
  g.quadraticCurveTo(-8, -34, -11, -27);
  g.quadraticCurveTo(-6, -30, 0, -27);
  g.fill();
  g.restore();
  g.strokeStyle = '#7a4a2a';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(-4, -18);
  g.lineTo(22, -30);
  g.stroke();
  tri(g, [21, -32.5], [23.5, -28.5], [27, -32.5], '#dfe6f2');
}

function drawCatapulta(g, f, color) {
  g.fillStyle = '#6b4128';
  rr(g, -16, -10, 32, 5, 1.5);
  g.fill();
  g.strokeStyle = '#7d5032';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-8, -9);
  g.lineTo(-2, -22);
  g.moveTo(4, -9);
  g.lineTo(-2, -22);
  g.stroke();
  g.strokeStyle = '#8b5a2b';
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(10, -8);
  g.lineTo(-11, -28);
  g.stroke();
  g.fillStyle = '#5a3a22';
  g.beginPath();
  g.arc(-12, -29, 3.6, 0, TAU);
  g.fill();
  g.fillStyle = '#8e939e';
  g.beginPath();
  g.arc(-12, -30, 2.4, 0, TAU);
  g.fill();
  [-10, 10].forEach((x) => {
    g.fillStyle = '#3b2416';
    g.beginPath();
    g.arc(x, -3, 4.6, 0, TAU);
    g.fill();
    g.fillStyle = '#9a6a42';
    g.beginPath();
    g.arc(x, -3, 2, 0, TAU);
    g.fill();
  });
  g.strokeStyle = '#3b2416';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(15, -9);
  g.lineTo(15, -27);
  g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(15, -27);
  g.lineTo(23, -24);
  g.lineTo(15, -21);
  g.closePath();
  g.fill();
  g.save();
  g.translate(19, 0);
  g.scale(0.62, 0.62);
  catBody(g, f, color);
  g.restore();
}

const UNIT_DRAW = {
  aldeano: drawAldeano,
  lancero: drawLancero,
  arquero: drawArquero,
  caballero: drawCaballero,
  catapulta: drawCatapulta,
};
const UNIT_BOX = {
  aldeano: [36, 46, 18, 40],
  lancero: [36, 50, 18, 44],
  arquero: [38, 46, 18, 40],
  caballero: [56, 52, 26, 44],
  catapulta: [56, 46, 26, 40],
};
const unitCache = new Map();

export function unitSprite(type, color, fur, tribe = 'gatos') {
  const key = `${type}|${color}|${fur}|${tribe}`;
  if (unitCache.has(key)) return unitCache.get(key);
  const [w, h, ax, ay] = UNIT_BOX[type];
  const [c, g] = canvasOf(w, h);
  g.translate(ax, ay);
  curTribe = TRIBE_FURS[tribe] ? tribe : 'gatos';
  const furs = TRIBE_FURS[curTribe];
  UNIT_DRAW[type](g, furs[fur % furs.length], color);
  curTribe = 'gatos';
  const out = { c, w, h, ax, ay };
  unitCache.set(key, out);
  return out;
}

const TOP = {
  castillo: 34,
  torre: 44,
  casa: 18,
  almacen: 14,
  granja: 0,
  cuartel: 22,
  establo: 22,
  taller: 22,
};

function stoneWall(g, x, y, w, h, base = '#9aa3b5') {
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  g.fillStyle = shade(base, -0.18);
  for (let row = 0; row * 6 < h; row += 1) {
    for (let col = 0; col * 10 < w + 10; col += 1) {
      const bx = x + col * 10 - (row % 2 ? 5 : 0);
      g.fillRect(Math.max(x, bx), y + row * 6, 0.8, 6);
    }
    g.fillRect(x, y + row * 6, w, 0.8);
  }
  g.fillStyle = shade(base, -0.3);
  g.fillRect(x, y + h - 3, w, 3);
}

function battlements(g, x, y, w, color) {
  g.fillStyle = color;
  for (let k = 0; k * 6 < w; k += 1) if (k % 2 === 0) g.fillRect(x + k * 6, y - 4, Math.min(6, w - k * 6), 4);
}

function earRoof(g, cx, baseY, half, height, color) {
  tri(g, [cx - half, baseY], [cx + half, baseY], [cx, baseY - height], color);
  const inner = { gatos: '#f6a6b8', zorros: '#fff3e6', conejos: '#ffd6e0' }[curTribe];
  if (inner) tri(g, [cx - half * 0.45, baseY - height * 0.18], [cx + half * 0.45, baseY - height * 0.18], [cx, baseY - height * 0.72], inner);
  else {
    g.fillStyle = shade(color, 0.25);
    g.beginPath();
    g.arc(cx, baseY - height, 3, 0, TAU);
    g.fill();
  }
  g.fillStyle = shade(color, -0.3);
  g.fillRect(cx - half, baseY - 1.5, half * 2, 2);
}

function gableRoof(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x + w, y + h);
  g.lineTo(x + w - 6, y);
  g.lineTo(x + 6, y);
  g.closePath();
  g.fill();
  g.strokeStyle = shade(color, -0.25);
  g.lineWidth = 1;
  for (let k = 1; k < 4; k += 1) {
    const yy = y + (h * k) / 4;
    const inset = 6 * (1 - k / 4);
    g.beginPath();
    g.moveTo(x + inset, yy);
    g.lineTo(x + w - inset, yy);
    g.stroke();
  }
  g.fillStyle = shade(color, -0.35);
  g.fillRect(x + 4, y - 1, w - 8, 2.4);
}

function woodWall(g, x, y, w, h, base = '#c9955f') {
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  g.strokeStyle = shade(base, -0.22);
  g.lineWidth = 0.8;
  for (let yy = y + 4; yy < y + h; yy += 4) {
    g.beginPath();
    g.moveTo(x, yy);
    g.lineTo(x + w, yy);
    g.stroke();
  }
  g.fillStyle = shade(base, -0.35);
  g.fillRect(x, y + h - 2, w, 2);
}

function banner(g, x, y, color) {
  g.strokeStyle = '#3b2416';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - 16);
  g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - 16);
  g.lineTo(x + 11, y - 13);
  g.lineTo(x, y - 9);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff6e6';
  g.beginPath();
  g.arc(x + 4, y - 12.6, 1.4, 0, TAU);
  g.fill();
}

function paw(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y + r * 0.3, r * 0.75, r * 0.6, 0, 0, TAU);
  g.fill();
  [
    [-0.8, -0.5],
    [-0.28, -0.95],
    [0.28, -0.95],
    [0.8, -0.5],
  ].forEach(([dx, dy]) => {
    g.beginPath();
    g.arc(x + dx * r, y + dy * r, r * 0.3, 0, TAU);
    g.fill();
  });
}

const BUILD_DRAW = {
  castillo(g, color) {
    g.fillStyle = 'rgba(20,12,40,0.25)';
    g.beginPath();
    g.ellipse(36, 70, 36, 6, 0, 0, TAU);
    g.fill();
    stoneWall(g, 20, -6, 32, 30, '#a9b1c2');
    battlements(g, 20, -6, 32, '#a9b1c2');
    banner(g, 36, -10, color);
    stoneWall(g, 4, 18, 64, 52);
    battlements(g, 4, 18, 64, '#9aa3b5');
    g.fillStyle = '#2b2440';
    g.beginPath();
    g.moveTo(27, 70);
    g.lineTo(27, 52);
    g.arc(36, 52, 9, Math.PI, TAU);
    g.lineTo(45, 70);
    g.closePath();
    g.fill();
    g.strokeStyle = '#5b5470';
    g.lineWidth = 1;
    for (let x = 29; x < 45; x += 3.5) {
      g.beginPath();
      g.moveTo(x, 46);
      g.lineTo(x, 70);
      g.stroke();
    }
    paw(g, 36, 32, 5, color);
    [0, 54].forEach((x) => {
      stoneWall(g, x, 6, 18, 64, '#b3bbcb');
      g.fillStyle = '#2b2440';
      g.fillRect(x + 7, 26, 4, 8);
      earRoof(g, x + 9, 8, 12, 26, color);
    });
  },
  casa(g, color) {
    g.fillStyle = 'rgba(20,12,40,0.22)';
    g.beginPath();
    g.ellipse(24, 46, 22, 4, 0, 0, TAU);
    g.fill();
    woodWall(g, 6, 14, 36, 32);
    gableRoof(g, 1, -12, 46, 28, color);
    g.fillStyle = '#6b4128';
    rr(g, 19, 30, 10, 16, 2);
    g.fill();
    g.fillStyle = '#ffe9a8';
    g.fillRect(33, 24, 6, 6);
    g.fillRect(9, 24, 6, 6);
    g.fillStyle = '#7d7f8a';
    g.fillRect(34, -14, 5, 9);
  },
  almacen(g, color) {
    g.fillStyle = 'rgba(20,12,40,0.22)';
    g.beginPath();
    g.ellipse(24, 46, 22, 4, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#a77b4e';
    g.fillRect(3, 30, 42, 16);
    g.fillStyle = '#7d5032';
    [5, 41].forEach((x) => g.fillRect(x, 2, 3, 30));
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(-1, 6);
    g.lineTo(49, 6);
    g.lineTo(44, -10);
    g.lineTo(4, -10);
    g.closePath();
    g.fill();
    g.fillStyle = shade(color, -0.3);
    g.fillRect(-1, 5, 50, 2.4);
    g.fillStyle = '#8b5a2b';
    [
      [12, 36],
      [18, 36],
      [15, 31],
    ].forEach(([x, y]) => {
      g.beginPath();
      g.arc(x, y, 3.4, 0, TAU);
      g.fill();
      g.fillStyle = '#d9b07a';
      g.beginPath();
      g.arc(x, y, 1.6, 0, TAU);
      g.fill();
      g.fillStyle = '#8b5a2b';
    });
    g.fillStyle = '#c8a26a';
    rr(g, 25, 26, 9, 9, 1.5);
    g.fill();
    g.fillStyle = '#e8c35a';
    g.beginPath();
    g.ellipse(39, 34, 4, 5, 0, 0, TAU);
    g.fill();
  },
  granja(g, color) {
    g.fillStyle = '#8b6a46';
    rr(g, 2, 2, 44, 44, 4);
    g.fill();
    for (let row = 0; row < 5; row += 1) {
      const y = 7 + row * 8;
      g.fillStyle = '#6e5235';
      g.fillRect(5, y + 3, 38, 2);
      for (let x = 7; x < 43; x += 5) {
        g.fillStyle = (x + row) % 3 ? '#7cc35b' : '#e6c75a';
        g.beginPath();
        g.arc(x, y + 2, 1.9, 0, TAU);
        g.fill();
      }
    }
    g.fillStyle = color;
    [
      [2, 2],
      [44, 2],
      [2, 44],
      [44, 44],
    ].forEach(([x, y]) => {
      g.beginPath();
      g.arc(x, y, 2.4, 0, TAU);
      g.fill();
    });
  },
  cuartel(g, color) {
    g.fillStyle = 'rgba(20,12,40,0.22)';
    g.beginPath();
    g.ellipse(36, 70, 34, 5, 0, 0, TAU);
    g.fill();
    woodWall(g, 8, 14, 56, 56, '#b7865a');
    gableRoof(g, 3, -16, 66, 32, color);
    g.fillStyle = '#5a3a22';
    rr(g, 28, 46, 16, 24, 3);
    g.fill();
    g.strokeStyle = '#dfe6f2';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(20, 24);
    g.lineTo(52, 44);
    g.moveTo(52, 24);
    g.lineTo(20, 44);
    g.stroke();
    g.fillStyle = shade(color, -0.1);
    g.beginPath();
    g.arc(36, 34, 6, 0, TAU);
    g.fill();
    paw(g, 36, 34.5, 3, '#fff6e6');
  },
  torre(g, color) {
    g.fillStyle = 'rgba(20,12,40,0.25)';
    g.beginPath();
    g.ellipse(24, 46, 18, 4, 0, 0, TAU);
    g.fill();
    stoneWall(g, 10, -12, 28, 58, '#a9b1c2');
    battlements(g, 8, -12, 32, '#a9b1c2');
    g.fillStyle = '#2b2440';
    g.fillRect(21, 6, 6, 11);
    g.fillRect(21, 26, 6, 9);
    earRoof(g, 24, -14, 16, 30, color);
  },
  establo(g, color) {
    g.fillStyle = 'rgba(20,12,40,0.22)';
    g.beginPath();
    g.ellipse(36, 70, 34, 5, 0, 0, TAU);
    g.fill();
    woodWall(g, 6, 14, 60, 56, '#a8473c');
    gableRoof(g, 1, -16, 70, 32, color);
    g.fillStyle = '#6e2a22';
    g.fillRect(24, 40, 24, 30);
    g.strokeStyle = '#f5ede0';
    g.lineWidth = 2;
    g.strokeRect(24, 40, 24, 30);
    g.beginPath();
    g.moveTo(24, 40);
    g.lineTo(48, 70);
    g.moveTo(48, 40);
    g.lineTo(24, 70);
    g.stroke();
    g.fillStyle = '#e8c35a';
    rr(g, 52, 58, 16, 11, 3);
    g.fill();
    rr(g, 3, 60, 14, 10, 3);
    g.fill();
  },
  taller(g, color) {
    g.fillStyle = 'rgba(20,12,40,0.22)';
    g.beginPath();
    g.ellipse(36, 70, 34, 5, 0, 0, TAU);
    g.fill();
    woodWall(g, 6, 16, 60, 54, '#9c7b5a');
    gableRoof(g, 1, -14, 70, 32, color);
    g.fillStyle = '#4a3a2c';
    rr(g, 12, 42, 26, 28, 3);
    g.fill();
    g.save();
    g.translate(52, 38);
    g.fillStyle = '#c3cbd9';
    for (let k = 0; k < 8; k += 1) {
      g.rotate(TAU / 8);
      g.fillRect(-2, -10, 4, 5);
    }
    g.beginPath();
    g.arc(0, 0, 7, 0, TAU);
    g.fill();
    g.fillStyle = '#9c7b5a';
    g.beginPath();
    g.arc(0, 0, 3, 0, TAU);
    g.fill();
    g.restore();
    g.strokeStyle = '#7d5032';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(44, 70);
    g.lineTo(66, 52);
    g.stroke();
  },
};

const buildCache = new Map();
export function buildingSprite(type, color, tribe = 'gatos') {
  const key = `${type}|${color}|${tribe}`;
  if (buildCache.has(key)) return buildCache.get(key);
  const size = BUILDINGS[type].size * TILE;
  const top = TOP[type];
  const [c, g] = canvasOf(size, size + top);
  g.translate(0, top);
  curTribe = tribe;
  BUILD_DRAW[type](g, color);
  curTribe = 'gatos';
  const out = { c, w: size, h: size + top, top };
  buildCache.set(key, out);
  return out;
}

const resCache = new Map();
function resourceSprite(kind, variant) {
  const key = `${kind}|${variant}`;
  if (resCache.has(key)) return resCache.get(key);
  const [c, g] = canvasOf(TILE + 12, TILE + 18);
  g.translate(6, 18);
  const r = (k) => hash(variant * 31 + k);
  if (kind === TREE) {
    g.fillStyle = 'rgba(10,30,10,0.25)';
    g.beginPath();
    g.ellipse(12, 20, 10, 3.5, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#6b4128';
    g.fillRect(10, 8, 4, 13);
    const greens = ['#2f7a3a', '#3a8f45', '#276b33'];
    const base = greens[variant % 3];
    [
      [12, -2, 9],
      [6 + r(1) * 2, 4, 6.5],
      [18 - r(2) * 2, 4, 6.5],
      [12, -9 + r(3) * 3, 6],
    ].forEach(([x, y, rad], k) => {
      g.fillStyle = k === 3 ? shade(base, 0.12) : base;
      g.beginPath();
      g.arc(x, y, rad, 0, TAU);
      g.fill();
    });
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.arc(9, -6, 3.5, 0, TAU);
    g.fill();
  } else if (kind === GOLD) {
    g.fillStyle = 'rgba(30,20,10,0.25)';
    g.beginPath();
    g.ellipse(12, 20, 11, 3.5, 0, 0, TAU);
    g.fill();
    [
      [6, 14, 7],
      [16, 13, 8],
      [11, 7, 7],
    ].forEach(([x, y, rad], k) => {
      g.fillStyle = k === 2 ? '#7d7f8a' : '#8e919c';
      g.beginPath();
      g.moveTo(x - rad, y + 4);
      g.lineTo(x - rad * 0.6, y - rad * 0.7);
      g.lineTo(x + rad * 0.5, y - rad * 0.8);
      g.lineTo(x + rad, y + 4);
      g.closePath();
      g.fill();
    });
    g.fillStyle = '#f2cf4a';
    [
      [8, 11],
      [15, 9],
      [12, 4],
      [18, 14],
    ].forEach(([x, y]) => {
      g.beginPath();
      g.moveTo(x, y - 2.5);
      g.lineTo(x + 2, y);
      g.lineTo(x, y + 2.5);
      g.lineTo(x - 2, y);
      g.closePath();
      g.fill();
    });
  } else {
    g.fillStyle = 'rgba(10,30,10,0.25)';
    g.beginPath();
    g.ellipse(12, 20, 9, 3, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#3d8a3f';
    [
      [8, 12, 6],
      [16, 12, 6],
      [12, 7, 6.5],
    ].forEach(([x, y, rad]) => {
      g.beginPath();
      g.arc(x, y, rad, 0, TAU);
      g.fill();
    });
    for (let k = 0; k < 7; k += 1) {
      g.fillStyle = k % 2 ? '#d6386a' : '#9b3dd6';
      g.beginPath();
      g.arc(5 + r(k) * 14, 4 + r(k + 9) * 12, 1.8, 0, TAU);
      g.fill();
    }
  }
  resCache.set(key, c);
  return c;
}

export function makeTerrain(st) {
  const [c, g] = canvasOf(WORLD_W, WORLD_H, 1);
  for (let y = 0; y < MH; y += 1)
    for (let x = 0; x < MW; x += 1) {
      const i = idx(x, y);
      const h = hash(i + st.seed);
      const water = st.tiles[i] === WATER;
      if (water) {
        g.fillStyle = h < 0.5 ? '#3a84cc' : '#3d89d2';
      } else {
        const tone = Math.floor(h * 4);
        g.fillStyle = ['#6aa84f', '#71af55', '#66a24b', '#6dac52'][tone];
      }
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  for (let y = 0; y < MH; y += 1)
    for (let x = 0; x < MW; x += 1) {
      const i = idx(x, y);
      if (st.tiles[i] === WATER) {
        const edges = [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ];
        g.fillStyle = '#d8c48a';
        edges.forEach(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || st.tiles[idx(nx, ny)] === WATER) return;
          if (dy === -1) g.fillRect(x * TILE, y * TILE, TILE, 4);
          if (dy === 1) g.fillRect(x * TILE, y * TILE + TILE - 4, TILE, 4);
          if (dx === -1) g.fillRect(x * TILE, y * TILE, 4, TILE);
          if (dx === 1) g.fillRect(x * TILE + TILE - 4, y * TILE, 4, TILE);
        });
        if (hash(i * 7) < 0.25) {
          g.strokeStyle = 'rgba(255,255,255,0.35)';
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(x * TILE + 6, y * TILE + 12);
          g.quadraticCurveTo(x * TILE + 10, y * TILE + 9, x * TILE + 14, y * TILE + 12);
          g.stroke();
        }
      } else {
        const h = hash(i * 13 + st.seed);
        if (h < 0.22) {
          g.strokeStyle = 'rgba(40,90,30,0.45)';
          g.lineWidth = 1;
          const bx = x * TILE + 4 + h * 60;
          const by = y * TILE + 16;
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(bx - 1.5, by - 5);
          g.moveTo(bx + 3, by);
          g.lineTo(bx + 3.5, by - 6);
          g.stroke();
        } else if (h > 0.96) {
          g.fillStyle = h > 0.98 ? '#fff4b8' : '#f7b6d2';
          g.beginPath();
          g.arc(x * TILE + 12, y * TILE + 12, 1.8, 0, TAU);
          g.fill();
        }
      }
    }
  return c;
}

let fogCanvas = null;
let fogData = null;
let fogKey = '';
function fogLayer(st, me) {
  if (!fogCanvas) {
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = MW;
    fogCanvas.height = MH;
  }
  const key = `${st.seed}|${me}|${st.visRev || 0}`;
  if (key === fogKey) return fogCanvas;
  fogKey = key;
  const g = fogCanvas.getContext('2d');
  if (!fogData) fogData = g.createImageData(MW, MH);
  const { vis, explored } = st.players[me];
  const d = fogData.data;
  for (let i = 0; i < MW * MH; i += 1) {
    d[i * 4] = 8;
    d[i * 4 + 1] = 6;
    d[i * 4 + 2] = 28;
    d[i * 4 + 3] = vis[i] ? 0 : explored[i] ? 120 : 255;
  }
  g.putImageData(fogData, 0, 0);
  return fogCanvas;
}

function hpBar(ctx, x, y, w, frac, mine) {
  ctx.fillStyle = 'rgba(10,6,30,0.75)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
  ctx.fillStyle = frac > 0.5 ? (mine ? '#6ee07a' : '#ff8080') : frac > 0.25 ? '#ffd166' : '#ff5c5c';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), 3);
}

function visibleBuilding(st, me, b) {
  if (b.owner === me) return true;
  const ex = st.players[me].explored;
  for (let y = b.ty; y < b.ty + b.size; y += 1) for (let x = b.tx; x < b.tx + b.size; x += 1) if (ex[idx(x, y)]) return true;
  return false;
}

export function unitVisible(st, me, u) {
  if (u.owner === me) return true;
  return !!st.players[me].vis[idx(Math.max(0, Math.min(MW - 1, Math.floor(u.x / TILE))), Math.max(0, Math.min(MH - 1, Math.floor(u.y / TILE))))];
}

export function drawBuilding(ctx, st, b, time, selected, alpha = 1) {
  const color = st.players[b.owner].color;
  const sp = buildingSprite(b.type, color, st.players[b.owner].tribe);
  const x = b.tx * TILE;
  const y = b.ty * TILE;
  if (selected) {
    ctx.strokeStyle = b.owner === st.me ? '#8dffb0' : '#ff8a8a';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x + 1, y + 1, sp.w - 2, sp.w - 2);
    ctx.setLineDash([]);
  }
  if (!b.done) {
    ctx.fillStyle = 'rgba(120,90,60,0.55)';
    ctx.fillRect(x + 2, y + 2, sp.w - 4, sp.w - 4);
    const p = Math.max(0.08, b.progress);
    const cut = sp.h * (1 - p);
    ctx.globalAlpha = alpha * 0.9;
    ctx.drawImage(sp.c, 0, cut * S, sp.c.width, sp.c.height - cut * S, x, y - sp.top + cut, sp.w, sp.h - cut);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#c9955f';
    ctx.lineWidth = 1.5;
    for (let k = 0; k <= 2; k += 1) {
      const xx = x + 4 + ((sp.w - 8) * k) / 2;
      ctx.beginPath();
      ctx.moveTo(xx, y + sp.w - 2);
      ctx.lineTo(xx, y - sp.top * 0.4 + 4);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x + 4, y + sp.w * 0.45);
    ctx.lineTo(x + sp.w - 4, y + sp.w * 0.45);
    ctx.stroke();
  } else {
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp.c, x, y - sp.top, sp.w, sp.h);
    ctx.globalAlpha = 1;
    if (b.hit > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, sp.w, sp.w);
    }
  }
  const max = buildingMaxHp(st, b.owner, b.type);
  if (b.done && b.hp < max * 0.5) {
    for (let k = 0; k < 3; k += 1) {
      const ph = (time * 0.8 + k * 0.37) % 1;
      ctx.fillStyle = `rgba(70,64,80,${0.5 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + sp.w * (0.3 + k * 0.2), y + sp.w * 0.2 - ph * 26, 4 + ph * 6, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.arc(x + sp.w * 0.5, y + sp.w * 0.3, 3 + Math.sin(time * 12) * 1, 0, TAU);
    ctx.fill();
  }
  if (selected || b.hp < max) hpBar(ctx, x + sp.w / 2, y - sp.top - 6, Math.min(56, sp.w - 8), b.hp / max, b.owner === st.me);
  if (!b.done) hpBar(ctx, x + sp.w / 2, y + sp.w / 2, Math.min(40, sp.w - 10), b.progress, true);
}

export function drawUnit(ctx, st, u, time, selected) {
  const color = st.players[u.owner].color;
  const sp = unitSprite(u.type, color, u.fur || 0, st.players[u.owner].tribe);
  const r = UNITS[u.type].r;
  ctx.fillStyle = 'rgba(15,10,35,0.28)';
  ctx.beginPath();
  ctx.ellipse(u.x, u.y + 2, r + 2, r * 0.45, 0, 0, TAU);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = u.owner === st.me ? '#8dffb0' : '#ff8a8a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 2, r + 4, r * 0.6 + 1, 0, 0, TAU);
    ctx.stroke();
  }
  const phase = time * 10 + u.id;
  const bob = u.moving ? Math.abs(Math.sin(phase)) * -2 : u.working ? Math.sin(phase * 0.8) * -1 : 0;
  const lean = u.swing > 0 ? 0.18 * (u.face || 1) : 0;
  ctx.save();
  ctx.translate(u.x, u.y + 2 + bob);
  if (lean) ctx.rotate(lean);
  ctx.scale((u.face || 1) * 0.92, 0.92);
  ctx.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h);
  ctx.restore();
  if (u.hit > 0) {
    ctx.fillStyle = 'rgba(255,90,90,0.35)';
    ctx.beginPath();
    ctx.arc(u.x, u.y - 12, r + 4, 0, TAU);
    ctx.fill();
  }
  if (u.carry?.amt > 0.5 && u.carry.res) {
    const c = { food: '#d6386a', wood: '#8b5a2b', gold: '#f2cf4a' }[u.carry.res];
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(u.x - (u.face || 1) * 7, u.y - 10, 3.2, 0, TAU);
    ctx.fill();
  }
  const max = unitMaxHp(st, u.owner, u.type);
  if (selected || u.hp < max) hpBar(ctx, u.x, u.y - sp.ay * 0.92 - 4, 22, u.hp / max, u.owner === st.me);
}

function drawMissile(ctx, m) {
  if (m.kind === 'rock') {
    const total = Math.hypot(m.tx - (m.sx ?? m.x), m.ty - (m.sy ?? m.y)) || 1;
    const left = Math.hypot(m.tx - m.x, m.ty - m.y);
    const p = 1 - Math.min(1, left / total);
    const lift = Math.sin(p * Math.PI) * 46;
    ctx.fillStyle = 'rgba(15,10,35,0.25)';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, 4, 2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7d7f8a';
    ctx.beginPath();
    ctx.arc(m.x, m.y - lift, 4.2, 0, TAU);
    ctx.fill();
    return;
  }
  const a = Math.atan2(m.ty - m.y, m.tx - m.x);
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(a);
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.fillStyle = '#dfe6f2';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(3, -2.4);
  ctx.lineTo(3, 2.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFx(ctx, f) {
  const p = Math.max(0, f.t / f.life);
  if (f.t < 0) return;
  if (f.k === 'poof') {
    ctx.strokeStyle = f.color;
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y - 8, 6 + p * 14, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#fff6e6';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x_x', f.x, f.y - 14 - p * 14);
    ctx.globalAlpha = 1;
  } else if (f.k === 'smoke') {
    ctx.fillStyle = `rgba(90,84,100,${0.5 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y - p * 30, 6 + p * 10, 0, TAU);
    ctx.fill();
  } else if (f.k === 'boom') {
    ctx.fillStyle = `rgba(255,170,60,${0.8 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 6 + p * 20, 0, TAU);
    ctx.fill();
  } else if (f.k === 'spark') {
    ctx.fillStyle = `rgba(255,236,150,${1 - p})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2 + p * 4, 0, TAU);
    ctx.fill();
  } else if (f.k === 'rubble') {
    ctx.globalAlpha = 0.7 * (1 - p);
    const size = f.size * TILE;
    for (let k = 0; k < f.size * 6; k += 1) {
      ctx.fillStyle = k % 2 ? '#6e6a78' : '#8b6a46';
      ctx.beginPath();
      ctx.arc(f.x + hash(k + f.x) * size, f.y + hash(k * 3 + f.y) * size, 2 + hash(k * 7) * 3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (f.k === 'mark') {
    ctx.strokeStyle = f.color;
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 10 * (1 - p * 0.5), 5 * (1 - p * 0.5), 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawWorld(ctx, st, view) {
  const { me, cam, time, sel, ghost, box, terrain } = view;
  st.me = me;
  ctx.fillStyle = '#05031c';
  ctx.fillRect(0, 0, VW, VH);
  const z = cam.z || 1;
  const viewW = VW / z;
  const viewH = VH / z;
  ctx.save();
  ctx.scale(z, z);
  ctx.translate(-Math.round(cam.x * z) / z, -Math.round(cam.y * z) / z);
  const sx = Math.max(0, Math.floor(cam.x));
  const sy = Math.max(0, Math.floor(cam.y));
  const sw = Math.min(WORLD_W - sx, Math.ceil(viewW) + 2);
  const sh = Math.min(WORLD_H - sy, Math.ceil(viewH) + 2);
  ctx.drawImage(terrain, sx, sy, sw, sh, sx, sy, sw, sh);
  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const x1 = Math.min(MW - 1, Math.ceil((cam.x + viewW) / TILE) + 1);
  const y1 = Math.min(MH - 1, Math.ceil((cam.y + viewH) / TILE) + 2);
  const explored = st.players[me].explored;

  st.buildings.forEach((b) => {
    if (b.type === 'granja' && visibleBuilding(st, me, b)) drawBuilding(ctx, st, b, time, sel.has(b.id));
  });

  for (let y = y0; y <= y1; y += 1)
    for (let x = x0; x <= x1; x += 1) {
      const i = idx(x, y);
      const t = st.tiles[i];
      if (t !== TREE && t !== GOLD && t !== BERRY) continue;
      if (!explored[i]) continue;
      const variant = Math.floor(hash(i + 3) * 6);
      ctx.drawImage(resourceSprite(t, variant), x * TILE - 6, y * TILE - 18, TILE + 12, TILE + 18);
    }

  const drawList = [];
  st.buildings.forEach((b) => {
    if (b.type === 'granja' || !visibleBuilding(st, me, b)) return;
    drawList.push({
      y: (b.ty + b.size) * TILE,
      draw: () => drawBuilding(ctx, st, b, time, sel.has(b.id)),
    });
  });
  st.units.forEach((u) => {
    if (u.x < cam.x - 60 || u.x > cam.x + viewW + 60 || u.y < cam.y - 60 || u.y > cam.y + viewH + 80) return;
    if (!unitVisible(st, me, u)) return;
    drawList.push({
      y: u.y,
      draw: () => drawUnit(ctx, st, u, time, sel.has(u.id)),
    });
  });
  drawList.sort((a, b) => a.y - b.y).forEach((d) => d.draw());

  st.missiles.forEach((m) => drawMissile(ctx, m));
  st.fx.forEach((f) => drawFx(ctx, f));

  sel.forEach((id) => {
    const b = st.ents.get(id);
    if (!b || b.kind !== 'b' || b.owner !== me || !b.rally) return;
    const c = { x: (b.tx + b.size / 2) * TILE, y: (b.ty + b.size / 2) * TILE };
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(b.rally.x, b.rally.y);
    ctx.stroke();
    ctx.setLineDash([]);
    banner(ctx, b.rally.x, b.rally.y, st.players[me].color);
  });

  ctx.imageSmoothingEnabled = true;
  const fx = Math.max(0, x0 - 1);
  const fy = Math.max(0, y0 - 1);
  const fw = Math.min(MW, x1 + 2) - fx;
  const fh = Math.min(MH, y1 + 2) - fy;
  ctx.drawImage(fogLayer(st, me), fx, fy, fw, fh, fx * TILE, fy * TILE, fw * TILE, fh * TILE);

  if (ghost) {
    const size = BUILDINGS[ghost.type].size;
    ctx.fillStyle = ghost.ok ? 'rgba(110,224,122,0.28)' : 'rgba(255,92,92,0.32)';
    ctx.fillRect(ghost.tx * TILE, ghost.ty * TILE, size * TILE, size * TILE);
    const sp = buildingSprite(ghost.type, st.players[me].color, st.players[me].tribe);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(sp.c, ghost.tx * TILE, ghost.ty * TILE - sp.top, sp.w, sp.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ghost.ok ? '#6ee07a' : '#ff5c5c';
    ctx.lineWidth = 2;
    ctx.strokeRect(ghost.tx * TILE, ghost.ty * TILE, size * TILE, size * TILE);
  }
  ctx.restore();

  if (box) {
    ctx.fillStyle = 'rgba(141,255,176,0.12)';
    ctx.strokeStyle = '#8dffb0';
    ctx.lineWidth = 1.2;
    const bx = Math.min(box.x0, box.x1);
    const by = Math.min(box.y0, box.y1);
    ctx.fillRect(bx, by, Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0));
    ctx.strokeRect(bx, by, Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0));
  }
}

let miniCanvas = null;
let miniData = null;
export function drawMinimap(ctx, st, me, cam, w, h) {
  if (!miniCanvas) {
    miniCanvas = document.createElement('canvas');
    miniCanvas.width = MW;
    miniCanvas.height = MH;
    miniData = miniCanvas.getContext('2d').createImageData(MW, MH);
  }
  const img = miniData;
  const d = img.data;
  const { vis, explored } = st.players[me];
  for (let i = 0; i < MW * MH; i += 1) {
    const c = MINI[st.tiles[i]] || MINI[GRASS];
    const k = explored[i] ? (vis[i] ? 1 : 0.55) : 0;
    d[i * 4] = c[0] * k + 6 * (1 - k);
    d[i * 4 + 1] = c[1] * k + 4 * (1 - k);
    d[i * 4 + 2] = c[2] * k + 26 * (1 - k);
    d[i * 4 + 3] = 255;
  }
  const put = (x, y, rgb) => {
    if (x < 0 || y < 0 || x >= MW || y >= MH) return;
    const i = (y * MW + x) * 4;
    d[i] = rgb[0];
    d[i + 1] = rgb[1];
    d[i + 2] = rgb[2];
  };
  const rgbOf = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const colors = st.players.map((p) => rgbOf(p.color));
  st.buildings.forEach((b) => {
    if (!visibleBuilding(st, me, b)) return;
    for (let y = b.ty; y < b.ty + b.size; y += 1) for (let x = b.tx; x < b.tx + b.size; x += 1) put(x, y, colors[b.owner]);
  });
  st.units.forEach((u) => {
    if (!unitVisible(st, me, u)) return;
    put(Math.floor(u.x / TILE), Math.floor(u.y / TILE), u.owner === me ? [255, 255, 255] : colors[u.owner]);
  });
  miniCanvas.getContext('2d').putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(miniCanvas, 0, 0, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.strokeRect((cam.x / WORLD_W) * w + 0.5, (cam.y / WORLD_H) * h + 0.5, (VW / (cam.z || 1) / WORLD_W) * w, (VH / (cam.z || 1) / WORLD_H) * h);
}

export function drawMapPreview(ctx, tiles, w, h) {
  const img = ctx.createImageData(MW, MH);
  for (let i = 0; i < MW * MH; i += 1) {
    const c = MINI[tiles[i]] || MINI[GRASS];
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = 255;
  }
  const off = document.createElement('canvas');
  off.width = MW;
  off.height = MH;
  off.getContext('2d').putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, w, h);
}
