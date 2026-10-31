const COMPANY_OPTIONS = {
  abbie: {
    mixed: /^mixed breeds?/i,
    basic: {
      name: 'Bath',
      es: 'Baño, cuidado de uñas, limpieza de oídos y afeitado sanitario',
      en: 'Bath, nail care, ear cleaning and sanitary trim',
    },
    full: { name: 'Full Grooming' },
  },
  cruzin: {
    basicCat: /^cruzin.? splash/i,
    fullCat: /furfection/i,
    basic: {
      name: "Cruzin' Splash",
      es: 'Baño, corte de uñas, limpieza de oídos y recorte sanitario',
      en: 'Bath, nail trim, ear cleaning and sanitary trim',
    },
    full: { name: "Cruzin' Furfection" },
  },
  cutepaws: {
    basicCat: /^basic grooming/i,
    fullCat: /^full grooming/i,
    basic: {
      name: 'Basic Grooming',
      es: 'Dos shampoos, acondicionador, secado a mano, corte y limado de uñas, limpieza de oídos y recorte en áreas sanitarias',
      en: 'Two shampoos, conditioner, hand blow dry, nail trim and file, ear cleaning and sanitary trim',
    },
    full: { name: 'Full Grooming' },
  },
  famous: {
    basicCat: /^silver/i,
    fullCat: /^gold/i,
    basic: {
      name: 'Silver',
      es: 'Baño, secado, limpieza de oídos, cuidado de uñas y limpieza sanitaria',
      en: 'Bath, blow dry, ear cleaning, nail care and sanitary cleaning',
    },
    full: { name: 'Gold' },
  },
  mayami: {
    fullCat: /dog grooming service|^full grooming/i,
    full: {
      name: 'Full Grooming',
      es: 'Baño, limpieza de oídos, cuidado de uñas y afeitado sanitario, más corte de pelo o deslanado',
      en: 'Bath, ear cleaning, nail care and sanitary trim, plus a haircut or deshedding',
    },
  },
  tinis: {
    basicCat: /^bath package/i,
    fullCat: /^full grooming/i,
    basic: {
      name: 'Bath Package',
      es: 'Baño con shampoo especializado y acondicionador, secado y cepillado a mano, corte de uñas, limpieza de oídos, cepillado dental y afeitado sanitario',
      en: 'Bath with specialty shampoo and conditioner, hand dry and brush, nail trim, ear cleaning, teeth brushing and sanitary trim',
    },
    full: { name: 'Full Grooming' },
  },
};

const SIZE = /(mini|small|medium|large|extra large|xl)/i;
const SIZE_ES = { mini: 'Mini', small: 'Pequeño', medium: 'Mediano', large: 'Grande', 'extra large': 'Extra grande', xl: 'Extra grande' };

const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.00$/, '')}`;
const priceOf = (display) => {
  const m = String(display || '').match(/\$?\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
};

function sizeLabel(row) {
  const raw = (row.label || '').match(SIZE)?.[1]?.toLowerCase() || '';
  const name = SIZE_ES[raw] || row.label;
  const range = row.weight_min_lbs != null && row.weight_max_lbs != null ? ` (${Math.round(row.weight_min_lbs)}-${Math.round(row.weight_max_lbs)} lbs)` : '';
  return { name, range };
}

const SKIP = /raza|breed|especial|special|double|dental|gato|cat\b/i;
const catMatches = (r, re) => [r.original_category_name, r.category_name].some((c) => c && re.test(c.trim()) && !SKIP.test(c));
const byWeight = (a, b) => (a.weight_min_lbs ?? 0) - (b.weight_min_lbs ?? 0);

export function groomingSizes(rows, slug) {
  const cfg = COMPANY_OPTIONS[slug];
  if (!cfg) return [];
  const own = rows.filter((r) => r.company_slug === slug && !r.is_cat);

  if (cfg.mixed) {
    return own
      .filter((r) => cfg.mixed.test(r.label || ''))
      .sort(byWeight)
      .map((r) => {
        const bath = String(r.price_display || '').match(/bath[^$]*\$([\d.]+)/i);
        const full = String(r.price_display || '').match(/full[^$]*\$([\d.]+)/i);
        return { ...sizeLabel(r), basic: bath ? parseFloat(bath[1]) : null, full: full ? parseFloat(full[1]) : null };
      });
  }

  const pick = (re) => (re ? own.filter((r) => catMatches(r, re) && r.weight_min_lbs != null).sort(byWeight) : []);
  const fullRows = pick(cfg.fullCat);
  const basicRows = pick(cfg.basicCat);
  const base = fullRows.length ? fullRows : basicRows;
  return base.map((r, i) => ({
    ...sizeLabel(r),
    full: fullRows[i] ? priceOf(fullRows[i].price_display) : null,
    basic: basicRows[i] ? priceOf(basicRows[i].price_display) : null,
  }));
}

export function hasGroomingOptions(slug) {
  return Boolean(COMPANY_OPTIONS[slug]);
}

export function buildGroomingOptions(slug, sizes, sizeIndex, lang) {
  const cfg = COMPANY_OPTIONS[slug];
  if (!cfg) return '';
  const en = lang === 'en';
  const fromPrices = sizeIndex == null;
  const priceText = (key) => {
    if (fromPrices) {
      const values = sizes.map((s) => s[key]).filter((v) => v != null);
      if (!values.length) return null;
      return en ? `from ${money(Math.min(...values))}` : `desde ${money(Math.min(...values))}`;
    }
    const v = sizes[sizeIndex]?.[key];
    return v != null ? money(v) : null;
  };

  const basicPrice = cfg.basic ? priceText('basic') : null;
  const fullPrice = priceText('full');
  const forPrice = (p) => {
    if (!p) return '';
    if (fromPrices) return en ? ` ${p.charAt(0).toUpperCase()}${p.slice(1)}.` : ` ${p.charAt(0).toUpperCase()}${p.slice(1)}.`;
    return en ? ` For ${p}!` : ` ¡Por ${p}!`;
  };

  if (!cfg.basic) {
    const desc = cfg.full[lang] || cfg.full.es;
    return en
      ? `For your pet we offer our grooming service:\n\n✂️ ${cfg.full.name.toUpperCase()}: ${desc}.${forPrice(fullPrice)}`
      : `Para su mascota tenemos nuestro servicio de grooming:\n\n✂️ ${cfg.full.name.toUpperCase()}: ${desc}.${forPrice(fullPrice)}`;
  }

  const basicDesc = cfg.basic[lang] || cfg.basic.es;
  const lines = en
    ? [
        'We have two grooming options for your pet:',
        '',
        `🫧 ${cfg.basic.name.toUpperCase()}: ${basicDesc}.${forPrice(basicPrice)}`,
        '',
        `✂️ ${cfg.full.name.toUpperCase()}: Everything in the ${cfg.basic.name} + a haircut or deshedding!${forPrice(fullPrice)}`,
      ]
    : [
        'Tenemos dos opciones de grooming para su mascota:',
        '',
        `🫧 ${cfg.basic.name.toUpperCase()}: ${basicDesc}.${forPrice(basicPrice)}`,
        '',
        `✂️ ${cfg.full.name.toUpperCase()}: ¡Todo lo del ${cfg.basic.name} + corte de pelo o deslanado!${forPrice(fullPrice)}`,
      ];
  return lines.join('\n');
}
