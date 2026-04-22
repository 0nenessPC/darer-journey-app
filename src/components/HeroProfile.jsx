import React, { useState } from 'react';
import { C, PIXEL_FONT, FONT_LINK } from '../constants/gameData';
import { PixelText } from '../components/shared';
export default function HeroProfile({ hero, quest, battleHistory = [], onBack, setScreen }) {
  const defeated = quest.bosses.filter(b => b.defeated).length;
  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "16px 16px 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}>
        <PixelText size={8} color={C.grayLt}>← BACK TO MAP</PixelText>
      </button>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, margin: "0 auto 12px", borderRadius: 6,
          background: C.plum, border: "4px solid #5C3A50",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><PixelText size={32} color={C.goldMd}>⚔</PixelText></div>
        <PixelText size={14} color={C.cream}>{hero.name}</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={8} color={C.goldMd}>{defeated}/{quest.bosses.length} BOSSES DEFEATED</PixelText></div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>CHARACTER STATS</PixelText>
        {(() => {
          const dims = ["courage", "resilience", "openness"];
          const colors = { courage: C.bossRed, resilience: C.teal, openness: C.plumMd };
          const fallbacks = { courage: { word: "COURAGE", icon: "⚔️" }, resilience: { word: "RESILIENCE", icon: "🛡" }, openness: { word: "OPENNESS", icon: "💜" } };
          const cv = hero.coreValues || [];
          const assigned = [];
          const usedDims = new Set();
          cv.forEach(v => { if (!usedDims.has(v.dim)) { assigned.push({ ...v, assignedDim: v.dim }); usedDims.add(v.dim); } });
          cv.forEach(v => { if (!assigned.find(a => a.id === v.id)) { const fd = dims.find(d => !usedDims.has(d)); if (fd) { assigned.push({ ...v, assignedDim: fd }); usedDims.add(fd); } } });
          // Fill any remaining dims with fallbacks
          dims.forEach(d => { if (!usedDims.has(d)) { assigned.push({ ...fallbacks[d], assignedDim: d, id: d }); } });
          assigned.sort((a, b) => dims.indexOf(a.assignedDim) - dims.indexOf(b.assignedDim));
          return assigned.map(v => (
            <div key={v.assignedDim} style={{ padding: "10px 12px", marginBottom: 6, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 4, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{v.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <PixelText size={7} color={colors[v.assignedDim]}>{v.word.toUpperCase()}</PixelText>
                  <PixelText size={7} color={C.cream}>{hero.stats?.[v.assignedDim] || 5}/10</PixelText>
                </div>
                <div style={{ height: 6, background: C.mapBg, borderRadius: 2, border: "1px solid #5C3A50", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(hero.stats?.[v.assignedDim] || 5) * 10}%`, background: colors[v.assignedDim], borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Core Strengths */}
      {hero.coreValues && hero.coreValues.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>CORE STRENGTHS</PixelText>
          <div style={{ display: "flex", gap: 6 }}>
            {hero.coreValues.map(v => (
              <div key={v.id} style={{
                flex: 1, padding: "10px 6px", background: "#1A1218",
                border: `2px solid ${C.goldMd}40`, borderRadius: 6, textAlign: "center",
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{v.icon}</div>
                <PixelText size={6} color={C.goldMd}>{v.word.toUpperCase()}</PixelText>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {hero.traits && hero.traits.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>CLAIMED TRAITS</PixelText>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {hero.traits.map(t => (
              <span key={t.id} style={{
                padding: "4px 8px", borderRadius: 3,
                background: t.type === "strength" ? C.goldMd + "20" : C.plumMd + "20",
                border: `1px solid ${t.type === "strength" ? C.goldMd + "50" : C.plumMd + "50"}`,
                fontFamily: PIXEL_FONT, fontSize: 8, color: t.type === "strength" ? C.goldMd : C.plumMd,
              }}>{t.icon} {t.text.length > 20 ? t.text.slice(0, 20) + "..." : t.text}</span>
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
        const [expandedId, setExpandedId] = useState(null);
        if (completed.length === 0) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <PixelText size={9} color={C.hpGreen} style={{ display: "block", marginBottom: 10 }}>✅ COMPLETED EXPOSURES</PixelText>
            {completed.map((boss, idx) => (
              <div key={boss.id} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setExpandedId(expandedId === boss.id ? null : boss.id)}
                  style={{
                    width: "100%",
                    padding: 10,
                    background: "#1A1218",
                    border: `2px solid ${expandedId === boss.id ? C.hpGreen : C.hpGreen + "40"}`,
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
                  <PixelText size={10} color={C.grayLt}>{expandedId === boss.id ? "▲" : "▼"}</PixelText>
                </button>

                {expandedId === boss.id && (() => {
                  const battle = battleHistory?.find(b => b.bossId === boss.id) || {};
                  return (
                    <div style={{ marginTop: 4, padding: 10, background: "#1A1218", border: `1px solid ${C.hpGreen}30`, borderRadius: 4 }}>
                      <div style={{ textAlign: "center", marginBottom: 6 }}>
                        <PixelText size={9} color={battle.outcome === "victory" ? C.hpGreen : battle.outcome === "partial" ? C.amber : C.bossRed}>
                          {battle.outcome === "victory" ? "🏆 VICTORY" : battle.outcome === "partial" ? "⚡ PARTIAL" : "💀 DEFEATED"}
                        </PixelText>
                      </div>
                      {battle.suds && battle.suds.before !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 6, padding: 6, background: "#1E1A18", borderRadius: 4 }}>
                          <div style={{ textAlign: "center" }}><PixelText size={9} color={C.bossRed}>{battle.suds.before}</PixelText><div><PixelText size={6} color={C.grayLt}>BEFORE</PixelText></div></div>
                          <div style={{ textAlign: "center" }}><PixelText size={9} color={C.amber}>{battle.suds.during ?? battle.suds.peak}</PixelText><div><PixelText size={6} color={C.grayLt}>PEAK</PixelText></div></div>
                          <div style={{ textAlign: "center" }}><PixelText size={9} color={C.hpGreen}>{battle.suds.after}</PixelText><div><PixelText size={6} color={C.grayLt}>AFTER</PixelText></div></div>
                        </div>
                      )}
                      {battle.date && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.grayLt}>Completed: {new Date(battle.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</PixelText></div>}
                      {battle.prepAnswers?.value && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>💭 Value:</PixelText><PixelText size={6} color={C.cream}> {battle.prepAnswers.value}</PixelText></div>}
                      {battle.exposureArmory && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>⚗ Tool:</PixelText><PixelText size={6} color={C.cream}> {battle.exposureArmory}</PixelText></div>}
                      {battle.exposureWhen && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>🕐 When:</PixelText><PixelText size={6} color={C.cream}> {battle.exposureWhen}</PixelText></div>}
                      {battle.exposureWhere && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>📍 Where:</PixelText><PixelText size={6} color={C.cream}> {battle.exposureWhere}</PixelText></div>}
                      {battle.exposureScheduledTime && <div style={{ marginBottom: 4 }}><PixelText size={6} color={C.goldMd}>⏰ Scheduled:</PixelText><PixelText size={6} color={C.cream}> {new Date(battle.exposureScheduledTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</PixelText></div>}
                      {battle.battleMessages?.length > 0 && (
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ cursor: "pointer", marginBottom: 4 }}>
                            <PixelText size={6} color={C.teal}>💬 Battle conversation ({battle.battleMessages.length} messages)</PixelText>
                          </summary>
                          <div style={{ maxHeight: 150, overflowY: "auto", padding: 6, background: "#0D0A0C", borderRadius: 4, marginTop: 4 }}>
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
                            <PixelText size={6} color={C.teal}>🎉 Victory reflection ({battle.victoryMessages.length} messages)</PixelText>
                          </summary>
                          <div style={{ maxHeight: 150, overflowY: "auto", padding: 6, background: "#0D0A0C", borderRadius: 4, marginTop: 4 }}>
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
          <div key={b.id} style={{ padding: 10, marginBottom: 6, background: "#1A1218", border: "2px solid " + C.hpGreen + "60", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <PixelText size={7} color={C.hpGreen}>✓ {b.name}</PixelText>
            <PixelText size={7} color={C.goldMd}>+100 XP</PixelText>
          </div>
        ))}
        {quest.bosses.filter(b => b.defeated).length === 0 && (
          <div style={{ padding: 14, textAlign: "center" }}><PixelText size={8} color={C.grayLt}>No bosses defeated yet. Your journey awaits!</PixelText></div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218",
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: () => setScreen("map") },
          { icon: "⚗", label: "ARMORY", active: false, onClick: () => setScreen("armory") },
          { icon: "🏆", label: "LADDER", active: false, onClick: () => setScreen("ladder") },
          { icon: "🛡", label: "HERO", active: true },
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


