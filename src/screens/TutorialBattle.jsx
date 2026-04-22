import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAIChat, callAI } from '../utils/chat';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT, FONT_LINK, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, TypingDots, DialogBox } from '../components/shared';
export default function TutorialBattle({ heroName, hero, quest, shadowText, heroValues, heroStrengths = [], heroCoreValues = [], onComplete, obState = {}, setOBState }) {
  const [phase, setPhase] = useState(obState.phase || "intro"); // intro, choose, decide, allow, rehearse, rise, waiting, engage, debrief
  const advancePhase = (newPhase) => { setPhase(newPhase); if (setOBState) setOBState({ phase: newPhase }); };
  const [chosenExposure, setChosenExposure] = useState(obState.chosenExposure || null);
  const [sudsBefore, setSudsBefore] = useState(obState.sudsBefore ?? null);
  const [sudsAfter, setSudsAfter] = useState(null);
  const [rehearsalStep, setRehearsalStep] = useState(0);
  const [allowInput, setAllowInput] = useState("");
  const [engageInput, setEngageInput] = useState("");
  const [riseSubStep, setRiseSubStep] = useState(obState.riseSubStep ?? 0);
  const [exposureWhen, setExposureWhen] = useState(obState.exposureWhen || "");
  const [exposureWhere, setExposureWhere] = useState(obState.exposureWhere || "");
  const [exposureArmory, setExposureArmory] = useState(obState.exposureArmory || "");
  const [exposureScheduledTime, setExposureScheduledTime] = useState(obState.exposureScheduledTime || "");
  const [showAlarmSuggestion, setShowAlarmSuggestion] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const valueName = heroValues?.[0]?.word || heroValues?.[0]?.text || "courage";

  // AI coach for the rehearsal/coaching moments
  const heroContext = buildHeroContext(hero, quest, shadowText, []);
  const coachChat = useAIChat(SYS.preBoss, `${heroContext}\n\nTUTORIAL BATTLE: This is the hero's very first exposure — a micro-challenge. Reference their strengths, values, and shadow profile when coaching. Be encouraging and personal.`);
  const chatRef = useRef(null);
  const [coachInput, setCoachInput] = useState("");

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [coachChat.messages, coachChat.typing]);

  // Persist tutorial state to obState for resume-anywhere
  const initRef = useRef(true);
  useEffect(() => {
    if (initRef.current) { initRef.current = false; return; }
    if (!setOBState) return;
    setOBState({ chosenExposure, sudsBefore, riseSubStep, exposureWhen, exposureWhere, exposureArmory });
  }, [chosenExposure, sudsBefore, riseSubStep, exposureWhen, exposureWhere, exposureArmory, setOBState]);

  // AI-generated micro-exposures tailored to the user's profile
  const [tutorialExposures, setTutorialExposures] = useState([]);
  const [exposuresLoading, setExposuresLoading] = useState(true);
  const [prevExposureTexts, setPrevExposureTexts] = useState([]);
  const fallbackRoundRef = useRef(0);


  const generateTutorialExposures = async (avoidTexts = []) => {
    setExposuresLoading(true);
    try {
      const shadowsText = shadowText || "General social anxiety";
      const strengthsText = heroStrengths.length > 0 ? heroStrengths.join(", ") : "Not specified";
      const valuesText = heroCoreValues.length > 0 ? heroCoreValues.map(v => v.word || v.text).join(", ") : (heroValues?.[0]?.text || "courage");
      const avoidBlock = avoidTexts.length > 0
        ? `\n\nPREVIOUSLY SHOWN — DO NOT REPEAT:\n${avoidTexts.map(t => "❌ " + t).join("\n")}\n\nGenerate 3 COMPLETELY DIFFERENT exposures from the above.`
        : "";
      const res = await callAI(
        `You are a clinical psychologist designing micro-exposures for someone with social anxiety. Generate exactly 3 very low-SUDS (1-2 out of 10) training exposures for a user's FIRST exposure experience.

User profile:
- Shadow pattern: ${shadowsText}
- Self-identified strengths: ${strengthsText}
- Core value: ${valuesText}${avoidBlock}

Clinical rules:
- SUDS must be 1 or 2 (very gentle, low-stakes micro-actions)
- Each must be completable in 5-15 seconds
- Each must be context-flexible (works in multiple settings)
- Tailor the activities to the user's shadow pattern without being too targeted (this is still a beginner exercise)
- Leverage the user's strengths where possible
- Connect subtly to their core value
- Each activity must be COMPLETELY DIFFERENT from the others and from any previously shown exposures
- Give each a creative RPG-style boss name (1-2 words)
- Include an emoji icon name (use standard emoji names like "smile", "wave", "nod", "greet", etc.)

Return ONLY a JSON array: [{"name":"Boss Name","text":"specific micro-exposure activity","icon":"emoji_name","where":"where to do it","time":"X seconds","suds":1}]
No other text.`,
        [{ role: "user", text: `Generate 3 DIFFERENT training exposures. ${avoidTexts.length > 0 ? "The user has seen " + avoidTexts.length + " already and wants NEW ones." : "This is the first batch."}` }]
      );
      const jsonMatch = res.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const newExposures = parsed.slice(0, 3).map((e, i) => ({
            ...e,
            id: "tutorial_" + (e.name || "exp" + i).replace(/\s+/g, "_").toLowerCase(),
            suds: Math.min(2, e.suds || 1),
            time: e.time || "10 seconds",
            icon: e.icon || "star",
          }));
          // Deduplication: if any new text matches a previously shown text, force fallback
          const allPrev = [...avoidTexts];
          const hasDupe = newExposures.some(ne => allPrev.some(p => p.toLowerCase().trim() === ne.text.toLowerCase().trim()));
          if (hasDupe) {
            console.warn("AI returned duplicate exposures — falling back");
            throw new Error("AI returned duplicates");
          }
          setTutorialExposures(newExposures);
          // Track the texts so next regenerate avoids them
          setPrevExposureTexts(prev => [...prev, ...newExposures.map(e => e.text)]);
          setExposuresLoading(false);
          return;
        }
      }
      throw new Error("Parse failed");
    } catch (e) {
      console.error("Tutorial exposure generation failed:", e);
      // Fallback: rotate through different sets
      const fallbackSets = [
        [
          { id: "smile", text: "Make eye contact and smile at a stranger", icon: "😊", where: "Anywhere — street, shop, café", time: "5 seconds", suds: 1, name: "The Smiler" },
          { id: "hello", text: "Say 'hello' or 'good morning' to someone you don't know", icon: "👋", where: "Walking past someone, a cashier, a neighbor", time: "10 seconds", suds: 1, name: "The Greeter" },
          { id: "nod", text: "Give a small nod of acknowledgment to someone nearby", icon: "🙂", where: "Elevator, waiting in line, shared space", time: "5 seconds", suds: 2, name: "The Nod" },
        ],
        [
          { id: "wave", text: "Give a friendly wave to someone across the room", icon: "👋", where: "Park, grocery store, shared space", time: "5 seconds", suds: 1, name: "The Waver" },
          { id: "door", text: "Hold a door open for someone behind you", icon: "🚪", where: "Any entrance — shop, building, elevator", time: "10 seconds", suds: 1, name: "The Gatekeeper" },
          { id: "thanks", text: "Thank a cashier or service worker by name if their badge is visible", icon: "🙏", where: "Store, restaurant, pharmacy", time: "10 seconds", suds: 2, name: "The Gratitude" },
        ],
        [
          { id: "chair", text: "Sit in a visible spot and stay there for 30 seconds without looking at your phone", icon: "🪑", where: "Café, park bench, waiting area", time: "30 seconds", suds: 2, name: "The Stillness" },
          { id: "queue", text: "Make brief friendly small talk with someone in line", icon: "💬", where: "Grocery checkout, coffee shop, ATM line", time: "15 seconds", suds: 2, name: "The Chatter" },
          { id: "ask", text: "Ask a stranger for simple directions you already know", icon: "🗺️", where: "Street, mall, campus", time: "10 seconds", suds: 2, name: "The Seeker" },
        ],
      ];
      // Skip fallback sets that overlap with previously shown exposures
      const prevSet = new Set(avoidTexts.map(t => t.toLowerCase().trim()));
      let startIdx = (fallbackRoundRef.current + 1) % fallbackSets.length;
      let chosenIdx = startIdx;
      for (let i = 0; i < fallbackSets.length; i++) {
        const idx = (startIdx + i) % fallbackSets.length;
        const hasOverlap = fallbackSets[idx].some(e => prevSet.has(e.text.toLowerCase().trim()));
        if (!hasOverlap) { chosenIdx = idx; break; }
      }
      fallbackRoundRef.current = chosenIdx;
      setTutorialExposures(fallbackSets[chosenIdx]);
      setExposuresLoading(false);
    }
  };

  useEffect(() => { generateTutorialExposures(); }, []);

  // Timer for waiting phase
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [timerActive]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const PhaseLabel = ({ letter, title, active, color }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
      padding: "8px 12px", borderRadius: 6,
      background: active ? color + "15" : "transparent",
      border: active ? `2px solid ${color}40` : "2px solid transparent",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 4,
        background: active ? color + "25" : "#1A1218",
        border: `2px solid ${active ? color : "#5C3A50"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PixelText size={12} color={active ? color : C.grayLt}>{letter}</PixelText>
      </div>
      <div>
        <PixelText size={9} color={active ? color : C.grayLt}>{title}</PixelText>
        <div><PixelText size={6} color={C.grayLt}>{active ? "ACTIVE" : "—"}</PixelText></div>
      </div>
    </div>
  );

  // D.A.R.E.R. mini progress bar
  const phases = ["D", "A", "R", "E", "R"];
  const phaseIndex = phase === "decide" ? 0 : phase === "allow" || phase === "rehearse" ? 1 : phase === "rise" ? 2 : phase === "waiting" || phase === "engage" ? 3 : phase === "debrief" ? 4 : -1;

  const ProgressBar = () => (
    <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
      {phases.map((p, i) => (
        <div key={i} style={{
          flex: 1, padding: "5px 2px", textAlign: "center", borderRadius: 3,
          background: i < phaseIndex ? C.hpGreen + "25" : i === phaseIndex ? C.goldMd + "20" : "#1A1218",
          border: `2px solid ${i < phaseIndex ? C.hpGreen : i === phaseIndex ? C.goldMd : "#5C3A50"}`,
          transition: "all 0.3s",
        }}>
          <PixelText size={7} color={i <= phaseIndex ? (i < phaseIndex ? C.hpGreen : C.goldMd) : C.grayLt}>{p}</PixelText>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, display: "flex", flexDirection: "column" }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* Header */}
      {phase !== "intro" && phase !== "choose" && (
        <div style={{ padding: "10px 16px", borderBottom: "2px solid #5C3A50", background: "#1A1218" }}>
          <PixelText size={7} color={C.goldMd}>🏕 TRAINING GROUNDS</PixelText>
          {chosenExposure && (
            <div style={{ marginTop: 4 }}>
              <PixelText size={7} color={C.cream}>{chosenExposure.text}</PixelText>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 32px" }}>

        {/* === INTRO === */}
        {phase === "intro" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏕</div>
            <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>TRAINING GROUNDS</PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>Practice the DARER Strategy � guided by Dara</PixelText>

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                Before you forge your full path,{"\n"}let's try one small battle{"\n"}together.{"\n"}{"\n"}
                This is your training ground. I'll{"\n"}walk you through every step of{"\n"}the D.A.R.E.R. cycle so you know{"\n"}exactly how it works.{"\n"}{"\n"}
                The battle is tiny — but the{"\n"}process is real. Ready to see{"\n"}what you're made of?
              </PixelText>
            </DialogBox>

            <PixelBtn onClick={() => advancePhase("choose")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              SHOW ME THE BATTLES →
            </PixelBtn>
          </div>
        )}

        {/* === CHOOSE MICRO-EXPOSURE === */}
        {phase === "choose" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>CHOOSE YOUR FIRST BATTLE</PixelText>
              <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>Pick the one that feels right</PixelText>
            </div>

            {exposuresLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>🔨 FORGING YOUR TRAINING</PixelText>
                <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>Dara is studying your Shadow profile...</PixelText>
              </div>
            ) : (
              <>
                {tutorialExposures.map((exp) => {
                  const selected = chosenExposure?.id === exp.id;
                  return (
                    <button key={exp.id} onClick={() => setChosenExposure(exp)} style={{
                      width: "100%", textAlign: "left", padding: 14, marginBottom: 8,
                      background: selected ? C.goldMd + "12" : "#1A1218",
                      border: `2px solid ${selected ? C.goldMd : "#5C3A50"}`,
                      borderRadius: 6, cursor: "pointer",
                      boxShadow: selected ? `0 0 12px ${C.goldMd}15` : "none",
                      transition: "all 0.2s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{exp.icon}</span>
                        <div style={{ flex: 1 }}>
                          <PixelText size={8} color={selected ? C.goldMd : C.cream} style={{ display: "block", lineHeight: 1.5 }}>
                            {exp.text}
                          </PixelText>
                          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                            <PixelText size={6} color={C.grayLt}>📍 {exp.where}</PixelText>
                          </div>
                          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                            <PixelText size={6} color={C.grayLt}>⏱ {exp.time}</PixelText>
                            <PixelText size={6} color={C.hpGreen}>SUDs {exp.suds}/10</PixelText>
                          </div>
                        </div>
                        {selected && <PixelText size={14} color={C.goldMd}>✓</PixelText>}
                      </div>
                    </button>
                  );
                })}

                <PixelBtn onClick={() => chosenExposure && advancePhase("decide")} disabled={!chosenExposure} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
                  BEGIN TRAINING →
                </PixelBtn>
                <button onClick={() => generateTutorialExposures(prevExposureTexts)} style={{
                  width: "100%", marginTop: 8, padding: 10,
                  background: "transparent", border: "1px dashed #5C3A50",
                  borderRadius: 4, cursor: "pointer",
                }}>
                  <PixelText size={6} color={C.grayLt}>🔄 Generate different training exposures</PixelText>
                </button>
              </>
            )}
          </div>
        )}

        {/* === D — DECIDE === */}
        {phase === "decide" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="D" title="DECIDE" active color={C.goalGold} />

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Your battle: "{chosenExposure.text}"{"\n"}{"\n"}
                Before any battle, a DARER asks:{"\n"}Why am I choosing this?{"\n"}{"\n"}
                Your answer is your anchor. When{"\n"}the Shadow strikes, your "why"{"\n"}keeps you on the path.{"\n"}{"\n"}
                Your core value is {valueName}.{"\n"}That's your "why."
              </PixelText>
            </DialogBox>

            <div style={{ background: C.goldMd + "10", border: `1.5px solid ${C.goldMd}30`, borderRadius: 6, padding: 12, marginTop: 12, textAlign: "center" }}>
              <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>YOUR DECISION</PixelText>
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.6 }}>
                "I choose to {chosenExposure.text.toLowerCase()}{"\n"}because {valueName.toLowerCase()} matters to me."
              </PixelText>
            </div>

            <PixelBtn onClick={() => advancePhase("allow")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
              I DECIDE → NEXT: ALLOW
            </PixelBtn>
          </div>
        )}

        {/* === A — ALLOW (with mental rehearsal) === */}
        {phase === "allow" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="A" title="ALLOW" active color={C.hpGreen} />

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Now, before we do this for real,{"\n"}let's rehearse it in your mind.{"\n"}{"\n"}
                Close your eyes for a moment.{"\n"}Imagine yourself about to{"\n"}{chosenExposure.text.toLowerCase()}.{"\n"}{"\n"}
                What does the Storm whisper?{"\n"}What do you feel in your body?
              </PixelText>
            </DialogBox>

            <div style={{ marginTop: 12 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 6 }}>What comes up when you imagine it?</PixelText>
              <textarea value={allowInput} onChange={e => setAllowInput(e.target.value)}
                placeholder='e.g. "My mind says they will think I am weird. My stomach tightens..."'
                style={{
                  width: "100%", minHeight: 80, padding: 10, background: "#1A1218",
                  border: "2px solid #5C3A50", borderRadius: 4, color: C.cream,
                  fontSize: 12, fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                  lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            <PixelBtn onClick={() => {
              advancePhase("rehearse");
              coachChat.init(`The hero ${heroName} is doing their FIRST ever exposure — a tutorial battle. The exposure is: "${chosenExposure.text}". They just imagined doing it and reported: "${allowInput}". Coach them through ALLOWING: validate what they're feeling is normal, that the Storm is doing its job, and that these feelings are passengers not drivers. Then guide a brief grounding exercise (3 deep breaths, feet on the floor). Keep it warm, brief, 2-3 sentences. Use game language.`);
            }} disabled={!allowInput.trim()} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              THE STORM IS HERE →
            </PixelBtn>
          </div>
        )}

        {/* === REHEARSE — Dara coaches through the Storm === */}
        {phase === "rehearse" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="A" title="ALLOW — DARA COACHING" active color={C.hpGreen} />

            <div ref={chatRef} style={{ maxHeight: 280, overflowY: "auto", marginBottom: 12 }}>
              {coachChat.messages.filter(m => m.role === "assistant").map((m, i) => (
                <DialogBox key={i} speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{m.text}</PixelText>
                </DialogBox>
              ))}
              {coachChat.typing && <DialogBox speaker="DARA" typing />}
            </div>

            {/* Quick-response options or free text */}
            {!coachChat.typing && coachChat.messages.length > 0 && (
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {["I notice the Storm but I can sit with it", "It feels intense but I want to try", "What if it gets worse?"].map(opt => (
                    <button key={opt} onClick={() => coachChat.sendMessage(opt)} style={{
                      padding: "8px 10px", background: "#1A1218", border: "1.5px solid #5C3A50",
                      borderRadius: 4, cursor: "pointer",
                    }}>
                      <PixelText size={6} color={C.cream}>{opt}</PixelText>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={coachInput} onChange={e => setCoachInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && coachInput.trim()) { coachChat.sendMessage(coachInput); setCoachInput(""); } }}
                    placeholder="Talk to Dara..."
                    style={{ flex: 1, padding: 8, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 11, fontFamily: PIXEL_FONT, outline: "none" }}
                  />
                  <PixelBtn onClick={() => { if (coachInput.trim()) { coachChat.sendMessage(coachInput); setCoachInput(""); } }}>→</PixelBtn>
                </div>

                <PixelBtn onClick={() => advancePhase("rise")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 14 }}>
                  I'M ALLOWING IT → NEXT: RISE
                </PixelBtn>
              </div>
            )}
          </div>
        )}

        {/* === R — RISE (plan + SUDs before + go do it) === */}
        {phase === "rise" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="R" title="RISE" active color={C.teal} />

            {/* Sub-step 0: WHEN */}
            {riseSubStep === 0 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    The rehearsal is done. You've{"\n"}felt the Storm and you're still{"\n"}standing.{"\n"}{"\n"}
                    Before you step into the arena,{"\n"}tell me — when will you face{"\n"}this battle? Choose a time{"\n"}that feels real and within reach.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 14 }}>
                  {[
                    "Today — as soon as I'm ready",
                    "Later today — within a few hours",
                    "Tomorrow — I'll plan it in",
                    "Within the next 3 days",
                    "This week — I'll pick a day",
                  ].map(opt => (
                    <button key={opt} onClick={() => { setExposureWhen(opt); setRiseSubStep(1); }} style={{
                      display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                      borderRadius: 4, border: "2px solid #5C3A50",
                      background: exposureWhen === opt ? C.teal + "20" : "#1A1218",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <PixelText size={7} color={exposureWhen === opt ? C.teal : C.grayLt}>{opt}</PixelText>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-step 1: WHERE */}
            {riseSubStep === 1 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    Good. You know when.{"\n"}{"\n"}
                    Now — where will you step into{"\n"}the territory? Name the place.{"\n"}Be specific. This is your map.
                  </PixelText>
                </DialogBox>
                <input
                  type="text"
                  placeholder="e.g. the coffee shop on Main St..."
                  value={exposureWhere}
                  onChange={e => setExposureWhere(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && exposureWhere.trim()) setRiseSubStep(2); }}
                  style={{
                    display: "block", width: "100%", marginTop: 14, padding: "12px 14px",
                    borderRadius: 4, border: "2px solid #5C3A50", background: "#1A1218",
                    color: C.cream, fontFamily: "inherit", fontSize: 14, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <PixelBtn
                  onClick={() => setRiseSubStep(2)}
                  disabled={!exposureWhere.trim()}
                  color={C.gold} textColor={C.charcoal}
                  style={{ width: "100%", marginTop: 10 }}
                >
                  NEXT →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 2: SCHEDULE DATE/TIME */}
            {riseSubStep === 2 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    {"\n"}Pick the exact time you'll{"\n"}face this battle. The more{"\n"}specific you are, the more{"\n"}likely you'll follow through.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 14 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    <PixelText size={7} color={C.goldMd}>📅 Date & Time</PixelText>
                  </label>
                  <input
                    type="datetime-local"
                    value={exposureScheduledTime}
                    onChange={e => setExposureScheduledTime(e.target.value)}
                    style={{
                      display: "block", width: "100%", padding: "12px 14px",
                      borderRadius: 4, border: "2px solid #5C3A50", background: "#1A1218",
                      color: C.cream, fontFamily: "inherit", fontSize: 14, outline: "none",
                      boxSizing: "border-box", colorScheme: "dark",
                    }}
                  />
                  <PixelBtn
                    onClick={() => { setRiseSubStep(3); setShowAlarmSuggestion(true); }}
                    disabled={!exposureScheduledTime}
                    color={C.gold} textColor={C.charcoal}
                    style={{ width: "100%", marginTop: 10 }}
                  >
                    LOCK IT IN →
                  </PixelBtn>
                  <button onClick={() => setRiseSubStep(1)} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", display: "block", width: "100%", textAlign: "center" }}>
                    <PixelText size={6} color={C.grayLt}>← Back</PixelText>
                  </button>
                </div>

                {showAlarmSuggestion && exposureScheduledTime && (
                  <div style={{ marginTop: 16, padding: 14, background: C.teal + "15", border: `2px solid ${C.teal}60`, borderRadius: 6 }}>
                    <PixelText size={8} color={C.teal} style={{ display: "block", marginBottom: 8 }}>⏰ SET A REMINDER</PixelText>
                    <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 10, lineHeight: 1.6 }}>
                      You scheduled this for {new Date(exposureScheduledTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
                      {"\n"}{"\n"}
                      Setting an alarm or reminder on your phone right now will make you much more likely to follow through. Tap below to open your phone's calendar app.
                    </PixelText>
                    <button
                      onClick={() => {
                        const dt = new Date(exposureScheduledTime);
                        const title = encodeURIComponent(`DARER Training: ${chosenExposure?.name || 'Exposure'}`);
                        const desc = encodeURIComponent(`Practice exposure: ${chosenExposure?.desc || 'Face your fear'}`);
                        const startStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const endStr = new Date(dt.getTime() + 30*60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&dates=${startStr}/${endStr}`, '_blank');
                      }}
                      style={{ width: "100%", padding: "10px 14px", background: C.teal, border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 6 }}
                    >
                      <PixelText size={8} color={C.charcoal}>📱 ADD TO CALENDAR + ALARM</PixelText>
                    </button>
                    <button onClick={() => setShowAlarmSuggestion(false)} style={{ width: "100%", padding: "8px 14px", background: "transparent", border: `1px solid #5C3A50`, borderRadius: 4, cursor: "pointer" }}>
                      <PixelText size={7} color={C.grayLt}>I already set a reminder</PixelText>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sub-step 3: ARMORY */}
            {riseSubStep === 3 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You've chosen your time and{"\n"}your battlefield.{"\n"}{"\n"}
                    Before you go — which tool{"\n"}from the Armory will you carry?{"\n"}Choose the one that steadies you.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 14 }}>
                  {/* Training phase: only show Paced Breathing (the only tool learned so far) */}
                  {(() => {
                    const breathingTool = (hero.armory || []).find(t => t.id === "breathing");
                    const toolsToShow = breathingTool ? [breathingTool] : [];
                    return toolsToShow.map(tool => (
                      <button key={tool.id} onClick={() => { setExposureArmory(tool.name); setRiseSubStep(4); }} style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                        borderRadius: 4, border: `2px solid ${exposureArmory === tool.name ? C.teal : "#5C3A50"}`,
                        background: exposureArmory === tool.name ? C.teal + "20" : "#1A1218",
                        cursor: "pointer", textAlign: "left",
                      }}>
                        <span style={{ fontSize: 18 }}>{tool.icon}</span>
                        <PixelText size={7} color={exposureArmory === tool.name ? C.teal : C.grayLt}>{tool.name}</PixelText>
                      </button>
                    ));
                  })()}
                  <button onClick={() => { setExposureArmory("I'll trust the strategy alone"); setRiseSubStep(4); }} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${exposureArmory === "I'll trust the strategy alone" ? C.teal : "#5C3A50"}`,
                    background: exposureArmory === "I'll trust the strategy alone" ? C.teal + "20" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 18 }}>🗡️</span>
                    <PixelText size={7} color={exposureArmory === "I'll trust the strategy alone" ? C.teal : C.grayLt}>I'll trust the strategy alone</PixelText>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step 4: Storm Intensity (SUDs) */}
            {riseSubStep === 4 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You're armed and ready.{"\n"}{"\n"}
                    One last thing before you{"\n"}step through — how intense is{"\n"}the Storm right now? Rate it{"\n"}honestly. There's no wrong answer.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 12 }}>
                  <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (before)</PixelText>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => {
                      const color = n <= 3 ? C.hpGreen : n <= 6 ? C.goldMd : C.bossRed;
                      return (
                        <button key={n} onClick={() => setSudsBefore(n)} style={{
                          width: 40, height: 40, borderRadius: 4, cursor: "pointer",
                          background: sudsBefore === n ? color + "30" : "#1A1218",
                          border: `2px solid ${sudsBefore === n ? color : "#5C3A50"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <PixelText size={9} color={sudsBefore === n ? color : C.grayLt}>{n}</PixelText>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <PixelBtn onClick={() => { advancePhase("waiting"); setTimerActive(true); }} disabled={!sudsBefore} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  I'M GOING IN → RISE!
                </PixelBtn>
              </div>
            )}
          </div>
        )}

        {/* === WAITING (user is doing the exposure IRL) === */}
        {phase === "waiting" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />

            <div style={{
              width: 100, height: 100, margin: "20px auto", borderRadius: "50%",
              background: C.goldMd + "10", border: `3px solid ${C.goldMd}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 24px ${C.goldMd}15`,
              animation: "pulse 2s ease-in-out infinite",
            }}>
              <PixelText size={16} color={C.goldMd}>{formatTime(timer)}</PixelText>
            </div>

            <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>
              YOU'RE IN THE ARENA
            </PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>
              Go {chosenExposure.text.toLowerCase()}.{"\n"}Dara is right here.
            </PixelText>

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                You are doing it right now.{"\n"}The Storm is not in charge.{"\n"}You are.{"\n"}{"\n"}
                Take your time. Come back when{"\n"}you're done.
              </PixelText>
            </DialogBox>

            <PixelBtn onClick={() => { setTimerActive(false); advancePhase("engage"); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
              ✅ I DID IT!
            </PixelBtn>
            <button onClick={() => { setTimerActive(false); advancePhase("engage"); }} style={{ background: "none", border: "none", marginTop: 10, cursor: "pointer" }}>
              <PixelText size={7} color={C.grayLt}>I tried but couldn't finish</PixelText>
            </button>

            <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
          </div>
        )}

        {/* === E — ENGAGE (report back + SUDs after) === */}
        {phase === "engage" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="E" title="ENGAGE — REPORT" active color={C.bossRed} />

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                You stepped into the arena.{"\n"}That took real courage.{"\n"}{"\n"}
                What actually happened?{"\n"}How intense is the Storm now?
              </PixelText>
            </DialogBox>

            <div style={{ marginTop: 12 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 6 }}>What happened?</PixelText>
              <textarea value={engageInput} onChange={e => setEngageInput(e.target.value)}
                placeholder='e.g. "They smiled back! It was way less scary than I thought..."'
                style={{
                  width: "100%", minHeight: 60, padding: 10, background: "#1A1218",
                  border: "2px solid #5C3A50", borderRadius: 4, color: C.cream,
                  fontSize: 12, fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                  lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (after)</PixelText>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => {
                  const color = n <= 3 ? C.hpGreen : n <= 6 ? C.goldMd : C.bossRed;
                  return (
                    <button key={n} onClick={() => setSudsAfter(n)} style={{
                      width: 40, height: 40, borderRadius: 4, cursor: "pointer",
                      background: sudsAfter === n ? color + "30" : "#1A1218",
                      border: `2px solid ${sudsAfter === n ? color : "#5C3A50"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <PixelText size={9} color={sudsAfter === n ? color : C.grayLt}>{n}</PixelText>
                    </button>
                  );
                })}
              </div>
            </div>

            <PixelBtn onClick={() => advancePhase("debrief")} disabled={!sudsAfter} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
              NEXT: REPEAT (DEBRIEF) →
            </PixelBtn>
          </div>
        )}

        {/* === R — REPEAT (Debrief) === */}
        {phase === "debrief" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <ProgressBar />

            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <PixelText size={12} color={C.goldMd} style={{ display: "block" }}>FIRST BATTLE COMPLETE!</PixelText>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginTop: 4 }}>+50 XP EARNED</PixelText>
            </div>

            {/* SUDs comparison */}
            <div style={{ background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, padding: 14, marginBottom: 12 }}>
              <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>THE SHADOW LIED</PixelText>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                <div>
                  <PixelText size={7} color={C.grayLt}>BEFORE</PixelText>
                  <div style={{ fontSize: 28, margin: "4px 0" }}>
                    <PixelText size={20} color={C.bossRed}>{sudsBefore}</PixelText>
                  </div>
                  <PixelText size={6} color={C.bossRed}>FEARED</PixelText>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <PixelText size={16} color={C.goldMd}>→</PixelText>
                </div>
                <div>
                  <PixelText size={7} color={C.grayLt}>AFTER</PixelText>
                  <div style={{ fontSize: 28, margin: "4px 0" }}>
                    <PixelText size={20} color={C.hpGreen}>{sudsAfter}</PixelText>
                  </div>
                  <PixelText size={6} color={C.hpGreen}>ACTUAL</PixelText>
                </div>
              </div>
              {sudsBefore > sudsAfter && (
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <PixelText size={7} color={C.hpGreen}>
                    The Storm dropped {sudsBefore - sudsAfter} point{sudsBefore - sudsAfter !== 1 ? "s" : ""}. That's damage dealt to the Shadow.
                  </PixelText>
                </div>
              )}
            </div>

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                {heroName}, you just completed your{"\n"}first battle. Do you see what{"\n"}happened?{"\n"}{"\n"}
                The Shadow told you it would be{"\n"}unbearable. {sudsBefore > sudsAfter ? "But the actual experience was less intense than the fear predicted." : "And you survived it."}{"\n"}{"\n"}
                This is the D.A.R.E.R. cycle:{"\n"}Decide. Allow. Rise. Engage.{"\n"}Repeat. Every battle weakens{"\n"}the Shadow.{"\n"}{"\n"}
                Now you're ready to forge your{"\n"}full path — choose which battles{"\n"}to fight on the road toward{"\n"}{valueName.toLowerCase()}.
              </PixelText>
            </DialogBox>

            <PixelBtn onClick={() => { if (setOBState) setOBState({ tutorialComplete: true }); onComplete(); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              FORGE YOUR PATH →
            </PixelBtn>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
    </div>
  );
}



