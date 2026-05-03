/** Armory Growth Tree — tools level up through practice */

const TOOL_LEVELS = [
  { level: 1, name: 'Novice', practiceNeeded: 0, icon: '⭐' },
  { level: 2, name: 'Learner', practiceNeeded: 3, icon: '⭐' },
  { level: 3, name: 'Practiced', practiceNeeded: 8, icon: '⭐⭐' },
  { level: 4, name: 'Skilled', practiceNeeded: 15, icon: '⭐⭐' },
  { level: 5, name: 'Master', practiceNeeded: 25, icon: '⭐⭐⭐' },
];

/** Get tool level from practice count */
export function getToolLevel(practiceCount = 0) {
  let current = TOOL_LEVELS[0];
  for (const tl of TOOL_LEVELS) {
    if (practiceCount >= tl.practiceNeeded) current = tl;
  }
  return current;
}

/** Get progress toward next level */
export function getToolProgress(practiceCount = 0) {
  const current = getToolLevel(practiceCount);
  const nextIdx = TOOL_LEVELS.findIndex(t => t.level === current.level) + 1;
  const next = TOOL_LEVELS[nextIdx];
  if (!next) return { current, next: null, progress: 100 };
  const currentThreshold = current.practiceNeeded;
  const nextThreshold = next.practiceNeeded;
  const pct = Math.min(100, ((practiceCount - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
  return { current, next, progress: pct };
}

/** Get the hero's signature tool (most practiced) */
export function getSignatureTool(armory = []) {
  let maxCount = 0;
  let signature = null;
  for (const tool of armory) {
    if (tool.unlocked && (tool.practiceCount || 0) > maxCount) {
      maxCount = tool.practiceCount || 0;
      signature = tool;
    }
  }
  return signature;
}

/** Check if any tool reached mastery (level 5) */
export function getMasteryTools(armory = []) {
  return armory.filter(t => {
    const lvl = getToolLevel(t.practiceCount || 0);
    return lvl.level >= 5;
  });
}
