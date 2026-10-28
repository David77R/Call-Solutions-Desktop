import { getServiceDescription } from '../data/serviceDescriptions';
import { breedCoat, isBreedCategory } from './search';

const DENTAL = /dental|smile|placa|diente/i;
const EXTRA = /adicional|add-on/i;
const SIZE_SUFFIX = /\s+(extra large|large|medium|small|mini|xl)$/i;
const PRICE_TOKEN = /\$(\d+(?:\.\d{1,2})?)/g;
const FULL_SERVICE = /gold|full|furfection|completo/i;
const BASIC_SERVICE = /silver|bath|splash|basic|baño/i;

const COPY = {
  es: {
    pet: 'su mascota',
    many: (pet) => `Para ${pet} ofrecemos estos servicios:`,
    manyDental: (pet) => `Para ${pet} ofrecemos estos servicios dentales:`,
    one: (pet, name) => `Para ${pet} ofrecemos el servicio ${name}.`,
    dental: (pet) => `Para ${pet} ofrecemos el servicio de limpieza dental.`,
    price: 'Precio',
    tbd: 'por confirmar',
    zone: (zone, fee, total) => `Por la distancia a ${zone} se suma un cargo de $${fee} por millaje, para un total de ${total}.`,
    noZoneFee: (zone) => `Para ${zone} no hay cargo adicional por distancia.`,
    discount: (pct, total) => `Con el descuento de ${pct}%, el precio queda en ${total}.`,
    review: 'El precio está sujeto a confirmación según la condición y el pelaje de la mascota.',
    recommend: (pet, reason, name, price, includes) => `Para ${pet}, ${reason}, le recomendamos el servicio ${name} (${price}), ${includes}.`,
    includesFull: 'que incluye corte de pelo o deslanado',
    includesBasic: 'que mantiene su pelaje limpio sin necesidad de corte',
    addons: (list) => `Como complemento, le sugerimos ${list}.`,
    addon: (name, price) => `${name} por ${price}`,
    and: ' y ',
  },
  en: {
    pet: 'your pet',
    many: (pet) => `For ${pet} we offer the following services:`,
    manyDental: (pet) => `For ${pet} we offer the following dental services:`,
    one: (pet, name) => `For ${pet} we offer our ${name} service.`,
    dental: (pet) => `For ${pet} we offer our dental cleaning service.`,
    price: 'Price',
    tbd: 'to be confirmed',
    zone: (zone, fee, total) => `Since you are in ${zone}, there is a $${fee} mileage fee, for a total of ${total}.`,
    noZoneFee: (zone) => `There is no additional distance fee for ${zone}.`,
    discount: (pct, total) => `With the ${pct}% discount, the price comes to ${total}.`,
    review: "The price is subject to confirmation depending on the pet's condition and coat.",
    recommend: (pet, reason, name, price, includes) => `For ${pet}, ${reason}, we recommend our ${name} service (${price}), ${includes}.`,
    includesFull: 'which includes a haircut or deshedding',
    includesBasic: 'which keeps the coat clean without a haircut',
    addons: (list) => `As an add-on, we suggest ${list}.`,
    addon: (name, price) => `${name} for ${price}`,
    and: ' and ',
  },
};

const COAT_PLANS = {
  doble_capa: {
    es: 'por ser una raza de doble manto que muda bastante pelo',
    en: 'since it is a double-coated breed that sheds heavily',
    full: true,
    addons: [/deshed|deslan|undercoat/i, /nail|uña/i],
  },
  rizado: {
    es: 'por su pelaje rizado, que se enreda con facilidad',
    en: 'because its curly coat tangles easily',
    full: true,
    addons: [/detangl|knot|nudo|dematt/i, /teeth|dient/i],
  },
  liso_largo: {
    es: 'por su pelaje largo, que se enreda con facilidad',
    en: 'because its long coat tangles easily',
    full: true,
    addons: [/detangl|knot|nudo|dematt/i, /huella|paw|pad/i, /teeth|dient/i],
  },
  sedoso: {
    es: 'por su pelaje sedoso y fino',
    en: 'because of its fine, silky coat',
    full: true,
    addons: [/detangl|knot|nudo|dematt/i, /teeth|dient/i],
  },
  alambrado: {
    es: 'por su pelaje de textura áspera',
    en: 'because of its wiry coat',
    full: true,
    addons: [/nail|uña/i, /teeth|dient/i],
  },
  corto_denso: {
    es: 'por su pelaje corto y denso',
    en: 'because of its short, dense coat',
    full: false,
    addons: [/deshed|deslan/i, /nail|uña/i, /special shampoo|shampoo especial/i],
  },
};

const lower = (v) => (v || '').toLowerCase();
const isDental = (s) => DENTAL.test(`${s.category || ''} ${s.name || ''}`);

function serviceName(categoryName) {
  return (categoryName || '').split(' (')[0].trim();
}

function bumpPrice(display, amount) {
  if (!display || !amount) return display;
  return display.replace(PRICE_TOKEN, (m, n) => `$${(parseFloat(n) + amount).toFixed(2)}`);
}

function sentence(text) {
  const t = (text || '').trim();
  if (!t) return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function joinList(items, t) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')}${t.and}${items[items.length - 1]}`;
}

