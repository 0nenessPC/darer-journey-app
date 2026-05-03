import { C } from '../constants/gameData';

/**
 * Mastery milestones for repeat exposure tracking.
 * Each level reflects how many times the hero has completed this boss.
 */
const MASTERY_LEVELS = [
  { min: 0, label: 'UNCHARTED', short: 'Never faced', color: C.grayLt },
  { min: 1, label: 'FACED', short: 'Faced once', color: C.hpGreen },
  { min: 2, label: 'RETURNED', short: 'Returned 2x', color: C.teal },
  { min: 3, label: 'TRAINING EFFECT', short: 'Repeated 3x', color: C.goldMd },
  { min: 5, label: 'SHADOW WEAKENED', short: 'Shadow weakening', color: C.amber },
  { min: 10, label: 'TERRITORY RECLAIMED', short: 'Mastered', color: C.goalGold },
];

export function getMasteryLevel(completions) {
  let level = MASTERY_LEVELS[0];
  for (const m of MASTERY_LEVELS) {
    if (completions >= m.min) level = m;
  }
  return level;
}

export function getMasteryLabel(completions) {
  const m = getMasteryLevel(completions);
  if (completions >= 10) return 'MASTERED';
  if (completions >= 5) return `SHADOW WEAKENED (${completions}x)`;
  if (completions >= 3) return `REPEATED ${completions}x`;
  if (completions >= 2) return `RETURNED ${completions}x`;
  if (completions === 1) return 'FACED ONCE';
  return 'UNCHARTED';
}

export function getMasteryColor(completions) {
  return getMasteryLevel(completions).color;
}

export function getMasteryStatusText(boss) {
  const completions = boss.completions || 0;
  const attempts = boss.attempts || 0;
  if (completions === 0 && attempts > 0) return `Attempted — not yet completed`;
  if (completions >= 10) return 'TERRITORY RECLAIMED';
  if (completions >= 5) return 'SHADOW WEAKENED — Shadow grows weaker';
  if (completions >= 3) return 'TRAINING EFFECT — Neural pathways rewiring';
  if (completions >= 2) return 'RETURNED — Each visit builds strength';
  if (completions === 1) return 'FACED ONCE — The real work begins now';
  return 'Ready for your first attempt';
}

export function getNextMilestone(completions) {
  for (const m of MASTERY_LEVELS) {
    if (m.min > completions) return { label: m.label, at: m.min };
  }
  return null;
}
