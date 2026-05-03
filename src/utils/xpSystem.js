/** XP and player level calculations */

// XP thresholds per level (cumulative)
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  300,    // Level 2
  700,    // Level 3
  1200,   // Level 4
  1800,   // Level 5
  2500,   // Level 6
  3300,   // Level 7
  4200,   // Level 8
  5200,   // Level 9
  6300,   // Level 10
  7500,   // Level 11
  8800,   // Level 12
  10200,  // Level 13
  11700,  // Level 14
  13300,  // Level 15
  15000,  // Level 16
  16800,  // Level 17
  18700,  // Level 18
  20700,  // Level 19
  22800,  // Level 20
];

const MAX_LEVEL = LEVEL_THRESHOLDS.length;

/** Calculate XP earned from a single battle */
export function battleXP(boss, outcome, sudsBefore, sudsAfter) {
  const bossLevel = boss?.level || boss?.difficulty || 1;
  const baseXP = bossLevel * 50;

  let multiplier = 1;
  if (outcome === "victory") multiplier = 1.5;
  else if (outcome === "partial") multiplier = 1.0;
  else multiplier = 0.5; // retreat

  // SUDS reduction bonus: bigger drops earn more XP
  const sudsDrop = (sudsBefore || 0) - (sudsAfter || 0);
  const dropBonus = sudsDrop > 0 ? Math.round(sudsDrop * 2) : 0;

  return Math.round((baseXP + dropBonus) * multiplier);
}

/** Get total XP from battle history */
export function calcTotalXP(battleHistory = [], questBosses = []) {
  let total = 0;
  for (const b of battleHistory) {
    const boss = questBosses.find(qb => qb.id === b.bossId);
    total += battleXP(boss, b.outcome, b.suds?.before, b.suds?.after);
  }
  return total;
}

/** Get player level from total XP */
export function getPlayerLevel(totalXP) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

/** Get XP needed for next level */
export function xpToNextLevel(totalXP) {
  const level = getPlayerLevel(totalXP);
  if (level >= MAX_LEVEL) return { current: 0, needed: 0, pct: 100 };
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const current = totalXP - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { current, needed, pct: Math.min(100, (current / needed) * 100) };
}
