import { useEffect, useState } from 'react';
import { BREED_WIKI } from '../data/breedWiki';
import { BREED_WEIGHTS } from '../data/breedWeights';
import { findBreed, isBreedCategory, parsePrice, searchPriceItems } from './search';

const PHOTO_KEY = 'ccs_breed_photos_v4';
const MISSING_TTL_MS = 2 * 24 * 60 * 60 * 1000;
const CARD_WIDTH = 500;
const LARGE_WIDTH = 960;
const PHOTO_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKI_SEARCH = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3&prop=pageimages&piprop=thumbnail|original&pithumbsize=500&gsrsearch=';
const DOG_CEO = 'https://dog.ceo/api/breed/';
const COMMONS_SEARCH = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&gsrsearch=';

const DOG_CEO_BREEDS = {
  akita: 'akita',
  'alaskan malamute': 'malamute',
  'australian shepherd l': 'australian/shepherd',
  'basset hound': 'hound/basset',
  beagle: 'beagle',
  'belgian malinois': 'malinois',
  'bernese mountain dog': 'mountain/bernese',
  'border collie large': 'collie/border',
  'boston terrier': 'bulldog/boston',
  boxer: 'boxer',
  'carlino / pug': 'pug',
  'cavalier king charles': 'spaniel/blenheim',
  chihuahua: 'chihuahua',
  'chow chow': 'chow',
  'cocker spaniel': 'spaniel/cocker',
  corgi: 'pembroke',
  doberman: 'doberman',
  'english bulldog': 'bulldog/english',
  'french bulldog': 'bulldog/french',
  'german shepherd': 'germanshepherd',
  'golden retriever': 'retriever/golden',
  'great dane': 'dane/great',
  'great pyrenees': 'pyrenees',
  husky: 'husky',
  'labrador retriever': 'labrador',
  maltese: 'maltese',
  mastiff: 'mastiff/english',
  newfoundland: 'newfoundland',
  'american pitbull terrier': 'pitbull',
  pomeranian: 'pomeranian',
  'rottweiler large': 'rottweiler',
  'saint bernard': 'stbernard',
  schnauzer: 'schnauzer',
  'schnauzer mini': 'schnauzer/miniature',
  'giant schnauzer': 'schnauzer/giant',
  'shih tzu': 'shihtzu',
  'standard poodle': 'poodle/standard',
  'miniature poodle': 'poodle/miniature',
  'toy poodle': 'poodle/toy',
  'wheaten terrier': 'terrier/wheaten',
  'yorkshire terrier': 'terrier/yorkshire',
  labradoodle: 'labradoodle',
  cockapoo: 'cockapoo',
  cavapoo: 'cavapoo',
  dalmata: 'dalmatian',
  dachshund: 'dachshund',
  'american staffordshire terrier': 'terrier/american',
  'staffordshire bull terrier': 'bullterrier/staffordshire',
  'bull terrier': 'terrier/bull',
  'shar pei': 'sharpei',
  'rhodesian ridgeback': 'ridgeback/rhodesian',
  weimaraner: 'weimaraner',
  vizsla: 'vizsla',
  'german shorthaired pointer': 'pointer/germanlonghair',
  'italian greyhound': 'greyhound/italian',
  whippet: 'whippet',
  bloodhound: 'hound/blood',
  basenji: 'basenji',
  'jack russell terrier': 'terrier/russell',
  'miniature pinscher': 'pinscher/miniature',
  'shiba inu': 'shiba',
  samoyed: 'samoyed',
  'norwegian elkhound': 'elkhound/norwegian',
  'american eskimo dog': 'eskimo',
  'shetland sheepdog': 'sheepdog/shetland',
  collie: 'collie',
  keeshond: 'keeshond',
  'australian cattle dog': 'cattledog/australian',
  'old english sheepdog': 'sheepdog/english',
  leonberger: 'leonberg',
  'tibetan mastiff': 'mastiff/tibetan',
  'bichon frise': 'frise/bichon',
  havanese: 'havanese',
  papillon: 'papillon',
  'japanese chin': 'spaniel/japanese',
  'english springer spaniel': 'springer/english',
  brittany: 'spaniel/brittany',
  'lhasa apso': 'lhasa',
  pekingese: 'pekinese',
  'afghan hound': 'hound/afghan',
  'coton de tulear': 'cotondetulear',
  'west highland white terrier': 'terrier/westhighland',
  'airedale terrier': 'airedale',
  'scottish terrier': 'terrier/scottish',
  'cairn terrier': 'terrier/cairn',
  'american bulldog': 'bulldog/american',
};
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

