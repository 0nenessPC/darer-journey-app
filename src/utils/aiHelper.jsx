export const QWEN_MODELS = ['qwen3.5-flash', 'qwen3.6-plus'];

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
