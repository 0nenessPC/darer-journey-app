import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAIChat, callAI } from '../utils/chat';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT, FONT_LINK, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, TypingDots, DialogBox } from '../components/shared';
import PracticeSession from '../components/PracticeSession';
import { useCloudVoice } from '../hooks/useCloudVoice';
import { VoiceInputBar, VoiceMessageBubble } from '../components/VoiceToggle';

// Map emoji name strings to actual emoji characters
const EMOJI_MAP = {
  smile: "😊", wave: "👋", nod: "🙂", greet: "🤝", hello: "👋",
  door: "🚪", thanks: "🙏", chair: "🪑", queue: "💬", ask: "🗺️",
  seek: "🔍", chat: "💬", laugh: "😄", compliment: "💛", help: "🤲",
  look: "👀", stand: "🧍", sit: "🪑", walk: "🚶", talk: "🗣",
  star: "⭐", heart: "❤️", fire: "🔥", sparkle: "✨", sun: "☀️",
  shield: "🛡️", eye: "👁", brain: "🧠", muscle: "💪", lightbulb: "💡",
};

const resolveEmoji = (icon) => {
  if (!icon) return "✨";
  if (icon.length <= 2) return icon; // already an emoji
  return EMOJI_MAP[icon.toLowerCase()] || "✨";
};

