import React, { useState } from 'react';
import { C, PIXEL_FONT, FONT_LINK } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
import PracticeSession from '../components/PracticeSession';
export default function HeroProfile({ hero, setHero, quest, battleHistory = [], onBack, setScreen }) {
  const defeated = quest.bosses.filter(b => b.defeated).length;
  const [armoryView, setArmoryView] = useState(false);
  const [practiceMode, setPracticeMode] = useState(null);
  const [expandedBossId, setExpandedBossId] = useState(null);

  const incrementPractice = (toolId) => {
    setHero(h => {
      let unlockedItem = null;
      const updatedArmory = (h.armory || []).map(item => {
        if (item.id !== toolId) return item;
        const newCount = (item.practiceCount || 0) + 1;
        const newItem = { ...item, practiceCount: newCount };
        const nextIdx = (h.armory || []).findIndex(a => a.id === toolId) + 1;
        const nextItem = (h.armory || [])[nextIdx];
        if (nextItem && !nextItem.unlocked && nextItem.unlockCondition) {
          const cond = nextItem.unlockCondition;
          if (cond.requiresToolId === toolId && newCount >= cond.practiceCount) {
            unlockedItem = nextItem;
            return { ...newItem, unlocked: true, practiceCount: nextItem.practiceCount };
          }
        }
        return newItem;
      });
      if (unlockedItem) setPracticeMode({ toolId, justUnlocked: unlockedItem });
      else setPracticeMode(null);
      return { ...h, armory: updatedArmory };
    });
  };

  const handleComplete = (toolId) => {
    incrementPractice(toolId);
  };

  const armory = hero.armory || [];

  // Practice session running
  if (practiceMode && !practiceMode.justUnlocked) {
    const tool = armory.find(a => a.id === practiceMode.toolId);
    return <PracticeSession tool={tool} onComplete={() => handleComplete(practiceMode.toolId)} onQuit={() => { setPracticeMode(null); setArmoryView(false); }} />;
  }

  // Just unlocked notification
  if (practiceMode && practiceMode.justUnlocked) {
    const unlocked = practiceMode.justUnlocked;
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 100px" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16, animation: "fearPulseScale 1.5s ease-in-out infinite" }}>{unlocked.icon}</div>
          <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>NEW ARMORY ITEM UNLOCKED!</PixelText>
          <div style={{ padding: 16, background: C.cardBg, border: `3px solid ${C.goldMd}`, borderRadius: 6, marginBottom: 24 }}>
            <PixelText size={10} color={C.cream}>{unlocked.name}</PixelText>
            <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{unlocked.description}</PixelText></div>
          </div>
          <PixelBtn onClick={() => { setPracticeMode(null); setArmoryView(false); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>CONTINUE</PixelBtn>
        </div>
        <style>{`@keyframes fearPulseScale { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "16px 16px 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}>
        <PixelText size={8} color={C.grayLt}>← BACK TO MAP</PixelText>
      </button>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, margin: "0 auto 12px", borderRadius: 6,
          background: C.plum, border: "4px solid ${C.mutedBorder}",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><PixelText size={32} color={C.goldMd}>⚔</PixelText></div>
        <PixelText size={14} color={C.cream}>{hero.name}</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={8} color={C.goldMd}>{defeated}/{quest.bosses.length} BOSSES DEFEATED</PixelText></div>
      </div>

      {/* Tab toggle: Profile / Armory */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        <button onClick={() => setArmoryView(false)} style={{
          flex: 1, padding: "8px 0", border: `2px solid ${armoryView ? C.mutedBorder : C.goldMd}`, borderRadius: 4,
          background: armoryView ? "transparent" : C.goldMd + "20", cursor: "pointer",
        }}>
          <PixelText size={8} color={armoryView ? C.grayLt : C.goldMd}>HERO</PixelText>
        </button>
        <button onClick={() => setArmoryView(true)} style={{
          flex: 1, padding: "8px 0", border: `2px solid ${armoryView ? C.plum + "80" : C.mutedBorder}`, borderRadius: 4,
          background: armoryView ? C.plum + "30" : "transparent", cursor: "pointer",
        }}>
          <PixelText size={8} color={armoryView ? C.plumMd : C.grayLt}>⚗ ARMORY</PixelText>
        </button>
      </div>

      {!armoryView ? (
        <>
      {/* Sealed Values — Why I Fight */}
      {hero.values && hero.values.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PixelText size={9} color={C.goalGold} style={{ display: "block", marginBottom: 10 }}>WHY I FIGHT</PixelText>
          <div style={{
            padding: 14, background: C.goalGold + "08",
            border: `2px solid ${C.goalGold}40`, borderRadius: 6,
          }}>
            {hero.values.map(v => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{v.icon}</span>
                <PixelText size={7} color={C.goalGold}>{v.text}</PixelText>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>JOURNEY GOAL</PixelText>
        <div style={{ padding: 14, background: C.goalGold + "15", border: `2px solid ${C.goalGold}`, borderRadius: 4, textAlign: "center" }}>
          <PixelText size={9} color={C.goalGold}>🏰 {quest.goal}</PixelText>
        </div>
      </div>

      {/* Completed Exposures */}
      {(() => {
        const completed = quest.bosses.filter(b => b.defeated);
        if (completed.length === 0) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <PixelText size={9} color={C.hpGreen} style={{ display: "block", marginBottom: 10 }}>COMPLETED EXPOSURES</PixelText>
            {completed.map((boss, idx) => (
              <div key={boss.id} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setExpandedBossId(expandedBossId === boss.id ? null : boss.id)}
                  style={{
                    width: "100%",
                    padding: 10,
                    background: C.cardBg,
                    border: `2px solid ${expandedBossId === boss.id ? C.hpGreen : C.hpGreen + "40"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <PixelText size={8} color={C.hpGreen}>✓ {boss.name}</PixelText>
                    <div><PixelText size={6} color={C.grayLt}>{boss.desc}</PixelText></div>
                  </div>
                  <PixelText size={10} color={C.grayLt}>{expandedBossId === boss.id ? "▲" : "▼"}</PixelText>
                </button>

                {expandedBossId === boss.id && (() => {
                  const battle = battleHistory?.find(b => b.bossId === boss.id) || {};
                  return (
                    <div style={{ marginTop: 4, padding: 10, background: C.cardBg, border: `1px solid ${C.hpGreen}30`, borderRadius: 4 }}>
                      <div style={{ textAlign: "center", marginBottom: 6 }}>
                        <PixelText size={9} color={battle.outcome === "victory" ? C.hpGreen : battle.outcome === "partial" ? C.amber : C.bossRed}>
                          {battle.outcome === "victory" ? "VICTORY" : battle.outcome === "partial" ? "PARTIAL" : "DEFEATED"}
                        </PixelText>
                      </div>
                      {battle.suds && battle.suds.before !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 6, padding: 6, background: C.warmDark, borderRadius: 4 }}>
                          <div style={{ textAlign: "center" }}><PixelText size={9} color={C.bossRed}>{battle.suds.before}</PixelText><div><PixelText size={6} color={C.grayLt}>BEFORE</PixelText></div></div>
                          <div style={{ textAlign: "center" }}><PixelText size={9} color={C.amber}>{battle.suds.during ?? battle.suds.peak}</PixelText><div><PixelText size={6} color={C.grayLt}>PEAK</PixelText></div></div>
                          <div style={{ textAlign: "center" }}><PixelText size={9} color={C.hpGreen}>{battle.suds.after}</PixelText><div><PixelText size={6} color={C.grayLt}>AFTER</PixelText></div></div>
                        </div>
                      )}
                      {battle.date && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.grayLt}>Completed: {new Date(battle.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</PixelText></div>}
                      {battle.prepAnswers?.value && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>Value:</PixelText><PixelText size={6} color={C.cream}> {battle.prepAnswers.value}</PixelText></div>}
                      {battle.exposureArmory && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>Tool:</PixelText><PixelText size={6} color={C.cream}> {battle.exposureArmory}</PixelText></div>}
                      {battle.exposureWhen && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>When:</PixelText><PixelText size={6} color={C.cream}> {battle.exposureWhen}</PixelText></div>}
                      {battle.exposureWhere && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>Where:</PixelText><PixelText size={6} color={C.cream}> {battle.exposureWhere}</PixelText></div>}
                      {battle.exposureScheduledTime && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>Scheduled:</PixelText><PixelText size={6} color={C.cream}> {new Date(battle.exposureScheduledTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</PixelText></div>}
                      {battle.battleMessages?.length > 0 && (
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ cursor: "pointer", marginBottom: 4 }}>
                            <PixelText size={6} color={C.teal}>Battle conversation ({battle.battleMessages.length} messages)</PixelText>
                          </summary>
                          <div style={{ maxHeight: 150, overflowY: "auto", padding: 6, background: C.deepDark, borderRadius: 4, marginTop: 4 }}>
                            {battle.battleMessages.map((m, mi) => (
                              <div key={mi} style={{ marginBottom: 3 }}>
                                <PixelText size={6} color={m.role === "assistant" ? C.rose : C.cream}>{m.role === "assistant" ? "Dara: " : "You: "}{m.text}</PixelText>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      {battle.victoryMessages?.length > 0 && (
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ cursor: "pointer", marginBottom: 4 }}>
                            <PixelText size={6} color={C.teal}>Victory reflection ({battle.victoryMessages.length} messages)</PixelText>
                          </summary>
                          <div style={{ maxHeight: 150, overflowY: "auto", padding: 6, background: C.deepDark, borderRadius: 4, marginTop: 4 }}>
                            {battle.victoryMessages.map((m, mi) => (
                              <div key={mi} style={{ marginBottom: 3 }}>
                                <PixelText size={6} color={m.role === "assistant" ? C.rose : C.cream}>{m.role === "assistant" ? "Dara: " : "You: "}{m.text}</PixelText>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        );
      })()}

      <div>
        <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>BATTLE LOG</PixelText>
        {quest.bosses.filter(b => b.defeated).map(b => (
          <div key={b.id} style={{ padding: 10, marginBottom: 6, background: C.cardBg, border: "2px solid " + C.hpGreen + "60", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <PixelText size={7} color={C.hpGreen}>{b.name}</PixelText>
            <PixelText size={7} color={C.goldMd}>+100 XP</PixelText>
          </div>
        ))}
        {quest.bosses.filter(b => b.defeated).length === 0 && (
          <div style={{ padding: 14, textAlign: "center" }}><PixelText size={8} color={C.grayLt}>No bosses defeated yet. Your journey awaits!</PixelText></div>
        )}
      </div>
      </>
      ) : (
      /* === ARMORY VIEW === */
      <>
      <div style={{ padding: 12, textAlign: "center" }}>
        <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>Practice to unlock new tools</PixelText>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {armory.map((item, i) => {
          const isLocked = !item.unlocked;
          const cond = item.unlockCondition;
          const prevItem = armory.find(a => a.id === cond?.requiresToolId);
          const progressNeeded = cond?.practiceCount || 2;
          const currentProgress = prevItem ? (prevItem.practiceCount || 0) : 0;
          const progressPct = Math.min(1, currentProgress / progressNeeded);

          return (
            <div key={item.id} style={{
              padding: 16, borderRadius: 6,
              background: isLocked ? C.lockedBg : C.cardBg,
              border: `3px solid ${isLocked ? C.grayBorder : C.plum + "80"}`,
              opacity: isLocked ? 0.55 : 1,
              transition: "all 0.3s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 6,
                  background: isLocked ? C.grayBg : C.plum + "20",
                  border: `2px solid ${isLocked ? C.grayBorderMid : C.plum + "60"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  {isLocked && (
                    <div style={{
                      position: "absolute", top: -4, right: -4,
                      width: 18, height: 18, borderRadius: "50%",
                      background: C.grayBorder, border: "2px solid ${C.grayBorderLt}",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 9 }}>🔒</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <PixelText size={9} color={isLocked ? C.grayLt : C.cream}>{item.name}</PixelText>
                  <div style={{ marginTop: 2 }}>
                    <PixelText size={6} color={C.grayLt}>{item.description}</PixelText>
                  </div>
                </div>
              </div>

              {isLocked && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <PixelText size={6} color={C.amber}>Practice {prevItem?.name || ""} to unlock</PixelText>
                    <PixelText size={6} color={C.grayLt}>{currentProgress}/{progressNeeded}</PixelText>
                  </div>
                  <div style={{ height: 6, background: C.grayBg, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${progressPct * 100}%`,
                      background: progressPct >= 1 ? C.hpGreen : C.amber,
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>
              )}

              {!isLocked && (
                <div>
                  <div style={{ marginTop: 8, marginBottom: 10 }}>
                    <PixelText size={6} color={C.teal}>Practiced {item.practiceCount || 0}x{item.practiceCount >= 2 ? "" : ` (${2 - (item.practiceCount || 0)} more to unlock next)`}</PixelText>
                  </div>
                  <button onClick={() => setPracticeMode({ toolId: item.id })} style={{
                    width: "100%", padding: "10px 14px", borderRadius: 4,
                    background: C.plum + "30", border: `2px solid ${C.plum + "80"}`,
                    cursor: "pointer",
                  }}>
                    <PixelText size={8} color={C.plumMd}>PRACTICE →</PixelText>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* Bottom nav — 4 tabs, HERO active */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", borderTop: `3px solid ${C.mutedBorder}`, background: C.cardBg,
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: () => setScreen("map") },
          { icon: "📚", label: "BANK", active: false, onClick: () => setScreen("bank") },
          { icon: "🏆", label: "LADDER", active: false, onClick: () => setScreen("ladder") },
          { icon: "🛡", label: "HERO", active: true },
        ].map(t => (
          <button key={t.label} onClick={t.onClick} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
            background: t.active ? C.cardBgAlt : "transparent", display: "flex",
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


