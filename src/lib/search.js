import { BREED_WEIGHTS } from '../data/breedWeights';
import { resolveBreedAliases } from '../data/breedAliases';

const WEIGHT_REGEX = /(\d+(?:\.\d+)?)\s*(lbs?|libras?)?/i;
const SPECIAL_BREED_SURCHARGE_AMOUNT = 10;
const PRICE_TOKEN_REGEX = /\$(\d+(?:\.\d{1,2})?)/g;
const LARGE_WEIGHT_THRESHOLD_LBS = 46;
const DOUBLE_COAT_LARGE_ALERT_FOUND =
  'Raza de doble capa: se cobra el precio Large sin importar el tamaño natural de la raza.';
const DOUBLE_COAT_LARGE_ALERT_MISSING =
  'Raza de doble capa: verificar con la empresa el precio Large a cobrar (no hay tarifa Large genérica registrada para esta empresa).';
const ONLY_GOLD_DESCRIPTION =
  'Baño, secado, limpieza de oídos, cuidado de uñas, afeitado sanitario + corte de pelo o deslanado profesional';
const DENTAL_KEYWORDS = ['dental', 'smile', 'placa', 'diente'];
const BREED_CATEGORY_PREFIX = 'grooming por raza';
const SEARCH_LIMIT = 200;

const lower = (v) => (v || '').toLowerCase();
const compare = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
const byCatalogOrder = (a, b) =>
  compare(a.company_name, b.company_name) ||
  compare(a.category_name, b.category_name) ||
  a.sort_order - b.sort_order;

export function isBreedCategory(name) {
  return lower(name).startsWith(BREED_CATEGORY_PREFIX);
}

export function flattenCatalog(companies) {
  const rows = [];
  for (const company of companies) {
    (company.categories || []).forEach((cat, ci) => {
      (cat.items || []).forEach((item, ii) => {
        rows.push({
          company_slug: company.slug,
          company_name: company.name,
          color_primary: company.color_primary,
          category_name: cat.name,
          pill_label: cat.pill_label || null,
          category_order: ci,
          sort_order: ii,
          label: item.label,
          price_display: item.price_display ?? null,
          needs_review: !!item.needs_review,
          coat: item.coat ?? null,
          service_note: item.service_note ?? null,
          weight_min_lbs: item.weight_min_lbs ?? null,
          weight_max_lbs: item.weight_max_lbs ?? null,
        });
      });
    });
  }
  return rows;
}

export function extractWeightLbs(text) {
  const match = text.match(WEIGHT_REGEX);
  if (!match) return null;
  return parseFloat(match[1]);
}

export function stripWeight(text) {
  return text.replace(WEIGHT_REGEX, '').replace(/[,;]+/g, ' ').trim();
}

export function findBreed(text) {
  const needle = lower(text).trim();
  if (!needle) return null;

  if (BREED_WEIGHTS[needle]) return { breed: needle, ...BREED_WEIGHTS[needle] };

  for (const canonical of resolveBreedAliases(needle)) {
    if (BREED_WEIGHTS[canonical]) return { breed: canonical, ...BREED_WEIGHTS[canonical] };
  }

  let best = null;
  for (const [breed, range] of Object.entries(BREED_WEIGHTS)) {
    if (needle.includes(breed) || breed.includes(needle)) {
      if (!best || breed.length > best.breed.length) best = { breed, ...range };
    }
  }
  return best;
}

function hasWeights(row) {
  return row.weight_min_lbs != null && row.weight_max_lbs != null;
}

function inCompany(slug) {
  return (row) => !slug || row.company_slug === slug;
}

function addAmountToPriceDisplay(display, amount) {
  if (!display) return display;
  return display.replace(PRICE_TOKEN_REGEX, (match, numberPart) => `$${(parseFloat(numberPart) + amount).toFixed(2)}`);
}

function keywordMatch(keywords, textPart) {
  const needle = lower(textPart);
  return keywords.map((k) => lower(k).trim()).some((k) => needle.includes(k) || k.includes(needle));
}

