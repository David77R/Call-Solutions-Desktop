import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { CALL_FLOW_BRANCHES, CALL_FLOW_CLOSING, CALL_FLOW_GREETING } from '../data/callFlowScript';

const DEFAULTS = { greeting: CALL_FLOW_GREETING, branches: CALL_FLOW_BRANCHES, closing: CALL_FLOW_CLOSING };

export function useCallFlow() {
  const [flow, setFlow] = useState(DEFAULTS);

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'callFlowScript', 'main'),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          setFlow({
            greeting: data.greeting || DEFAULTS.greeting,
            branches: data.branches || DEFAULTS.branches,
            closing: data.closing || DEFAULTS.closing,
          });
        },
        () => {}
      ),
    []
  );

  return flow;
}
