/** Variable-ratio loot table — rewards after battle completion */

export const LOOT_TABLE = [
  // Common (~50%)
  {
    id: 'xp_small',
    name: '+50 XP',
    icon: '✨',
    rarity: 'common',
    weight: 25,
    type: 'xp',
    value: 50,
  },
  {
    id: 'platinum_small',
    name: '+5 Platinum',
    icon: '⚪',
    rarity: 'common',
    weight: 25,
    type: 'platinum',
    value: 5,
  },

  // Uncommon (~35%)
  {
    id: 'xp_medium',
    name: '+100 XP',
    icon: '💫',
    rarity: 'uncommon',
    weight: 15,
    type: 'xp',
    value: 100,
  },
  {
    id: 'platinum_medium',
    name: '+10 Platinum',
    icon: '⚪',
    rarity: 'uncommon',
    weight: 10,
    type: 'platinum',
    value: 10,
  },
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    icon: '❄️',
    rarity: 'uncommon',
    weight: 10,
    type: 'streak_freeze',
    value: 1,
  },

  // Rare (~12%)
  {
    id: 'xp_large',
    name: '+200 XP',
    icon: '🌟',
    rarity: 'rare',
    weight: 7,
    type: 'xp',
    value: 200,
  },
  {
    id: 'double_xp_token',
    name: 'Double XP Token',
    icon: '🧪',
    rarity: 'rare',
    weight: 5,
    type: 'double_xp',
    value: 1,
  },

  // Legendary (~3%)
  {
    id: 'shadow_crystal',
    name: 'Shadow Crystal',
    icon: '💎',
    rarity: 'legendary',
    weight: 2,
    type: 'collectible',
    value: 1,
  },
  {
    id: 'xp_huge',
    name: '+500 XP',
    icon: '👑',
    rarity: 'legendary',
    weight: 1,
    type: 'xp',
    value: 500,
  },
];

const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#34D399',
  rare: '#60A5FA',
  legendary: '#FBBF24',
};

const RARITY_LABELS = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  legendary: 'LEGENDARY',
};

/** Roll the loot table and return a random item based on weights */
export function rollLoot() {
  const totalWeight = LOOT_TABLE.reduce((s, item) => s + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of LOOT_TABLE) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return LOOT_TABLE[0];
}

/** Get display info for a loot item */
export function getLootDisplay(item) {
  return {
    name: item.name,
    icon: item.icon,
    rarity: item.rarity,
    color: RARITY_COLORS[item.rarity],
    label: RARITY_LABELS[item.rarity],
  };
}
