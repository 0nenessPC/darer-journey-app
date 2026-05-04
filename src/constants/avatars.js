/**
 * Dara Avatar Catalog — purchasable cosmetic variants.
 * The default avatar (dara_default) is free and always available.
 * Other variants are bought with courageCoins in the Shop.
 */
export const AVATAR_CATALOG = [
  {
    id: 'dara_default',
    name: 'The Guide',
    price: 0,
    description: "Dara's original look — calm, steady, ready.",
    tier: 'default',
  },
  {
    id: 'dara_sage',
    name: 'The Sage',
    price: 20,
    description: 'A forest-green cloak, blue staff light. Wisdom walks beside you.',
    tier: 'common',
  },
  {
    id: 'dara_ember',
    name: 'The Ember',
    price: 30,
    description: 'Warm amber glow. For those who face the cold with fire.',
    tier: 'uncommon',
  },
  {
    id: 'dara_storm',
    name: 'The Storm',
    price: 40,
    description: 'Purple lightning on the staff. The Shadow trembles.',
    tier: 'rare',
  },
  {
    id: 'dara_phantom',
    name: 'The Phantom',
    price: 50,
    description: 'Cloaked in shadow. Even the Fear cannot see you coming.',
    tier: 'epic',
  },
];

export function getAvatarById(id) {
  return AVATAR_CATALOG.find((a) => a.id === id) || AVATAR_CATALOG[0];
}
