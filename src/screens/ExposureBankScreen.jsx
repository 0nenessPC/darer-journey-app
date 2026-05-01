import React from 'react';
import { C, FONT_LINK } from '../constants/gameData';
import { PixelText, HPBar } from '../components/shared';
import SwipeableBoss from '../components/SwipeableBoss';

export default function ExposureBankScreen({ quest, hero, focusedBoss, setFocusedBoss, onBack, onAchieveBoss, onDeleteBoss }) {
  const unfinishedBosses = quest.bosses.filter(b => !b.defeated);
  const defeatedBosses = quest.bosses.filter(b => b.defeated);

  const levelColor = (lv) => lv <= 3 ? C.hpGreen : lv <= 6 ? C.goldMd : lv <= 8 ? "#E8A04A" : C.bossRed;

  const handleSelectBoss = (boss) => {
    setFocusedBoss(boss);
    onBack();
  };

  const cardStyle = (boss, isFocused) => {
    const isCompleted = boss.defeated;
    return {
      width: "100%",
      padding: 14,
      background: isFocused ? "#2A1A28" : isCompleted ? "#151E14" : boss.isCustom ? "#1E1620" : "#1A1218",
      border: `2px solid ${isFocused ? C.goldMd : isCompleted ? C.hpGreen + "60" : boss.isCustom ? C.teal + "60" : "#5C3A50"}`,
      borderRadius: 6,
      cursor: "pointer",
      textAlign: "left",
      boxSizing: "border-box",
    };
  };

  const BossCard = ({ boss, isFocused }) => {
    const isCompleted = boss.defeated;
    const bDiff = boss.difficulty ?? boss.level;

    return (
      <div style={cardStyle(boss, isFocused)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Icon badge */}
          <div style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: isCompleted ? C.hpGreen + "20" : levelColor(bDiff) + "15",
            border: `2px solid ${isCompleted ? C.hpGreen + "60" : levelColor(bDiff) + "50"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {isCompleted ? (
              <span style={{ fontSize: 18, color: C.hpGreen }}>✓</span>
            ) : (
              <span style={{ fontSize: 16 }}>{boss.isCustom ? "✏" : "👾"}</span>
            )}
          </div>
          {/* Name + desc */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <PixelText size={9} color={isCompleted ? C.hpGreen : isFocused ? C.cream : C.grayLt}>
              {boss.name}
            </PixelText>
            <div style={{ marginTop: 3 }}>
              <PixelText size={6} color={C.grayLt}>{boss.desc}</PixelText>
            </div>
            {/* HP bar for unfinished */}
            {!isCompleted && (
              <div style={{ marginTop: 6 }}>
                <HPBar current={boss.hp} max={boss.maxHp} height={4} />
              </div>
            )}
          </div>
          {/* Right side badge */}
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
            {isCompleted ? (
              <PixelText size={7} color={C.hpGreen}>↻ REPEAT</PixelText>
            ) : (
              <PixelText size={8} color={levelColor(bDiff)}>LV.{bDiff}</PixelText>
            )}
          </div>
        </div>
        {/* Focused label */}
        {isFocused && (
          <div style={{ marginTop: 8, textAlign: "center", paddingTop: 6, borderTop: `1px solid ${C.goldMd}30` }}>
            <PixelText size={7} color={C.goldMd}>★ CURRENT FOCUS ★</PixelText>
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
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "0 0 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{
          background: "#1A1218", border: "1px solid #5C3A50", borderRadius: 4,
          padding: "4px 10px", cursor: "pointer",
        }}>
          <PixelText size={7} color={C.grayLt}>← BACK</PixelText>
        </button>
        <div style={{ flex: 1 }}>
          <PixelText size={10} color={C.cream}>📚 EXPOSURE BANK</PixelText>
        </div>
        <PixelText size={7} color={C.grayLt}>{quest.bosses.length} total</PixelText>
      </div>

      <div style={{ padding: 16 }}>
        {unfinishedBosses.length === 0 && defeatedBosses.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <PixelText size={9} color={C.grayLt}>No exposures in your bank.</PixelText>
          </div>
        )}

        {/* UNFINISHED group */}
        {unfinishedBosses.length > 0 && (
          <div style={{ marginBottom: defeatedBosses.length > 0 ? 20 : 0 }}>
            <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>
              — UNFINISHED —
            </PixelText>
            {unfinishedBosses.map(b => renderBossCard(b))}
          </div>
        )}

        {/* COMPLETED group */}
        {defeatedBosses.length > 0 && (
          <div>
            <PixelText size={9} color={C.hpGreen} style={{ display: "block", marginBottom: 12 }}>
              — COMPLETED —
            </PixelText>
            {defeatedBosses.map(b => renderBossCard(b))}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <PixelText size={6} color={C.grayLt}>Tap to re-focus and repeat</PixelText>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav — 4 tabs, BANK active */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218",
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: onBack },
          { icon: "📚", label: "BANK", active: true, onClick: () => {} },
          { icon: "🏆", label: "LADDER", active: false, onClick: () => {} },
          { icon: "🛡", label: "HERO", active: false, onClick: () => {} },
        ].map(t => (
          <button key={t.label} onClick={t.onClick} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
            background: t.active ? "#2A1A28" : "transparent", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <PixelText size={6} color={t.active ? C.goldMd : C.grayLt}>{t.label}</PixelText>
          </button>
        ))}
      </div>
    </div>
  );
}
