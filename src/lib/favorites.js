import { itemKey } from './search';

const FAVORITES_KEY = 'ccs_favorites_v1';
const HISTORY_KEY = 'ccs_history_v1';
const HISTORY_LIMIT = 12;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function snapshotItem(item) {
  return {
    type: item.type || null,
    breed: item.breed || null,
    label: item.label || null,
    category_name: item.category_name || null,
    pill_label: item.pill_label || null,
    company_slug: item.company_slug,
    company_name: item.company_name,
    color_primary: item.color_primary,
    coat: item.coat || null,
    price_display: item.type === 'breed_bundle' ? item.options?.[0]?.price || null : item.price_display || null,
    needs_review: item.needs_review || false,
  };
}

export function getFavorites() {
  return read(FAVORITES_KEY);
}

export function isFavorite(item) {
  const key = itemKey(item);
  return getFavorites().some((f) => itemKey(f) === key);
}

export function toggleFavorite(item) {
  const favs = getFavorites();
  const key = itemKey(item);
  const exists = favs.some((f) => itemKey(f) === key);
  write(FAVORITES_KEY, exists ? favs.filter((f) => itemKey(f) !== key) : [snapshotItem(item), ...favs]);
  return !exists;
}

export function getHistory() {
  return read(HISTORY_KEY);
}

export function addToHistory(item) {
  const key = itemKey(item);
  const next = [snapshotItem(item), ...getHistory().filter((h) => itemKey(h) !== key)].slice(0, HISTORY_LIMIT);
  write(HISTORY_KEY, next);
  return next;
}
