import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { agentEmail } from './agents';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, loading: false })), []);

  const value = useMemo(
    () => ({
      ...state,
      login: async (firstName, lastName, password) => {
        const cred = await signInWithEmailAndPassword(auth, agentEmail(firstName, lastName), password);
        if (!cred.user.displayName) {
          await updateProfile(cred.user, { displayName: `${firstName.trim()} ${lastName.trim()}` });
          setState({ user: auth.currentUser, loading: false });
        }
      },
      register: async (firstName, lastName, password) => {
        const first = firstName.trim();
        const last = lastName.trim();
        const cred = await createUserWithEmailAndPassword(auth, agentEmail(first, last), password);
        await updateProfile(cred.user, { displayName: `${first} ${last}` });
        await setDoc(
          doc(db, 'agents', cred.user.uid),
          { firstName: first, lastName: last, displayName: `${first} ${last}`, email: cred.user.email, createdAt: serverTimestamp() },
          { merge: true }
        ).catch(() => {});
        setState({ user: auth.currentUser, loading: false });
      },
      logout: () => signOut(auth),
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