function getSurchargeMap(companies, textPart, slug) {
  const map = {};
  if (!textPart) return map;
  for (const c of companies) {
    if (slug && c.slug !== slug) continue;
    const rule = c.special_breed_surcharge;
    if (!rule || !rule.keywords) continue;
    if (keywordMatch(rule.keywords, textPart)) {
      map[c.slug] = {
        amount: SPECIAL_BREED_SURCHARGE_AMOUNT,
        note: `Recargo de $${SPECIAL_BREED_SURCHARGE_AMOUNT} por raza especial`,
      };
    }
  }
  return map;
}

function getDoubleCoatMap(companies, textPart, slug) {
  const map = {};
  if (!textPart) return map;
  for (const c of companies) {
    if (slug && c.slug !== slug) continue;
    const rule = c.double_coat_breeds;
    if (!rule || !rule.keywords) continue;
    if (keywordMatch(rule.keywords, textPart)) map[c.slug] = rule.label || 'Solo Gold';
  }
  return map;
}

function isDentalService(row) {
  const text = lower(`${row.category_name || ''} ${row.label || ''}`);
  return DENTAL_KEYWORDS.some((k) => text.includes(k));
}

function withSurcharge(row, surchargeMap) {
  if (isDentalService(row)) return row;
  const surcharge = surchargeMap[row.company_slug];
  if (!surcharge) return row;
  return {
    ...row,
    surcharge_alert: surcharge.note,
    surcharge_amount_applied: surcharge.amount,
    original_price_display: row.price_display,
    price_display: addAmountToPriceDisplay(row.price_display, surcharge.amount),
  };
}

function applyDoubleCoat(rows, doubleCoatMap) {
  return rows
    .filter((r) => !doubleCoatMap[r.company_slug] || !r.category_name.startsWith('Silver'))
    .map((r) => {
      const label = doubleCoatMap[r.company_slug];
      if (!label || !r.category_name.startsWith('Gold')) return r;
      return { ...r, only_gold_alert: label, original_category_name: r.category_name, category_name: ONLY_GOLD_DESCRIPTION };
    });
}

function getMixedBreedLargePrice(rows, slug) {
  const candidates = rows.filter((r) => {
    if (r.company_slug !== slug) return false;
    const label = lower(r.label);
    const cat = lower(r.category_name);
    return (
      label.includes('mixed breed') &&
      (cat.includes('large') || label.includes('large')) &&
      !cat.includes('extra large') &&
      !label.includes('extra large')
    );
  });
  candidates.sort((a, b) => (b.weight_min_lbs ?? -Infinity) - (a.weight_min_lbs ?? -Infinity));
  return candidates[0] || null;
}

function withDoubleCoatLargePricing(rows, row) {
  const naturallyLarge = row.weight_min_lbs != null && row.weight_min_lbs >= LARGE_WEIGHT_THRESHOLD_LBS;
  if (row.coat !== 'doble_capa' || naturallyLarge) return row;

  const largeRef = getMixedBreedLargePrice(rows, row.company_slug);
  if (largeRef) {
    return {
      ...row,
      double_coat_large_alert: DOUBLE_COAT_LARGE_ALERT_FOUND,
      original_price_display: row.original_price_display || row.price_display,
      price_display: largeRef.price_display,
      needs_review: row.needs_review || !!largeRef.needs_review,
    };
  }
  return { ...row, double_coat_large_alert: DOUBLE_COAT_LARGE_ALERT_MISSING };
}

function labelSearch(rows, text, slug) {
  const needle = lower(text);
  return rows
    .filter(inCompany(slug))
    .filter((r) => lower(r.label).includes(needle) || lower(r.category_name).includes(needle))
    .sort(byCatalogOrder)
    .slice(0, SEARCH_LIMIT);
}

function weightPointSearch(rows, weight, slug) {
  return rows
    .filter(inCompany(slug))
    .filter((r) => hasWeights(r) && weight >= r.weight_min_lbs && weight <= r.weight_max_lbs)
    .sort(byCatalogOrder)
    .slice(0, SEARCH_LIMIT);
}

function weightRangeSearch(rows, min, max, slug) {
  return rows
    .filter(inCompany(slug))
    .filter((r) => hasWeights(r) && r.weight_min_lbs <= max && r.weight_max_lbs >= min)
    .sort(byCatalogOrder)
    .slice(0, SEARCH_LIMIT);
}

