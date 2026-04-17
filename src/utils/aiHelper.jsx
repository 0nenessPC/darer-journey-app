import { useCallback, useRef, useState } from 'react';

export const QWEN_MODELS = ['qwen3.5-flash', 'qwen3.6-plus'];
const QWEN_MODEL = QWEN_MODELS[0];

export async function callQwen(systemPrompt, messages, options = {}) {
  const apiKey = import.meta.env.VITE_QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_QWEN_API_KEY in .env');
  }

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || QWEN_MODEL,
      max_tokens: options.maxTokens || 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.text,
        })),
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qwen API ${response.status}: ${text}`);
  }

  const data = await response.json();
  return (data.choices || [])
    .map((choice) => choice.message?.content ?? '')
    .join('\n')
    .trim();
}

export function useAIChat(systemPrompt, context = '') {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const historyRef = useRef([]);

  const sendMessage = useCallback(async (text) => {
    const userMsg = { role: 'user', text };
    historyRef.current.push(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    try {
      const payload = context
        ? [{ role: 'user', text: context }, { role: 'assistant', text: 'Understood.' }, ...historyRef.current]
        : historyRef.current;

      const replyText = await callQwen(systemPrompt, payload);
      const assistantMsg = { role: 'assistant', text: replyText };
      historyRef.current.push(assistantMsg);
      setMessages((prev) => [...prev, assistantMsg]);
      return replyText;
    } finally {
      setTyping(false);
    }
  }, [systemPrompt, context]);

  const init = useCallback(async (prompt) => {
    historyRef.current = [];
    setMessages([]);
    setTyping(true);
    try {
      const replyText = await callQwen(systemPrompt, [{ role: 'user', text: prompt }]);
      const seed = [{ role: 'user', text: prompt }, { role: 'assistant', text: replyText }];
      historyRef.current = seed;
      setMessages([{ role: 'assistant', text: replyText }]);
      return replyText;
    } finally {
      setTyping(false);
    }
  }, [systemPrompt]);

  const reset = useCallback(() => {
    historyRef.current = [];
    setMessages([]);
    setTyping(false);
  }, []);

  return { messages, typing, sendMessage, init, reset };
}
