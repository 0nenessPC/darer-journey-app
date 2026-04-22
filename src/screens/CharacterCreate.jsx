import React, { useState, useEffect, useRef } from 'react';
import { C, PIXEL_FONT, FONT_LINK, STRENGTH_ICONS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, DialogBox, TypingDots } from '../components/shared';
function calcStats(claimed) {
  const base = { courage: 5, resilience: 5, openness: 5 };
  claimed.forEach(card => {
    if (card.type === "strength") base[card.stat] = Math.min(10, base[card.stat] + 1);
    else base[card.stat] = Math.max(1, base[card.stat] - 1);
  });
  return base;
}

function calcSADS(claimed, dismissed) {
  // SADS scoring: challenge cards claimed as "that's me" = 1 point each
  // strength cards dismissed (NOT claimed) = 1 point each
  // Full 28-item SADS (Watson & Friend, 1969)
  let score = 0;
  claimed.forEach(card => { if (card.type === "challenge") score += 1; });
  dismissed.forEach(card => { if (card.type === "strength") score += 1; });
  // Score is already on the 0-28 scale with all 28 items
  const level = score <= 1 ? "low" : score <= 11 ? "average" : "high";
  return { raw: score, normalized: score, level };
}

// --- CHARACTER CREATION (Name → Card Sort → Stat Reveal) ---
// Currently bypassing card sort; goes name → stat reveal (all stats = 1)
// To re-enable card sort: set SKIP_CARD_SORT = false
const SKIP_CARD_SORT = true;

