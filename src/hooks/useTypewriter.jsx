import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useTypewriter — reveals text character-by-character at a pace matching speech.
 *
 * @param {string} text — full text to reveal
 * @param {boolean} active — start revealing when true, reset when changed
 * @param {number} charsPerMs — speed; default ~0.04 = ~12 words/sec ≈ typical TTS
 */
export function useTypewriter(text, active = false, charsPerMs = 0.04) {
  const [revealed, setRevealed] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    // Reset when text or active changes
    setRevealed('');
    if (timerRef.current) clearInterval(timerRef.current);

    if (!active || !text) return;

    const interval = Math.max(1, Math.round(1 / charsPerMs));
    const charsPerTick = Math.max(1, Math.round(charsPerMs * interval));

    let idx = 0;
    timerRef.current = setInterval(() => {
      idx = Math.min(idx + charsPerTick, text.length);
      setRevealed(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, active, charsPerMs]);

  const skipToEnd = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRevealed(text || '');
  }, [text]);

  return { revealed, isComplete: revealed === text, skipToEnd };
}
