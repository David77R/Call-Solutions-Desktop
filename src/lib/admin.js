import { useEffect, useState } from 'react';
import { collection, doc, getDocFromServer, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function setAndVerify(ref, data) {
  await setDoc(ref, data);
  const snap = await getDocFromServer(ref);
  if (!snap.exists() || stable(snap.data()) !== stable(data)) {
    throw new Error('El cambio no llegó al servidor. Revisa la conexión e inténtalo de nuevo.');
  }
}

export function saveCompanyCatalog(company) {
  return setAndVerify(doc(db, 'priceCatalog', company.slug), company);
}

export function saveServiceDescriptions(global, byCompany) {
  return setAndVerify(doc(db, 'serviceDescriptions', 'main'), { global, byCompany });
}

export function saveCallFlow(flow) {
  return setAndVerify(doc(db, 'callFlowScript', 'main'), { greeting: flow.greeting, branches: flow.branches, closing: flow.closing });
}

export function saveMessageTemplates(items) {
  return setAndVerify(doc(db, 'messageTemplates', 'main'), { items });
}

export function saveRoster(slug, names) {
  return setAndVerify(doc(db, 'groomerRosters', slug), { names });
}

export function useAgents() {
  const [state, setState] = useState({ agents: [], error: null, loading: true });
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'agents'),
        (snap) =>
          setState({
            agents: snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
            error: null,
            loading: false,
          }),
        (err) => setState({ agents: [], error: err.code || 'error', loading: false })
      ),
    []
  );
  return state;
}
