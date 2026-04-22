import { useState, useEffect, useRef } from "react";
import { C, PIXEL_FONT, FONT_LINK } from "../constants/gameData";
import { PixelText, PixelBtn } from "../components/shared";
import PracticeSession from "../components/PracticeSession";

export default function GameArmory({ hero, setHero, setScreen, onBack }) {
  const armory = hero.armory || [];
  const [practiceMode, setPracticeMode] = useState(null); // { toolId } or null

  const incrementPractice = (toolId) => {
    setHero(h => {
      const updatedArmory = (h.armory || []).map(item => {
        if (item.id !== toolId) return item;
        const newCount = (item.practiceCount || 0) + 1;
        const newItem = { ...item, practiceCount: newCount };
        // Check if the NEXT item should unlock
        const nextIdx = (h.armory || []).findIndex(a => a.id === toolId) + 1;
        const nextItem = (h.armory || [])[nextIdx];
        if (nextItem && !nextItem.unlocked && nextItem.unlockCondition) {
          const cond = nextItem.unlockCondition;
          if (cond.requiresToolId === toolId && newCount >= cond.practiceCount) {
            return { ...newItem, unlocked: true, practiceCount: nextItem.practiceCount };
          }
        }
        return newItem;
      });
      return { ...h, armory: updatedArmory };
    });
  };

  const handleComplete = (toolId) => {
    incrementPractice(toolId);
    // Check what was unlocked
    const nextIdx = (hero.armory || []).findIndex(a => a.id === toolId) + 1;
    const nextItem = (hero.armory || [])[nextIdx];
    if (nextItem && nextItem.unlocked) {
      setPracticeMode({ toolId, justUnlocked: nextItem });
    } else {
      setPracticeMode(null);
    }
  };

  // Practice session running
  if (practiceMode && !practiceMode.justUnlocked) {
    const tool = armory.find(a => a.id === practiceMode.toolId);
    return <PracticeSession tool={tool} onComplete={() => handleComplete(practiceMode.toolId)} onQuit={() => setPracticeMode(null)} />;
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
          <div style={{ padding: 16, background: "#1A1218", border: `3px solid ${C.goldMd}`, borderRadius: 6, marginBottom: 24 }}>
            <PixelText size={10} color={C.cream}>{unlocked.name}</PixelText>
            <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{unlocked.description}</PixelText></div>
          </div>
          <PixelBtn onClick={() => setPracticeMode(null)} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>CONTINUE</PixelBtn>
        </div>
        <style>{`@keyframes fearPulseScale { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
      </div>
    );
  }

  // Main armory view
  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <PixelText size={9} color={C.grayLt}>←</PixelText>
        </button>
        <PixelText size={10} color={C.goldMd}>⚗ ARMORY</PixelText>
      </div>
      <div style={{ padding: 12, textAlign: "center" }}>
        <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>Practice to unlock new tools</PixelText>
      </div>

      {/* Armory cards */}
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
              background: isLocked ? "#15101a" : "#1A1218",
              border: `3px solid ${isLocked ? "#333" : C.plum + "80"}`,
              opacity: isLocked ? 0.55 : 1,
              transition: "all 0.3s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 6,
                  background: isLocked ? "#222" : C.plum + "20",
                  border: `2px solid ${isLocked ? "#444" : C.plum + "60"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  {isLocked && (
                    <div style={{
                      position: "absolute", top: -4, right: -4,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#333", border: "2px solid #555",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 9 }}>🔒</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <PixelText size={9} color={isLocked ? C.grayLt : C.cream}>{item.name}</PixelText>
                  <div style={{ marginTop: 2 }}>
                    <PixelText size={6} color={C.grayLt}>{item.description}</PixelText>
                  </div>
                </div>
              </div>

              {/* Locked: show progress to unlock */}
              {isLocked && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <PixelText size={6} color={C.amber}>Practice {prevItem?.name || ""} to unlock</PixelText>
                    <PixelText size={6} color={C.grayLt}>{currentProgress}/{progressNeeded}</PixelText>
                  </div>
                  <div style={{ height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${progressPct * 100}%`,
                      background: progressPct >= 1 ? C.hpGreen : C.amber,
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>
              )}

              {/* Unlocked: practice count + action */}
              {!isLocked && (
                <div>
                  <div style={{ marginTop: 8, marginBottom: 10 }}>
                    <PixelText size={6} color={C.teal}>Practiced {item.practiceCount || 0}×{item.practiceCount >= 2 ? "" : ` (${2 - (item.practiceCount || 0)} more to unlock next)`}</PixelText>
                  </div>
                  <button onClick={() => setPracticeMode({ toolId: item.id })} style={{
                    width: "100%", padding: "10px 14px", borderRadius: 4,
                    background: C.plum + "30", border: `2px solid ${C.plum + "80"}`,
                    cursor: "pointer",
                  }}>
                    <PixelText size={8} color={C.plumMd}>⚗ PRACTICE →</PixelText>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218",
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: () => setScreen("map") },
          { icon: "⚗", label: "ARMORY", active: true },
          { icon: "🏆", label: "LADDER", active: false, onClick: () => setScreen("ladder") },
          { icon: "🛡", label: "HERO", active: false, onClick: () => setScreen("profile") },
        ].map(t => (
          <button key={t.label} onClick={t.onClick} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
            background: "transparent", display: "flex",
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
