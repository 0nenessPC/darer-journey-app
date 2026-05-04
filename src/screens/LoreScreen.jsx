import React, { useState } from 'react';
import { C } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
import { getUnlockedLore, getNextLore, LORE_CHAPTERS } from '../constants/loreData';
import BottomNav from '../components/BottomNav';

export default function LoreScreen({ quest, onBack, setScreen }) {
  const defeatedCount = (quest.bosses || []).filter((b) => b.defeated).length;
  const unlocked = getUnlockedLore(defeatedCount);
  const nextLore = getNextLore(defeatedCount);
  const [openChapter, setOpenChapter] = useState(null);

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '16px 16px 100px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 0',
          borderBottom: `2px solid ${C.mutedBorder}`,
          marginBottom: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <PixelText size={9} color={C.subtleText}>
            ←
          </PixelText>
        </button>
        <PixelText size={10} color={C.goalGold}>
          📚 SHADOW LORE
        </PixelText>
        <PixelText size={7} color={C.grayLt} style={{ marginLeft: 'auto' }}>
          {unlocked.length}/{LORE_CHAPTERS.length}
        </PixelText>
      </div>

      {/* Progress hint */}
      {nextLore && (
        <div
          style={{
            padding: C.padMd,
            marginBottom: 16,
            textAlign: 'center',
            background: C.cardBg,
            border: `1px solid ${C.mutedBorder}`,
            borderRadius: 6,
          }}
        >
          <PixelText size={7} color={C.grayLt}>
            Defeat {nextLore.unlockBosses - defeatedCount} more boss
            {nextLore.unlockBosses - defeatedCount > 1 ? 'es' : ''} to unlock:
          </PixelText>
          <PixelText size={8} color={C.plumMd} style={{ display: 'block', marginTop: 4 }}>
            {nextLore.title}
          </PixelText>
        </div>
      )}

      {/* Lore chapters */}
      {unlocked.length === 0 ? (
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📜</div>
          <PixelText size={9} color={C.grayLt} style={{ display: 'block', lineHeight: 1.8 }}>
            Complete your first exposure{'\n'}to begin unlocking Shadow Lore.
          </PixelText>
        </div>
      ) : (
        unlocked.map((ch, i) => {
          const isOpen = openChapter === ch.id;
          return (
            <div key={ch.id} style={{ marginBottom: 8 }}>
              <button
                onClick={() => setOpenChapter(isOpen ? null : ch.id)}
                style={{
                  width: '100%',
                  padding: C.padLg,
                  textAlign: 'left',
                  background: C.cardBg,
                  border: `2px solid ${isOpen ? C.goalGold + '60' : C.mutedBorder}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>{ch.icon}</span>
                <div style={{ flex: 1 }}>
                  <PixelText size={8} color={C.goalGold} style={{ display: 'block' }}>
                    {ch.title}
                  </PixelText>
                  <PixelText size={6} color={C.grayLt}>
                    {ch.subtitle}
                  </PixelText>
                </div>
                <PixelText size={10} color={C.grayLt}>
                  {isOpen ? '▲' : '▼'}
                </PixelText>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: C.padLg,
                    marginTop: 4,
                    background: C.deepDark,
                    border: `1px solid ${C.goalGold}20`,
                    borderRadius: 6,
                    animation: 'fadeIn 0.3s ease-out',
                  }}
                >
                  <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.9 }}>
                    {ch.content}
                  </PixelText>
                </div>
              )}
            </div>
          );
        })
      )}

      <BottomNav active="hero" onNav={setScreen} />
    </div>
  );
}
