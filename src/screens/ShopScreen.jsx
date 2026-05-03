import React, { useState } from 'react';
import { C } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
import BottomNav from '../components/BottomNav';

const SHOP_ITEMS = [
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    icon: '❄️',
    description: 'Protects your streak for one missed day',
    price: 10,
    category: 'functional',
    repeatable: true,
    effect: 'streak_freeze',
  },
  {
    id: 'double_xp_potion',
    name: 'Double XP Potion',
    icon: '🧪',
    description: 'Your next battle earns 2x XP',
    price: 15,
    category: 'functional',
    repeatable: true,
    effect: 'double_xp',
  },
  {
    id: 'title_shadow_hunter',
    name: 'Title: Shadow Hunter',
    icon: '🏷️',
    description: 'Display "Shadow Hunter" on your profile',
    price: 20,
    category: 'cosmetic',
    repeatable: false,
  },
  {
    id: 'title_courage_knight',
    name: 'Title: Courage Knight',
    icon: '🏷️',
    description: 'Display "Courage Knight" on your profile',
    price: 30,
    category: 'cosmetic',
    repeatable: false,
  },
  {
    id: 'title_storm_breaker',
    name: 'Title: Storm Breaker',
    icon: '🏷️',
    description: 'Display "Storm Breaker" on your profile',
    price: 50,
    category: 'cosmetic',
    repeatable: false,
  },
  {
    id: 'theme_forest',
    name: 'Map Theme: Forest',
    icon: '🌲',
    description: 'A green, leafy path through the Whisper Woods',
    price: 25,
    category: 'theme',
    repeatable: false,
  },
  {
    id: 'theme_cosmic',
    name: 'Map Theme: Cosmic',
    icon: '🌌',
    description: 'Navigate through starlit darkness',
    price: 35,
    category: 'theme',
    repeatable: false,
  },
  {
    id: 'frame_gold',
    name: 'Avatar Frame: Gold',
    icon: '👑',
    description: 'A golden border for your hero avatar',
    price: 20,
    category: 'cosmetic',
    repeatable: false,
  },
  {
    id: 'frame_fire',
    name: 'Avatar Frame: Flame',
    icon: '🔥',
    description: 'A burning flame border for your hero avatar',
    price: 30,
    category: 'cosmetic',
    repeatable: false,
  },
];

