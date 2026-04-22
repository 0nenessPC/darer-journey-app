import React, { useState, useEffect } from 'react';
import { C, PIXEL_FONT, FONT_LINK } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
export default function GameMap({ quest, hero, battleHistory = [], onSelectBoss, onViewProfile, onArmory, onLadder, onAddExposure, onAchieveBoss, onDeleteBoss, justAddedBossId }) {
  const nextBoss = quest.bosses.find(b => !b.defeated);
  const defeatedCount = quest.bosses.filter(b => b.defeated).length;
  const totalXp = defeatedCount * 100;
  const [pendingBoss, setPendingBoss] = useState(null); // boss pending high-SUDs warning
  const [addPulse, setAddPulse] = useState(false); // FAB pulse animation trigger

  // Scroll to newly added boss
  useEffect(() => {
    if (!justAddedBossId) return;
    const el = document.getElementById(`boss-${justAddedBossId}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    }
  }, [justAddedBossId]);

  const handleBossSelect = (boss) => {
    if (!nextBoss || boss.difficulty - nextBoss.difficulty >= 2) {
      // Show warning dialog
      setPendingBoss(boss);
    } else {
      onSelectBoss(boss);
    }
  };

  // Sort bosses: active only on main map, custom sorted by difficulty at the bottom
  const activeDefaultBosses = quest.bosses.filter(b => !b.isCustom && !b.defeated);
  const activeCustomBosses = quest.bosses.filter(b => b.isCustom && !b.defeated).sort((a, b) => a.difficulty - b.difficulty);
  const sortedBosses = [...activeDefaultBosses, ...activeCustomBosses];
  const activeCount = sortedBosses.length;
  const customCount = activeCustomBosses.length;

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "0 0 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Hero status bar */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, background: C.plum, border: "2px solid #5C3A50", borderRadius: 4,
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
      <div style={{ padding: "12px 16px", background: "#1A1218", borderBottom: "2px solid #5C3A50", textAlign: "center" }}>
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
            background: "#1A1218",
            borderBottom: "2px solid #5C3A50",
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

      {/* Boss path — active exposures only */}
      <div style={{ padding: 16 }}>
        {sortedBosses.length === 0 && defeatedCount === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <PixelText size={10} color={C.grayLt}>No exposures yet.</PixelText>
            <div style={{ marginTop: 8 }}><PixelText size={8} color={C.grayLt}>Add your first exposure to begin!</PixelText></div>
          </div>
        )}
        {sortedBosses.length === 0 && defeatedCount > 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <PixelText size={10} color={C.hpGreen}>🎉 All exposures completed!</PixelText>
            <div style={{ marginTop: 8 }}><PixelText size={8} color={C.grayLt}>Tap ✅ COMPLETED above to review your journey, or add new challenges below.</PixelText></div>
          </div>
        )}
        {sortedBosses.map((boss, i) => {
          const isNext = nextBoss?.id === boss.id;
          const isHighLevel = nextBoss && boss.difficulty - nextBoss.difficulty >= 2;
          const isJustAdded = justAddedBossId === boss.id;
          const bgColor = isNext ? "#2A1A28" : boss.isCustom ? "#1E1620" : "#1A1218";
          const borderColor = isNext ? C.goldMd : isHighLevel ? C.amber + "60" : boss.isCustom ? C.teal + "80" : "#5C3A50";
          const bossBoxShadow = isJustAdded
            ? `0 0 20px ${C.goldMd}50, inset 0 0 20px ${C.goldMd}15`
            : isNext ? `0 0 16px ${C.goldMd}20` : boss.isCustom ? `0 0 8px ${C.teal}15` : "none";

          // Card content (used as children of SwipeableBoss)
          const isFirstCustom = boss.isCustom && sortedBosses.slice(0, i).every(b => !b.isCustom);
          const cardContent = (
            <>
              {/* Separator before custom section */}
              {isFirstCustom && (
                <div style={{ margin: "16px 0 8px", textAlign: "center" }}>
                  <PixelText size={7} color={C.teal}>— ✏️ CUSTOM EXPOSURES —</PixelText>
                </div>
              )}
              {/* Connector line between default bosses */}
              {i > 0 && !boss.isCustom && !sortedBosses[i-1]?.isCustom && (
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <div style={{ width: 3, height: 20, background: isNext ? C.plumMd : "#5C3A50" }} />
                </div>
              )}
              {/* Bridge connector: last default boss → custom section separator */}
              {isFirstCustom && i > 0 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <div style={{ width: 3, height: 16, background: `linear-gradient(to bottom, ${C.plumMd}60, ${C.teal}60)` }} />
                </div>
              )}
              {/* Connector line between custom bosses */}
              {i > 0 && boss.isCustom && !isFirstCustom && (
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <div style={{ width: 3, height: 14, background: C.teal + "50" }} />
                </div>
              )}
              {/* Boss card */}
              <div
                id={isJustAdded ? `boss-${boss.id}` : undefined}
                className={isJustAdded ? "just-added-glow" : undefined}
                style={{
                  width: "100%", padding: 14, background: bgColor,
                  border: `3px solid ${borderColor}`, borderRadius: 6,
                  cursor: "pointer", textAlign: "left",
                  opacity: boss.defeated ? 0.6 : 1, transition: "all 0.2s",
                  boxShadow: bossBoxShadow,
                  position: "relative",
                }}
              >
                {isHighLevel && !boss.defeated && (
                  <div style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: C.amber, border: `2px solid #1A1218`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10 }}>⚠</span>
                  </div>
                )}
                {boss.isCustom && !boss.defeated && (
                  <div style={{
                    position: "absolute", top: -6, left: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: C.teal, border: `2px solid #1A1218`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10 }}>✏️</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 4,
                    background: boss.defeated ? C.hpGreen + "30" : isNext ? C.bossRed + "30" : boss.isCustom ? C.teal + "20" : "#2A1F28",
                    border: `2px solid ${boss.defeated ? C.hpGreen : isNext ? C.bossRed : boss.isCustom ? C.teal + "60" : "#5C3A50"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PixelText size={boss.defeated ? 16 : 12} color={boss.defeated ? C.hpGreen : isNext ? C.bossRed : boss.isCustom ? C.teal : C.grayLt}>
                      {boss.defeated ? "✓" : boss.isCustom ? "✏" : "👾"}
                    </PixelText>
                  </div>
                  <div style={{ flex: 1 }}>
                    <PixelText size={9} color={boss.defeated ? C.hpGreen : isNext ? C.cream : C.grayLt}>
                      {boss.name}
                    </PixelText>
                    <div style={{ marginTop: 3 }}>
                      <PixelText size={7} color={C.grayLt}>{boss.desc}</PixelText>
                    </div>
                    {!boss.defeated && (
                      <div style={{ marginTop: 6 }}>
                        <HPBar current={boss.hp} max={boss.maxHp} height={6} label={isNext ? "BOSS HP" : ""} />
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <PixelText size={8} color={boss.defeated ? C.hpGreen : isHighLevel ? C.amber : boss.isCustom ? C.teal : C.grayLt}>
                      LV.{boss.difficulty}
                    </PixelText>
                  </div>
                </div>
                {isNext && (
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <PixelText size={8} color={C.goldMd}>⚔ NEXT BATTLE ⚔</PixelText>
                  </div>
                )}
              </div>
            </>
          );

          return (
            <SwipeableBoss
              key={boss.id}
              boss={boss}
              onBossSelect={handleBossSelect}
              onAchieve={onAchieveBoss}
              onDelete={onDeleteBoss}
            >
              {cardContent}
            </SwipeableBoss>
          );
        })}

        {/* Just-added pulse animation */}
        {justAddedBossId && (
          <style>{`
            @keyframes justAddedPulse {
              0%, 100% { box-shadow: 0 0 20px ${C.goldMd}50, inset 0 0 20px ${C.goldMd}15; }
              50% { box-shadow: 0 0 32px ${C.goldMd}70, inset 0 0 32px ${C.goldMd}25; }
            }
            .just-added-glow {
              animation: justAddedPulse 1.5s ease-in-out 2;
            }
          `}</style>
        )}

        {/* Goal castle at end */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
          <div style={{ width: 3, height: 20, background: "#5C3A50" }} />
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

      {/* High-SUDs Warning Dialog */}
      {pendingBoss && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{
            width: "100%", maxWidth: 400, background: "#1A1218",
            border: `3px solid ${C.amber}`, borderRadius: 8,
            padding: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <PixelText size={11} color={C.amber} style={{ display: "block", marginBottom: 8 }}>HIGH DIFFICULTY WARNING</PixelText>
            <div style={{ padding: 12, background: "#222", borderRadius: 6, marginBottom: 16 }}>
              <PixelText size={9} color={C.cream}>{pendingBoss.name}</PixelText>
              <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{pendingBoss.desc}</PixelText></div>
              <div style={{ marginTop: 6 }}>
                <PixelText size={8} color={C.amber}>LV.{pendingBoss.difficulty}</PixelText>
                <PixelText size={6} color={C.grayLt}> · Recommended: LV.{nextBoss?.difficulty || 1}-{(nextBoss?.difficulty || 1) + 1}</PixelText>
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

      {/* Floating "+" FAB for adding exposures — replaced by bar at top of list */}
      {/* Kept as backup but hidden */}
      {false && onAddExposure && (
        <button
          onClick={() => { setAddPulse(true); setTimeout(() => setAddPulse(false), 400); onAddExposure(); }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = `0 0 24px ${C.teal}50, 0 6px 0 #4A7A60`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 0 16px ${C.teal}40, 0 4px 0 #4A7A60`; }}
          style={{
            position: "fixed", bottom: 64, right: 16,
            width: 48, height: 48, borderRadius: "50%",
            background: C.teal, border: `3px solid ${C.teal}`,
            color: C.cream, fontSize: 24, fontWeight: "bold",
            cursor: "pointer", zIndex: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 16px ${C.teal}40, 0 4px 0 #4A7A60`,
            transition: "transform 0.15s, box-shadow 0.15s",
            transform: addPulse ? "scale(1.15)" : "scale(1)",
            maxWidth: 480,
          }}
          aria-label="Add new exposure"
        >
          +
        </button>
      )}

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218",
      }}>
        {[
          { icon: "🗺", label: "MAP", onClick: () => {} },
          { icon: "⚗", label: "ARMORY", onClick: onArmory },
          { icon: "🏆", label: "LADDER", onClick: onLadder },
          { icon: "🛡", label: "HERO", onClick: onViewProfile },
        ].map(t => (
          <button key={t.label} onClick={t.onClick} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
            background: "transparent", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <PixelText size={6} color={C.grayLt}>{t.label}</PixelText>
          </button>
        ))}
      </div>
    </div>
  );
}


