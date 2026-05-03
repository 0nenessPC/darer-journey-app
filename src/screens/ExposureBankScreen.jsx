import React, { useState } from 'react';
import { C } from '../constants/gameData';
import { PixelText, HPBar } from '../components/shared';
import SwipeableBoss from '../components/SwipeableBoss';
import BottomNav from '../components/BottomNav';
import { getMasteryLabel, getMasteryColor } from '../utils/mastery';

export default function ExposureBankScreen({
  quest,
  hero,
  focusedBoss,
  setFocusedBoss,
  onBack,
  onAchieveBoss,
  onDeleteBoss,
  onNav,
  battleHistory = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const allBosses = quest.bosses;
  const unfinishedBosses = allBosses.filter((b) => !b.defeated);
  const defeatedBosses = allBosses.filter((b) => b.defeated);

  const filtered = (bosses) => {
    if (!searchQuery.trim()) return bosses;
    const q = searchQuery.toLowerCase();
    return bosses.filter(
      (b) => b.name.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q),
    );
  };
  const filteredUnfinished = filtered(unfinishedBosses);
  const filteredDefeated = filtered(defeatedBosses);

  const levelColor = (lv) =>
    lv <= 3 ? C.hpGreen : lv <= 6 ? C.goldMd : lv <= 8 ? C.levelAmber : C.bossRed;

  const handleSelectBoss = (boss) => {
    setFocusedBoss(boss);
    onBack();
  };

  const cardStyle = (boss, isFocused) => {
    const isCompleted = boss.defeated;
    return {
      width: '100%',
      padding: 14,
      background: isFocused
        ? C.cardBgAlt
        : isCompleted
          ? C.cardCompleted
          : boss.isCustom
            ? C.cardCustom
            : C.cardBg,
      border: `2px solid ${isFocused ? C.goldMd : isCompleted ? C.hpGreen + '60' : boss.isCustom ? C.teal + '60' : C.mutedBorder}`,
      borderRadius: 6,
      cursor: 'pointer',
      textAlign: 'left',
      boxSizing: 'border-box',
    };
  };

  const BossCard = ({ boss, isFocused }) => {
    const isCompleted = boss.defeated;
    const bDiff = boss.difficulty ?? boss.level;

    return (
      <div style={cardStyle(boss, isFocused)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Icon badge */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 4,
              flexShrink: 0,
              background: isCompleted ? C.hpGreen + '20' : levelColor(bDiff) + '15',
              border: `2px solid ${isCompleted ? C.hpGreen + '60' : levelColor(bDiff) + '50'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCompleted ? (
              <span style={{ fontSize: 18, color: C.hpGreen }}>✓</span>
            ) : (
              <span style={{ fontSize: 16 }}>{boss.isCustom ? '✏' : '👾'}</span>
            )}
          </div>
          {/* Name + desc */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <PixelText size={9} color={isCompleted ? C.hpGreen : isFocused ? C.cream : C.grayLt}>
              {boss.name}
            </PixelText>
            <div style={{ marginTop: 3 }}>
              <PixelText size={6} color={C.grayLt}>
                {boss.desc}
              </PixelText>
            </div>
            {/* HP bar for unfinished */}
            {!isCompleted && (
              <div style={{ marginTop: 6 }}>
                <HPBar current={boss.hp} max={boss.maxHp} height={4} />
              </div>
            )}
          </div>
          {/* Right side badge */}
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
            {isCompleted ? (
              <>
                <PixelText size={7} color={getMasteryColor(boss.completions || 1)}>
                  {getMasteryLabel(boss.completions || 1)}
                </PixelText>
                {(battleHistory || []).filter(
                  (b) => b.bossName === boss.name && (b.lootImage || b.lootText),
                ).length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    <PixelText size={6} color={C.goalGold}>
                      📸{' '}
                      {(battleHistory || []).filter(
                        (b) => b.bossName === boss.name && (b.lootImage || b.lootText),
                      ).length}
                    </PixelText>
                  </div>
                )}
              </>
            ) : (
              <PixelText size={8} color={levelColor(bDiff)}>
                LV.{bDiff}
              </PixelText>
            )}
          </div>
        </div>
        {/* Focused label */}
        {isFocused && (
          <div
            style={{
              marginTop: 8,
              textAlign: 'center',
              paddingTop: 6,
              borderTop: `1px solid ${C.goldMd}30`,
            }}
          >
            <PixelText size={7} color={C.goldMd}>
              ★ CURRENT FOCUS ★
            </PixelText>
          </div>
        )}
      </div>
    );
  };

  const renderBossCard = (boss) => {
    const isFocused = focusedBoss?.id === boss.id;
    const cardContent = <BossCard key={boss.id} boss={boss} isFocused={isFocused} />;

    if (!boss.defeated) {
      return (
        <div key={boss.id} style={{ marginBottom: 8 }}>
          <SwipeableBoss
            boss={boss}
            onBossSelect={handleSelectBoss}
            onAchieve={onAchieveBoss}
            onDelete={onDeleteBoss}
          >
            {cardContent}
          </SwipeableBoss>
        </div>
      );
    }
    // Completed boss — clickable to re-focus for repeat
    return (
      <div key={boss.id} style={{ marginBottom: 8 }} onClick={() => handleSelectBoss(boss)}>
        {cardContent}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '0 0 100px' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `2px solid ${C.mutedBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: C.cardBg,
            border: `1px solid ${C.mutedBorder}`,
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          <PixelText size={7} color={C.grayLt}>
            ← BACK
          </PixelText>
        </button>
        <div style={{ flex: 1 }}>
          <PixelText size={10} color={C.cream}>
            📚 EXPOSURE BANK
          </PixelText>
        </div>
        <PixelText size={7} color={C.grayLt}>
          {quest.bosses.length} total
        </PixelText>
      </div>

      {/* Search bar */}
      <div style={{ padding: '8px 16px 0' }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search exposures..."
          style={{
            width: '100%',
            padding: '8px 12px',
            boxSizing: 'border-box',
            background: C.cardBg,
            border: `2px solid ${C.mutedBorder}`,
            borderRadius: 6,
            color: C.cream,
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ padding: C.padLg }}>
        {allBosses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <PixelText size={9} color={C.grayLt}>
              No exposures in your bank.
            </PixelText>
          </div>
        )}

        {/* UNFINISHED group */}
        {filteredUnfinished.length > 0 && (
          <div style={{ marginBottom: filteredDefeated.length > 0 ? 20 : 0 }}>
            <PixelText size={9} color={C.goldMd} style={{ display: 'block', marginBottom: 12 }}>
              — UNFINISHED — {searchQuery && `(${filteredUnfinished.length})`}
            </PixelText>
            {filteredUnfinished.map((b) => renderBossCard(b))}
          </div>
        )}

        {/* COMPLETED group */}
        {filteredDefeated.length > 0 && (
          <div>
            <PixelText size={9} color={C.hpGreen} style={{ display: 'block', marginBottom: 12 }}>
              — MASTERY PATH — {searchQuery && `(${filteredDefeated.length})`}
            </PixelText>
            {filteredDefeated.map((b) => renderBossCard(b))}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <PixelText size={6} color={C.grayLt}>
                Tap to re-focus and repeat
              </PixelText>
            </div>
          </div>
        )}
      </div>

      <BottomNav
        active="bank"
        onNav={(s) => {
          if (s === 'map') onBack();
          else if (onNav) onNav(s);
        }}
      />
    </div>
  );
}
