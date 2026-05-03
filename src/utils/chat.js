import { useState, useCallback, useRef } from 'react';
import { z } from 'zod';

export async function callAI(systemPrompt, messages, maxTokens = 1000, timeoutMs = 45000, signal) {
  const FALLBACK = 'Dara gathers her thoughts...';
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (signal?.aborted) return FALLBACK;
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500)); // 1.5s pause before retry
      const r = await fetch('/api/qwen-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          messages: messages.map((m) => ({ role: m.role, text: m.text })),
          options: { model: 'gpt-5.4-mini', maxTokens },
        }),
        signal: signal || controller.signal,
      });
      const d = await r.json();
      return d.reply || '...';
    } catch (e) {
      if (e?.name === 'AbortError') return FALLBACK;
      console.error(`AI call failed (attempt ${attempt + 1}):`, e);
    } finally {
      clearTimeout(timer);
    }
  }
  return FALLBACK;
}

export function useAIChat(systemPrompt, ctx = '') {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'init' or 'send'
  const hist = useRef([]);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const abortRef = useRef(null);
  const FALLBACK = 'Dara gathers her thoughts...';

  const sendMessage = useCallback(
    async (text) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const u = { role: 'user', text };
      setMessages((p) => [...p, u]);
      hist.current.push(u);
      setTyping(true);
      setError(null);
      setErrorType(null);
      const ctxVal = ctxRef.current;
      const api = ctxVal
        ? [
            { role: 'user', text: ctxVal },
            { role: 'assistant', text: 'Understood.' },
            ...hist.current,
          ]
        : hist.current;
      const res = await callAI(systemPrompt, api, 1000, 45000, abortRef.current.signal);
      if (res === FALLBACK || res === '...' || !res) {
        // AI call failed — don't pollute chat with fallback text
        hist.current.pop(); // remove the user message from history too
        setMessages((p) => p.slice(0, -1)); // remove user message from display
        setError('Dara lost her thread — tap Send to try again.');
        setErrorType('send');
        setTyping(false);
        return null;
      }
      const a = { role: 'assistant', text: res };
      hist.current.push(a);
      setMessages((p) => [...p, a]);
      setTyping(false);
      return res;
    },
    [systemPrompt],
  );

  const init = useCallback(
    async (prompt) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setTyping(true);
      hist.current = [];
      setError(null);
      setErrorType(null);
      const res = await callAI(
        systemPrompt,
        [{ role: 'user', text: prompt }],
        1000,
        45000,
        abortRef.current.signal,
      );
      if (res === FALLBACK) {
        setError('Dara is still preparing... retrying.');
        setErrorType('init');
        setTyping(false);
        return null;
      }
      const a = { role: 'assistant', text: res };
      hist.current = [{ role: 'user', text: prompt }, a];
      setMessages([a]);
      setTyping(false);
      return res;
    },
    [systemPrompt],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    hist.current = [];
    setTyping(false);
    setError(null);
    setErrorType(null);
  }, []);

  return { messages, typing, sendMessage, init, reset, error, errorType };
}

/**
 * Shared AI-driven follow-up exposure generator used by both BossBattle
 * and TutorialBattle. Returns an array of 3 options adjusted by outcome.
 */
export async function generateFollowUpExposures({ currentText, outcome, why, callAIFn = callAI }) {
  try {
    const isComplete = outcome === 'victory' || outcome === 'full';
    const res = await callAIFn(
      `You are a clinical psychologist designing ERP (Exposure Response Prevention) follow-up exercises. The user just completed a boss battle exposure.

Current exposure: "${currentText}"
User's outcome: ${isComplete ? 'They completed it fully.' : outcome === 'partial' ? "They went partway but didn't finish." : "They tried but couldn't push through."}
User's value: "${why}"

Generate exactly 3 follow-up exposure variations in the same nature as the original but adjusted:
- If they COMPLETED it: make them slightly harder (longer duration, more people, more visible, etc.)
- If they DID NOT complete it: make them slightly easier or break into smaller steps
- One of the three should be an "outside the box" creative variation that is still therapeutic — something unexpected but clinically sound

Return ONLY a JSON array like: [{"text":"exposure description","icon":"emoji","tag":"normal|step-up|creative"}]
No other text.`,
      [{ role: 'user', text: 'Generate 3 follow-up exposures based on their outcome.' }],
    );
    const { ExposureSchema, validateAIResponse } = await import('./aiSchemas.js');
    const validated = validateAIResponse(res, z.array(ExposureSchema));
    if (validated && validated.length >= 2) {
      return validated.slice(0, 3).map((o, i) => ({
        ...o,
        icon: o.icon || '⚡',
        tag: o.tag || (i === 2 ? 'creative' : 'normal'),
      }));
    }
    throw new Error('Parse failed');
  } catch {
    return [
      {
        text: `Do "${currentText}" again, but push yourself a bit further`,
        icon: '🔁',
        tag: 'normal',
      },
      {
        text: `Try a bigger version — more people, longer, or more visible`,
        icon: '⚡',
        tag: 'step-up',
      },
      {
        text: `Find a completely new way to challenge this same fear — be creative`,
        icon: '✨',
        tag: 'creative',
      },
    ];
  }
}