export default function TutorialBattle({ heroName, hero, quest, shadowText, heroValues, heroStrengths = [], heroCoreValues = [], onComplete, obState = {}, setOBState }) {
  const [phase, setPhase] = useState(obState.phase || "intro"); // intro, choose, decide, allow, rehearse, rise, waiting, engage, debrief
  const advancePhase = (newPhase) => { setPhase(newPhase); if (setOBState) setOBState({ phase: newPhase }); };
  const [chosenExposure, setChosenExposure] = useState(obState.chosenExposure || null);
  const [sudsBefore, setSudsBefore] = useState(obState.sudsBefore ?? 0);
  const [sudsAfter, setSudsAfter] = useState(obState.sudsAfter ?? 0);
  const [rehearsalStep, setRehearsalStep] = useState(0);
  const [allowInput, setAllowInput] = useState("");
  const [allowFearful, setAllowFearful] = useState("");
  const [allowLikelihood, setAllowLikelihood] = useState(null);
  const [allowSeverity, setAllowSeverity] = useState(null);
  const [allowCanHandle, setAllowCanHandle] = useState("");
  const [allowFearShowing, setAllowFearShowing] = useState("");

  const [allowPhysicalSensations, setAllowPhysicalSensations] = useState([]);
  const [allowCustomSensation, setAllowCustomSensation] = useState("");
  const [engageSubStep, setEngageSubStep] = useState(0);
  const [engageOutcome, setEngageOutcome] = useState("");
  const [engageFreeText, setEngageFreeText] = useState("");
  const [fearedHappened, setFearedHappened] = useState("");
  const [fearedSeverity, setFearedSeverity] = useState("");
  const [madeItThrough, setMadeItThrough] = useState("");
  const [repeatOptions, setRepeatOptions] = useState([]);
  const [riseSubStep, setRiseSubStep] = useState(obState.riseSubStep ?? 0);
  const [decideWhy, setDecideWhy] = useState(obState.decideWhy || "");
  const [decideCustom, setDecideCustom] = useState("");
  const [decideSelectedVals, setDecideSelectedVals] = useState([]);
  const [exposureWhen, setExposureWhen] = useState(obState.exposureWhen || "");
  const [exposureWhere, setExposureWhere] = useState(obState.exposureWhere || "");
  const [exposureArmory, setExposureArmory] = useState(obState.exposureArmory || "");
  const [exposureScheduledTime, setExposureScheduledTime] = useState(obState.exposureScheduledTime || "");
  const [showAlarmSuggestion, setShowAlarmSuggestion] = useState(false);
  const [selectedArmoryTool, setSelectedArmoryTool] = useState(null);
  const valueName = heroValues?.[0]?.word || heroValues?.[0]?.text || "courage";

  // AI coach for the rehearsal/coaching moments
  const heroContext = buildHeroContext(hero, quest, shadowText, []);
  const coachChat = useAIChat(SYS.preBoss, `${heroContext}\n\nTUTORIAL BATTLE: This is the hero's very first exposure — a micro-challenge. Reference their strengths, values, and shadow profile when coaching. Be encouraging and personal.`);
  const chatRef = useRef(null);
  const [coachInput, setCoachInput] = useState("");
  const voice = useCloudVoice({ useCloud: false });

  // Auto-speak AI replies
  const spokenIdx = useRef(-1);
  useEffect(() => {
    const msgs = coachChat.messages;
    if (msgs.length === 0) return;
    const lastIdx = msgs.length - 1;
    const last = msgs[lastIdx];
    if (last?.role === "assistant" && lastIdx > spokenIdx.current) {
      spokenIdx.current = lastIdx;
      voice.speak(last.text, { speed: 0.9 });
    }
  }, [coachChat.messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [coachChat.messages, coachChat.typing]);

  // Persist tutorial state to obState for resume-anywhere
  const initRef = useRef(true);
  useEffect(() => {
    if (initRef.current) { initRef.current = false; return; }
    if (!setOBState) return;
    setOBState({ chosenExposure, sudsBefore, sudsAfter, riseSubStep, decideWhy: Array.isArray(decideWhy) ? decideWhy.join("||") : decideWhy, exposureWhen, exposureWhere, exposureArmory, engageSubStep });
  }, [chosenExposure, sudsBefore, sudsAfter, riseSubStep, decideWhy, exposureWhen, exposureWhere, exposureArmory, engageSubStep, setOBState]);

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
- Include an emoji icon (e.g., 😊👋🙂🤝🚪🙏🪑💬🗺️🔍😄💛🧍🚶🗣⭐❤️🔥💪💡)

CRITICAL: Every activity MUST be a true exposure — meaning it involves intentionally entering a feared social situation to face the fear. DO NOT suggest grounding techniques (5-4-3-2-1, body scan), breathing exercises, mindfulness, relaxation, journaling, or any internal coping strategy. Exposures are outward-facing social actions, not internal regulation techniques. If it doesn't involve interacting with or being observed by other people, it is NOT an exposure.

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
            icon: e.icon || "✨",
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

  // Pre-generate repeat options when user reaches the REPEAT step
  useEffect(() => {
    if (engageSubStep === 6 && repeatOptions.length === 0) {
      generateRepeatOptions();
    }
  }, [engageSubStep]);

  // Generate repeat exposure variations based on outcome
  const generateRepeatOptions = async () => {
    try {
      const isComplete = engageOutcome === "full";
      const currentText = chosenExposure?.text || "a micro-exposure";
      const res = await callAI(
        `You are a clinical psychologist designing ERP (Exposure Response Prevention) follow-up exercises. The user just completed their first micro-exposure.

Current exposure: "${currentText}"
User's outcome: ${isComplete ? "They completed it fully." : engageOutcome === "partial" ? "They went partway but didn't finish." : "They tried but couldn't push through."}
User's "why": "${decideWhy}"

Generate exactly 3 follow-up exposure variations in the same nature as the original but adjusted:
- If they COMPLETED it: make them slightly harder (longer duration, more people, more visible, etc.)
- If they DID NOT complete it: make them slightly easier or break into smaller steps
- One of the three should be an "outside the box" creative variation that is still therapeutic — something unexpected but clinically sound

CRITICAL: Every follow-up must be a true exposure — intentionally entering a feared social situation. DO NOT suggest grounding techniques, breathing exercises, mindfulness, journaling, or any internal coping strategy. Exposures are outward-facing social actions, not internal regulation techniques.

Return ONLY a JSON array like: [{"text":"exposure description","icon":"emoji","tag":"normal|step-up|creative"}]
No other text.`,
        [{ role: "user", text: `Generate 3 follow-up exposures based on their outcome.` }]
      );
      const jsonMatch = res?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setRepeatOptions(parsed.slice(0, 3).map((o, i) => ({
            ...o,
            icon: o.icon || "⚡",
            tag: o.tag || (i === 2 ? "creative" : "normal"),
          })));
          return;
        }
      }
      throw new Error("Parse failed");
    } catch (e) {
      console.error("Repeat option generation failed:", e);
      // Fallback options
      const currentText = chosenExposure?.text || "a micro-exposure";
      setRepeatOptions([
        { text: `Do "${currentText}" again, but one more time today`, icon: "🔁", tag: "normal" },
        { text: `Do "${currentText}" with one more person than last time`, icon: "👥", tag: "step-up" },
        { text: `Do "${currentText}" while maintaining eye contact and smiling — be the most confident version of yourself`, icon: "✨", tag: "creative" },
      ]);
    }
  };

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

  // D.A.R.E.R. mini progress bar — clickable to navigate completed steps
  const phaseNames = ["decide", "allow", "rise", "engage", "repeat"];
  const phaseIndex = phase === "decide" ? 0 : phase === "allow" || phase === "rehearse" ? 1 : phase === "rise" ? 2 : phase === "engage" ? 3 : phase === "repeat" ? 4 : -1;

  const ProgressBar = () => (
    <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
      {phaseNames.map((pName, i) => {
        const canClick = i <= phaseIndex;
        const isLast = i === 3; // engage is final, no repeat in training
        return (
          <button key={i}
            onClick={() => { if (canClick && !isLast) advancePhase(pName); }}
            style={{
              flex: 1, padding: "5px 2px", textAlign: "center", borderRadius: 3,
              background: i < phaseIndex ? C.hpGreen + "25" : i === phaseIndex ? C.goldMd + "20" : "#1A1218",
              border: `2px solid ${i < phaseIndex ? C.hpGreen : i === phaseIndex ? C.goldMd : "#5C3A50"}`,
              cursor: canClick && !isLast ? "pointer" : "default",
              opacity: canClick ? 1 : 0.4,
              transition: "all 0.3s",
            }}>
            <PixelText size={7} color={i <= phaseIndex ? (i < phaseIndex ? C.hpGreen : C.goldMd) : C.grayLt}>{pName[0].toUpperCase()}</PixelText>
          </button>
        );
      })}
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
                        <span style={{ fontSize: 24 }}>{resolveEmoji(exp.icon)}</span>
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

                <PixelBtn onClick={() => { if (chosenExposure) { setDecideSelectedVals([]); setDecideCustom(""); setDecideWhy(""); advancePhase("decide"); } }} disabled={!chosenExposure} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
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
                Why are you choosing to{"\n"}face this fear? Pick your "why" —{"\n"}it's your anchor when the{"\n"}Shadow strikes.
              </PixelText>
            </DialogBox>

            {/* Value pick buttons — multi-select */}
            <div style={{ marginTop: 14 }}>
              {(heroValues || []).slice(0, 5).map(v => {
                const picked = decideSelectedVals.includes(v.text);
                return (
                  <button key={v.id} onClick={() => {
                    setDecideSelectedVals(prev =>
                      picked ? prev.filter(x => x !== v.text) : [...prev, v.text]
                    );
                  }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${picked ? C.goalGold : "#5C3A50"}`,
                    background: picked ? C.goalGold + "15" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 18 }}>{v.icon || "💫"}</span>
                    <PixelText size={7} color={picked ? C.goalGold : C.grayLt}>{v.text}</PixelText>
                  </button>
                );
              })}
            </div>

            {/* Custom why input — separate from value picks */}
            <input
              value={decideCustom}
              onChange={e => setDecideCustom(e.target.value)}
              placeholder="Or type your own reason..."
              style={{
                width: "100%", padding: 10, marginTop: 10,
                background: "#1A1218", border: "2px solid #5C3A50",
                borderRadius: 4, color: C.cream, fontSize: 12,
                fontFamily: PIXEL_FONT, outline: "none", boxSizing: "border-box",
              }}
            />

            <PixelBtn
              onClick={() => {
                const whyParts = [...decideSelectedVals];
                if (decideCustom.trim()) whyParts.push(decideCustom.trim());
                setDecideWhy(whyParts.join("; "));
                advancePhase("allow");
              }}
              disabled={decideSelectedVals.length === 0 && !decideCustom.trim()}
              color={C.gold} textColor={C.charcoal}
              style={{ width: "100%", marginTop: 16 }}
            >
              I DECIDE → NEXT: ALLOW
            </PixelBtn>
          </div>
        )}

        {/* === A — ALLOW === */}
        {phase === "allow" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="A" title="ALLOW" active color={C.hpGreen} />

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Close your eyes. Imagine{"\n"}yourself stepping into this{"\n"}battle.{"\n"}{"\n"}
                The Storm will speak — let{"\n"}it. Name every whisper, every{"\n"}signal your body sends.{"\n"}Don't fight them. Let them be.
              </PixelText>
            </DialogBox>

            {/* 1. Fearful thoughts */}
            <div style={{ marginTop: 16 }}>
              <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 4 }}>
                WHAT DOES THE SHADOW WHISPER?
              </PixelText>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8, fontStyle: "italic" }}>
                What are your fearful thoughts?
              </PixelText>
              <textarea
                value={allowFearful}
                onChange={e => setAllowFearful(e.target.value)}
                placeholder="e.g. They'll think I'm weird. I'll embarrass myself..."
                rows={3}
                style={{
                  width: "100%", minHeight: 70, padding: 10,
                  background: "#1A1218", border: "2px solid #5C3A50",
                  borderRadius: 4, color: C.cream, fontSize: 12,
                  fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                  lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            {/* 2. Likelihood */}
            {allowFearful.trim() && (
              <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
                <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
                  HOW LIKELY IS THE FEAR COME TRUE?
                </PixelText>
                {(() => {
                  const pct = allowLikelihood ?? 50;
                  const color = pct <= 33 ? C.hpGreen : pct <= 66 ? C.amber : C.bossRed;
                  return (
                    <div>
                      <input type="range" min="0" max="100" value={pct} onChange={e => setAllowLikelihood(+e.target.value)}
                        style={{ width: "100%", accentColor: color }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <PixelText size={6} color={C.grayLt}>Won't happen</PixelText>
                        <PixelText size={9} color={color}>{pct}%</PixelText>
                        <PixelText size={6} color={C.grayLt}>Certain</PixelText>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 3. Severity */}
            {allowLikelihood !== null && (
              <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
                <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
                  HOW BAD WOULD IT BE IF IT HAPPENED?
                </PixelText>
                {(() => {
                  const sev = allowSeverity ?? 5;
                  const color = sev <= 3 ? C.hpGreen : sev <= 6 ? C.amber : C.bossRed;
                  return (
                    <div>
                      <input type="range" min="0" max="10" value={sev} onChange={e => setAllowSeverity(+e.target.value)}
                        style={{ width: "100%", accentColor: color }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <PixelText size={6} color={C.grayLt}>Mild</PixelText>
                        <PixelText size={9} color={color}>{sev} / 10</PixelText>
                        <PixelText size={6} color={C.grayLt}>Devastating</PixelText>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 4. Can I handle it? */}
            {allowSeverity !== null && (
              <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
                <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
                  COULD YOU HANDLE IT IF IT HAPPENED?
                </PixelText>
                {["Yes — I'd get through it", "I'm not sure, but I think so", "I don't know if I could"].map(opt => (
                  <button key={opt} onClick={() => setAllowCanHandle(opt)} style={{
                    display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${allowCanHandle === opt ? C.teal : "#5C3A50"}`,
                    background: allowCanHandle === opt ? C.teal + "20" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <PixelText size={7} color={allowCanHandle === opt ? C.teal : C.grayLt}>{opt}</PixelText>
                  </button>
                ))}
              </div>
            )}

            {/* 5. Is FEAR showing up? */}
            {allowCanHandle && (
              <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
                <PixelText size={7} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>
                  IS FEAR SHOWING UP RIGHT NOW?
                </PixelText>
                {["Yes — the Shadow is loud", "A little — a faint whisper", "Not really — it's quiet for now"].map(opt => (
                  <button key={opt} onClick={() => setAllowFearShowing(opt)} style={{
                    display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${allowFearShowing === opt ? C.bossRed : "#5C3A50"}`,
                    background: allowFearShowing === opt ? C.bossRed + "20" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <PixelText size={7} color={allowFearShowing === opt ? C.bossRed : C.grayLt}>{opt}</PixelText>
                  </button>
                ))}
              </div>
            )}

            {/* 6. Physical sensations */}
            {allowFearShowing && (
              <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
                <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
                  WHAT DOES YOUR BODY FEEL?
                </PixelText>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Racing heart 💓", "Sweaty palms 💦", "Tight chest 🫁", "Shaking 🫨", "Nausea 🤢", "Hot flushes 🔥", "Dizzy 😵", "Dry mouth 👄", "Nothing significant — my body feels fine 🧘"].map(s => {
                    const picked = allowPhysicalSensations.includes(s);
                    return (
                      <button key={s} onClick={() => {
                        setAllowPhysicalSensations(prev =>
                          picked ? prev.filter(x => x !== s) : [...prev, s]
                        );
                      }} style={{
                        padding: "6px 10px", borderRadius: 4,
                        border: `2px solid ${picked ? C.teal : "#5C3A50"}`,
                        background: picked ? C.teal + "20" : "#1A1218",
                        cursor: "pointer",
                      }}>
                        <PixelText size={6} color={picked ? C.teal : C.grayLt}>{s}</PixelText>
                      </button>
                    );
                  })}
                </div>
                <input
                  value={allowCustomSensation}
                  onChange={e => setAllowCustomSensation(e.target.value)}
                  placeholder="Or describe another sensation..."
                  style={{
                    width: "100%", padding: 8, marginTop: 8,
                    background: "#1A1218", border: "2px solid #5C3A50",
                    borderRadius: 4, color: C.cream, fontSize: 11,
                    fontFamily: PIXEL_FONT, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            <PixelBtn
              onClick={() => {
                setAllowInput(`Thoughts: "${allowFearful}" Likelihood: ${allowLikelihood}% Severity: ${allowSeverity}/10 Can handle: "${allowCanHandle}" Fear showing: "${allowFearShowing}" Body: [${allowPhysicalSensations.join(", ")}]${allowCustomSensation ? " — " + allowCustomSensation : ""}`);
                advancePhase("rise");
              }}
              disabled={!allowFearful.trim() || allowLikelihood === null || allowSeverity === null || !allowCanHandle || !allowFearShowing || allowPhysicalSensations.length === 0}
              color={C.gold} textColor={C.charcoal}
              style={{ width: "100%", marginTop: 16 }}
            >
              I'M ALLOWING IT → NEXT: RISE
            </PixelBtn>
          </div>
        )}

        {/* === R — RISE (plan + SUDs before + go do it) === */}
        {phase === "rise" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="R" title="RISE" active color={C.teal} />

            {/* Sub-step 0: WHEN + TIME + WHERE */}
            {riseSubStep === 0 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You're ready. The Storm may{"\n"}strike, but you've already{"\n"}decided what matters.{"\n"}{"\n"}
                    Before you step into the arena —{"\n"}tell me when and where you'll{"\n"}face this battle.
                  </PixelText>
                </DialogBox>

                {/* WHEN */}
                <div style={{ marginTop: 14 }}>
                  <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>📅 WHEN</PixelText>
                  {[
                    "Today — as soon as I'm ready",
                    "Later today — within a few hours",
                    "Tomorrow — I'll plan it in",
                    "Within the next 3 days",
                    "This week — I'll pick a day",
                  ].map(opt => (
                    <button key={opt} onClick={() => setExposureWhen(opt)} style={{
                      display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                      borderRadius: 4, border: `2px solid ${exposureWhen === opt ? C.teal : "#5C3A50"}`,
                      background: exposureWhen === opt ? C.teal + "20" : "#1A1218",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <PixelText size={7} color={exposureWhen === opt ? C.teal : C.grayLt}>{opt}</PixelText>
                    </button>
                  ))}
                </div>

                {/* TIME — pick a specific time */}
                {exposureWhen && (
                  <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
                    <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>⏰ WHAT TIME</PixelText>
                    <input
                      type="time"
                      value={exposureScheduledTime}
                      onChange={e => setExposureScheduledTime(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px",
                        borderRadius: 4, border: "2px solid #5C3A50", background: "#1A1218",
                        color: C.cream, fontFamily: "inherit", fontSize: 16, outline: "none",
                        boxSizing: "border-box", colorScheme: "dark",
                      }}
                    />
                    <button
                      onClick={() => {
                        const dt = exposureScheduledTime ? new Date(new Date().toDateString() + " " + exposureScheduledTime) : new Date(Date.now() + 60 * 60 * 1000);
                        const title = encodeURIComponent(`DARER Training: ${chosenExposure?.name || 'Exposure'}`);
                        const desc = encodeURIComponent(`Face this exposure: ${chosenExposure?.text || chosenExposure?.desc || ''}. Location: ${exposureWhere || 'TBD'}. Your anchor: ${decideWhy || 'courage'}.`);
                        const startStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const endStr = new Date(dt.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&dates=${startStr}/${endStr}`, '_blank');
                      }}
                      style={{
                        width: "100%", padding: "8px 14px", marginTop: 8,
                        background: C.teal, border: "none", borderRadius: 4, cursor: "pointer",
                      }}
                    >
                      <PixelText size={7} color={C.charcoal}>📱 SET CALENDAR REMINDER →</PixelText>
                    </button>
                  </div>
                )}

                {/* WHERE */}
                <div style={{ marginTop: 16 }}>
                  <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>📍 WHERE</PixelText>
                  <button
                    onClick={() => window.open("https://maps.google.com", "_blank")}
                    style={{
                      width: "100%", padding: "8px 12px", marginBottom: 8,
                      background: "transparent", border: `1px dashed #5C3A50`,
                      borderRadius: 4, cursor: "pointer",
                    }}
                  >
                    <PixelText size={6} color={C.plumMd}>🗺️ Open Google Maps to find your location →</PixelText>
                  </button>
                  <input
                    type="text"
                    placeholder="e.g. the coffee shop on Main St..."
                    value={exposureWhere}
                    onChange={e => setExposureWhere(e.target.value)}
                    style={{
                      display: "block", width: "100%", padding: "10px 14px",
                      borderRadius: 4, border: "2px solid #5C3A50", background: "#1A1218",
                      color: C.cream, fontFamily: "inherit", fontSize: 13, outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <PixelBtn
                  onClick={() => setRiseSubStep(1)}
                  disabled={!exposureWhen || !exposureWhere.trim()}
                  color={C.gold} textColor={C.charcoal}
                  style={{ width: "100%", marginTop: 16 }}
                >
                  LOCK IT IN →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 1: ARMORY */}
            {riseSubStep === 1 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You've locked in your time and{"\n"}battlefield.{"\n"}{"\n"}
                    Before you go — which tool{"\n"}from the Armory will you carry?{"\n"}Choose the one that steadies you.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 14 }}>
                  {(hero.armory || []).filter(t => t.unlocked).map(tool => (
                    <button key={tool.id} onClick={() => { setExposureArmory(tool.name); setSelectedArmoryTool(tool); setRiseSubStep(2); }} style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                      borderRadius: 4, border: `2px solid ${exposureArmory === tool.name ? C.teal : "#5C3A50"}`,
                      background: exposureArmory === tool.name ? C.teal + "20" : "#1A1218",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <span style={{ fontSize: 18 }}>{tool.icon}</span>
                      <PixelText size={7} color={exposureArmory === tool.name ? C.teal : C.grayLt}>{tool.name}</PixelText>
                    </button>
                  ))}
                  <button onClick={() => { setExposureArmory("I'll trust the strategy alone"); setSelectedArmoryTool(null); setRiseSubStep(3); }} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${exposureArmory === "I'll trust the strategy alone" ? C.teal : "#5C3A50"}`,
                    background: exposureArmory === "I'll trust the strategy alone" ? C.teal + "20" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 18 }}>🗡️</span>
                    <PixelText size={7} color={exposureArmory === "I'll trust the strategy alone" ? C.teal : C.grayLt}>I'll trust the strategy alone</PixelText>
                  </button>
                  {/* Locked tools preview */}
                  {(hero.armory || []).filter(t => !t.unlocked).length > 0 && (
                    <div style={{ marginTop: 12, opacity: 0.5 }}>
                      {(hero.armory || []).filter(t => !t.unlocked).map(tool => (
                        <div key={tool.id} style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                          borderRadius: 4, border: "2px solid #5C3A5040", background: "#1A1218",
                          pointerEvents: "none",
                        }}>
                          <span style={{ fontSize: 18, filter: "grayscale(1)" }}>{tool.icon}</span>
                          <PixelText size={7} color={C.grayLt}>{tool.name} 🔒</PixelText>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-step 2: Practice prompt */}
            {riseSubStep === 2 && selectedArmoryTool && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You've chosen your anchor.{"\n"}{"\n"}
                    Want to practice this skill{"\n"}right now before the real{"\n"}battle? Just a few rounds{"\n"}to warm up.
                  </PixelText>
                </DialogBox>

                <PixelBtn onClick={() => setRiseSubStep(2.5)} color={C.teal} textColor={C.cream} style={{ width: "100%", marginTop: 16 }}>
                  YES — PRACTICE NOW →
                </PixelBtn>
                <PixelBtn onClick={() => setRiseSubStep(3)} color={C.plum} textColor={C.cream} style={{ width: "100%", marginTop: 8 }}>
                  SKIP — I'M READY
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 2.5: Practice session running */}
            {riseSubStep === 2.5 && selectedArmoryTool && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <PracticeSession
                  tool={selectedArmoryTool}
                  onComplete={() => setRiseSubStep(3)}
                  onQuit={() => setRiseSubStep(3)}
                />
              </div>
            )}

            {/* Sub-step 3: Storm Intensity (SUDs) */}
            {riseSubStep === 3 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You're armed and ready.{"\n"}{"\n"}
                    One last thing before you{"\n"}step through — how intense is{"\n"}the Storm right now? Rate it{"\n"}honestly. There's no wrong answer.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 12 }}>
                  <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (before)</PixelText>
                  <PixelText size={6} color={C.grayLt} style={{ display: "block", marginBottom: 6, fontStyle: "italic" }}>How much distress do you feel right now?</PixelText>
                  {(() => {
                    const pct = sudsBefore;
                    const color = pct <= 33 ? C.hpGreen : pct <= 66 ? C.amber : C.bossRed;
                    return (
                    <div>
                      <input type="range" min="0" max="100" value={pct} onChange={e => setSudsBefore(+e.target.value)}
                        style={{ width: "100%", accentColor: color }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <PixelText size={6} color={C.grayLt}>Calm</PixelText>
                        <PixelText size={8} color={color}>{pct}</PixelText>
                        <PixelText size={6} color={C.grayLt}>Intense</PixelText>
                      </div>
                    </div>
                    );
                  })()}
                </div>
                <PixelBtn onClick={() => advancePhase("engage")} disabled={!sudsBefore} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  LET'S GO →
                </PixelBtn>
              </div>
            )}
          </div>
        )}

        {/* === E — ENGAGE (outcome → SUDs → reflection → debrief) === */}
        {phase === "engage" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="E" title="ENGAGE" active color={C.bossRed} />

            {/* Sub-step 0: Choose engage or talk to Dara */}
            {engageSubStep === 0 && (
              <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
                <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 16 }}>
                  TIME TO FACE THE SHADOW
                </PixelText>

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                    {heroName}, this is your moment.{"\n"}{"\n"}
                    You've prepared for this — you{"\n"}know why you're doing it, you've{"\n"}felt the Storm and let it be{"\n"}there, and you've chosen your{"\n"}tools.{"\n"}{"\n"}
                    The Shadow will whisper. The{"\n"}Storm will rise. But you are{"\n"}stronger than both.{"\n"}{"\n"}
                    When you're ready — step forward.
                  </PixelText>
                </DialogBox>

                <PixelBtn onClick={() => setEngageSubStep(1)} color={C.bossRed} textColor={C.cream} style={{ width: "100%", marginTop: 16 }}>
                  ⚔ ENGAGE RIGHT AWAY
                </PixelBtn>
                <PixelBtn onClick={() => setEngageSubStep(0.5)} color={C.teal} textColor={C.cream} style={{ width: "100%", marginTop: 8 }}>
                  💬 TALK TO DARA FIRST
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 0.5: Dara chat before engaging */}
            {engageSubStep === 0.5 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    Of course, {heroName}.{"\n"}{"\n"}
                    Whatever's on your mind —{"\n"}say it. I'm here. No judgment,{"\n"}no rush. What do you need{"\n"}before you step forward?
                  </PixelText>
                </DialogBox>

                {voice.supported ? (
                  <div style={{ marginTop: 14 }}>
                    <VoiceInputBar
                      input={coachInput}
                      onInputChange={setCoachInput}
                      onSend={async (t) => {
                        const msg = t;
                        setCoachInput("");
                        coachChat.messages.push({ role: "user", text: msg });
                        coachChat.setTyping(true);
                        try {
                          const reply = await callAI(SYS.preBoss, [...coachChat.messages.map(m => ({ role: m.role, content: m.text }))]);
                          coachChat.setTyping(false);
                          coachChat.messages.push({ role: "assistant", text: reply });
                        } catch {
                          coachChat.setTyping(false);
                          coachChat.messages.push({ role: "assistant", text: "I'm here with you. You've got this." });
                        }
                      }}
                      typing={coachChat.typing}
                      disabled={false}
                      voice={voice}
                      placeholder="Speak or type — ask Dara anything..."
                    />
                  </div>
                ) : (
                  <textarea
                    value={coachInput}
                    onChange={e => setCoachInput(e.target.value)}
                    placeholder="Ask Dara anything — fears, doubts, encouragement..."
                    rows={3}
                    style={{
                      width: "100%", minHeight: 70, padding: 10, marginTop: 14,
                      background: "#1A1218", border: "2px solid #5C3A50",
                      borderRadius: 4, color: C.cream, fontSize: 12,
                      fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                      lineHeight: 1.6, boxSizing: "border-box",
                    }}
                  />
                )}
                {voice.supported || (
                  <PixelBtn
                    onClick={async () => {
                      if (!coachInput.trim()) return;
                      const msg = coachInput;
                      setCoachInput("");
                      coachChat.messages.push({ role: "user", text: msg });
                      coachChat.setTyping(true);
                      try {
                        const reply = await callAI(SYS.preBoss, [...coachChat.messages.map(m => ({ role: m.role, content: m.text }))]);
                        coachChat.setTyping(false);
                        coachChat.messages.push({ role: "assistant", text: reply });
                      } catch {
                        coachChat.setTyping(false);
                        coachChat.messages.push({ role: "assistant", text: "I'm here with you. You've got this." });
                      }
                    }}
                    disabled={coachChat.typing || !coachInput.trim()}
                    color={C.teal} textColor={C.cream}
                    style={{ width: "100%", marginTop: 8 }}
                  >
                    SEND TO DARA →
                  </PixelBtn>
                )}

                {coachChat.messages.length > 0 && (
                  <div ref={chatRef} style={{ marginTop: 12, maxHeight: 300, overflowY: "auto" }}>
                    {coachChat.messages.map((m, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                        marginBottom: 6,
                      }}>
                        <div style={{
                          maxWidth: "85%", padding: "8px 12px", borderRadius: 4,
                          background: m.role === "user" ? C.plum : "#1A1218",
                          border: `2px solid ${m.role === "user" ? "#5C3A50" : C.teal + "40"}`,
                        }}>
                          <PixelText size={7} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>{m.text}</PixelText>
                        </div>
                      </div>
                    ))}
                    {coachChat.typing && <DialogBox speaker="DARA" typing />}
                  </div>
                )}

                <PixelBtn
                  onClick={() => setEngageSubStep(1)}
                  color={C.gold} textColor={C.charcoal}
                  style={{ width: "100%", marginTop: 12 }}
                >
                  I'M READY — LET'S GO →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 1: Outcome selection */}
            {engageSubStep === 1 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You stepped into the arena.{"\n"}Whatever happened — you showed{"\n"}up. That matters.{"\n"}{"\n"}
                    How did it go?
                  </PixelText>
                </DialogBox>

                <div style={{ marginTop: 14 }}>
                  {[
                    { id: "full", label: "✅ I did it — I stayed all the way through", desc: "I completed the full exposure" },
                    { id: "partial", label: "🔥 I went partway — faced some of it", desc: "I didn't finish, but I stayed longer than I usually would" },
                    { id: "tried", label: "💪 I tried but couldn't push through this time", desc: "The Storm was too strong, but I'm not giving up" },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setEngageOutcome(opt.id)} style={{
                      display: "block", width: "100%", marginBottom: 8, padding: "14px 12px",
                      borderRadius: 4, border: `2px solid ${engageOutcome === opt.id ? C.goldMd : "#5C3A50"}`,
                      background: engageOutcome === opt.id ? C.goldMd + "12" : "#1A1218",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <PixelText size={7} color={engageOutcome === opt.id ? C.goldMd : C.cream} style={{ display: "block", lineHeight: 1.5 }}>
                        {opt.label}
                      </PixelText>
                    </button>
                  ))}
                </div>

                <PixelBtn onClick={() => setEngageSubStep(2)} disabled={!engageOutcome} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  CONTINUE →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 2: SUDs after */}
            {engageSubStep === 2 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    How intense is the Storm{"\n"}right now? Rate it honestly.
                  </PixelText>
                </DialogBox>

                <div style={{ marginTop: 12 }}>
                  <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (after)</PixelText>
                  <PixelText size={6} color={C.grayLt} style={{ display: "block", marginBottom: 6, fontStyle: "italic" }}>How much distress do you feel right now?</PixelText>
                  {(() => {
                    const pct = sudsAfter;
                    const color = pct <= 33 ? C.hpGreen : pct <= 66 ? C.amber : C.bossRed;
                    return (
                    <div>
                      <input type="range" min="0" max="100" value={pct} onChange={e => setSudsAfter(+e.target.value)}
                        style={{ width: "100%", accentColor: color }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <PixelText size={6} color={C.grayLt}>Calm</PixelText>
                        <PixelText size={8} color={color}>{pct}</PixelText>
                        <PixelText size={6} color={C.grayLt}>Intense</PixelText>
                      </div>
                    </div>
                    );
                  })()}
                </div>

                <PixelBtn onClick={() => setEngageSubStep(3)} disabled={!sudsAfter} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  CONTINUE →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 3: Reflection questions */}
            {engageSubStep === 3 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <PixelText size={10} color={C.goldMd} style={{ display: "block", textAlign: "center", marginBottom: 16 }}>
                  REFLECT ON THE BATTLE
                </PixelText>

                {/* Q1: Did feared consequences happen? */}
                <div style={{ marginBottom: 16 }}>
                  <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
                    1. Did the consequences you feared actually happen?
                  </PixelText>
                  {["No, they didn't happen at all", "Some did, but not like I expected", "Yes, they did happen"].map(opt => (
                    <button key={opt} onClick={() => {
                      setFearedHappened(opt);
                      if (opt === "No, they didn't happen at all") {
                        setFearedSeverity("");
                        setMadeItThrough("");
                      }
                    }} style={{
                      display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                      borderRadius: 4, border: `2px solid ${fearedHappened === opt ? C.teal : "#5C3A50"}`,
                      background: fearedHappened === opt ? C.teal + "20" : "#1A1218",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <PixelText size={7} color={fearedHappened === opt ? C.teal : C.grayLt}>{opt}</PixelText>
                    </button>
                  ))}
                </div>

                {/* Q2: If it did happen, how severe was it actually? */}
                {fearedHappened && fearedHappened !== "No, they didn't happen at all" && (
                  <div style={{ marginBottom: 16, animation: "fadeIn 0.3s ease-out" }}>
                    <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
                      2. If it did happen — how bad was it really?
                    </PixelText>
                    {["It was much less severe than I feared", "It was about what I expected", "It was as bad as I feared"].map(opt => (
                      <button key={opt} onClick={() => setFearedSeverity(opt)} style={{
                        display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                        borderRadius: 4, border: `2px solid ${fearedSeverity === opt ? C.teal : "#5C3A50"}`,
                        background: fearedSeverity === opt ? C.teal + "20" : "#1A1218",
                        cursor: "pointer", textAlign: "left",
                      }}>
                        <PixelText size={7} color={fearedSeverity === opt ? C.teal : C.grayLt}>{opt}</PixelText>
                      </button>
                    ))}
                  </div>
                )}

                {/* Q3: Even if difficult, did you make it through? */}
                {fearedSeverity && fearedHappened !== "No, they didn't happen at all" && (
                  <div style={{ marginBottom: 16, animation: "fadeIn 0.3s ease-out" }}>
                    <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
                      3. Did you get through it?
                    </PixelText>
                    {["Yes — I made it through, even if it was hard", "I'm still working on it, but I know I can", "Not this time, but I learned something"].map(opt => (
                      <button key={opt} onClick={() => setMadeItThrough(opt)} style={{
                        display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                        borderRadius: 4, border: `2px solid ${madeItThrough === opt ? C.teal : "#5C3A50"}`,
                        background: madeItThrough === opt ? C.teal + "20" : "#1A1218",
                        cursor: "pointer", textAlign: "left",
                      }}>
                        <PixelText size={7} color={madeItThrough === opt ? C.teal : C.grayLt}>{opt}</PixelText>
                      </button>
                    ))}
                  </div>
                )}

                <PixelBtn onClick={() => setEngageSubStep(4)} disabled={fearedHappened === "No, they didn't happen at all" ? false : (!fearedHappened || !fearedSeverity || !madeItThrough)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  CONTINUE →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 4: Free text — what did you learn */}
            {engageSubStep === 4 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    Before we look at what the{"\n"}numbers tell us — in your own{"\n"}words, what did you learn{"\n"}from this battle?
                  </PixelText>
                </DialogBox>

                <textarea
                  value={engageFreeText}
                  onChange={e => setEngageFreeText(e.target.value)}
                  placeholder="What surprised you? What will you carry forward?..."
                  rows={3}
                  style={{
                    width: "100%", minHeight: 80, padding: 10, marginTop: 14,
                    background: "#1A1218", border: "2px solid #5C3A50",
                    borderRadius: 4, color: C.cream, fontSize: 12,
                    fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                    lineHeight: 1.6, boxSizing: "border-box",
                  }}
                />

                <PixelBtn onClick={() => setEngageSubStep(5)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  SEE WHAT THE SHADOW DID →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 5: SUDs comparison + debrief (moved from old debrief phase) */}
            {engageSubStep === 5 && (
              <div style={{ animation: "fadeIn 0.6s ease-out" }}>
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
                    {engageFreeText ? `"${engageFreeText}" — that's wisdom earned through action, not just thought.{"\n"}{"\n"}` : ""}
                    This is the D.A.R.E.R. cycle:{"\n"}Decide. Allow. Rise. Engage.{"\n"}Repeat. Every battle weakens{"\n"}the Shadow.{"\n"}{"\n"}
                    But there's one more step before{"\n"}we close — and it's the most{"\n"}important one.
                  </PixelText>
                </DialogBox>

                <PixelBtn onClick={() => setEngageSubStep(6)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
                  THE POWER OF REPEAT →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 6: REPEAT — psychoeducation + preview of follow-up options */}
            {engageSubStep === 6 && (
              <div style={{ animation: "fadeIn 0.6s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔁</div>
                <PixelText size={11} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>
                  THE POWER OF REPEAT
                </PixelText>

                {/* Psychoeducation block */}
                <div style={{
                  background: C.hpGreen + "10", border: `2px solid ${C.hpGreen}30`,
                  borderRadius: 6, padding: 16, marginBottom: 16, textAlign: "left",
                }}>
                  <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8, letterSpacing: 2 }}>WHY REPEAT?</PixelText>
                  <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    One exposure teaches your brain something. Repeat exposure rewires it.{"\n"}{"\n"}
                    Every time you repeat the same exposure, your nervous system learns a little deeper that the threat isn't real. The Shadow's whispers get quieter. The Storm gets smaller.{"\n"}{"\n"}
                    This is the heart of ERP therapy — not just facing fear once, but practicing it until it becomes normal. That's how you reclaim your life from the Shadow.
                  </PixelText>
                </div>

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    On your real journey, after every{"\n"}battle you'll get personalized{"\n"}suggestions for how to repeat —{"\n"}slightly harder if you crushed it,{"\n"}a bit gentler if the Storm was{"\n"}too strong today.{"\n"}{"\n"}
                    Here's a taste of what that{"\n"}might look like for you:
                  </PixelText>
                </DialogBox>

                {repeatOptions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>🔨 DARA IS FINDING OPTIONS...</PixelText>
                  </div>
                ) : (
                  <div style={{ opacity: 0.7, pointerEvents: "none" }}>
                    {repeatOptions.map((opt, i) => (
                      <div key={i} style={{
                        display: "block", width: "100%", marginBottom: 8, padding: "12px 14px",
                        borderRadius: 4, border: "2px solid #5C3A50",
                        background: "#1A1218", textAlign: "left",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>{opt.icon}</span>
                          <PixelText size={7} color={C.cream}>{opt.text}</PixelText>
                        </div>
                        {opt.tag === "creative" && (
                          <PixelText size={6} color={C.goldMd}>✨ OUTSIDE THE BOX</PixelText>
                        )}
                        {opt.tag === "step-up" && (
                          <PixelText size={6} color={C.bossRed}>⚡ STEP UP</PixelText>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <PixelBtn onClick={() => { if (setOBState) setOBState({ tutorialComplete: true }); onComplete(); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
                  GOT IT — ON TO THE PATH →
                </PixelBtn>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
    </div>
  );
}



