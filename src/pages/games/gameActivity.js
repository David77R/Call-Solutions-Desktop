import { createContext, useContext, useEffect, useRef } from 'react';

export const GameActiveContext = createContext(true);

export function useGameActive() {
  return useContext(GameActiveContext);
}

export function useGameActiveRef() {
  const active = useContext(GameActiveContext);
  const ref = useRef(active);
  useEffect(() => {
    ref.current = active;
  }, [active]);
  return ref;
}
