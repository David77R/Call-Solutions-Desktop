import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { defaultCompanyDescriptions, defaultGlobalDescriptions } from '../data/serviceDescriptions';

const DEFAULTS = { global: defaultGlobalDescriptions, byCompany: defaultCompanyDescriptions };
const GLANDS = [/,?\s*(?:y\s+)?(?:expresión\s+de\s+|vaciado\s+de\s+)?glándulas(?:\s+anales)?(?:\s+si\s+es\s+necesario)?/gi, /,?\s*(?:and\s+)?(?:anal\s+)?glands?(?:\s+expressed|\s+expression)?(?:\s+if\s+needed)?/gi];

const hasGlands = (text) => /glándula|gland/i.test(text || '');

function cleanText(text) {
  if (!hasGlands(text)) return text;
  return GLANDS.reduce((t, re) => t.replace(re, ''), text)
    .replace(/\s+([.,)])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanEntries(entries, defaults = {}) {
  return Object.fromEntries(
    Object.entries(entries || {}).map(([key, entry]) => {
      if (!entry || !(hasGlands(entry.es) || hasGlands(entry.en))) return [key, entry];
      const fallback = defaults[key];
      if (fallback && !hasGlands(fallback.es) && !hasGlands(fallback.en)) return [key, { ...entry, ...fallback }];
      return [key, { ...entry, es: cleanText(entry.es), en: cleanText(entry.en) }];
    })
  );
}

function withDefaults(data) {
  const byCompany = { ...DEFAULTS.byCompany };
  for (const [slug, entries] of Object.entries(data.byCompany || {})) {
    byCompany[slug] = { ...byCompany[slug], ...cleanEntries(entries, DEFAULTS.byCompany[slug]) };
  }
  return { global: { ...DEFAULTS.global, ...cleanEntries(data.global, DEFAULTS.global) }, byCompany };
}

function countOutdated(data) {
  const stale = (entries) => Object.values(entries || {}).filter((e) => e && (hasGlands(e.es) || hasGlands(e.en))).length;
  return stale(data?.global) + Object.values(data?.byCompany || {}).reduce((n, entries) => n + stale(entries), 0);
}

function countMissing(data) {
  const global = data?.global || {};
  const byCompany = data?.byCompany || {};
  let missing = Object.keys(DEFAULTS.global).filter((k) => !global[k]).length;
  for (const [slug, entries] of Object.entries(DEFAULTS.byCompany)) {
    missing += Object.keys(entries).filter((k) => !byCompany[slug]?.[k]).length;
  }
  return missing + countOutdated(data);
}

export function useServiceDescriptionsSync() {
  const [state, setState] = useState({ descriptions: DEFAULTS, missing: 0 });

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'serviceDescriptions', 'main'),
        (snap) => {
          const data = snap.exists() ? snap.data() : {};
          setState({ descriptions: withDefaults(data), missing: countMissing(data) });
        },
        () => {}
      ),
    []
  );

  return state;
}

export function useServiceDescriptions() {
  return useServiceDescriptionsSync().descriptions;
}
