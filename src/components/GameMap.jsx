import React, { useState, useEffect } from 'react';
import { C, PIXEL_FONT, FONT_LINK } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar } from '../components/shared';
import SwipeableBoss from './SwipeableBoss';
export default function GameMap({ quest, hero, battleHistory = [], onSelectBoss, onViewProfile, onLadder, onBank, focusedBoss, setFocusedBoss, onAddExposure, onAchieveBoss, onDeleteBoss, justAddedBossId }) {
  const nextBoss = quest.bosses.find(b => !b.defeated);
  const defeatedCount = quest.bosses.filter(b => b.defeated).length;
  const totalXp = defeatedCount * 100;
  const [pendingBoss, setPendingBoss] = useState(null);
  const [addPulse, setAddPulse] = useState(false);

  // Sync focusedBoss to first undefeated only when there is NO focus set yet
  useEffect(() => {
    if (!focusedBoss) {
      const next = quest.bosses.find(b => !b.defeated);
      if (next) setFocusedBoss(next);
    }
  }, []);

  // Scroll to newly added boss in bank (handled there, but keep prop for consistency)
  useEffect(() => {
    if (!justAddedBossId) return;
    const el = document.getElementById(`boss-${justAddedBossId}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    }
  }, [justAddedBossId]);

  const handleBossSelect = (boss) => {
    const bDiff = boss.difficulty ?? boss.level;
    const nDiff = nextBoss?.difficulty ?? nextBoss?.level;
    if (!nextBoss || bDiff - nDiff >= 2) {
      setPendingBoss(boss);
    } else {
      onSelectBoss(boss);
    }
  };

  const activeBosses = quest.bosses.filter(b => !b.defeated);
  const customBosses = quest.bosses.filter(b => b.isCustom && !b.defeated);
  const defeatedBosses = quest.bosses.filter(b => b.defeated);
  const activeCount = activeBosses.length;

  const levelColor = (lv) => lv <= 3 ? C.hpGreen : lv <= 6 ? C.goldMd : lv <= 8 ? C.levelAmber : C.bossRed;
  const levelLabel = (lv) => lv <= 3 ? "SHALLOW WATER" : lv <= 6 ? "GETTING DEEPER" : lv <= 8 ? "DEEP END" : "BOSS TERRITORY";

  const boss = focusedBoss || nextBoss;
  const bDiff = boss?.difficulty ?? boss?.level;
  const isHighLevel = nextBoss && bDiff - (nextBoss?.difficulty ?? nextBoss?.level) >= 2;

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "0 0 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Hero status bar */}
      <div style={{ padding: "12px 16px", borderBottom: `2px solid ${C.mutedBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, background: C.plum, border: `2px solid ${C.mutedBorder}`, borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><PixelText size={14} color={C.goldMd}>⚔</PixelText></div>
        <div style={{ flex: 1 }}>
          <PixelText size={8} color={C.cream}>{hero.name}</PixelText>
          <HPBar current={totalXp} max={quest.bosses.length * 100} height={8} />
        </div>
        <div style={{ textAlign: "right" }}>
          <PixelText size={10} color={C.goldMd}>{totalXp} XP</PixelText>
          <div><PixelText size={7} color={C.grayLt}>{activeCount}/{quest.bosses.length} BOSSES</PixelText></div>
        </div>
      </div>

      {/* Journey goal banner */}
      <div style={{ padding: "12px 16px", background: C.cardBg, borderBottom: `2px solid ${C.mutedBorder}`, textAlign: "center" }}>
        <PixelText size={7} color={C.grayLt}>JOURNEY GOAL</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={9} color={C.goalGold}>🏰 {quest.goal}</PixelText></div>
      </div>

      {/* Add exposure bar */}
      {onAddExposure && (
        <button
          onClick={onAddExposure}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: C.cardBg,
            borderBottom: `2px solid ${C.mutedBorder}`,
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>➕</span>
          <PixelText size={9} color={C.teal}>ADD NEW EXPOSURE</PixelText>
        </button>
      )}

      {/* Focused Boss Card */}
      <div style={{ padding: 16 }}>
        {!boss ? (
          // No bosses at all
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <PixelText size={10} color={C.grayLt}>No exposures yet.</PixelText>
            <div style={{ marginTop: 8 }}><PixelText size={8} color={C.grayLt}>Add your first exposure to begin!</PixelText></div>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            {/* Path progress summary */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <PixelText size={7} color={C.grayLt}>
                {activeCount} shadow{activeCount !== 1 ? "s" : ""} remaining · {defeatedCount} defeated
              </PixelText>
            </div>

            {/* Focused boss hero card */}
            <div style={{
              padding: 20,
              background: `linear-gradient(180deg, ${levelColor(bDiff)}10 0%, ${C.cardBg} 100%)`,
              border: `3px solid ${boss === nextBoss ? C.goldMd : levelColor(bDiff) + "80"}`,
              borderRadius: 8,
              boxShadow: boss === nextBoss ? `0 0 20px ${C.goldMd}25` : "none",
            }}>
              {/* Level badge */}
              <div style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 4, marginBottom: 14,
                background: levelColor(bDiff) + "20", border: `2px solid ${levelColor(bDiff)}50`,
              }}>
                <PixelText size={8} color={levelColor(bDiff)}>LV.{bDiff} · {levelLabel(bDiff)}</PixelText>
              </div>

              {/* High SUDs warning */}
              {isHighLevel && (
                <div style={{
                  display: "inline-block", marginLeft: 10, padding: "4px 8px", borderRadius: 4,
                  background: C.amber + "20", border: `2px solid ${C.amber}50`,
                }}>
                  <PixelText size={6} color={C.amber}>⚠ HIGH DIFFICULTY</PixelText>
                </div>
              )}

              {/* Boss name */}
              <PixelText size={12} color={C.cream} style={{ display: "block", marginBottom: 8 }}>
                {boss.name}
              </PixelText>

              {/* Boss description */}
              <PixelText size={8} color={C.grayLt} style={{ display: "block", lineHeight: 1.7, marginBottom: 14 }}>
                {boss.desc}
              </PixelText>

              {/* HP Bar (only for undefeated) */}
              {!boss.defeated && (
                <HPBar current={boss.hp} max={boss.maxHp} height={10} label="BOSS HP" />
              )}

              {/* Completed badge */}
              {boss.defeated && (
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <PixelText size={8} color={C.hpGreen}>✓ PREVIOUSLY DEFEATED</PixelText>
                </div>
              )}

              {/* Custom badge */}
              {boss.isCustom && (
                <div style={{ marginTop: 8 }}>
                  <PixelText size={6} color={C.teal}>✏️ CUSTOM EXPOSURE</PixelText>
                </div>
              )}
            </div>

            {/* ENGAGE or REPEAT button */}
            <PixelBtn
              onClick={() => handleBossSelect(boss)}
              color={boss.defeated ? C.hpGreen : C.bossRed}
              textColor={boss.defeated ? C.cream : C.cream}
              style={{ width: "100%", marginTop: 16, padding: "14px 0" }}
            >
              {boss.defeated ? "↻ REPEAT THIS EXPOSURE" : "⚔ ENGAGE THIS BOSS ⚔"}
            </PixelBtn>

            {/* CHANGE FOCUS button */}
            <PixelBtn
              onClick={onBank}
              color={C.plum}
              style={{ width: "100%", marginTop: 8, padding: "10px 0" }}
            >
              CHANGE FOCUS →
            </PixelBtn>
          </div>
        )}

        {/* Goal castle */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
            <div style={{ width: 3, height: 20, background: C.mutedBorder }} />
          </div>
          <div style={{
            padding: 16, background: C.goalGold + "15", border: `3px solid ${C.goalGold}`,
            borderRadius: 6, textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏰</div>
            <PixelText size={10} color={C.goalGold}>{quest.goal.toUpperCase()}</PixelText>
            <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>Defeat all bosses to reach your goal</PixelText></div>
          </div>
        </div>
      </div>

      {/* High-SUDs Warning Dialog */}
      {pendingBoss && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: C.overlay,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{
            width: "100%", maxWidth: 400, background: C.cardBg,
            border: `3px solid ${C.amber}`, borderRadius: 8,
            padding: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <PixelText size={11} color={C.amber} style={{ display: "block", marginBottom: 8 }}>HIGH DIFFICULTY WARNING</PixelText>
            <div style={{ padding: 12, background: "C.inputBg", borderRadius: 6, marginBottom: 16 }}>
              <PixelText size={9} color={C.cream}>{pendingBoss.name}</PixelText>
              <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{pendingBoss.desc}</PixelText></div>
              <div style={{ marginTop: 6 }}>
                <PixelText size={8} color={C.amber}>LV.{pendingBoss.level || pendingBoss.difficulty}</PixelText>
                <PixelText size={6} color={C.grayLt}> · Recommended: LV.{(nextBoss?.level ?? nextBoss?.difficulty) || 1}-{((nextBoss?.level ?? nextBoss?.difficulty) || 1) + 1}</PixelText>
              </div>
            </div>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16, lineHeight: 1.6 }}>
              This exposure has a significantly higher anxiety level than your current path. It's recommended to work through lower-SUDs activities first to build confidence.
            </PixelText>
            <div style={{ display: "flex", gap: 8 }}>
              <PixelBtn onClick={() => setPendingBoss(null)} color={C.plum} style={{ flex: 1 }}>← GO BACK</PixelBtn>
              <PixelBtn onClick={() => { setPendingBoss(null); onSelectBoss(pendingBoss); }} color={C.amber} textColor={C.charcoal} style={{ flex: 1 }}>I'M READY →</PixelBtn>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav — 4 tabs — positioned relative to the app container */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", borderTop: `3px solid ${C.mutedBorder}`, background: C.cardBg,
      }}>
        {[
          { icon: "🗺", label: "MAP", active: true, onClick: () => {} },
          { icon: "📚", label: "BANK", active: false, onClick: onBank },
          { icon: "🏆", label: "LADDER", active: false, onClick: onLadder },
          { icon: "🛡", label: "HERO", active: false, onClick: onViewProfile },
        ].map(t => (
          <button key={t.label} onClick={t.onClick} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
            background: t.active ? C.charcoal + "80" : "transparent", display: "flex",
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
