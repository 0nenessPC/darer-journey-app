import { useState, useCallback, useRef } from 'react';

export async function callAI(systemPrompt, messages, maxTokens = 1000, timeoutMs = 45000) {
  const FALLBACK = "Dara gathers her thoughts...";
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1500)); // 1.5s pause before retry
      const r = await fetch("/api/qwen-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: messages.map(m => ({ role: m.role, text: m.text })),
          options: { model: "gpt-5.4-nano", maxTokens },
        }),
        signal: controller.signal,
      });
      const d = await r.json();
      return d.reply || "...";
    } catch(e) {
      console.error(`AI call failed (attempt ${attempt + 1}):`, e);
    }
    finally { clearTimeout(timer); }
  }
  return FALLBACK;
}

export function useAIChat(systemPrompt, ctx = "") {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'init' or 'send'
  const hist = useRef([]);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const FALLBACK = "Dara gathers her thoughts...";

  const sendMessage = useCallback(async (text) => {
    const u = { role: "user", text };
    setMessages(p => [...p, u]); hist.current.push(u); setTyping(true); setError(null); setErrorType(null);
    const ctxVal = ctxRef.current;
    const api = ctxVal ? [{ role: "user", text: ctxVal }, { role: "assistant", text: "Understood." }, ...hist.current] : hist.current;
    const res = await callAI(systemPrompt, api);
    if (res === FALLBACK || res === "..." || !res) {
      // AI call failed — don't pollute chat with fallback text
      hist.current.pop(); // remove the user message from history too
      setMessages(p => p.slice(0, -1)); // remove user message from display
      setError("Dara lost her thread — tap Send to try again.");
      setErrorType("send");
      setTyping(false);
      return null;
    }
    const a = { role: "assistant", text: res };
    hist.current.push(a); setMessages(p => [...p, a]); setTyping(false);
    return res;
  }, [systemPrompt, ctx]);

  const init = useCallback(async (prompt) => {
    setTyping(true); hist.current = []; setError(null); setErrorType(null);
    const res = await callAI(systemPrompt, [{ role: "user", text: prompt }]);
    if (res === FALLBACK) {
      setError("Dara is still preparing... retrying.");
      setErrorType("init");
      setTyping(false);
      return null;
    }
    const a = { role: "assistant", text: res };
    hist.current = [{ role: "user", text: prompt }, a];
    setMessages([a]); setTyping(false);
    return res;
  }, [systemPrompt]);

  const reset = useCallback(() => { setMessages([]); hist.current = []; setTyping(false); setError(null); setErrorType(null); }, []);
  return { messages, typing, sendMessage, init, reset, error, errorType };
}
