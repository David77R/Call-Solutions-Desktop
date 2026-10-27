import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { defaultCompanyDescriptions, defaultGlobalDescriptions } from '../data/serviceDescriptions';

const DEFAULTS = { global: defaultGlobalDescriptions, byCompany: defaultCompanyDescriptions };

export function useServiceDescriptions() {
  const [descriptions, setDescriptions] = useState(DEFAULTS);

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'serviceDescriptions', 'main'),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          setDescriptions({ global: data.global || {}, byCompany: data.byCompany || {} });
        },
        () => {}
      ),
    []
  );

  return descriptions;
}
