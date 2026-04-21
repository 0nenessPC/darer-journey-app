import { useCallback, useRef, useState } from 'react';

export const QWEN_MODELS = ['qwen3.5-flash', 'qwen3.6-plus'];
const QWEN_MODEL = QWEN_MODELS[0];

/**
 * Build a compact hero context string from user data for AI prompt enrichment.
 * Only includes non-empty fields to keep it lean.
 * @param {Object} hero - { name, darerId, stats, strengths, coreValues, traits, sads, armory }
 * @param {Object} quest - { goal, bosses }
 * @param {string} shadowText - AI-generated shadow profile summary
 * @param {Array} battleHistory - Array of past battle records
 * @returns {string} Compact context string (~300-500 chars)
 */
export function buildHeroContext(hero, quest, shadowText, battleHistory = []) {
  const parts = [];

  // Hero identity
  const idParts = [];
  if (hero?.name) idParts.push(hero.name);
  if (hero?.darerId) idParts.push(`DARER ${hero.darerId}`);
  if (idParts.length) parts.push(`HERO: ${idParts.join(', ')}`);

  // Stats
  if (hero?.stats) {
    const { courage, resilience, openness } = hero.stats;
    if (courage !== undefined || resilience !== undefined || openness !== undefined) {
      parts.push(`STATS: Courage ${courage ?? '?'}/10, Resilience ${resilience ?? '?'}/10, Openness ${openness ?? '?'}/10`);
    }
  }

  // SADS
  if (hero?.sads !== undefined && hero.sads !== null) {
    parts.push(`SADS: ${hero.sads}`);
  }

  // Core values / strengths
  if (hero?.coreValues?.length) {
    const vals = hero.coreValues.map(v => v.word || v.text).filter(Boolean);
    if (vals.length) parts.push(`VALUES: ${vals.join(', ')}`);
  }
  if (hero?.strengths?.length) {
    parts.push(`STRENGTHS: ${hero.strengths.join(', ')}`);
  }
  if (hero?.traits?.length) {
    parts.push(`TRAITS: ${hero.traits.join(', ')}`);
  }

  // Goal
  if (quest?.goal) {
    parts.push(`GOAL: ${quest.goal}`);
  }

  // Shadow profile (first line only, keep it short)
  if (shadowText) {
    const shadowLine = shadowText.split('\n').find(l => l.trim()) || shadowText;
    parts.push(`SHADOW: ${shadowLine}`);
  }

  // Battle progress
  const defeated = quest?.bosses?.filter(b => b.defeated)?.length || 0;
  const total = quest?.bosses?.length || 0;
  if (total > 0) {
    parts.push(`PROGRESS: ${defeated}/${total} bosses defeated`);
  }

  // Recent battles (last 2)
  if (battleHistory?.length) {
    const recent = battleHistory.slice(-2).map(b => `${b.bossName}→${b.outcome}`);
    parts.push(`RECENT: ${recent.join(', ')}`);
  }

  // Armory tools unlocked
  if (hero?.armory?.length) {
    const unlocked = hero.armory.filter(t => t.unlocked);
    if (unlocked.length) {
      const tools = unlocked.map(t => {
        const practiced = t.practiceCount ? ` (practiced ${t.practiceCount}x)` : '';
        return `${t.name}${practiced}`;
      });
      parts.push(`ARMORY: ${tools.join(', ')}`);
    }
  }

  return parts.join('\n');
}

export async function callQwen(systemPrompt, messages, options = {}) {
  const response = await fetch('/api/qwen-chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt,
      messages,
      options,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qwen API ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.reply || '';
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
