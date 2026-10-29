import { useEffect, useState } from 'react';
import { BREED_WIKI } from '../data/breedWiki';
import { BREED_WEIGHTS } from '../data/breedWeights';
import { findBreed, isBreedCategory, parsePrice, searchPriceItems } from './search';

const PHOTO_KEY = 'ccs_breed_photos_v1';
const PHOTO_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const DENTAL = /dental|smile|placa/i;
const EXTRA = /adicional|add-on/i;
const FULL = /gold|full|furfection|completo/i;
const BASIC = /silver|bath|splash|basic|baño/i;
const MIXED = /^mixed breed/i;

export const COAT_LABELS = {
  doble_capa: 'Doble manto',
  rizado: 'Rizado',
  liso_largo: 'Largo y liso',
  sedoso: 'Sedoso',
  alambrado: 'Pelo duro',
  corto_denso: 'Corto',
};

export const SIZE_LABELS = ['Pequeño', 'Mediano', 'Grande', 'Gigante'];

export function sizeOf(weight) {
  const mid = (weight.min + weight.max) / 2;
  if (mid < 20) return 'Pequeño';
  if (mid < 40) return 'Mediano';
  if (mid < 75) return 'Grande';
  return 'Gigante';
}

export const BREEDS = BREED_WIKI.map((b) => {
  const weight = BREED_WEIGHTS[b.key];
  return { ...b, weight, coat: weight.coat, size: sizeOf(weight) };
}).sort((a, b) => a.name.localeCompare(b.name, 'es'));

export function wikiForBreedName(name) {
  if (!name) return null;
  const found = findBreed(name);
  if (!found) return null;
  return BREEDS.find((b) => b.key === found.breed) || null;
}

let memory = null;

function readCache() {
  if (memory) return memory;
  try {
    memory = JSON.parse(localStorage.getItem(PHOTO_KEY) || '{}') || {};
  } catch {
    memory = {};
  }
  return memory;
}

function writeCache(key, value) {
  const cache = readCache();
  cache[key] = { ...value, at: Date.now() };
  try {
    localStorage.setItem(PHOTO_KEY, JSON.stringify(cache));
  } catch {
    return;
  }
}

const pending = new Map();

async function fetchSummary(title) {
  const res = await fetch(`${WIKI_API}${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === 'disambiguation' || !data.thumbnail?.source) return null;
  return { src: data.thumbnail.source, large: data.originalimage?.source || data.thumbnail.source, page: data.content_urls?.desktop?.page || null };
}

export function loadBreedPhoto(breed) {
  const cached = readCache()[breed.key];
  if (cached && Date.now() - cached.at < PHOTO_TTL_MS) return Promise.resolve(cached.src ? cached : null);
  if (pending.has(breed.key)) return pending.get(breed.key);
  const titles = [...new Set([breed.wiki, breed.en, `${breed.en} dog`])];
  const job = (async () => {
    for (const title of titles) {
      try {
        const found = await fetchSummary(title);
        if (found) {
          writeCache(breed.key, found);
          return found;
        }
      } catch {
        return null;
      }
    }
    writeCache(breed.key, { src: null });
    return null;
  })();
  pending.set(breed.key, job);
  job.finally(() => pending.delete(breed.key));
  return job;
}

export function useBreedPhoto(breed, enabled = true) {
  const [photo, setPhoto] = useState(() => {
    const cached = breed ? readCache()[breed.key] : null;
    return cached?.src ? cached : null;
  });
  const [state, setState] = useState(photo ? 'ready' : 'idle');

  useEffect(() => {
    if (!breed || !enabled || state !== 'idle') return undefined;
    let alive = true;
    loadBreedPhoto(breed).then((found) => {
      if (!alive) return;
      setPhoto(found);
      setState(found ? 'ready' : 'missing');
    });
    return () => {
      alive = false;
    };
  }, [breed, enabled, state]);

  return { photo, state: enabled && state === 'idle' ? 'loading' : state };
}

function money(n) {
  return `$${Math.round(n)}`;
}

function priceRange(values) {
  const list = values.filter((v) => v != null);
  if (!list.length) return null;
  const min = Math.min(...list);
  const max = Math.max(...list);
  return min === max ? money(min) : `${money(min)} – ${money(max)}`;
}

function bundlePrice(display, wantFull) {
  const pattern = wantFull ? /full grooming[^$]*\$([\d.]+)/i : /bath[^$]*\$([\d.]+)/i;
  const m = (display || '').match(pattern);
  return m ? parseFloat(m[1]) : null;
}

function serviceLabel(row) {
  const category = row.original_category_name || row.category_name;
  if (/raza especial|double-coated|special breed/i.test(category)) return category.replace(/^raza especial\s*-\s*/i, '');
  return row.pill_label || category.split(' (')[0];
}

function overlaps(row, weight) {
  if (row.weight_min_lbs == null || row.weight_max_lbs == null) return true;
  return row.weight_min_lbs <= weight.max && row.weight_max_lbs >= weight.min;
}

function closest(rows, weight) {
  const mid = (weight.min + weight.max) / 2;
  const score = (r) => (r.weight_min_lbs == null ? 999 : r.weight_min_lbs <= mid && r.weight_max_lbs >= mid ? 0 : Math.min(Math.abs(r.weight_min_lbs - mid), Math.abs(r.weight_max_lbs - mid)));
  return [...rows].sort((a, b) => score(a) - score(b))[0];
}

export function recommendServices(breed, catalog) {
  if (!catalog.rows.length) return [];
  const wantFull = breed.coat !== 'corto_denso';
  const results = searchPriceItems(catalog, breed.key, null);
  return catalog.companies
    .map((company) => {
      const rows = results.filter(
        (r) => r.company_slug === company.slug && !DENTAL.test(r.category_name) && !EXTRA.test(r.category_name) && !r.is_cat && overlaps(r, breed.weight)
      );
      if (!rows.length) return null;
      const breedRows = rows.filter((r) => isBreedCategory(r.category_name));
      if (breedRows.length) {
        const own = breedRows.filter((r) => !MIXED.test(r.label));
        const best = closest(own.length ? own : breedRows, breed.weight);
        return {
          slug: company.slug,
          name: company.name,
          color: company.color_primary,
          service: `${wantFull ? 'Full Grooming' : 'Bath'} · ${best.label}`,
          price: priceRange([bundlePrice(best.price_display, wantFull)]),
        };
      }
      const preferred = rows.filter((r) => (wantFull ? FULL : BASIC).test(`${r.original_category_name || r.category_name} ${r.pill_label || ''} ${r.label}`));
      const chosen = preferred.length ? preferred : rows;
      const label = serviceLabel(chosen[0]);
      const same = chosen.filter((r) => serviceLabel(r) === label);
      return {
        slug: company.slug,
        name: company.name,
        color: company.color_primary,
        service: label,
        price: priceRange(same.map((r) => parsePrice(r.price_display))),
      };
    })
    .filter(Boolean);
}
