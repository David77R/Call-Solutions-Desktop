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

export function useServiceDescriptions() {
  const [descriptions, setDescriptions] = useState(DEFAULTS);

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'serviceDescriptions', 'main'),
        (snap) => {
          if (!snap.exists()) return;
          setDescriptions(withDefaults(snap.data()));
        },
        () => {}
      ),
    []
  );

  return descriptions;
}
