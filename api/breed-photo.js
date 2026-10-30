import { BREED_WIKI } from '../src/data/breedWiki.js';
import { DOG_CEO_BREEDS, PHOTO_OVERRIDES } from '../src/data/breedPhotos.js';

const UA = 'CCCS-Desktop/1.0 (https://github.com/David77R/Call-Solutions-Desktop)';
const WIDTHS = [500, 960];
const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const COMMONS_API =
  'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&gsrsearch=';
const TIMEOUT_MS = 6000;

const squash = (text) => (text || '').toLowerCase().replace(/[^a-z]/g, '');
const sized = (src, width) => (/\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, `/${width}px-`) : src);

async function get(url, accept) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url) {
  const res = await get(url, 'application/json');
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function getImage(url) {
  const res = await get(url, 'image/avif,image/webp,image/jpeg,image/png,image/*');
  if (!res || !res.ok) return null;
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) return null;
  return { type, body: Buffer.from(await res.arrayBuffer()) };
}

function* commonsFile(breed, width) {
  const file = PHOTO_OVERRIDES[breed.key];
  if (file) yield { url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${width}`, source: 'Wikimedia Commons' };
}

async function wikiCandidates(breed, width) {
  const titles = [...new Set([breed.wiki, breed.en, `${breed.en} dog`])];
  for (const title of titles) {
    const data = await getJson(`${WIKI_API}${encodeURIComponent(title.replace(/ /g, '_'))}`);
    if (!data || data.type === 'disambiguation') continue;
    const thumb = data.thumbnail?.source;
    const original = data.originalimage;
    if (!thumb && !original) continue;
    const list = [];
    if (original && original.width && original.width <= width) list.push(original.source);
    if (thumb) list.push(sized(thumb, width), thumb);
    if (original && original.width <= 2000) list.push(original.source);
    return [...new Set(list)].map((url) => ({ url, source: 'Wikipedia' }));
  }
  return [];
}

async function dogCeoCandidates(breed) {
  const path = DOG_CEO_BREEDS[breed.key];
  if (!path) return [];
  const data = await getJson(`https://dog.ceo/api/breed/${path}/images`);
  if (!data || data.status !== 'success' || !Array.isArray(data.message) || !data.message.length) return [];
  return data.message.slice(0, 3).map((url) => ({ url, source: 'Dog CEO' }));
}

async function commonsCandidates(breed, width) {
  const name = squash(breed.en);
  const search = async (q) => {
    const data = await getJson(`${COMMONS_API}${encodeURIComponent(`${q} filetype:bitmap`)}&iiurlwidth=${width}`);
    return Object.values(data?.query?.pages || {})
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .filter((p) => /jpeg|png|webp/.test(p.imageinfo?.[0]?.mime || ''));
  };
  const files = await search(`${breed.en} dog`);
  let page = files.find((p) => squash(p.title).includes(name));
  if (!page) {
    const exact = await search(`"${breed.en}"`);
    page = exact.find((p) => squash(p.title).includes(name)) || exact[0];
  }
  const info = page?.imageinfo?.[0];
  return info ? [{ url: info.thumburl || info.url, source: 'Wikimedia Commons' }] : [];
}

async function findPhoto(breed, width) {
  const steps = [async () => [...commonsFile(breed, width)], () => wikiCandidates(breed, width), () => dogCeoCandidates(breed), () => commonsCandidates(breed, width)];
  for (const step of steps) {
    const list = await step();
    for (const candidate of list) {
      const image = await getImage(candidate.url);
      if (image) return { ...image, source: candidate.source };
    }
  }
  return null;
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const key = url.searchParams.get('key') || '';
  const asked = Number(url.searchParams.get('w')) || WIDTHS[0];
  const width = WIDTHS.reduce((best, w) => (Math.abs(w - asked) < Math.abs(best - asked) ? w : best), WIDTHS[0]);
  const breed = BREED_WIKI.find((b) => b.key === key);

  if (!breed) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    res.end('Raza no encontrada');
    return;
  }

  const photo = await findPhoto(breed, width);
  if (!photo) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    res.end('Sin foto');
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', photo.type);
  res.setHeader('X-Photo-Source', photo.source);
  res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=2592000');
  res.end(photo.body);
}
