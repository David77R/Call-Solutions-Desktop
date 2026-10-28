import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { defaultCompanyDescriptions, defaultGlobalDescriptions } from '../data/serviceDescriptions';

const DEFAULTS = { global: defaultGlobalDescriptions, byCompany: defaultCompanyDescriptions };

function withDefaults(data) {
  const byCompany = { ...DEFAULTS.byCompany };
  for (const [slug, entries] of Object.entries(data.byCompany || {})) {
    byCompany[slug] = { ...byCompany[slug], ...entries };
  }
  return { global: { ...DEFAULTS.global, ...data.global }, byCompany };
}

function countMissing(data) {
  const global = data?.global || {};
  const byCompany = data?.byCompany || {};
  let missing = Object.keys(DEFAULTS.global).filter((k) => !global[k]).length;
  for (const [slug, entries] of Object.entries(DEFAULTS.byCompany)) {
    missing += Object.keys(entries).filter((k) => !byCompany[slug]?.[k]).length;
  }
  return missing;
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