export default function ShopScreen({ hero, setHero, onBack, setScreen }) {
  const [category, setCategory] = useState('all');
  const [purchasing, setPurchasing] = useState(null);
  const [justPurchased, setJustPurchased] = useState(null);

  const coins = hero.courageCoins || 0;
  const purchased = hero.purchasedItems || [];
  const functionalItems = purchased.filter(p => p.repeatable && p.id !== undefined);

  const categories = [
    { key: 'all', label: 'ALL' },
    { key: 'functional', label: '⚡ ITEMS' },
    { key: 'cosmetic', label: '🏷️ COSMETICS' },
    { key: 'theme', label: '🗺 THEMES' },
  ];

  const filtered = category === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(i => i.category === category);

  const handlePurchase = (item) => {
    if (coins < item.price) return;
    if (!item.repeatable && purchased.some(p => p.id === item.id)) return;

    setPurchasing(item.id);
    // Simulate a brief processing delay for feel
    setTimeout(() => {
      setHero(h => {
        const updates = {
          courageCoins: h.courageCoins - item.price,
          purchasedItems: [...(h.purchasedItems || []), { id: item.id, date: new Date().toISOString(), repeatable: item.repeatable }],
        };
        // Apply consumable items immediately
        if (item.effect === 'double_xp') {
          updates.doubleXP = (h.doubleXP || 0) + 1;
        } else if (item.effect === 'streak_freeze') {
          updates.streakFreezes = (h.streakFreezes || 0) + 1;
        }
        return { ...h, ...updates };
      });
      setPurchasing(null);
      setJustPurchased(item);
      setTimeout(() => setJustPurchased(null), 2000);
    }, 500);
  };

  const isOwned = (item) => {
    if (item.repeatable) return false;
    return purchased.some(p => p.id === item.id);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '16px 16px 100px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 0', borderBottom: `2px solid ${C.mutedBorder}`, marginBottom: 16,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <PixelText size={9} color={C.subtleText}>←</PixelText>
        </button>
        <PixelText size={10} color={C.goalGold}>🛒 DARA'S SHOP</PixelText>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14 }}>🪙</span>
          <PixelText size={10} color={C.goldMd}>{coins}</PixelText>
        </div>
      </div>

      {/* Purchase confirmation toast */}
      {justPurchased && (
        <div style={{
          padding: C.padLg, marginBottom: 12, textAlign: 'center',
          background: C.hpGreen + '15', border: `2px solid ${C.hpGreen}40`,
          borderRadius: 6, animation: 'fadeIn 0.3s ease-out',
        }}>
          <PixelText size={8} color={C.hpGreen}>
            ✓ {justPurchased.name} acquired!
          </PixelText>
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }} role="tablist">
        {categories.map(cat => (
          <button key={cat.key} onClick={() => setCategory(cat.key)} role="tab" aria-selected={category === cat.key} style={{
            flex: 1, padding: '6px 0', border: `2px solid ${category === cat.key ? C.goldMd : C.mutedBorder}`,
            borderRadius: 4, background: category === cat.key ? C.goldMd + '20' : 'transparent', cursor: 'pointer',
          }}>
            <PixelText size={6} color={category === cat.key ? C.goldMd : C.grayLt}>{cat.label}</PixelText>
          </button>
        ))}
      </div>

      {/* Shop items */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <PixelText size={8} color={C.grayLt}>Nothing here yet.</PixelText>
        </div>
      ) : (
        filtered.map(item => {
          const owned = isOwned(item);
          const canAfford = coins >= item.price;
          const buying = purchasing === item.id;

          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: C.padLg, marginBottom: 8,
              background: owned ? C.hpGreen + '08' : C.cardBg,
              border: `2px solid ${owned ? C.hpGreen + '40' : canAfford ? C.mutedBorder : C.grayBorder + '40'}`,
              borderRadius: 6,
              opacity: owned ? 0.7 : 1,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 6,
                background: C.cardBg,
                border: `2px solid ${C.mutedBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <PixelText size={8} color={owned ? C.hpGreen : C.cream}>{item.name}</PixelText>
                <PixelText size={6} color={C.grayLt} style={{ display: 'block', marginTop: 2 }}>{item.description}</PixelText>
              </div>
              <div style={{ textAlign: 'right' }}>
                {owned ? (
                  <PixelText size={7} color={C.hpGreen}>OWNED</PixelText>
                ) : (
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={!canAfford || buying}
                    style={{
                      padding: '6px 12px', borderRadius: 4,
                      background: canAfford ? C.goldMd : C.charcoal,
                      border: 'none', cursor: canAfford ? 'pointer' : 'default',
                      fontFamily: 'inherit',
                    }}
                  >
                    <PixelText size={7} color={canAfford ? C.charcoal : C.grayLt}>
                      {buying ? '...' : `${item.price} 🪙`}
                    </PixelText>
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* How to earn coins */}
      <div style={{
        marginTop: 20, padding: C.padLg,
        background: C.cardBg, border: `2px solid ${C.mutedBorder}`,
        borderRadius: 6,
      }}>
        <PixelText size={8} color={C.goldMd} style={{ display: 'block', marginBottom: 8 }}>
          HOW TO EARN COINS
        </PixelText>
        <PixelText size={7} color={C.grayLt} style={{ display: 'block', lineHeight: 1.8 }}>
          🗡️ Defeat a boss: 1-3 coins{'\n'}
          (more for harder bosses){'\n'}
          ⚔️ Partial victory: 1 coin{'\n'}
          {'\n'}
          Coins are earned through{'\n'}real effort in your exposures.
        </PixelText>
      </div>

      <BottomNav active="hero" onNav={setScreen} />
    </div>
  );
}
