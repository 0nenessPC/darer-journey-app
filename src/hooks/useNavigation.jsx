import { useState, useCallback } from 'react';

/** Screen navigation state and helpers — string-based routing with back-stack. */
export function useNavigation() {
  const [screen, setScreenRaw] = useState('login');
  const [screenHistory, setScreenHistory] = useState([]);

  const setScreen = useCallback(
    (s) => {
      if (s === screen) return;
      setScreenHistory((prev) => {
        const last = prev.length > 0 ? prev[prev.length - 1] : null;
        if (last === screen && prev.length > 1) {
          return [...prev.slice(0, -1), screen];
        }
        return [...prev, screen];
      });
      setScreenRaw(s);
    },
    [screen],
  );

  const setOBState = useCallback((screenKey, partial) => {
    // Returns a state updater — the caller wires this into onboardingState
    return { screenKey, partial };
  }, []);

  const goBack = useCallback(() => {
    setScreenHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      while (next.length > 1 && next[next.length - 1] === next[next.length - 2]) {
        next.pop();
      }
      const last = next.pop();
      setScreenRaw(last);
      return next;
    });
  }, []);

  return {
    screen,
    setScreen,
    setScreenRaw,
    screenHistory,
    setScreenHistory,
    setOBState,
    goBack,
  };
}
