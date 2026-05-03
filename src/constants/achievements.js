/** Achievement badges — unlocked by in-game milestones */

export const ACHIEVEMENTS = [
  // First steps
  {
    id: 'first_step',
    name: 'First Step',
    icon: '🌱',
    desc: 'Complete your first exposure',
    category: 'milestone',
    check: ({ defeatedCount }) => defeatedCount >= 1,
  },
  {
    id: 'first_victory',
    name: 'First Blood',
    icon: '⚔️',
    desc: 'Win your first boss battle',
    category: 'milestone',
    check: ({ victoryCount }) => victoryCount >= 1,
  },

  // Boss milestones
  {
    id: 'boss_3',
    name: 'Apprentice',
    icon: '🗡️',
    desc: 'Defeat 3 bosses',
    category: 'progression',
    check: ({ defeatedCount }) => defeatedCount >= 3,
  },
  {
    id: 'boss_5',
    name: 'Warrior',
    icon: '⚔️',
    desc: 'Defeat 5 bosses',
    category: 'progression',
    check: ({ defeatedCount }) => defeatedCount >= 5,
  },
  {
    id: 'boss_10',
    name: 'Boss Slayer',
    icon: '🏆',
    desc: 'Defeat 10 bosses',
    category: 'progression',
    check: ({ defeatedCount }) => defeatedCount >= 10,
  },
  {
    id: 'boss_15',
    name: 'Legend',
    icon: '👑',
    desc: 'Defeat 15 bosses',
    category: 'progression',
    check: ({ defeatedCount }) => defeatedCount >= 15,
  },
  {
    id: 'all_difficulties',
    name: 'All Terrains',
    icon: '🌍',
    desc: 'Defeat bosses at every difficulty tier',
    category: 'progression',
    check: ({ allDiffTiers }) => allDiffTiers >= 4,
  },

  // Streak milestones
  {
    id: 'streak_3',
    name: 'On a Roll',
    icon: '🔥',
    desc: 'Reach a 3-day streak',
    category: 'streak',
    check: ({ streakCount }) => streakCount >= 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    icon: '💥',
    desc: 'Reach a 7-day streak',
    category: 'streak',
    check: ({ streakCount }) => streakCount >= 7,
  },
  {
    id: 'streak_14',
    name: 'Dedicated',
    icon: '🌟',
    desc: 'Reach a 14-day streak',
    category: 'streak',
    check: ({ streakCount }) => streakCount >= 14,
  },
  {
    id: 'streak_30',
    name: 'Iron Will',
    icon: '💎',
    desc: 'Reach a 30-day streak',
    category: 'streak',
    check: ({ streakCount }) => streakCount >= 30,
  },
  {
    id: 'night_warrior',
    name: 'Night Warrior',
    icon: '🌙',
    desc: 'Complete a battle between 10pm and 6am',
    category: 'streak',
    check: ({ nightBattles }) => nightBattles >= 1,
  },

  // Platinum
  {
    id: 'platinum_10',
    name: 'Saver',
    icon: '⚪',
    desc: 'Accumulate 10 Platinum',
    category: 'collection',
    check: ({ platinum }) => platinum >= 10,
  },
  {
    id: 'platinum_50',
    name: 'Treasury',
    icon: '💰',
    desc: 'Accumulate 50 Platinum',
    category: 'collection',
    check: ({ platinum }) => platinum >= 50,
  },

  // SUDS reduction
  {
    id: 'suds_drop_20',
    name: 'Calm Storm',
    icon: '🌊',
    desc: 'Reduce SUDS by 20+ points in one battle',
    category: 'skill',
    check: ({ maxSudsDrop }) => maxSudsDrop >= 20,
  },
  {
    id: 'suds_drop_40',
    name: 'Eye of the Storm',
    icon: '🌀',
    desc: 'Reduce SUDS by 40+ points in one battle',
    category: 'skill',
    check: ({ maxSudsDrop }) => maxSudsDrop >= 40,
  },

  // Meaningful moments
  {
    id: 'first_moment',
    name: 'Memory Keeper',
    icon: '📸',
    desc: 'Save your first meaningful moment',
    category: 'collection',
    check: ({ lootCount }) => lootCount >= 1,
  },
  {
    id: 'moments_5',
    name: 'Story Collector',
    icon: '📖',
    desc: 'Save 5 meaningful moments',
    category: 'collection',
    check: ({ lootCount }) => lootCount >= 5,
  },

  // Repeat mastery — SUDS comparison focused
  {
    id: 'second_strike',
    name: 'Second Strike',
    icon: '🔁',
    desc: 'Repeat your first boss',
    category: 'skill',
    check: ({ repeatCount }) => repeatCount >= 1,
  },
  {
    id: 'shadow_weakener',
    name: 'Shadow Weakener',
    icon: '💔',
    desc: 'Repeat a boss with 10+ lower peak SUDS',
    category: 'skill',
    check: ({ bestRepeatSudsDrop }) => bestRepeatSudsDrop >= 10,
  },
  {
    id: 'same_dragon_smaller_fire',
    name: 'Same Dragon, Smaller Fire',
    icon: '🐉',
    desc: 'Repeat a boss with 25+ lower peak SUDS',
    category: 'skill',
    check: ({ bestRepeatSudsDrop }) => bestRepeatSudsDrop >= 25,
  },
  {
    id: 'stayed_anyway',
    name: 'Stayed Anyway',
    icon: '🛡️',
    desc: 'Repeat a boss with SUDS ending below 30',
    category: 'skill',
    check: ({ minRepeatSudsAfter }) => minRepeatSudsAfter <= 30,
  },
  {
    id: 'creative_repeat',
    name: 'Creative Repeat',
    icon: '🎨',
    desc: 'Try 3 different variations of the same boss',
    category: 'skill',
    check: ({ repeatVariations }) => repeatVariations >= 3,
  },
  {
    id: 'repeat_5',
    name: 'Relentless',
    icon: '♻️',
    desc: 'Complete 5 repeat exposures',
    category: 'skill',
    check: ({ repeatCount }) => repeatCount >= 5,
  },

  // Custom exposures
  {
    id: 'custom_creator',
    name: 'Custom Creator',
    icon: '✏️',
    desc: 'Complete 3 custom exposures',
    category: 'collection',
    check: ({ customBossCount }) => customBossCount >= 3,
  },

  // All zones
  {
    id: 'all_zones',
    name: 'World Traveler',
    icon: '🗺️',
    desc: 'Visit every map zone',
    category: 'progression',
    check: ({ zonesVisited }) => zonesVisited >= 5,
  },
];

export const CATEGORY_LABELS = {
  milestone: 'MILESTONES',
  progression: 'PROGRESSION',
  streak: 'STREAKS',
  collection: 'COLLECTION',
  skill: 'SKILL',
};

export const CATEGORY_ORDER = ['milestone', 'progression', 'streak', 'skill', 'collection'];

/**
 * Check which achievements are newly unlocked.
 */
export function checkAchievements(ctx, previouslyUnlocked = []) {
  const alreadyUnlocked = new Set(previouslyUnlocked);
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (!alreadyUnlocked.has(ach.id) && ach.check(ctx)) {
      newlyUnlocked.push(ach.id);
    }
  }

  return {
    unlocked: newlyUnlocked,
    all: new Set([...alreadyUnlocked, ...newlyUnlocked]),
  };
}

/** Get achievement data by ID */
export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