function sized(src, width) {
  return /\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, `/${width}px-`) : src;
}

function fromWiki(thumb, original) {
  if (!thumb && !original) return null;
  const origWidth = original?.width || 0;
  const base = thumb?.source || original.source;
  const card = original && origWidth && origWidth <= CARD_WIDTH ? original.source : sized(base, CARD_WIDTH);
  const large = original && origWidth && origWidth <= LARGE_WIDTH ? original.source : sized(base, LARGE_WIDTH);
  const backups = [thumb?.source, original && origWidth <= 2000 ? original.source : null].filter(Boolean);
  return { src: card, large, backups, source: 'Wikipedia' };
}

async function fetchSummary(title) {
  const res = await fetch(`${WIKI_API}${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === 'disambiguation') return null;
  return fromWiki(data.thumbnail, data.originalimage);
}

async function fetchDogCeo(key) {
  const path = DOG_CEO_BREEDS[key];
  if (!path) return null;
  const res = await fetch(`${DOG_CEO}${path}/images/random`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 'success' || !data.message) return null;
  return { src: data.message, large: data.message, source: 'Dog CEO' };
}

async function fetchSearch(breed) {
  const res = await fetch(`${WIKI_SEARCH}${encodeURIComponent(`${breed.en} dog breed`)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const page = pages.find((p) => p.thumbnail || p.original);
  return page ? fromWiki(page.thumbnail, page.original ? { source: page.original.source, width: page.original.width } : null) : null;
}

const squash = (text) => (text || '').toLowerCase().replace(/[^a-z]/g, '');

async function fetchCommons(breed) {
  const res = await fetch(`${COMMONS_SEARCH}${encodeURIComponent(`${breed.en} dog filetype:bitmap`)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const name = squash(breed.en);
  const files = Object.values(data.query?.pages || {})
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .filter((p) => /jpeg|png|webp/.test(p.imageinfo?.[0]?.mime || '') && squash(p.title).includes(name));
  const info = files[0]?.imageinfo?.[0];
  if (!info) return null;
  const card = info.thumburl || info.url;
  return { src: card, large: sized(card, LARGE_WIDTH), backups: [info.url], source: 'Wikimedia Commons' };
}

export async function loadBackupPhoto(breed) {
  try {
    const found = (await fetchDogCeo(breed.key)) || (await fetchCommons(breed)) || null;
    if (found) writeCache(breed.key, found);
    return found;
  } catch {
    return null;
  }
}

export function loadBreedPhoto(breed) {
  const cached = readCache()[breed.key];
  if (cached && Date.now() - cached.at < (cached.src ? PHOTO_TTL_MS : MISSING_TTL_MS)) return Promise.resolve(cached.src ? cached : null);
  if (pending.has(breed.key)) return pending.get(breed.key);
  const titles = [...new Set([breed.wiki, breed.en, `${breed.en} dog`])];
  const steps = [...titles.map((t) => () => fetchSummary(t)), () => fetchDogCeo(breed.key), () => fetchCommons(breed), () => fetchSearch(breed)];
  const job = (async () => {
    let offline = true;
    for (const step of steps) {
      try {
        const found = await step();
        offline = false;
        if (found) {
          writeCache(breed.key, found);
          return found;
        }
      } catch {
        continue;
      }
    }
    if (!offline) writeCache(breed.key, { src: null });
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
