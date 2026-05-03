import React, { useState, useEffect, useRef } from 'react';
import { useAIChat, callAI } from '../utils/chat';
import { logger } from '../utils/logger';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, TypingDots, DialogBox } from '../components/shared';
import { validateAIResponse } from '../utils/aiSchemas';
import { z } from 'zod';
// --- EXPOSURE HIERARCHY SORT (AI generates personalized battles, user swipes) ---
export default function ExposureSortScreen({ hero, shadowText, onComplete, obState = {}, setOBState }) {
  const [exposures, setExposures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState(obState.currentCard || 0);
  const [accepted, setAccepted] = useState(obState.accepted || []);
  const [rejected, setRejected] = useState(obState.rejected || []);
  const [done, setDone] = useState(obState.done || false);
  const [swipeDir, setSwipeDir] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [levelRejectCounts, setLevelRejectCounts] = useState(obState.levelRejectCounts || {});
  const [generatingReplacement, setGeneratingReplacement] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState(obState.allSuggestions || []);
  const touchStartRef = useRef(null);
  const touchCurrentRef = useRef(null);

  const levelColor = (lv) => lv <= 3 ? C.hpGreen : lv <= 6 ? C.goldMd : lv <= 8 ? C.levelAmber : C.bossRed;
  const levelLabel = (lv) => lv <= 3 ? "SHALLOW WATER" : lv <= 6 ? "GETTING DEEPER" : lv <= 8 ? "DEEP END" : "BOSS TERRITORY";

  useEffect(() => { generateExposures(); }, []);

  // Persist card-sort progress so resume-anywhere survives refresh/close
  useEffect(() => {
    if (!setOBState) return;
    setOBState({ currentCard, accepted, rejected, done, levelRejectCounts, allSuggestions });
  }, [currentCard, accepted, rejected, done, levelRejectCounts, allSuggestions, setOBState]);

  // Mark done when all cards have been seen
  useEffect(() => {
    if (!loading && exposures.length > 0 && currentCard >= exposures.length && !done) {
      setDone(true);
    }
  }, [loading, exposures.length, currentCard, done]);

  const generateExposures = async () => {
    try {
      const valuesText = (hero.values || []).map(v => v.text).join(", ");
      const strengthsText = (hero.coreValues || []).map(v => v.word).join(", ");
      const traitsText = (hero.traits || []).filter(t => t.type === "challenge").map(t => t.text).join("; ");
      const res = await callAI(
        `You are a clinical psychologist designing a graduated exposure hierarchy for someone with social anxiety, following systematic graduated exposure principles (Hope, Heimberg, Juster & Turk). Based on the user's profile, generate exactly 10 exposure activities.

Clinical rules:
- Activities must form a graduated hierarchy from SUDS 10 (minimal anxiety) to SUDS 100 (maximum)
- Levels 1-3: Very low anxiety exposures (brief, low-stakes interactions like smiling, making eye contact, saying thank you)
- Levels 4-6: Moderate anxiety (initiating brief conversations, asking questions, joining groups)
- Levels 7-8: High anxiety (sharing opinions, being assertive, initiating deeper social contact)
- Levels 9-10: Peak anxiety (vulnerability, public attention, confronting core fears)
- Each must be concrete, specific, and completable in a single real-world attempt
- Tailor to the user's specific feared situations and avoidance patterns
- Connect higher-level exposures to the user's stated values where possible
- Give each a creative 2-3 word RPG boss name (fantasy/game themed)
- IMPORTANT: Each activity must be clearly distinct from activities at other levels, in case the system needs to generate alternatives at a specific level later.

Return ONLY a JSON array: [{"name":"Boss Name","activity":"specific activity","level":1}]
No other text.`,
        [{ role: "user", text: `User profile:
- Core strengths: ${strengthsText || "Not specified"}
- Values (why they fight): ${valuesText || "Build meaningful social connections"}
- Social challenges: ${traitsText || "General social avoidance and discomfort"}
- Shadow assessment: ${shadowText || "Avoidance of social situations, fear of judgment"}` }],
        4000
      );
      const parsed = validateAIResponse(res, z.array(z.object({ name: z.string(), activity: z.string(), level: z.number().optional() })));
      if (Array.isArray(parsed) && parsed.length > 0) {
        const initial = parsed.slice(0, 10).map((e, i) => ({ ...e, id: "exp" + i, level: e.level || i + 1 }));
        setExposures(initial);
        setAllSuggestions(initial.map(e => ({ name: e.name, activity: e.activity, level: e.level })));
      }
    } catch (e) { /* AI generation failed — will show retry */ }
    setLoading(false);
  };

  // Generate a single replacement exposure at a specific SUDS level
  const generateReplacementForLevel = async (level, exclusions) => {
    try {
      const valuesText = (hero.values || []).map(v => v.text).join(", ");
      const strengthsText = (hero.coreValues || []).map(v => v.word).join(", ");
      const traitsText = (hero.traits || []).filter(t => t.type === "challenge").map(t => t.text).join("; ");
      const exclusionList = exclusions.map(e => `"${e.name}" - ${e.activity}`).join("; ");
      const res = await callAI(
        `You are a clinical psychologist designing a graduated exposure hierarchy. Generate EXACTLY ONE exposure activity at SUDS level ${level} (out of 10). It must be concrete, specific, and completable in a single real-world attempt. Give it a creative 2-3 word RPG boss name (fantasy/game themed).

CRITICAL: The new exposure must be DIFFERENT from these already-suggested activities:
${exclusionList || "None"}

Return ONLY a JSON object: {"name":"Boss Name","activity":"specific activity","level":${level}}
No other text.`,
        [{ role: "user", text: `User profile:
- Core strengths: ${strengthsText || "Not specified"}
- Values (why they fight): ${valuesText || "Build meaningful social connections"}
- Social challenges: ${traitsText || "General social avoidance and discomfort"}
- Shadow assessment: ${shadowText || "Avoidance of social situations, fear of judgment"}` }],
        2000
      );
      const parsed = validateAIResponse(res, z.object({ name: z.string(), activity: z.string(), level: z.number().optional() }));
      if (parsed && parsed.name && parsed.activity) {
        return { ...parsed, id: "exp_r_" + Date.now(), level: parsed.level || level };
      }
    } catch (e) { logger.warn("Replacement generation failed:", e); }
    return null;
  };

  const card = exposures[currentCard];

  const handleAccept = () => {
    if (!card || generatingReplacement) return;
    setSwipeDir("right");
    setAccepted(prev => [...prev, card]);
    // Reset reject counter for this level — they found one they like
    setLevelRejectCounts(prev => { const next = { ...prev }; delete next[card.level]; return next; });
    setTimeout(() => { setSwipeDir(null); setDragX(0); setDragging(false); setCurrentCard(i => i + 1); }, 300);
  };

  const handleReject = async () => {
    if (!card || generatingReplacement) return;
    const level = card.level;
    const rejectionsSoFar = levelRejectCounts[level] || 0;

    if (rejectionsSoFar < 2) {
      // Generate a replacement at the same SUDS level
      setSwipeDir("left");
      setGeneratingReplacement(true);
      const replacement = await generateReplacementForLevel(level, allSuggestions);
      setGeneratingReplacement(false);

      if (replacement) {
        // Insert replacement at current position
        setExposures(prev => {
          const next = [...prev];
          next[currentCard] = replacement;
          return next;
        });
        // Track this suggestion for duplicate avoidance
        setAllSuggestions(prev => [...prev, { name: replacement.name, activity: replacement.activity, level }]);
        // Increment reject count for this level
        setLevelRejectCounts(prev => ({ ...prev, [level]: rejectionsSoFar + 1 }));
        // Reset swipe and stay on same card (replacement will be shown next)
        setTimeout(() => { setSwipeDir(null); setDragX(0); setDragging(false); }, 300);
        return;
      }
      // AI failed to generate replacement — fall through to normal reject
    }

    // No more alternatives or AI failed — move to next card
    setSwipeDir("left");
    setRejected(prev => [...prev, card]);
    setTimeout(() => { setSwipeDir(null); setDragX(0); setDragging(false); setCurrentCard(i => i + 1); }, 300);
  };

  const onTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; touchCurrentRef.current = e.touches[0].clientX; setDragging(true); };
  const onTouchMove = (e) => { if (!touchStartRef.current) return; touchCurrentRef.current = e.touches[0].clientX; setDragX(touchCurrentRef.current - touchStartRef.current); };
  const onTouchEnd = () => { if (!touchStartRef.current) return; const diff = touchCurrentRef.current - touchStartRef.current; if (diff > 60) handleAccept(); else if (diff < -60) handleReject(); else { setDragX(0); setDragging(false); } touchStartRef.current = null; };
  const onMouseDown = (e) => { touchStartRef.current = e.clientX; touchCurrentRef.current = e.clientX; setDragging(true); };
  const onMouseMove = (e) => { if (!dragging) return; touchCurrentRef.current = e.clientX; setDragX(e.clientX - touchStartRef.current); };
  const onMouseUp = () => { if (!touchStartRef.current) return; const diff = touchCurrentRef.current - touchStartRef.current; if (diff > 60) handleAccept(); else if (diff < -60) handleReject(); else { setDragX(0); setDragging(false); } touchStartRef.current = null; };

  // === COMPLETION: PATH FORGED ===
  if (done) {
    // "Forge is Cold" only when AI generated cards but user rejected ALL of them
    // (not when AI failed to generate — that shows a different screen)
    if (accepted.length === 0 && exposures.length > 0) {
      return (
        <div style={{ minHeight: "100vh", background: C.mapBg, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <PixelText size={12} color={C.bossRed} style={{ display: "block", marginBottom: 4 }}>THE FORGE IS COLD</PixelText>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              You passed on all the battles I suggested.{"\n"}{"\n"}That's okay — sometimes I miss the mark.{"\n"}Let me try again with a different approach.
            </PixelText>
          </DialogBox>
          <PixelBtn onClick={() => { setDone(false); setAccepted([]); setRejected([]); setCurrentCard(0); generateExposures(); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", maxWidth: 340, marginTop: 12 }}>
            FORGE AGAIN →
          </PixelBtn>
        </div>
      );
    }
    const finalBosses = accepted.sort((a, b) => a.level - b.level).map((e, i) => ({
      id: "boss" + i, name: e.name, desc: e.activity, level: e.level, hp: 100, defeated: false,
    }));
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>PATH FORGED</PixelText>
        <PixelText size={7} color={C.subtleText} style={{ display: "block", marginBottom: 16 }}>
          {finalBosses.length} battles accepted · {rejected.length} passed
        </PixelText>

        {/* Visual path preview */}
        <div style={{ width: "100%", maxWidth: 340, marginBottom: 16, position: "relative" }}>
          {finalBosses.map((b, i) => (
            <div key={b.id} style={{ display: "flex", alignItems: "stretch", animation: `fadeIn 0.4s ease-out ${i * 0.08}s both` }}>
              {/* Vertical connector line */}
              <div style={{ width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: levelColor(b.level) + "30", border: `2px solid ${levelColor(b.level)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontFamily: PIXEL_FONT, color: levelColor(b.level),
                }}>{b.level}</div>
                {i < finalBosses.length - 1 && <div style={{ width: 2, flex: 1, background: C.mutedBorder, minHeight: 12 }} />}
              </div>
              {/* Boss card */}
              <div style={{
                flex: 1, padding: "8px 12px", marginBottom: 4, marginLeft: 8,
                background: C.cardBg, border: `1px solid ${levelColor(b.level)}30`,
                borderRadius: 4,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <PixelText size={7} color={levelColor(b.level)}>{b.name}</PixelText>
                  <PixelText size={5} color={C.subtleText}>{levelLabel(b.level)}</PixelText>
                </div>
                <PixelText size={6} color={C.subtleText}>{b.desc}</PixelText>
              </div>
            </div>
          ))}
          {/* Goal at end */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 32, display: "flex", justifyContent: "center" }}>
              <div style={{ fontSize: 16 }}>🏰</div>
            </div>
            <div style={{ marginLeft: 8 }}>
              <PixelText size={7} color={C.goalGold}>{hero.values?.[0]?.text || "Freedom from the Shadow"}</PixelText>
            </div>
          </div>
        </div>

        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
            Your path is forged. Each{"\n"}battle is a chance to carry{"\n"}fear and move forward anyway.{"\n"}{"\n"}
            Start with the first step.{"\n"}You don't need to feel ready.{"\n"}You just need to be willing.{"\n"}I'll be with you every step.
          </PixelText>
        </DialogBox>
        <PixelBtn onClick={() => onComplete(finalBosses)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", maxWidth: 340, marginTop: 12 }}>
          BEGIN THE JOURNEY →
        </PixelBtn>

      </div>
    );
  }

  // === MAIN: Loading / Card Sort ===
  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "40px 24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>

      {loading ? (
        <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔨</div>
          <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>FORGING YOUR BATTLES</PixelText>
          <PixelText size={7} color={C.subtleText} style={{ display: "block" }}>Dara is studying your Shadow profile...</PixelText>
        </div>
      ) : exposures.length === 0 ? (
        <div style={{ textAlign: "center" }}>
          <PixelText size={10} color={C.bossRed} style={{ display: "block", marginBottom: 12 }}>THE FORGE NEEDS MORE FIRE</PixelText>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              I couldn't generate your battles{"\n"}this time. Let me try again.
            </PixelText>
          </DialogBox>
          <PixelBtn onClick={() => { setLoading(true); generateExposures(); }} color={C.gold} textColor={C.charcoal} style={{ marginTop: 12 }}>
            TRY AGAIN
          </PixelBtn>
        </div>
      ) : card ? (
        <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>FORGE YOUR PATH</PixelText>
          <PixelText size={7} color={C.subtleText} style={{ display: "block", marginBottom: 14 }}>
            Could you try this? Swipe right to accept, left to pass.
          </PixelText>

          {/* Progress */}
          <div style={{ height: 4, background: C.cardBg, borderRadius: 2, marginBottom: 14, border: `1px solid ${C.mutedBorder}` }}>
            <div style={{ height: "100%", width: `${(currentCard / exposures.length) * 100}%`, background: C.goldMd, borderRadius: 2, transition: "width 0.3s" }} />
          </div>

          {/* Replacement loading indicator */}
          {generatingReplacement && (
            <div style={{ textAlign: "center", marginBottom: 14, padding: "12px 16px", animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 28, marginBottom: 8, animation: "pulse 1.2s ease-in-out infinite" }}>🔨</div>
              <PixelText size={8} color={C.goldMd} style={{ display: "block" }}>Dara is finding another option...</PixelText>
            </div>
          )}

          {/* Exposure card */}
          <div
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            style={{
              padding: "20px 18px", position: "relative",
              background: `linear-gradient(180deg, ${levelColor(card.level)}08 0%, ${C.cardBg} 100%)`,
              border: `2px solid ${swipeDir === "right" ? C.hpGreen : swipeDir === "left" ? C.bossRed : levelColor(card.level) + "60"}`,
              borderRadius: 8, cursor: "grab", userSelect: "none", marginBottom: 14,
              transform: `translateX(${swipeDir === "right" ? 200 : swipeDir === "left" ? -200 : dragX}px) rotate(${(swipeDir === "right" ? 12 : swipeDir === "left" ? -12 : dragX * 0.08)}deg)`,
              opacity: swipeDir ? 0 : 1, transition: swipeDir ? "all 0.3s" : "none",
            }}
          >
            {/* Floating swipe hint arrows */}
            <div style={{
              position: "absolute", left: -32, top: "50%", transform: "translateY(-50%)",
              fontSize: 20, color: C.hpGreen,
              animation: "swipeHintLeft 1.5s ease-in-out infinite", pointerEvents: "none",
            }}>←</div>
            <div style={{
              position: "absolute", right: -32, top: "50%", transform: "translateY(-50%)",
              fontSize: 20, color: C.goldMd,
              animation: "swipeHintRight 1.5s ease-in-out infinite", pointerEvents: "none",
            }}>→</div>
            {/* Difficulty badge */}
            <div style={{
              display: "inline-block", padding: "3px 10px", borderRadius: 3, marginBottom: 12,
              background: levelColor(card.level) + "20", border: `1px solid ${levelColor(card.level)}40`,
            }}>
              <PixelText size={6} color={levelColor(card.level)}>LV.{card.level} · {levelLabel(card.level)}</PixelText>
            </div>

            {/* Alternative badge — shown when this is a replacement card */}
            {levelRejectCounts[card.level] > 0 && (
              <div style={{
                position: "absolute", top: 10, right: 10,
                padding: "2px 8px", borderRadius: 3,
                background: C.plum + "80", border: `1px solid ${C.goldMd}60`,
                animation: "fadeIn 0.3s ease-out",
              }}>
                <PixelText size={5} color={C.goldMd}>Alt {levelRejectCounts[card.level]} of 2</PixelText>
              </div>
            )}

            <PixelText size={11} color={C.cream} style={{ display: "block", marginBottom: 10 }}>{card.name}</PixelText>
            <PixelText size={8} color={C.subtleText} style={{ display: "block", lineHeight: 1.7 }}>{card.activity}</PixelText>

            {/* Swipe indicators */}
            {dragX > 20 && <div style={{ position: "absolute", top: 12, right: 12 }}><PixelText size={9} color={C.hpGreen}>ACCEPT ✓</PixelText></div>}
            {dragX < -20 && <div style={{ position: "absolute", top: 12, left: 12 }}><PixelText size={9} color={C.bossRed}>PASS ✗</PixelText></div>}
          </div>

          {/* Labels + count */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 10 }}>
            <PixelText size={7} color={C.bossRed}>← PASS</PixelText>
            <PixelText size={8} color={C.subtleText}>{currentCard + 1} / {exposures.length}</PixelText>
            <PixelText size={7} color={C.hpGreen}>ACCEPT →</PixelText>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, opacity: generatingReplacement ? 0.4 : 1, pointerEvents: generatingReplacement ? "none" : "auto" }}>
            <button onClick={handleReject} style={{
              width: 48, height: 48, borderRadius: "50%", border: `2px solid ${C.mutedBorder}`,
              background: C.plum, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>✗</button>
            <button onClick={handleAccept} style={{
              width: 48, height: 48, borderRadius: "50%", border: `2px solid ${C.goldMd}`,
              background: C.plum, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 18,
              boxShadow: `0 0 12px ${C.goldMd}20`,
            }}>✓</button>
          </div>

          {/* Accepted count */}
          {accepted.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <PixelText size={6} color={C.hpGreen}>{accepted.length} battle{accepted.length !== 1 ? "s" : ""} on your path</PixelText>
            </div>
          )}
        </div>
      ) : null}

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} } @keyframes swipeHintLeft { 0%,100%{opacity:0.3;transform:translateY(-50%) translateX(0)} 50%{opacity:1;transform:translateY(-50%) translateX(-6px)} } @keyframes swipeHintRight { 0%,100%{opacity:0.3;transform:translateY(-50%) translateX(0)} 50%{opacity:1;transform:translateY(-50%) translateX(6px)} }`}</style>
    </div>
  );
}