export default function CharacterCreate({ onComplete, initialName, darerId, obState, setOBState }) {
  const step = obState?.step ?? "name";
  const setStep = (v) => setOBState({ step: typeof v === 'function' ? v(step) : v });
  const name = obState?.name ?? initialName ?? "";
  const setName = (v) => setOBState({ name: typeof v === 'function' ? v(name) : v });
  const nameConfirmed = obState?.nameConfirmed ?? false;
  const setNameConfirmed = (v) => setOBState({ nameConfirmed: typeof v === 'function' ? v(nameConfirmed) : v });
  const [deck, setDeck] = useState(() => [...TRAIT_CARDS].sort(() => Math.random() - 0.5));
  const [currentCard, setCurrentCard] = useState(0);
  const [claimed, setClaimed] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [swipeDir, setSwipeDir] = useState(null);
  const [stats, setStats] = useState(null);
  const [sads, setSads] = useState(null);
  const [statsRevealed, setStatsRevealed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const [coreValues, setCoreValues] = useState([]);
  const [valuesPage, setValuesPage] = useState(0);
  const [expandedValue, setExpandedValue] = useState(null);
  const [dragX, setDragX] = useState(0);
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
  const [dragging, setDragging] = useState(false);
  const touchStartRef = useRef(null);
  const touchCurrentRef = useRef(null);

  const handleClaim = () => {
    setSwipeDir("right"); setDragX(0); setDragging(false);
    setClaimed(p => [...p, deck[currentCard]]);
    setTimeout(() => { setSwipeDir(null); setCurrentCard(c => c + 1); }, 300);
  };

  const handleDismiss = () => {
    setSwipeDir("left"); setDragX(0); setDragging(false);
    setDismissed(p => [...p, deck[currentCard]]);
    setTimeout(() => { setSwipeDir(null); setCurrentCard(c => c + 1); }, 300);
  };

  const onTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchCurrentRef.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!touchStartRef.current) return;
    touchCurrentRef.current = e.touches[0].clientX;
    const diff = touchCurrentRef.current - touchStartRef.current;
    setDragX(diff);
  };
  const onTouchEnd = () => {
    if (!touchStartRef.current) return;
    const diff = touchCurrentRef.current - touchStartRef.current;
    if (diff > 60) handleClaim();
    else if (diff < -60) handleDismiss();
    else { setDragX(0); setDragging(false); }
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  };
  const onMouseDown = (e) => {
    touchStartRef.current = e.clientX;
    touchCurrentRef.current = e.clientX;
    setDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragging || !touchStartRef.current) return;
    touchCurrentRef.current = e.clientX;
    setDragX(e.clientX - touchStartRef.current);
  };
  const onMouseUp = () => {
    if (!touchStartRef.current) return;
    const diff = touchCurrentRef.current - touchStartRef.current;
    if (diff > 60) handleClaim();
    else if (diff < -60) handleDismiss();
    else { setDragX(0); setDragging(false); }
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  };

  const dragRotation = Math.max(-15, Math.min(15, dragX * 0.1));
  const dragOpacity = Math.max(0.3, 1 - Math.abs(dragX) / 300);
  const showClaimHint = dragX > 30;
  const showDismissHint = dragX < -30;

  const finishSort = () => {
    const s = calcStats(claimed);
    const sa = calcSADS(claimed, dismissed);
    setStats(s);
    setSads(sa);
    setStep("reveal");
    setTimeout(() => setStatsRevealed(true), 400);
  };

  useEffect(() => {
    if (currentCard >= deck.length && step === "cards") finishSort();
  }, [currentCard, deck.length, step]);

  const card = deck[currentCard];
  const progress = deck.length > 0 ? Math.round((currentCard / deck.length) * 100) : 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: step === "reveal" ? "flex-start" : "center", alignItems: "center", padding: step === "reveal" ? "16px 24px 0" : "0 24px", background: C.mapBg, textAlign: "center", overflowY: step === "reveal" ? "auto" : "hidden" }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* STEP 1: NAME */}
      {step === "name" && (
        <div style={{ animation: "fadeIn 0.5s ease-out", width: "100%" }}>
          <div style={{
            width: 80, height: 80, margin: "0 auto 24px", borderRadius: 6,
            background: "#1A1218", border: `4px solid ${nameConfirmed ? C.goldMd : "#5C3A50"}`,
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
              background: "#1A1218", border: `3px solid ${nameConfirmed ? C.goldMd : "#5C3A50"}`,
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
              <div style={{ padding: 16, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, marginBottom: 16 }}>
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
            background: "linear-gradient(135deg, #2A1A28 0%, #1A1218 100%)",
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

          <div style={{ padding: 16, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, marginBottom: 16 }}>
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              Every DARER is assigned a Soul{"\n"}Companion — someone who knows the{"\n"}Shadow's tricks and how to{"\n"}unravel them.{"\n"}{"\n"}
              Dara has walked beside hundreds{"\n"}of DARERs before you. She knows{"\n"}the path. She knows the fear.{"\n"}And she knows it can be beaten.{"\n"}{"\n"}
              She will be with you before{"\n"}every battle, beside you during{"\n"}every struggle, and here to{"\n"}celebrate every victory.
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              {name.trim() || darerId}. I've been waiting for you.{"\n"}{"\n"}
              My name means courage — and{"\n"}that's exactly what we'll build{"\n"}together. But first, I need to{"\n"}understand who you are.{"\n"}{"\n"}
              I'm going to show you some cards.{"\n"}Each one describes a trait. Just{"\n"}tell me — is this you, or not?{"\n"}There are no wrong answers.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => setStep("coreValues")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            I'M READY, DARA →
          </PixelBtn>
        </div>
      )}

      {/* STEP 1.75: CORE VALUES — pick top 3, paginated, swipeable, tap to see description */}
      {step === "coreValues" && (() => {
        const ITEMS_PER_PAGE = 6;
        const totalPages = Math.ceil(ACT_VALUES.length / ITEMS_PER_PAGE);
        const pageItems = ACT_VALUES.slice(valuesPage * ITEMS_PER_PAGE, (valuesPage + 1) * ITEMS_PER_PAGE);
        const handleGridTouchStart = (e) => { e.currentTarget._touchX = e.touches[0].clientX; };
        const handleGridTouchEnd = (e) => {
          const diff = e.changedTouches[0].clientX - (e.currentTarget._touchX || 0);
          if (diff < -50 && valuesPage < totalPages - 1) { setValuesPage(p => p + 1); setExpandedValue(null); }
          else if (diff > 50 && valuesPage > 0) { setValuesPage(p => p - 1); setExpandedValue(null); }
        };
        return (
        <div style={{ width: "100%", animation: "fadeIn 0.4s ease-out" }}>
          <PixelText size={11} color={C.goldMd} style={{ display: "block", textAlign: "center", marginBottom: 4 }}>
            YOUR INNER CHARACTER
          </PixelText>
          <PixelText size={8} color={C.grayLt} style={{ display: "block", textAlign: "center", marginBottom: 12 }}>
            Choose the 3 that best describe you.
          </PixelText>

          {/* Top 3 slots */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[0, 1, 2].map(i => {
              const picked = coreValues[i] ? ACT_VALUES.find(v => v.id === coreValues[i]) : null;
              return (
                <div key={i} style={{
                  flex: 1, padding: "12px 8px", textAlign: "center", borderRadius: 6,
                  background: picked ? C.goldMd + "15" : "#1A1218",
                  border: `2px solid ${picked ? C.goldMd : "#5C3A50"}`,
                  minHeight: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: picked ? "pointer" : "default",
                }} onClick={() => picked && setCoreValues(prev => prev.filter(x => x !== picked.id))}>
                  {picked ? (
                    <>
                      <span style={{ fontSize: 22 }}>{picked.icon}</span>
                      <PixelText size={7} color={C.goldMd}>{picked.word.toUpperCase()}</PixelText>
                    </>
                  ) : (
                    <PixelText size={10} color={"#5C3A50"}>?</PixelText>
                  )}
                </div>
              );
            })}
          </div>

          {/* Value grid — 2 columns, swipeable */}
          <div
            onTouchStart={handleGridTouchStart}
            onTouchEnd={handleGridTouchEnd}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, touchAction: "pan-y" }}>
            {pageItems.map(v => {
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
                  padding: "14px 10px", background: active ? C.goldMd + "15" : "#1A1218",
                  border: `2px solid ${active ? C.goldMd : expanded ? C.plumMd : "#5C3A50"}`,
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

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button onClick={() => { setValuesPage(p => p - 1); setExpandedValue(null); }} disabled={valuesPage === 0}
              style={{ background: "none", border: "none", cursor: valuesPage === 0 ? "default" : "pointer", opacity: valuesPage === 0 ? 0.3 : 1 }}>
              <PixelText size={9} color={C.cream}>←</PixelText>
            </button>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <div key={i} style={{
                  width: i === valuesPage ? 16 : 6, height: 6, borderRadius: 3,
                  background: i === valuesPage ? C.goldMd : "#5C3A50", transition: "all 0.3s",
                }} />
              ))}
            </div>
            <button onClick={() => { setValuesPage(p => p + 1); setExpandedValue(null); }} disabled={valuesPage >= totalPages - 1}
              style={{ background: "none", border: "none", cursor: valuesPage >= totalPages - 1 ? "default" : "pointer", opacity: valuesPage >= totalPages - 1 ? 0.3 : 1 }}>
              <PixelText size={9} color={C.cream}>→</PixelText>
            </button>
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
                padding: 16, background: "#1A1218",
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

      {/* STEP 1.9: TRANSITION TO CARD SORT (hidden — skip to reveal) */}
      {false && step === "preCards" && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.7 }}>🔍</div>

          <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 16 }}>
            WHERE FEAR GROWS
          </PixelText>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
              Now let's explore the spaces{"\n"}where the Shadow meets you —{"\n"}the social moments where fear{"\n"}shows up in your life.{"\n"}{"\n"}
              I'm going to show you a series{"\n"}of statements about social{"\n"}situations. For each one, simply{"\n"}tell me — is this you, or not?{"\n"}{"\n"}
              There are no right or wrong{"\n"}answers. Stay true to yourself.{"\n"}The truth within will light the{"\n"}path to our destination.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => setStep("cards")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            I'M READY →
          </PixelBtn>
        </div>
      )}

      {/* STEP 2: CARD SORT (hidden — skipped) */}
      {false && step === "cards" && card && (
        <div style={{ width: "100%", animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>
            YOU IN SOCIAL MOMENTS
          </PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>
            Is this you? Swipe right for Yes, left for No.
          </PixelText>

          {/* Progress bar */}
          <div style={{ height: 4, background: "#1A1218", borderRadius: 2, marginBottom: 20, border: "1px solid #5C3A50" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: C.goldMd, borderRadius: 2, transition: "width 0.3s" }} />
          </div>

          {/* Card */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { if (dragging) { setDragX(0); setDragging(false); touchStartRef.current = null; } }}
            style={{
              width: 260, height: 380, margin: "0 auto 16px",
              background: card.type === "strength"
                ? "linear-gradient(170deg, #1A1218 0%, #2A1A20 50%, #1A1218 100%)"
                : "linear-gradient(170deg, #1A1218 0%, #1E1625 50%, #1A1218 100%)",
              border: `3px solid ${showClaimHint ? C.goldMd : showDismissHint ? C.bossRed : card.type === "strength" ? C.goldMd + "80" : C.plumMd + "80"}`,
              borderRadius: 12, position: "relative", overflow: "hidden",
              transform: swipeDir === "right" ? "translateX(120%) rotate(12deg)"
                : swipeDir === "left" ? "translateX(-120%) rotate(-12deg)"
                : dragging ? `translateX(${dragX}px) rotate(${dragRotation}deg)`
                : "none",
              opacity: swipeDir ? 0 : dragging ? dragOpacity : 1,
              transition: swipeDir ? "transform 0.3s ease-out, opacity 0.3s ease-out"
                : dragging ? "none"
                : "transform 0.3s ease-out, opacity 0.3s ease-out, border-color 0.2s",
              cursor: "grab", userSelect: "none", touchAction: "pan-y",
              boxShadow: `0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Inner border (poker card double frame) */}
            <div style={{
              position: "absolute", inset: 8,
              border: `1px solid ${card.type === "strength" ? C.goldMd + "30" : C.plumMd + "30"}`,
              borderRadius: 8, pointerEvents: "none",
            }} />

            {/* Top-left corner pip */}
            <div style={{ position: "absolute", top: 16, left: 16, textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{card.icon}</div>
              <PixelText size={6} color={card.type === "strength" ? C.goldMd : C.plumMd}>
                {card.type === "strength" ? "STR" : "CHL"}
              </PixelText>
            </div>

            {/* Bottom-right corner pip (inverted) */}
            <div style={{ position: "absolute", bottom: 16, right: 16, textAlign: "center", transform: "rotate(180deg)" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{card.icon}</div>
              <PixelText size={6} color={card.type === "strength" ? C.goldMd : C.plumMd}>
                {card.type === "strength" ? "STR" : "CHL"}
              </PixelText>
            </div>

            {/* Center content */}
            <div style={{ fontSize: 48, marginBottom: 16 }}>{card.icon}</div>
            <div style={{ padding: "0 28px", textAlign: "center" }}>
              <PixelText size={9} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                "{card.text}"
              </PixelText>
            </div>
            <div style={{ marginTop: 14 }}>
              <span style={{
                padding: "4px 12px", borderRadius: 3,
                background: card.type === "strength" ? C.goldMd + "20" : C.plumMd + "20",
                border: `1px solid ${card.type === "strength" ? C.goldMd + "50" : C.plumMd + "50"}`,
              }}>
                <PixelText size={6} color={card.type === "strength" ? C.goldMd : C.plumMd}>
                  {card.type === "strength" ? "STRENGTH" : "CHALLENGE"}
                </PixelText>
              </span>
            </div>

            {/* Swipe direction overlays */}
            {showClaimHint && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: C.goldMd + "18", borderRadius: 9,
              }}>
                <div style={{ padding: "8px 20px", background: C.goldMd + "40", borderRadius: 6, border: `2px solid ${C.goldMd}` }}>
                  <PixelText size={10} color={C.goldMd}>THAT'S ME</PixelText>
                </div>
              </div>
            )}
            {showDismissHint && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: C.bossRed + "18", borderRadius: 9,
              }}>
                <div style={{ padding: "8px 20px", background: C.bossRed + "40", borderRadius: 6, border: `2px solid ${C.bossRed}` }}>
                  <PixelText size={10} color={C.bossRed}>NOT ME</PixelText>
                </div>
              </div>
            )}
          </div>

          {/* Swipe hint + progress + fallback buttons */}
          <div style={{ textAlign: "center" }}>
            <PixelText size={6} color={C.grayLt}>
              ← NO | YES →
            </PixelText>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
              <button onClick={handleDismiss} style={{
                width: 48, height: 48, borderRadius: "50%", border: "2px solid #5C3A50",
                background: "#1A1218", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>✕</button>
              <div style={{ display: "flex", alignItems: "center" }}>
                <PixelText size={7} color={C.grayLt}>{currentCard + 1} / {deck.length}</PixelText>
              </div>
              <button onClick={handleClaim} style={{
                width: 48, height: 48, borderRadius: "50%", border: `2px solid ${C.goldMd}`,
                background: C.plum, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 18,
                boxShadow: `0 0 12px ${C.goldMd}20`,
              }}>✓</button>
            </div>
          </div>
        </div>
      )}

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
            {claimed.filter(c => c.type === "strength").length} strengths claimed · {claimed.filter(c => c.type === "weakness").length} challenges acknowledged
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
                padding: "12px 14px", marginBottom: 8, background: "#1A1218",
                border: "2px solid #5C3A50", borderRadius: 6,
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
                  <div style={{ height: 8, background: C.mapBg, borderRadius: 2, border: "1px solid #5C3A50", overflow: "hidden" }}>
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
              flex: 1, padding: 10, background: showTooltip === "strength" ? C.goldMd + "15" : "#1A1218",
              border: `2px solid ${showTooltip === "strength" ? C.goldMd : "#5C3A50"}`,
              borderRadius: 6, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            }}>
              <PixelText size={12} color={C.goldMd}>{claimed.filter(c => c.type === "strength").length}</PixelText>
              <div><PixelText size={6} color={C.grayLt}>STRENGTHS ⓘ</PixelText></div>
            </button>
            <button onClick={() => setShowTooltip(showTooltip === "challenge" ? null : "challenge")} style={{
              flex: 1, padding: 10, background: showTooltip === "challenge" ? C.plumMd + "15" : "#1A1218",
              border: `2px solid ${showTooltip === "challenge" ? C.plumMd : "#5C3A50"}`,
              borderRadius: 6, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            }}>
              <PixelText size={12} color={C.plumMd}>{claimed.filter(c => c.type === "challenge").length}</PixelText>
              <div><PixelText size={6} color={C.grayLt}>CHALLENGES ⓘ</PixelText></div>
            </button>
          </div>

          {/* Tooltip explanation */}
          {showTooltip && (
            <div style={{
              marginTop: 8, padding: 12, background: "#1A1218",
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

          <PixelBtn onClick={() => onComplete((name.trim() || darerId), stats, claimed, sads, coreValues.map(id => ACT_VALUES.find(v => v.id === id)))} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
            SEE THE PATH AHEAD →
          </PixelBtn>
        </div>
      )}


    </div>
  );
}

