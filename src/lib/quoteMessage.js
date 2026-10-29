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
  },
};

const COAT_PLANS = {
  doble_capa: {
    es: 'por ser una raza de doble manto que muda bastante pelo',
    en: 'since it is a double-coated breed that sheds heavily',
    full: true,
  },
  rizado: {
    es: 'por su pelaje rizado, que se enreda con facilidad',
    en: 'because its curly coat tangles easily',
    full: true,
  },
  liso_largo: {
    es: 'por su pelaje largo, que se enreda con facilidad',
    en: 'because its long coat tangles easily',
    full: true,
  },
  sedoso: {
    es: 'por su pelaje sedoso y fino',
    en: 'because of its fine, silky coat',
    full: true,
  },
  alambrado: {
    es: 'por su pelaje de textura áspera',
    en: 'because of its wiry coat',
    full: true,
  },
  corto_denso: {
    es: 'por su pelaje corto y denso',
    en: 'because of its short, dense coat',
    full: false,
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


export function breedName(item, breedFromQuery) {
  const raw = breedFromQuery || (item.type === 'breed_bundle' ? item.breed : null);
  return raw ? raw.replace(SIZE_SUFFIX, '').trim() : null;
}

const CAT_NAME = /^(gato|cat)$/i;

function petLabel(breed, lang) {
  if (!breed) return COPY[lang].pet;
  if (CAT_NAME.test(breed)) return lang === 'en' ? 'your cat' : 'su gato';
  return lang === 'en' ? `your ${breed}` : `su ${breed}`;
}

const SPECIALTY = /raza especial|double-coated|special breed/i;
const CAT_DENTAL = /dental|diente|smile/i;
const CAT_FULL = /gold|full|completo/i;
const BATH_FIRST = /bath|baño|silver|splash/i;

export function catEquivalent(item, rows) {
  const text = `${item.category_name || ''} ${item.label || ''}`;
  const type = CAT_DENTAL.test(text) ? 'dental' : CAT_FULL.test(text) ? 'full' : 'bath';
  const dogRows = rows.filter(
    (r) => r.company_slug === item.company_slug && !r.is_cat && !EXTRA.test(r.category_name) && !isBreedCategory(r.category_name) && !SPECIALTY.test(r.category_name)
  );
  const label = (r) => `${r.category_name} ${r.pill_label || ''}`;
  const pool =
    type === 'dental'
      ? dogRows.filter((r) => DENTAL.test(r.category_name) && !/promo/i.test(r.category_name))
      : dogRows.filter((r) => !DENTAL.test(r.category_name) && (type === 'full' ? FULL_SERVICE : BASIC_SERVICE).test(label(r)));
  const sorted = [...pool].sort((a, b) => (type === 'bath' ? BATH_FIRST.test(label(b)) - BATH_FIRST.test(label(a)) : 0) || a.category_order - b.category_order);
  if (sorted[0]) return sorted[0].pill_label || serviceName(sorted[0].category_name);
  return type === 'dental' ? 'Limpieza Dental' : type === 'full' ? 'Full Grooming' : 'Bath';
}

function specialtyName(row) {
  return (row.label || '').split(' - ')[0].split(' (')[0].trim();
}

function siblingServices(item, rows) {
  const isSpecialty = SPECIALTY.test(item.category_name || '');
  const base = {
    name: isSpecialty ? specialtyName(item) : item.is_cat ? serviceName(item.category_name) : item.pill_label || serviceName(item.category_name),
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
        (isSpecialty ? r.category_name === item.category_name : !SPECIALTY.test(r.category_name)) &&
        !DENTAL.test(r.category_name) &&
        !EXTRA.test(r.category_name) &&
        !(item.only_gold_alert && r.category_name.startsWith('Silver'))
    )
    .sort((a, b) => a.category_order - b.category_order)
    .map((r) => ({
      name: isSpecialty ? specialtyName(r) : r.pill_label || serviceName(r.category_name),
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
    item.is_cat
      ? getServiceDescription(descriptions, catEquivalent(item, rows), item.company_slug, lang)
      : getServiceDescription(descriptions, s.name, item.company_slug, lang) || getServiceDescription(descriptions, s.category, item.company_slug, lang);

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

const PLAN_COPY = {
  es: {
    intro: (pet, reason, name) => `Para ${pet}${reason ? `, ${reason},` : ''} le recomendamos el servicio ${name}.`,
    includes: (name, desc, price) => `El servicio ${name} incluye: ${desc} Precio: ${price}.`,
    price: (name, price) => `Precio del servicio ${name}: ${price}.`,
    addonsTitle: 'Para complementar el servicio, le sugerimos:',
    addon: (name, price) => `• ${name}: ${price}`,
    frequency: (range, goal) => `Recomendamos repetir el servicio cada ${range} para ${goal}.`,
    review: 'El precio final se confirma según la condición y el pelaje de la mascota el día del servicio.',
  },
  en: {
    intro: (pet, reason, name) => `For ${pet}${reason ? `, ${reason},` : ''} we recommend our ${name} service.`,
    includes: (name, desc, price) => `The ${name} service includes: ${desc} Price: ${price}.`,
    price: (name, price) => `${name} service price: ${price}.`,
    addonsTitle: 'To complement the service, we suggest:',
    addon: (name, price) => `• ${name}: ${price}`,
    frequency: (range, goal) => `We recommend repeating the service every ${range} to ${goal}.`,
    review: "The final price is confirmed on the day of the service based on the pet's condition and coat.",
  },
};

const FREQUENCY = {
  doble_capa: { es: ['6 a 8 semanas', 'mantener su pelaje sano y controlar la muda'], en: ['6 to 8 weeks', 'keep the coat healthy and control shedding'] },
  rizado: { es: ['4 a 6 semanas', 'evitar nudos y mantener la forma del corte'], en: ['4 to 6 weeks', 'prevent matting and keep the haircut in shape'] },
  liso_largo: { es: ['4 a 6 semanas', 'evitar nudos y mantener el pelaje suave'], en: ['4 to 6 weeks', 'prevent tangles and keep the coat soft'] },
  sedoso: { es: ['4 a 6 semanas', 'mantener su pelaje fino libre de nudos'], en: ['4 to 6 weeks', 'keep the fine coat free of tangles'] },
  alambrado: { es: ['6 a 8 semanas', 'mantener la textura y la forma de su pelaje'], en: ['6 to 8 weeks', 'keep the coat texture and shape'] },
  corto_denso: { es: ['6 a 8 semanas', 'mantener su piel y pelaje limpios y sanos'], en: ['6 to 8 weeks', 'keep the skin and coat clean and healthy'] },
};

const ADDON_PATTERNS = {
  doble_capa: [/deshed|deslan/i, /nail|uña/i, /huella|paw|balm/i],
  rizado: [/detangl|knot|nudo|dematt/i, /teeth|dient/i, /huella|paw|balm/i],
  liso_largo: [/detangl|knot|nudo|dematt/i, /huella|paw|balm/i, /teeth|dient/i],
  sedoso: [/detangl|knot|nudo|dematt/i, /teeth|dient/i, /special shampoo|shampoo especial/i],
  alambrado: [/nail|uña/i, /teeth|dient/i, /special shampoo|shampoo especial/i],
  corto_denso: [/special shampoo|shampoo especial|hydra/i, /nail|uña/i, /teeth|dient/i],
};

const ADDON_LIMIT = 3;

function addonFits(row, item) {
  if (row.weight_min_lbs == null || item.weight_min_lbs == null) return true;
  return row.weight_min_lbs <= item.weight_max_lbs && row.weight_max_lbs >= item.weight_min_lbs;
}

function pickAddons(item, rows, coat) {
  const extras = rows.filter((r) => r.company_slug === item.company_slug && EXTRA.test(r.category_name) && addonFits(r, item));
  const chosen = [];
  for (const pattern of ADDON_PATTERNS[coat] || []) {
    const found = extras.find((r) => pattern.test(r.label) && !chosen.includes(r));
    if (found) chosen.push(found);
    if (chosen.length === ADDON_LIMIT) break;
  }
  return chosen;
}

export function hasBreedSuggestion({ item, rows, breedFromQuery, optionIndex }) {
  const breed = breedName(item, breedFromQuery);
  if (!breed || CAT_NAME.test(breed) || item.is_cat) return false;
  const services = getQuoteServices(item, rows, optionIndex);
  return services.length > 0 && !isDentalQuote(services);
}

export function buildBreedSuggestion({ item, rows, descriptions, lang, breedFromQuery, optionIndex }) {
  const t = PLAN_COPY[lang] || PLAN_COPY.es;
  const base = COPY[lang] || COPY.es;
  const breed = breedName(item, breedFromQuery);
  if (!breed) return null;

  const services = getQuoteServices(item, rows, optionIndex);
  if (!services.length || isDentalQuote(services)) return null;

  const coat = coatFor(item, rows, breed);
  const plan = COAT_PLANS[coat];
  const wantsFull = plan ? plan.full : true;
  const pick = services.find((s) => (wantsFull ? FULL_SERVICE : BASIC_SERVICE).test(s.name)) || services[services.length - 1];
  const price = pick.price || base.tbd;
  const pet = petLabel(breed, lang);
  const desc =
    getServiceDescription(descriptions || {}, pick.name, item.company_slug, lang) || getServiceDescription(descriptions || {}, pick.category, item.company_slug, lang);

  const blocks = [t.intro(pet, plan ? plan[lang] : '', pick.name), desc ? t.includes(pick.name, sentence(desc), price) : t.price(pick.name, price)];

  const addons = pickAddons(item, rows, coat);
  if (addons.length) blocks.push([t.addonsTitle, ...addons.map((r) => t.addon(r.label, r.price_display || base.tbd))].join('\n'));

  const frequency = FREQUENCY[coat]?.[lang];
  if (frequency) blocks.push(t.frequency(frequency[0], frequency[1]));
  if (pick.needs_review) blocks.push(t.review);

  return blocks.join('\n\n');
}
