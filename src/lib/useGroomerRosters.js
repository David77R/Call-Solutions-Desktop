import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const FALLBACK = {
  abbie: ['Julio', 'Jessica', 'Lixy'],
  cruzin: ['Daniel', 'Groomer 2'],
  famous: ['Germán', 'Darío'],
  mayami: ['Nicolás', 'Andrea'],
  tinis: ['Marianela', 'Herbert', 'Jorgett'],
  cutepaws: ['Raudel', 'George', 'Dians', 'Sergio'],
};

const COMBINED_MESSAGES = { famous: true, cruzin: true, abbie: false, mayami: false, tinis: false };

export function isCombinedMessages(slug) {
  return COMBINED_MESSAGES[slug] ?? true;
}

export function useGroomerRosters() {
  const [rosters, setRosters] = useState(FALLBACK);

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'groomerRosters'),
        (snap) => {
          if (snap.empty) return;
          const fresh = {};
          snap.docs.forEach((d) => {
            fresh[d.id] = d.data().names || [];
          });
          setRosters(fresh);
        },
        () => {}
      ),
    []
  );

  return rosters;
}