export function searchPriceItems({ companies, rows }, queryText, slug) {
  const explicitWeight = extractWeightLbs(queryText);
  const textPart = (explicitWeight != null ? queryText.replace(WEIGHT_REGEX, '') : queryText).trim();

  const surchargeMap = getSurchargeMap(companies, textPart, slug);
  const doubleCoatMap = getDoubleCoatMap(companies, textPart, slug);
  const finish = (list) => applyDoubleCoat(list.map((r) => withSurcharge(r, surchargeMap)), doubleCoatMap).map((r) => withDoubleCoatLargePricing(rows, r));

  let textResults = [];
  if (textPart) {
    textResults = labelSearch(rows, textPart, slug);
    for (const canonical of resolveBreedAliases(textPart)) {
      textResults = [...textResults, ...labelSearch(rows, canonical, slug)];
    }
    const seen = new Set();
    textResults = textResults.filter((r) => {
      const key = `${r.company_slug}|${r.label}|${r.category_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const breedInfo = textPart.length >= MIN_BREED_TEXT ? findBreed(textPart) || breedFromCatalog(textResults) : null;
  const breedFound = explicitWeight == null ? breedInfo : null;
  const breedRange = breedFound ? { min: breedFound.min, max: breedFound.max } : null;

  if (explicitWeight == null && breedRange == null) {
    return finish(textResults.map((r) => ({ ...r, weight_match: null, suggested: false })));
  }

  const checkWeightMatch = (r) => {
    if (!hasWeights(r)) return null;
    if (explicitWeight != null) return explicitWeight >= r.weight_min_lbs && explicitWeight <= r.weight_max_lbs;
    return r.weight_min_lbs <= breedRange.max && r.weight_max_lbs >= breedRange.min;
  };

  const flagged = textResults.map((r) => ({ ...r, weight_match: checkWeightMatch(r), suggested: false }));
  const keepFlagged = explicitWeight != null ? flagged.filter((r) => r.weight_match !== false) : flagged;
  const coveredSlugs = new Set(keepFlagged.map((r) => r.company_slug));

  const weightRows =
    explicitWeight != null
      ? weightPointSearch(rows, explicitWeight, slug)
      : weightRangeSearch(rows, breedRange.min, breedRange.max, slug);

  const candidates = weightRows.filter((r) => !coveredSlugs.has(r.company_slug));
  const fallback = (breedInfo ? packagesForBreed(candidates, breedInfo) : candidates)
    .sort(
      (a, b) =>
        compare(a.company_name, b.company_name) ||
        isDentalService(a) - isDentalService(b) ||
        a.category_order - b.category_order ||
        a.weight_min_lbs - b.weight_min_lbs
    )
    .map((r) => ({ ...r, weight_match: true, suggested: true }));

  return finish([...keepFlagged, ...fallback]);
}

const MIN_BREED_TEXT = 3;
const EXTRA_CATEGORY = /adicional|add-on/i;
const MIXED_BREED = /^mixed breed/i;

const SPECIALTY_PACKAGES = [
  { category: /raza especial.*husky/i, fits: (b) => b.coat === 'doble_capa' },
  { category: /raza especial.*(poodle|sheepdog)/i, fits: (b) => b.coat === 'rizado' || /sheep/.test(b.breed) },
  { category: /raza especial.*cavalier/i, fits: (b) => /cavalier/.test(b.breed) },
  { category: /raza especial.*cocker/i, fits: (b) => /cocker|spaniel/.test(b.breed) },
  { category: /double-coated/i, fits: (b) => b.coat === 'doble_capa' },
];

function specialtyFor(row) {
  return SPECIALTY_PACKAGES.find((s) => s.category.test(row.category_name)) || null;
}

function breedFromCatalog(textResults) {
  const found = textResults.filter((r) => isBreedCategory(r.category_name) && hasWeights(r) && !MIXED_BREED.test(r.label));
  if (!found.length) return null;
  return {
    breed: lower(found[0].label),
    min: Math.min(...found.map((r) => r.weight_min_lbs)),
    max: Math.max(...found.map((r) => r.weight_max_lbs)),
    coat: found[0].coat,
  };
}

function packagesForBreed(rows, breed) {
  const usable = rows.filter((r) => {
    if (EXTRA_CATEGORY.test(r.category_name)) return false;
    if (isBreedCategory(r.category_name)) return MIXED_BREED.test(r.label);
    const specialty = specialtyFor(r);
    return !specialty || specialty.fits(breed);
  });
  const withSpecialty = new Set(usable.filter((r) => specialtyFor(r)).map((r) => r.company_slug));
  return usable.filter((r) => !withSpecialty.has(r.company_slug) || specialtyFor(r) || isDentalService(r));
}

export function breedCoat(name) {
  return name ? findBreed(name)?.coat || null : null;
}

function parseBathFullOptions(display) {
  if (!display) return [];
  return [...display.matchAll(/([A-Za-z\s]+?)\s*\$([\d.]+)/g)].map((m) => ({ name: m[1].trim(), price: `$${m[2]}` }));
}

export function getBreedBundle({ rows }, slug, breedLabel) {
  const found = rows.find((r) => r.company_slug === slug && r.label === breedLabel && isBreedCategory(r.category_name));
  if (!found) return null;

  const breedItem = withDoubleCoatLargePricing(rows, found);
  const options = parseBathFullOptions(breedItem.price_display).map((opt) => ({
    ...opt,
    needs_review: !!breedItem.needs_review,
  }));

  if (hasWeights(breedItem)) {
    rows
      .filter(
        (r) =>
          r.company_slug === slug &&
          r.weight_min_lbs === breedItem.weight_min_lbs &&
          r.weight_max_lbs === breedItem.weight_max_lbs &&
          !isBreedCategory(r.category_name)
      )
      .sort((a, b) => a.category_order - b.category_order)
      .forEach((r) => options.push({ name: r.pill_label || r.category_name, price: r.price_display, needs_review: !!r.needs_review }));
  }

  return {
    type: 'breed_bundle',
    breed: breedItem.label,
    category_name: breedItem.category_name,
    company_slug: breedItem.company_slug,
    company_name: breedItem.company_name,
    color_primary: breedItem.color_primary,
    coat: breedItem.coat,
    weight_min_lbs: breedItem.weight_min_lbs,
    weight_max_lbs: breedItem.weight_max_lbs,
    needs_review: !!breedItem.needs_review,
    service_note: breedItem.service_note,
    double_coat_large_alert: breedItem.double_coat_large_alert || null,
    options,
  };
}

export function isDiscountEligible(item) {
  if (item.type === 'breed_bundle') return false;
  const cat = lower(item.category_name);
  if (item.company_slug === 'famous') return cat.includes('dental');
  if (item.company_slug === 'tinis') return !cat.includes('adicional');
  if (item.company_slug === 'cruzin') return cat.includes('dental') || cat.includes('smile') || cat.includes('placa');
  return false;
}

const SIZE_WORDS = [
  ['extra large', 'Extra Large'],
  ['xl', 'Extra Large'],
  ['large', 'Large'],
  ['medium', 'Medium'],
  ['small', 'Small'],
  ['mini', 'Mini'],
  ['toy', 'Toy'],
];

function sizeName(label) {
  const l = lower(label);
  for (const [word, name] of SIZE_WORDS) {
    if (l.includes(word)) return name;
  }
  return label.split(/[(-]/)[0].trim();
}

export function getSizeBands(company) {
  if (!company) return [];
  for (const cat of company.categories || []) {
    if (isBreedCategory(cat.name)) continue;
    const items = (cat.items || []).filter((i) => i.weight_min_lbs != null && i.weight_max_lbs != null);
    if (items.length >= 3) {
      return items
        .map((i) => ({ name: sizeName(i.label), min: i.weight_min_lbs, max: i.weight_max_lbs }))
        .sort((a, b) => a.min - b.min);
    }
  }
  return [];
}

export function parsePrice(display) {
  if (!display) return null;
  const match = display.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

export function itemKey(item) {
  if (!item) return '';
  return `${item.company_slug}::${item.category_name || ''}::${item.label || item.breed || ''}`;
}

export function titleCase(text) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}
