import React, { useState } from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, DialogBox, TypingDots } from '../components/shared';

export default function CharacterCreate({ onComplete, onFastForward, initialName, darerId, obState, setOBState }) {
  const step = obState?.step ?? "name";
  const setStep = (v) => setOBState({ step: typeof v === 'function' ? v(step) : v });
  const name = obState?.name ?? initialName ?? "";
  const setName = (v) => setOBState({ name: typeof v === 'function' ? v(name) : v });
  const nameConfirmed = obState?.nameConfirmed ?? false;
  const setNameConfirmed = (v) => setOBState({ nameConfirmed: typeof v === 'function' ? v(nameConfirmed) : v });
  const [stats, setStats] = useState(null);
  const [statsRevealed, setStatsRevealed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const [coreValues, setCoreValues] = useState([]);
  const [expandedValue, setExpandedValue] = useState(null);
  // Stats defaults — all set to 1 (bypassing card sort calculation)
  const [defaultStats] = useState({ courage: 1, resilience: 1, openness: 1 });

  // ACT Core Values — filtered for social/relational relevance
  // From Russ Harris "A Quick Look at Your Values" (actmindfully.com, 2010)
  const [ACT_VALUES] = useState(() => [
    { id: "a1", word: "Acceptance", desc: "Open to and accepting of myself, others, and life", icon: "🌿", dim: "resilience" },
    { id: "a2", word: "Adventure", desc: "Actively seeking, creating, or exploring novel experiences", icon: "🧭", dim: "courage" },
    { id: "a3", word: "Assertiveness", desc: "Standing up for myself and asking for what I want", icon: "🗣", dim: "courage" },
    { id: "a4", word: "Authenticity", desc: "Being genuine, real, and true to who I am", icon: "💎", dim: "openness" },
    { id: "a5", word: "Caring", desc: "Being caring toward myself and others", icon: "💛", dim: "openness" },
    { id: "a6", word: "Challenge", desc: "Pushing myself to grow, learn, and improve", icon: "⚡", dim: "courage" },
    { id: "a7", word: "Compassion", desc: "Responding with kindness to those who are struggling", icon: "🤲", dim: "resilience" },
    { id: "a8", word: "Connection", desc: "Being fully present with others in what I'm doing", icon: "🔗", dim: "openness" },
    { id: "a9", word: "Cooperation", desc: "Being cooperative and collaborative with others", icon: "🧩", dim: "openness" },
    { id: "a10", word: "Courage", desc: "Being brave and persisting in the face of fear", icon: "⚔️", dim: "courage" },
    { id: "a11", word: "Curiosity", desc: "Being open-minded, interested, willing to explore", icon: "🔍", dim: "openness" },
    { id: "a12", word: "Fairness", desc: "Treating myself and others with fairness and justice", icon: "⚖️", dim: "openness" },
    { id: "a13", word: "Flexibility", desc: "Adjusting and adapting readily to changing circumstances", icon: "🌊", dim: "resilience" },
    { id: "a14", word: "Forgiveness", desc: "Being forgiving toward myself or others", icon: "🕊", dim: "resilience" },
    { id: "a15", word: "Friendliness", desc: "Being warm, open, and approachable toward others", icon: "🤝", dim: "openness" },
    { id: "a16", word: "Fun", desc: "Seeking, creating, and engaging in fun-filled activities", icon: "🎉", dim: "openness" },
    { id: "a17", word: "Generosity", desc: "Being generous, sharing, and giving to myself or others", icon: "🎁", dim: "openness" },
    { id: "a18", word: "Honesty", desc: "Being truthful and sincere with myself and others", icon: "✨", dim: "openness" },
    { id: "a19", word: "Humility", desc: "Being modest; letting my actions speak for themselves", icon: "🌱", dim: "resilience" },
    { id: "a20", word: "Humour", desc: "Seeing and appreciating the humorous side of life", icon: "😄", dim: "openness" },
    { id: "a21", word: "Independence", desc: "Choosing for myself how I live and what I do", icon: "🦅", dim: "courage" },
    { id: "a22", word: "Intimacy", desc: "Opening up and sharing myself in close relationships", icon: "❤️", dim: "openness" },
    { id: "a23", word: "Kindness", desc: "Being considerate, helpful, or caring to myself or others", icon: "🌸", dim: "openness" },
    { id: "a24", word: "Love", desc: "Showing love and affection to myself or others", icon: "💜", dim: "openness" },
    { id: "a25", word: "Open-mindedness", desc: "Seeing things from others' points of view", icon: "🌏", dim: "openness" },
    { id: "a26", word: "Order", desc: "Being orderly, organized, and structured", icon: "📐", dim: "resilience" },
    { id: "a27", word: "Patience", desc: "Waiting calmly for what I want", icon: "⏳", dim: "resilience" },
    { id: "a28", word: "Persistence", desc: "Continuing resolutely despite problems or difficulties", icon: "🔥", dim: "resilience" },
    { id: "a29", word: "Reciprocity", desc: "Building relationships with a fair balance of giving and taking", icon: "🔄", dim: "openness" },
    { id: "a30", word: "Respect", desc: "Being polite, considerate, and showing positive regard", icon: "🙏", dim: "openness" },
    { id: "a31", word: "Self-awareness", desc: "Being aware of my own thoughts, feelings, and actions", icon: "🪞", dim: "resilience" },
    { id: "a32", word: "Sensuality", desc: "Creating and enjoying experiences that stimulate the senses", icon: "🌺", dim: "openness" },
    { id: "a33", word: "Sexuality", desc: "Exploring and expressing my sexuality freely", icon: "💋", dim: "openness" },
    { id: "a34", word: "Supportiveness", desc: "Being helpful, encouraging, and available to others", icon: "🛡", dim: "openness" },
    { id: "a35", word: "Trust", desc: "Being loyal, faithful, sincere, and reliable", icon: "🤝", dim: "openness" },
  ].sort(() => Math.random() - 0.5));

  // --- Card sort removed (SKIP_CARD_SORT = true).
  // To re-enable: restore deck/currentCard/claimed/dismissed/swipeDir state,
  // handlers (handleClaim, handleDismiss, onTouch*, onMouse*), and the
  // {step === "cards" && ...} JSX block below.
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: step === "reveal" ? "flex-start" : "center", alignItems: "center", padding: step === "reveal" ? "16px 24px 0" : "0 24px", background: C.mapBg, textAlign: "center", overflowY: step === "reveal" ? "auto" : "hidden" }}>

      {/* STEP 1: NAME */}
      {step === "name" && (
        <div style={{ animation: "fadeIn 0.5s ease-out", width: "100%" }}>
          <div style={{
            width: 80, height: 80, margin: "0 auto 24px", borderRadius: 6,
            background: C.cardBg, border: `4px solid ${nameConfirmed ? C.goldMd : C.mutedBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: nameConfirmed ? `0 0 20px ${C.goldMd}30` : "none",
            transition: "all 0.5s",
          }}>
            <PixelText size={36} color={nameConfirmed ? C.goldMd : C.grayLt}>
              {nameConfirmed ? "⚔" : "?"}
            </PixelText>
          </div>

          <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
            EVERY HERO HAS A NAME
          </PixelText>
          <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 24 }}>
            What is yours?
          </PixelText>

          <input value={name}
            onChange={e => { setName(e.target.value); setNameConfirmed(false); }}
            onKeyDown={e => { if (e.key === "Enter" && name.trim()) setNameConfirmed(true); }}
            placeholder={darerId || "Enter your name..."}
            autoFocus
            style={{
              width: "100%", padding: 14, textAlign: "center",
              background: C.cardBg, border: `3px solid ${nameConfirmed ? C.goldMd : C.mutedBorder}`,
              borderRadius: 4, color: C.cream, fontSize: 16,
              fontFamily: PIXEL_FONT, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.3s",
            }}
          />

          {(name.trim() || darerId) && !nameConfirmed && (
            <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
              <PixelBtn onClick={() => setNameConfirmed(true)}>
                {name.trim() ? "THAT'S ME" : "USE MY DARER ID"}
              </PixelBtn>
            </div>
          )}

          {nameConfirmed && (
            <div style={{ marginTop: 20, animation: "fadeIn 0.5s ease-out" }}>
              <div style={{ padding: C.padLg, background: C.cardBg, border: `2px solid ${C.mutedBorder}`, borderRadius: 6, marginBottom: 16 }}>
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                  {name.trim() || darerId}. A name the Shadow{"\n"}will learn to fear.{"\n"}{"\n"}
                  Welcome to the DARER family.{"\n"}{"\n"}
                  A name alone doesn't make a{"\n"}hero. Your story does. Your{"\n"}actions do. Your strengths matter.{"\n"}{"\n"}
                  Let me introduce someone who{"\n"}will walk beside you from here.
                </PixelText>
              </div>
              <PixelBtn onClick={() => setStep("meetDara")} color={C.gold} textColor={C.charcoal}>
                CONTINUE →
              </PixelBtn>
              {onFastForward && (
                <button onClick={onFastForward} style={{
                  marginTop: 8, width: "100%", padding: "8px 16px",
                  background: "transparent", border: `1px dashed ${C.mutedBorder}`,
                  borderRadius: 4, cursor: "pointer",
                }}>
                  <PixelText size={7} color={C.grayLt}>⚡ FAST-FORWARD TO BATTLES</PixelText>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 1.5: MEET DARA */}
      {step === "meetDara" && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out" }}>
          {/* Dara portrait */}
          <div style={{
            width: 88, height: 88, margin: "0 auto 20px", borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.cardBgAlt} 0%, ${C.cardBg} 100%)`,
            border: `4px solid ${C.goldMd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px ${C.goldMd}25, 0 0 48px ${C.goldMd}10`,
          }}>
            <span style={{ fontSize: 40 }}>🧚</span>
          </div>

          <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>DARA</PixelText>
          <PixelText size={7} color={C.plumMd} style={{ display: "block", marginBottom: 20 }}>
            SOUL COMPANION OF THE DARER ORDER
          </PixelText>

          <div style={{ padding: C.padLg, background: C.cardBg, border: `2px solid ${C.mutedBorder}`, borderRadius: 6, marginBottom: 16 }}>
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              Every DARER is assigned a Soul{"\n"}Companion — someone who knows the{"\n"}Shadow's tricks and how to{"\n"}unravel them.{"\n"}{"\n"}
              Dara has walked beside hundreds{"\n"}of DARERs before you. She knows{"\n"}the path. She knows the fear.{"\n"}And she knows it can be beaten.{"\n"}{"\n"}
              She will be with you before{"\n"}every battle, beside you during{"\n"}every struggle, and here to{"\n"}celebrate every victory.
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              {name.trim() || darerId}. I've been waiting for you.{"\n"}{"\n"}
              My name means courage — and{"\n"}that's exactly what we'll build{"\n"}together. Let's begin the journey.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => onComplete(
            name.trim() || darerId,
            defaultStats,
            [],
            null,
            []
          )} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            BEGIN JOURNEY →
          </PixelBtn>
        </div>
      )}

      {/* STEP 1.75: CORE VALUES — pick top 3, scrollable grid, tap to see description */}
      {step === "coreValues" && (() => {
        return (
        <div style={{ width: "100%", height: "100%", animation: "fadeIn 0.4s ease-out", overflowY: "auto", paddingBottom: 24 }}>
          {/* Sticky title */}
          <div style={{ position: "sticky", top: 0, background: C.mapBg, zIndex: 10, paddingBottom: 8 }}>
            <PixelText size={11} color={C.goldMd} style={{ display: "block", textAlign: "center", marginBottom: 4 }}>
              YOUR INNER CHARACTER
            </PixelText>
            <PixelText size={8} color={C.grayLt} style={{ display: "block", textAlign: "center", marginBottom: 12 }}>
              Choose the 3 that best describe you.
            </PixelText>

            {/* Top 3 slots — also sticky */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[0, 1, 2].map(i => {
                const picked = coreValues[i] ? ACT_VALUES.find(v => v.id === coreValues[i]) : null;
                return (
                  <div key={i} style={{
                    flex: 1, padding: "12px 8px", textAlign: "center", borderRadius: 6,
                    background: picked ? C.goldMd + "15" : "C.cardBg",
                    border: `2px solid ${picked ? C.goldMd : C.mutedBorder}`,
                    minHeight: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: picked ? "pointer" : "default",
                  }} onClick={() => picked && setCoreValues(prev => prev.filter(x => x !== picked.id))}>
                    {picked ? (
                      <>
                        <span style={{ fontSize: 22 }}>{picked.icon}</span>
                        <PixelText size={7} color={C.goldMd}>{picked.word.toUpperCase()}</PixelText>
                      </>
                    ) : (
                      <PixelText size={10} color={C.mutedBorder}>?</PixelText>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Value grid — 2 columns, all items visible */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {ACT_VALUES.map(v => {
              const active = coreValues.includes(v.id);
              const expanded = expandedValue === v.id;
              return (
                <button key={v.id} onClick={() => {
                  if (expanded) {
                    setCoreValues(prev => prev.includes(v.id)
                      ? prev.filter(x => x !== v.id)
                      : prev.length < 3 ? [...prev, v.id] : prev);
                    setExpandedValue(null);
                  } else {
                    setExpandedValue(v.id);
                  }
                }} style={{
                  padding: "14px 10px", background: active ? C.goldMd + "15" : "C.cardBg",
                  border: `2px solid ${active ? C.goldMd : expanded ? C.plumMd : C.mutedBorder}`,
                  borderRadius: 6, cursor: "pointer", textAlign: "center",
                  boxShadow: active ? `0 0 8px ${C.goldMd}15` : "none",
                  transition: "all 0.2s",
                  gridColumn: expanded ? "1 / -1" : "auto",
                }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>{v.icon}</span>
                  <PixelText size={8} color={active ? C.goldMd : C.cream}>{v.word.toUpperCase()}</PixelText>
                  {expanded && (
                    <div style={{ marginTop: 8 }}>
                      <PixelText size={7} color={C.grayLt}>{v.desc}</PixelText>
                      <div style={{ marginTop: 8 }}>
                        <PixelText size={7} color={active ? C.bossRed : C.goldMd}>
                          {active ? "TAP TO REMOVE" : "TAP TO SELECT"}
                        </PixelText>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Continue button */}
          <div style={{ textAlign: "center" }}>
            {coreValues.length === 3 ? (
              <PixelBtn onClick={() => setStep("coreReveal")} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
                THESE DEFINE ME →
              </PixelBtn>
            ) : (
              <PixelText size={7} color={C.grayLt}>
                {coreValues.length}/3 selected
              </PixelText>
            )}
          </div>
        </div>
        );
      })()}

      {/* STEP 1.8: CORE VALUES REVEAL */}
      {step === "coreReveal" && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
              YOUR CORE STRENGTHS
            </PixelText>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {ACT_VALUES.filter(v => coreValues.includes(v.id)).map((v, i) => (
              <div key={v.id} style={{
                padding: C.padLg, background: "C.cardBg",
                border: `2px solid ${C.goldMd}60`, borderRadius: 6,
                textAlign: "center",
                animation: `fadeIn 0.5s ease-out ${i * 0.2}s both`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>
                  {v.word.toUpperCase()}
                </PixelText>
                <PixelText size={7} color={C.cream}>{v.desc}</PixelText>
              </div>
            ))}
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              These are the strengths the{"\n"}Shadow cannot take from you.{"\n"}They are yours — and they will{"\n"}grow stronger with every battle.{"\n"}{"\n"}
              I'll call on these strengths{"\n"}when we plan your battles and{"\n"}face the Shadow together. They{"\n"}are your strategies.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => {
            setStats(defaultStats);
            setStep("reveal");
            setTimeout(() => setStatsRevealed(true), 400);
          }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            CONTINUE →
          </PixelBtn>
        </div>
      )}

      {/* STEP 2: CARD SORT — disabled (SKIP_CARD_SORT = true). See comment after ACT_VALUES to re-enable. */}

      {/* STEP 3: STAT REVEAL */}
      {step === "reveal" && stats && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out", overflowY: "auto", maxHeight: "100%", paddingBottom: 20 }}>
          {/* Character portrait */}
          <div style={{
            width: 80, height: 80, margin: "0 auto 16px", borderRadius: 6,
            background: C.plum, border: `4px solid ${C.goldMd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px ${C.goldMd}30`,
          }}>
            <PixelText size={32} color={C.goldMd}>⚔</PixelText>
          </div>
          <PixelText size={12} color={C.cream} style={{ display: "block" }}>{name.trim() || darerId}</PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginTop: 4, marginBottom: 20 }}>
            0 strengths claimed · 0 challenges acknowledged
          </PixelText>

          {/* Stats — labeled with user's core values */}
          {(() => {
            // Map user's 3 core values to the 3 dimensions, ensuring coverage
            const dims = ["courage", "resilience", "openness"];
            const colors = { courage: C.bossRed, resilience: C.teal, openness: C.plumMd };
            const chosenVals = coreValues.map(id => ACT_VALUES.find(v => v.id === id)).filter(Boolean);
            const assigned = [];
            const usedDims = new Set();
            // First pass: assign each value to its natural dimension if available
            chosenVals.forEach(v => {
              if (!usedDims.has(v.dim)) { assigned.push({ ...v, assignedDim: v.dim }); usedDims.add(v.dim); }
            });
            // Second pass: assign remaining values to unassigned dimensions
            chosenVals.forEach(v => {
              if (!assigned.find(a => a.id === v.id)) {
                const freeDim = dims.find(d => !usedDims.has(d));
                if (freeDim) { assigned.push({ ...v, assignedDim: freeDim }); usedDims.add(freeDim); }
              }
            });
            // Sort by dimension order
            assigned.sort((a, b) => dims.indexOf(a.assignedDim) - dims.indexOf(b.assignedDim));
            return assigned.map((v, i) => (
              <div key={v.id} style={{
                padding: "12px 14px", marginBottom: 8, background: "C.cardBg",
                border: "2px solid ${C.mutedBorder}", borderRadius: 6,
                display: "flex", alignItems: "center", gap: 12,
                animation: statsRevealed ? `fadeIn 0.4s ease-out ${i * 0.15}s both` : "none",
                opacity: statsRevealed ? 1 : 0,
              }}>
                <div style={{ fontSize: 20, width: 28, textAlign: "center" }}>{v.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <PixelText size={8} color={colors[v.assignedDim]}>{v.word.toUpperCase()}</PixelText>
                    <PixelText size={8} color={C.cream}>{stats[v.assignedDim]}/10</PixelText>
                  </div>
                  <div style={{ height: 8, background: C.mapBg, borderRadius: 2, border: `1px solid ${C.mutedBorder}`, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: statsRevealed ? `${stats[v.assignedDim] * 10}%` : "0%",
                      background: colors[v.assignedDim], borderRadius: 2,
                      transition: `width 0.8s ease-out ${0.5 + i * 0.2}s`,
                    }} />
                  </div>
                  <div style={{ marginTop: 3 }}><PixelText size={6} color={C.grayLt}>{v.desc}</PixelText></div>
                </div>
              </div>
            ));
          })()}

          {/* Summary counts — tap to explain */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowTooltip(showTooltip === "strength" ? null : "strength")} style={{
              flex: 1, padding: 10, background: showTooltip === "strength" ? C.goldMd + "15" : "C.cardBg",
              border: `2px solid ${showTooltip === "strength" ? C.goldMd : C.mutedBorder}`,
              borderRadius: 6, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            }}>
              <PixelText size={12} color={C.goldMd}>0</PixelText>
              <div><PixelText size={6} color={C.grayLt}>STRENGTHS ⓘ</PixelText></div>
            </button>
            <button onClick={() => setShowTooltip(showTooltip === "challenge" ? null : "challenge")} style={{
              flex: 1, padding: 10, background: showTooltip === "challenge" ? C.plumMd + "15" : "C.cardBg",
              border: `2px solid ${showTooltip === "challenge" ? C.plumMd : C.mutedBorder}`,
              borderRadius: 6, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            }}>
              <PixelText size={12} color={C.plumMd}>0</PixelText>
              <div><PixelText size={6} color={C.grayLt}>CHALLENGES ⓘ</PixelText></div>
            </button>
          </div>

          {/* Tooltip explanation */}
          {showTooltip && (
            <div style={{
              marginTop: 8, padding: C.padMd, background: "C.cardBg",
              border: `2px solid ${showTooltip === "strength" ? C.goldMd + "60" : C.plumMd + "60"}`,
              borderRadius: 6, animation: "fadeIn 0.2s ease-out",
            }}>
              <PixelText size={8} color={showTooltip === "strength" ? C.goldMd : C.plumMd} style={{ display: "block", marginBottom: 6 }}>
                {showTooltip === "strength" ? "WHAT ARE STRENGTHS?" : "WHAT ARE CHALLENGES?"}
              </PixelText>
              <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                {showTooltip === "strength"
                  ? "These are the qualities that make you who you are — the parts of you the Shadow cannot touch. They boost your stats and become your strategies in battle."
                  : "These are the places where the Shadow has its grip. They're not weaknesses — they're the battles ahead. Every challenge you claimed is a boss waiting to be defeated, and each victory will raise your stats."}
              </PixelText>
              <button onClick={() => setShowTooltip(null)} style={{
                marginTop: 8, background: "none", border: "none", cursor: "pointer",
              }}><PixelText size={6} color={C.grayLt}>TAP TO CLOSE</PixelText></button>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Now I can see who you are,{"\n"}{name.trim() || darerId}.{" "}
                {(() => {
                  const chosenVals = coreValues.map(id => ACT_VALUES.find(v => v.id === id)).filter(Boolean);
                  const highest = chosenVals.reduce((best, v) => (!best || stats[v.dim] > stats[best.dim]) ? v : best, null);
                  return highest ? `Your ${highest.word.toLowerCase()} shines through — the Shadow hasn't been able to dim that.` : "I can see the fight in you already.";
                })()}
                {" "}Before we go further, let me{"\n"}show you what the journey ahead{"\n"}looks like.
              </PixelText>
            </DialogBox>
          </div>

          <PixelBtn onClick={() => onComplete((name.trim() || darerId), stats, [], null, coreValues.map(id => ACT_VALUES.find(v => v.id === id)))} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
            SEE THE PATH AHEAD →
          </PixelBtn>
        </div>
      )}


    </div>
  );
}

