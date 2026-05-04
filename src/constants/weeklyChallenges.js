/** Weekly challenges — rotating exposure goals with bonus rewards */

export const WEEKLY_CHALLENGES = [
  {
    id: 'wc_face_fear',
    name: 'Face Your Fear',
    desc: 'Complete 3 exposures this week',
    icon: '⚔️',
    check: ({ weeklyBattles }) => weeklyBattles >= 3,
    reward: { coins: 5, xp: 200 },
  },
  {
    id: 'wc_high_level',
    name: 'Brave Heart',
    desc: 'Defeat a LV.5+ boss this week',
    icon: '🔥',
    check: ({ maxBossLevel }) => maxBossLevel >= 5,
    reward: { coins: 3, xp: 150 },
  },
  {
    id: 'wc_streak',
    name: 'Consistent Warrior',
    desc: 'Battle on 4 different days this week',
    icon: '📅',
    check: ({ activeDays }) => activeDays >= 4,
    reward: { coins: 4, xp: 200 },
  },
  {
    id: 'wc_suds_master',
    name: 'SUDS Crusher',
    desc: 'Reduce SUDS by 30+ in one battle',
    icon: '📉',
    check: ({ bestSudsDrop }) => bestSudsDrop >= 30,
    reward: { coins: 3, xp: 100 },
  },
  {
    id: 'wc_explorer',
    name: 'Path Finder',
    desc: 'Try 3 different exposure types this week',
    icon: '🗺️',
    check: ({ uniqueBossTypes }) => uniqueBossTypes >= 3,
    reward: { coins: 4, xp: 150 },
  },
  {
    id: 'wc_repeat',
    name: 'Practice Makes Progress',
    desc: 'Complete 2 repeat battles this week',
    icon: '🔄',
    check: ({ repeats }) => repeats >= 2,
    reward: { coins: 3, xp: 100 },
  },
  {
    id: 'wc_sharer',
    name: 'Memory Keeper',
    desc: 'Save 2 meaningful moments this week',
    icon: '📸',
    check: ({ lootSaved }) => lootSaved >= 2,
    reward: { coins: 2, xp: 100 },
  },
  {
    id: 'wc_speed',
    name: 'Swift Strike',
    desc: 'Complete 5 exposures in one week',
    icon: '⚡',
    check: ({ weeklyBattles }) => weeklyBattles >= 5,
    reward: { coins: 8, xp: 300 },
  },
  {
    id: 'wc_perfect',
    name: 'Fearless',
    desc: 'Win a battle with SUDS ending below 20',
    icon: '💪',
    check: ({ minSudsAfter }) => minSudsAfter <= 20,
    reward: { coins: 5, xp: 200 },
  },
  {
    id: 'wc_tutor',
    name: 'Guide Light',
    desc: 'Use 3 different armory tools this week',
    icon: '🧰',
    check: ({ toolsUsed }) => toolsUsed >= 3,
    reward: { coins: 3, xp: 150 },
  },
];

/** Get Monday of the week for a given date */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Pick 3 random challenges for this week */
export function getWeeklyChallenges(seed) {
  const weekSeed = getWeekStart().slice(0, 10) + '_' + (seed || 0);
  // Simple deterministic shuffle based on date string
  let hash = 0;
  for (let i = 0; i < weekSeed.length; i++) {
    hash = (hash << 5) - hash + weekSeed.charCodeAt(i);
    hash |= 0;
  }
  const shuffled = [...WEEKLY_CHALLENGES].sort(() => 0.5 - Math.sin(hash++));
  return shuffled.slice(0, 3);
}

/** Check which weekly challenges are completed */
export function checkWeeklyChallenges(challenges, stats) {
  return challenges.map((ch) => ({
    ...ch,
    completed: ch.check(stats),
  }));
}