export function breedName(item, breedFromQuery) {
  const raw = breedFromQuery || (item.type === 'breed_bundle' ? item.breed : null);
  return raw ? raw.replace(SIZE_SUFFIX, '').trim() : null;
}

function petLabel(breed, lang) {
  if (!breed) return COPY[lang].pet;
  return lang === 'en' ? `your ${breed}` : `su ${breed}`;
}

function siblingServices(item, rows) {
  const base = {
    name: item.pill_label || serviceName(item.category_name),
    category: item.category_name,
    price: item.price_display,
    needs_review: item.needs_review,
  };
  if (item.weight_min_lbs == null || item.weight_max_lbs == null || isDental(base) || EXTRA.test(item.category_name || '')) {
    return [base];
  }

  const amount = item.surcharge_amount_applied || 0;
  const siblings = rows
    .filter(
      (r) =>
        r.company_slug === item.company_slug &&
        r.weight_min_lbs === item.weight_min_lbs &&
        r.weight_max_lbs === item.weight_max_lbs &&
        !isBreedCategory(r.category_name) &&
        !DENTAL.test(r.category_name) &&
        !EXTRA.test(r.category_name) &&
        !(item.only_gold_alert && r.category_name.startsWith('Silver'))
    )
    .sort((a, b) => a.category_order - b.category_order)
    .map((r) => ({
      name: r.pill_label || serviceName(r.category_name),
      category: r.category_name,
      price: bumpPrice(r.price_display, amount),
      needs_review: r.needs_review,
    }));

  if (!siblings.length) return [base];
  return siblings.some((s) => s.name === base.name) ? siblings.map((s) => (s.name === base.name ? { ...s, price: base.price } : s)) : [base, ...siblings];
}

export function getQuoteServices(item, rows, optionIndex = 0) {
  if (item.type !== 'breed_bundle') return siblingServices(item, rows);
  const options = (item.options || []).map((o) => ({ name: o.name, category: o.name, price: o.price, needs_review: o.needs_review }));
  const selected = options[optionIndex] || options[0];
  if (!selected) return [];
  const wantDental = isDental(selected);
  return options.filter((o) => isDental(o) === wantDental);
}

export function isDentalQuote(services) {
  return services.length > 0 && services.every(isDental);
}

export function buildQuoteMessage({ item, rows, descriptions, lang, breedFromQuery, optionIndex, zone, zoneTotal, discount, discountTotal }) {
  const t = COPY[lang] || COPY.es;
  const pet = petLabel(breedName(item, breedFromQuery), lang);
  const describe = (s) =>
    getServiceDescription(descriptions, s.name, item.company_slug, lang) || getServiceDescription(descriptions, s.category, item.company_slug, lang);

  const services = getQuoteServices(item, rows, optionIndex);
  const dental = isDentalQuote(services);
  const lines = [];

  if (services.length === 1) {
    const s = services[0];
    lines.push(dental ? t.dental(pet) : t.one(pet, s.name));
    const desc = describe(s);
    if (desc) lines.push(sentence(desc));
    lines.push(`${t.price}: ${s.price || t.tbd}.`);
  } else {
    lines.push(dental ? t.manyDental(pet) : t.many(pet), '');
    for (const s of services) {
      const desc = describe(s);
      lines.push(`• ${s.name}${desc ? `: ${sentence(desc)}` : '.'} ${t.price}: ${s.price || t.tbd}.`);
    }
  }

  const extras = [];
  if (discount) extras.push(t.discount(discount.pct, discountTotal));
  if (zone) extras.push(zone.fee > 0 ? t.zone(zone.name, zone.fee, zoneTotal) : t.noZoneFee(zone.name));
  if (services.some((s) => s.needs_review)) extras.push(t.review);
  if (extras.length) lines.push('', ...extras);

  return lines.join('\n');
}

function coatFor(item, rows, breed) {
  if (item.coat) return item.coat;
  if (!breed) return null;
  const needle = lower(breed);
  const match = rows.find((r) => r.coat && lower(r.label).includes(needle));
  return match ? match.coat : breedCoat(breed);
}

export function buildBreedSuggestion({ item, rows, lang, breedFromQuery, optionIndex }) {
  const t = COPY[lang] || COPY.es;
  const breed = breedName(item, breedFromQuery);
  const plan = COAT_PLANS[coatFor(item, rows, breed)];
  if (!breed || !plan) return null;

  const services = getQuoteServices(item, rows, optionIndex);
  if (!services.length || isDentalQuote(services)) return null;

  const pick = services.find((s) => (plan.full ? FULL_SERVICE : BASIC_SERVICE).test(s.name)) || services[services.length - 1];

  const extras = rows.filter((r) => r.company_slug === item.company_slug && EXTRA.test(r.category_name));
  const chosen = [];
  for (const pattern of plan.addons) {
    const found = extras.find((r) => pattern.test(r.label) && !chosen.includes(r));
    if (found) chosen.push(found);
    if (chosen.length === 2) break;
  }

  const lines = [t.recommend(petLabel(breed, lang), plan[lang], pick.name, pick.price || t.tbd, plan.full ? t.includesFull : t.includesBasic)];
  if (chosen.length) lines.push(t.addons(joinList(chosen.map((r) => t.addon(r.label, r.price_display || t.tbd)), t)));
  return lines.join(' ');
}
