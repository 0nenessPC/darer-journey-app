import React, { useState, useEffect, useRef } from 'react';
import { useAIChat } from '../utils/chat';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, DialogBox } from '../components/shared';
import { useCloudVoice } from '../hooks/useCloudVoice';
import { useTypewriter } from '../hooks/useTypewriter';
import { VoiceInputBar, VoiceMessageBubble } from '../components/VoiceToggle';

const TTS_CHARS_PER_SEC = 12;

function BattleTypewriterBubble({ text, muted }) {
  const [showFull, setShowFull] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { revealed, isComplete, skipToEnd } = useTypewriter(
    text,
    true,
    TTS_CHARS_PER_SEC / 1000
  );

  // Start speech simultaneously with typewriter
  useEffect(() => {
    if (muted || !text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha')))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    return () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };
  }, [text, muted]);

  const handleSkip = useCallback(() => {
    skipToEnd();
    window.speechSynthesis.cancel();
    setShowFull(true);
    setIsSpeaking(false);
  }, [skipToEnd]);

  const displayText = showFull || isComplete ? text : revealed;
  const canSkip = !isComplete && !showFull;

  return (
    <div style={{
      maxWidth: "82%", padding: "10px 12px", borderRadius: 4,
      background: "#1A1218", border: "2px solid #5C3A50",
      cursor: canSkip ? "pointer" : "default",
    }}
    onClick={canSkip ? handleSkip : undefined}
    title={canSkip ? "Tap to reveal full text" : ""}
    >
      <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>
        {displayText}
        {canSkip && <span style={{ opacity: 0.3 }}>▌</span>}
      </PixelText>
    </div>
  );
}

export default function BossBattle({ boss, quest, hero, onVictory, onRetreat, setActiveBoss, setScreen, obState = {}, setOBState, shadowText = "", battleHistory = [] }) {
  const [phase, setPhase] = useState(obState.phase || "prep");
  const [prepStep, setPrepStep] = useState(obState.prepStep ?? 0);
  const [prepAnswers, setPrepAnswers] = useState(obState.prepAnswers || { value: "", allow: "", rise: "" });
  const [suds, setSuds] = useState(obState.suds || { before: 50, during: 60, after: 30 });
  const [outcome, setOutcome] = useState(obState.outcome || null);
  const [riseSubStep, setRiseSubStep] = useState(obState.riseSubStep ?? 0);
  const [exposureWhen, setExposureWhen] = useState(obState.exposureWhen || "");
  const [exposureWhere, setExposureWhere] = useState(obState.exposureWhere || "");
  const [exposureArmory, setExposureArmory] = useState(obState.exposureArmory || "");
  const [exposureScheduledTime, setExposureScheduledTime] = useState(obState.exposureScheduledTime || "");
  const [engageSubStep, setEngageSubStep] = useState(0);
  const [engageFreeText, setEngageFreeText] = useState("");
  const [fearedHappened, setFearedHappened] = useState("");
  const [fearedSeverity, setFearedSeverity] = useState("");
  const [madeItThrough, setMadeItThrough] = useState("");
  const [repeatOptions, setRepeatOptions] = useState([]);
  const [selectedRepeat, setSelectedRepeat] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [battleVoiceMode, setBattleVoiceMode] = useState(false);
  const [victoryVoiceMode, setVictoryVoiceMode] = useState(false);
  const chatRef = useRef(null);

  // Voice hook
  const voice = useCloudVoice({ useCloud: false });

  // Reset internal state when a new boss is selected (fixes stale state from batched React updates)
  const lastBossIdRef = useRef(null);
  useEffect(() => {
    if (boss?.id && boss.id !== lastBossIdRef.current) {
      lastBossIdRef.current = boss.id;
      setPhase("prep");
      setPrepStep(0);
      setPrepAnswers({ value: "", allow: "", rise: "" });
      setSuds({ before: 50, during: 60, after: 30 });
      setOutcome(null);
      setRiseSubStep(0);
      setExposureWhen("");
      setExposureWhere("");
      setExposureArmory("");
      setExposureScheduledTime("");
      setEngageSubStep(0);
      setEngageFreeText("");
      setFearedHappened("");
      setFearedSeverity("");
      setMadeItThrough("");
      setRepeatOptions([]);
      setSelectedRepeat("");
    }
  }, [boss?.id]);

  // Persist battle progress so resume-anywhere survives refresh/close
  useEffect(() => {
    if (!setOBState) return;
    setOBState({ phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, engageSubStep, engageFreeText, fearedHappened, fearedSeverity, madeItThrough });
  }, [phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, engageSubStep, engageFreeText, fearedHappened, fearedSeverity, madeItThrough, setOBState]);

  const heroContext = buildHeroContext(hero, quest, shadowText, battleHistory);
  const battleChat = useAIChat(SYS.battle, `${heroContext}\n\nBOSS: "${boss.name}" — ${boss.desc}. The hero is fighting this boss RIGHT NOW in real life. Reference their strengths, values, and past battles when relevant.`);
  const victoryChat = useAIChat(SYS.victory, `${heroContext}\n\nThe hero just completed a battle. Reference their actual strengths, values, and progress when celebrating.`);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; },
    [battleChat.messages, victoryChat.messages, battleChat.typing, victoryChat.typing]);

  const heroValue = hero.values?.[0]?.text || "building the social life I want";
  const heroStrength = hero.coreValues?.[0]?.word || "courage";

  // D.A.R.E.R. prep steps (VITAL framework underneath)
  const darerSteps = [
    { letter: "D", title: "DECIDE", subtitle: "Why this battle matters", color: C.goalGold, icon: "🏰",
      prompt: "Why are you choosing this battle? What value or goal drives you to face this?",
      hint: `Your sealed value: "${heroValue}"`,
      placeholder: "I'm choosing this battle because...",
      field: "value",
      prefill: heroValue,
    },
    { letter: "A", title: "ALLOW", subtitle: "Make space for the storm", color: C.hpGreen, icon: "🌊",
      prompt: "The Shadow will bring discomfort. Can you let it be there without fighting it?",
      hint: "You don't need to push the anxiety away. Let it ride alongside you — it will pass.",
      placeholder: "I will make space for discomfort by...",
      field: "allow",
    },
    { letter: "R", title: "RISE", subtitle: "Ground yourself and observe", color: C.teal, icon: "👁",
      prompt: "How will you stay present? And what might the Shadow throw at you?",
      hint: "Choose an anchor (breath, feet on floor, sounds). Then name the Shadow's tricks so they don't surprise you.",
      placeholder: "My anchor: ... The Shadow might whisper: ...",
      field: "rise",
    },
    { letter: "E", title: "ENGAGE", subtitle: "Step into the arena", color: C.bossRed, icon: "⚔️",
      prompt: "You've prepared. Your value is clear. Your anchor is set. The Shadow's tricks are named. Now — are you ready to step forward?",
      hint: "When you enter battle, you'll do the exposure in real life. Dara will be with you.",
      placeholder: "",
      field: "",
      isFinal: true,
    },
  ];

  const startBattle = () => {
    setPhase("battle");
    const prepSummary = `D.A.R.E.R. prep: Decide="${prepAnswers.value}" Allow="${prepAnswers.allow}" Rise="${prepAnswers.rise}"`;
    battleChat.init(`The hero is NOW facing "${boss.name}" (${boss.desc}) in real life. Their prep: ${prepSummary}. Send a brief battle cry referencing their value and grounding anchor. 1-2 sentences.`);
  };

  const finishBattle = () => {
    const dmg = outcome === "victory" ? 100 : outcome === "partial" ? 50 : 10;
    setPhase("result");
    victoryChat.init(
      `BOSS: "${boss.name}" — ${boss.desc}.\nOutcome: ${outcome}\nSUDS before: ${suds.before}, peak: ${suds.during}, after: ${suds.after}\nValue: "${prepAnswers.value}"\nDamage dealt: ${dmg}HP\nCelebrate, reference their value, and reflect on feared-vs-actual outcome. 2-3 sentences.`
    );
  };

  // Generate follow-up exposure variations based on outcome
  const generateRepeatOptions = async () => {
    try {
      const isComplete = outcome === "victory";
      const res = await callAI(
        `You are a clinical psychologist designing ERP (Exposure Response Prevention) follow-up exercises. The user just completed a boss battle exposure.

Current exposure: "${boss.name}" — ${boss.desc}
User's outcome: ${isComplete ? "They completed it fully." : outcome === "partial" ? "They went partway but didn't finish." : "They tried but couldn't push through."}
User's value: "${prepAnswers.value}"

Generate exactly 3 follow-up exposure variations in the same nature as the original but adjusted:
- If they COMPLETED it: make them slightly harder (longer duration, more people, more visible, etc.)
- If they DID NOT complete it: make them slightly easier or break into smaller steps
- One of the three should be an "outside the box" creative variation that is still therapeutic — something unexpected but clinically sound

Return ONLY a JSON array like: [{"text":"exposure description","icon":"emoji","tag":"normal|step-up|creative"}]
No other text.`,
        [{ role: "user", text: `Generate 3 follow-up exposures based on their outcome.` }]
      );
      const jsonMatch = res?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setRepeatOptions(parsed.slice(0, 3).map((o, i) => ({
            ...o, icon: o.icon || "⚡", tag: o.tag || (i === 2 ? "creative" : "normal"),
          })));
          return;
        }
      }
      throw new Error("Parse failed");
    } catch (e) {
      console.error("Repeat option generation failed:", e);
      setRepeatOptions([
        { text: `Do "${boss.desc}" again, but push yourself a bit further`, icon: "🔁", tag: "normal" },
        { text: `Try a bigger version — more people, longer, or more visible`, icon: "⚡", tag: "step-up" },
        { text: `Find a completely new way to challenge this same fear — be creative`, icon: "✨", tag: "creative" },
      ]);
    }
  };

  // Trigger repeat generation when user reaches the REPEAT step
  useEffect(() => {
    if (engageSubStep === 6 && repeatOptions.length === 0) {
      generateRepeatOptions();
    }
  }, [engageSubStep]);

  const handleSend = async (chat, textOverride) => {
    const t = (textOverride || chatInput).trim();
    if (!t) return;
    setChatInput("");
    await chat.sendMessage(t);
  };

  const activeChat = phase === "battle" ? battleChat : victoryChat;

  // Auto-speak AI replies when voice mode is on
  const spokenIndices = useRef({ battle: -1, victory: -1 });
  useEffect(() => {
    const phaseKey = phase === "result" ? "victory" : "battle";
    if (!battleVoiceMode) return;
    const msgs = activeChat.messages;
    if (msgs.length === 0) return;
    const lastIdx = msgs.length - 1;
    const last = msgs[lastIdx];
    if (last?.role === "assistant" && lastIdx > spokenIndices.current[phaseKey]) {
      spokenIndices.current[phaseKey] = lastIdx;
      window.speechSynthesis?.cancel();
      const utterance = new SpeechSynthesisUtterance(last.text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha')))
        || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    }
  }, [activeChat.messages, battleVoiceMode, phase]);

  // Cancel speech on unmount or phase change
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, [phase]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.mapBg }}>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      {/* Boss header */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", background: phase === "battle" ? C.bossRed + "15" : "#1A1218" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <PixelText size={7} color={phase === "battle" ? C.bossRed : C.goldMd}>
            {phase === "prep" ? "⚔ PREPARING FOR BATTLE" : phase === "battle" ? "🔥 BATTLE IN PROGRESS" : phase === "log" ? "📋 BATTLE LOG" : "🎉 BATTLE COMPLETE"}
          </PixelText>
          <PixelText size={7} color={C.grayLt}>LV.{boss.level || boss.difficulty}</PixelText>
        </div>
        <PixelText size={10} color={C.cream}>{boss.name}</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{boss.desc}</PixelText></div>
      </div>

      {/* === PREP PHASE: D.A.R.E.R. Framework === */}
      {phase === "prep" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 12px" }}>
          {/* D.A.R.E.R. progress bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {darerSteps.map((vs, i) => (
              <div key={i} style={{
                flex: 1, padding: "6px 4px", textAlign: "center", borderRadius: 4,
                background: i < prepStep ? vs.color + "20" : i === prepStep ? vs.color + "10" : "#1A1218",
                border: i === prepStep ? `2px solid ${vs.color}60` : "2px solid transparent",
              }}>
                <PixelText size={10} color={vs.color}>{vs.letter}</PixelText>
                <div><PixelText size={5} color={C.grayLt}>{vs.title}</PixelText></div>
              </div>
            ))}
          </div>

          {(() => {
            const vs = darerSteps[prepStep];

            // RISE step — 4-sub-step flow (when, where, schedule, armory, SUDs)
            if (vs.field === "rise") return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.grayLt}>{vs.subtitle}</PixelText>
                  </div>
                </div>

                {/* Sub-step 0: WHEN + WHERE combined */}
                {riseSubStep === 0 && (
                  <div>
                    <DialogBox speaker="DARA">
                      <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
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
                      disabled={!exposureWhen}
                      color={C.gold} textColor={C.charcoal}
                      style={{ width: "100%", marginTop: 16 }}
                    >
                      LOCK IT IN →
                    </PixelBtn>
                  </div>
                )}

                {/* Sub-step 1: CALENDAR REMINDER */}
                {riseSubStep === 1 && (
                  <div>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
                    <PixelText size={10} color={C.teal} style={{ display: "block", marginBottom: 16 }}>
                      SET A REMINDER
                    </PixelText>

                    <DialogBox speaker="DARA">
                      <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                        You're stepping into the arena{"\n"}{exposureWhen || "soon"}{exposureWhere ? ` at ${exposureWhere}` : ""}.{"\n"}{"\n"}
                        Setting a reminder on your phone{"\n"}right now will make you much{"\n"}more likely to follow through.{"\n"}{"\n"}
                        Tap the button to add this battle{"\n"}to your calendar — or skip if{"\n"}you've already set one.
                      </PixelText>
                    </DialogBox>

                    <button
                      onClick={() => {
                        const dt = exposureScheduledTime ? new Date(exposureScheduledTime) : new Date(Date.now() + 60 * 60 * 1000);
                        const title = encodeURIComponent(`DARER: ${boss.name}`);
                        const desc = encodeURIComponent(`Face the ${boss.name} exposure: ${boss.desc}. Location: ${exposureWhere || 'TBD'}. Your anchor: ${prepAnswers.value || 'courage'}.`);
                        const startStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const endStr = new Date(dt.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&dates=${startStr}/${endStr}`, '_blank');
                      }}
                      style={{
                        width: "100%", padding: "12px 14px", marginTop: 16,
                        background: C.teal, border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 8,
                      }}
                    >
                      <PixelText size={8} color={C.charcoal}>📱 ADD TO CALENDAR</PixelText>
                    </button>
                    <button
                      onClick={() => setRiseSubStep(2)}
                      style={{
                        width: "100%", padding: "10px 14px",
                        background: "transparent", border: `1px solid #5C3A50`,
                        borderRadius: 4, cursor: "pointer",
                      }}
                    >
                      <PixelText size={7} color={C.grayLt}>I already set a reminder</PixelText>
                    </button>

                    {/* Optional: pick a specific time for the calendar entry */}
                    <div style={{ marginTop: 16 }}>
                      <button
                        onClick={() => {
                          const el = document.getElementById("boss-rise-datetime-picker");
                          if (el) el.style.display = el.style.display === "none" ? "block" : "none";
                        }}
                        style={{
                          background: "none", border: "none", cursor: "pointer", display: "block", width: "100%",
                        }}
                      >
                        <PixelText size={6} color={C.plumMd}>📅 Pick a specific time for the reminder →</PixelText>
                      </button>
                      <input
                        id="boss-rise-datetime-picker"
                        type="datetime-local"
                        value={exposureScheduledTime}
                        onChange={e => setExposureScheduledTime(e.target.value)}
                        style={{
                          display: "none", width: "100%", padding: "10px 14px", marginTop: 8,
                          borderRadius: 4, border: "2px solid #5C3A50", background: "#1A1218",
                          color: C.cream, fontFamily: "inherit", fontSize: 13, outline: "none",
                          boxSizing: "border-box", colorScheme: "dark",
                        }}
                      />
                    </div>

                    <PixelBtn
                      onClick={() => setRiseSubStep(2)}
                      color={C.gold} textColor={C.charcoal}
                      style={{ width: "100%", marginTop: 12 }}
                    >
                      NEXT →
                    </PixelBtn>
                  </div>
                )}

                {/* Sub-step 2: ARMORY */}
                {riseSubStep === 2 && (
                  <div>
                    <DialogBox speaker="DARA">
                      <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                        You've locked in your time and{"\n"}battlefield.{"\n"}{"\n"}
                        Before you go — which tool{"\n"}from the Armory will you carry?{"\n"}Choose the one that steadies you.
                      </PixelText>
                    </DialogBox>
                    <div style={{ marginTop: 14 }}>
                      {[
                        { key: "breathing", icon: "🌬️", label: "Paced Breathing (4-2-6-2)" },
                        { key: "allowing", icon: "🛡️", label: "Allow the Storm (don't fight it)" },
                        { key: "grounding", icon: "⚓", label: "Grounding (5-4-3-2-1 senses)" },
                        { key: "values", icon: "💎", label: `Anchor to "${heroValue}"` },
                        { key: "none", icon: "🗡️", label: "I'll trust the strategy alone" },
                      ].map(tool => (
                        <button key={tool.key} onClick={() => { setExposureArmory(tool.label); setRiseSubStep(3); }} style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                          borderRadius: 4, border: `2px solid ${exposureArmory === tool.label ? C.teal : "#5C3A50"}`,
                          background: exposureArmory === tool.label ? C.teal + "20" : "#1A1218",
                          cursor: "pointer", textAlign: "left",
                        }}>
                          <span style={{ fontSize: 18 }}>{tool.icon}</span>
                          <PixelText size={7} color={exposureArmory === tool.label ? C.teal : C.grayLt}>{tool.label}</PixelText>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-step 3: SUDs before */}
                {riseSubStep === 3 && (
                  <div>
                    <DialogBox speaker="DARA">
                      <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                        You're armed and ready.{"\n"}{"\n"}
                        One last thing before you{"\n"}step through — how intense is{"\n"}the Storm right now? Rate it{"\n"}honestly. There's no wrong answer.
                      </PixelText>
                    </DialogBox>
                    <div style={{ margin: "12px 0" }}>
                      <PixelText size={7} color={C.grayLt}>STORM INTENSITY (before):</PixelText>
                      <input type="range" min="0" max="100" value={suds.before} onChange={e => setSuds(s => ({...s, before: +e.target.value}))}
                        style={{ width: "100%", accentColor: C.teal }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <PixelText size={6} color={C.grayLt}>Calm</PixelText>
                        <PixelText size={8} color={C.cream}>{suds.before}</PixelText>
                        <PixelText size={6} color={C.grayLt}>Intense</PixelText>
                      </div>
                    </div>
                    <PixelBtn onClick={() => setPrepStep(s => s + 1)} color={vs.color} textColor={C.charcoal} style={{ width: "100%" }}>
                      LET'S GO →
                    </PixelBtn>
                    {riseSubStep > 0 && (
                      <button onClick={() => setRiseSubStep(riseSubStep - 1)} style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", display: "block", width: "100%", textAlign: "center" }}>
                        <PixelText size={6} color={C.grayLt}>← Back</PixelText>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );

            // D, A steps — text input
            return (
              <div key={prepStep} style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.grayLt}>{vs.subtitle}</PixelText>
                  </div>
                </div>

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>{vs.prompt}</PixelText>
                  <div style={{ marginTop: 6 }}><PixelText size={7} color={C.grayLt}>{vs.hint}</PixelText></div>
                </DialogBox>

                {vs.prefill ? (
                  <textarea
                    value={prepAnswers[vs.field]}
                    onChange={e => setPrepAnswers(prev => ({ ...prev, [vs.field]: e.target.value }))}
                    placeholder={vs.placeholder}
                    rows={3}
                    style={{
                      width: "100%", padding: 12, marginTop: 10,
                      borderRadius: 4, border: "2px solid #5C3A50", background: "#1A1218",
                      color: C.cream, fontFamily: "inherit", fontSize: 14, outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <textarea
                    value={prepAnswers[vs.field]}
                    onChange={e => setPrepAnswers(prev => ({ ...prev, [vs.field]: e.target.value }))}
                    placeholder={vs.placeholder}
                    rows={3}
                    style={{
                      width: "100%", padding: 12, marginTop: 10,
                      borderRadius: 4, border: "2px solid #5C3A50", background: "#1A1218",
                      color: C.cream, fontFamily: "inherit", fontSize: 14, outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                )}

                <PixelBtn
                  onClick={() => {
                    if (prepAnswers[vs.field]?.trim() || vs.isFinal) {
                      if (vs.isFinal) { startBattle(); }
                      else { setPrepStep(s => s + 1); }
                    }
                  }}
                  color={vs.color} textColor={C.charcoal}
                  style={{ width: "100%", marginTop: 10 }}
                  disabled={!vs.isFinal && !prepAnswers[vs.field]?.trim()}
                >
                  {vs.isFinal ? "⚔ ENGAGE" : "NEXT →"}
                </PixelBtn>
              </div>
            );
          })()}
        </div>
      )}

      {/* === BATTLE PHASE: Real-time exposure chat === */}
      {phase === "battle" && (
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {battleChat.messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
              {m.role === "assistant" ? (
                <BattleTypewriterBubble text={m.text} muted={!battleVoiceMode} />
              ) : (
                <VoiceMessageBubble isFromVoice={m.fromVoice} style={{
                  maxWidth: "82%", padding: "10px 12px", borderRadius: 4,
                  background: C.plum, border: "2px solid #5C3A50",
                }}>
                  <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>{m.text}</PixelText>
                </VoiceMessageBubble>
              )}
            </div>
          ))}
          {battleChat.typing && <DialogBox speaker="DARA" typing />}
        </div>
      )}

      {/* === E — ENGAGE (post-battle debrief flow) === */}
      {phase === "result" && (
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "20px 20px 32px" }}>

          {/* Sub-step 0: Outcome selection */}
          {engageSubStep === 0 && (
            <div style={{ animation: "fadeIn 0.4s ease-out" }}>
              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                  You stepped into the arena.{"\n"}Whatever happened — you showed{"\n"}up. That matters.{"\n"}{"\n"}
                  How did it go?
                </PixelText>
              </DialogBox>

              <div style={{ marginTop: 14 }}>
                {[
                  { id: "victory", label: "⚔ BOSS DEFEATED — I did it!", desc: "I stayed all the way through" },
                  { id: "partial", label: "🩹 PARTIAL VICTORY — I went partway", desc: "I didn't finish, but I stayed longer than I usually would" },
                  { id: "retreat", label: "🛡 STRATEGIC RETREAT — Not this time", desc: "The Storm was too strong, but I'm not giving up" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setOutcome(opt.id)} style={{
                    display: "block", width: "100%", marginBottom: 8, padding: "14px 12px",
                    borderRadius: 4, border: `2px solid ${outcome === opt.id ? C.goldMd : "#5C3A50"}`,
                    background: outcome === opt.id ? C.goldMd + "12" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <PixelText size={7} color={outcome === opt.id ? C.goldMd : C.cream} style={{ display: "block", lineHeight: 1.5 }}>
                      {opt.label}
                    </PixelText>
                  </button>
                ))}
              </div>

              <PixelBtn onClick={() => setEngageSubStep(1)} disabled={!outcome} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 1: SUDs after */}
          {engageSubStep === 1 && (
            <div style={{ animation: "fadeIn 0.4s ease-out" }}>
              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                  How intense is the Storm{"\n"}right now? Rate it honestly.
                </PixelText>
              </DialogBox>

              <div style={{ marginTop: 12 }}>
                <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (after)</PixelText>
                <input type="range" min="0" max="100" value={suds.after} onChange={e => setSuds(s => ({...s, after: +e.target.value}))}
                  style={{ width: "100%", accentColor: C.hpGreen }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <PixelText size={6} color={C.grayLt}>Calm</PixelText>
                  <PixelText size={8} color={C.cream}>{suds.after}</PixelText>
                  <PixelText size={6} color={C.grayLt}>Intense</PixelText>
                </div>
              </div>

              <PixelBtn onClick={() => setEngageSubStep(2)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 2: Reflection questions */}
          {engageSubStep === 2 && (
            <div style={{ animation: "fadeIn 0.4s ease-out" }}>
              <PixelText size={10} color={C.goldMd} style={{ display: "block", textAlign: "center", marginBottom: 16 }}>
                REFLECT ON THE BATTLE
              </PixelText>

              {/* Q1 */}
              <div style={{ marginBottom: 16 }}>
                <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
                  1. Did the consequences you feared actually happen?
                </PixelText>
                {["No, they didn't happen at all", "Some did, but not like I expected", "Yes, they did happen"].map(opt => (
                  <button key={opt} onClick={() => setFearedHappened(opt)} style={{
                    display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${fearedHappened === opt ? C.teal : "#5C3A50"}`,
                    background: fearedHappened === opt ? C.teal + "20" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <PixelText size={7} color={fearedHappened === opt ? C.teal : C.grayLt}>{opt}</PixelText>
                  </button>
                ))}
              </div>

              {/* Q2 */}
              {fearedHappened && (
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

              {/* Q3 */}
              {fearedSeverity && (
                <div style={{ marginBottom: 16, animation: "fadeIn 0.3s ease-out" }}>
                  <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
                    3. Even though it was difficult — did you get through it?
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

              <PixelBtn onClick={() => setEngageSubStep(3)} disabled={!fearedHappened || !fearedSeverity || !madeItThrough} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 3: Free text — what did you learn */}
          {engageSubStep === 3 && (
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

              <PixelBtn onClick={() => setEngageSubStep(4)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                SEE WHAT THE SHADOW DID →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 4: SUDs comparison + victory chat */}
          {engageSubStep === 4 && (
            <div style={{ animation: "fadeIn 0.6s ease-out" }}>
              {/* SUDs comparison */}
              <div style={{ background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, padding: 14, marginBottom: 12 }}>
                <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>THE SHADOW LIED</PixelText>
                <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                  <div>
                    <PixelText size={7} color={C.grayLt}>BEFORE</PixelText>
                    <div style={{ fontSize: 28, margin: "4px 0" }}>
                      <PixelText size={20} color={C.bossRed}>{suds.before}</PixelText>
                    </div>
                    <PixelText size={6} color={C.bossRed}>FEARED</PixelText>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <PixelText size={16} color={C.goldMd}>→</PixelText>
                  </div>
                  <div>
                    <PixelText size={7} color={C.grayLt}>AFTER</PixelText>
                    <div style={{ fontSize: 28, margin: "4px 0" }}>
                      <PixelText size={20} color={C.hpGreen}>{suds.after}</PixelText>
                    </div>
                    <PixelText size={6} color={C.hpGreen}>ACTUAL</PixelText>
                  </div>
                </div>
                {suds.before > suds.after && (
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <PixelText size={7} color={C.hpGreen}>
                      The Storm dropped {suds.before - suds.after} points. That's damage dealt to the Shadow.
                    </PixelText>
                  </div>
                )}
              </div>

              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                  {heroName}, do you see what{"\n"}happened?{"\n"}{"\n"}
                  The Shadow told you it would be{"\n"}unbearable. {suds.before > suds.after ? "But the actual experience was less intense than the fear predicted." : "And you survived it."}{"\n"}{"\n"}
                  {engageFreeText ? `"${engageFreeText}" — that's wisdom earned through action, not just thought.{"\n"}{"\n"}` : ""}
                  This is the D.A.R.E.R. cycle:{"\n"}Decide. Allow. Rise. Engage.{"\n"}Repeat. Every battle weakens{"\n"}the Shadow.{"\n"}{"\n"}
                  But there's one more step before{"\n"}we close — and it's the most{"\n"}important one.
                </PixelText>
              </DialogBox>

              <PixelBtn onClick={() => setEngageSubStep(5)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
                THE POWER OF REPEAT →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 5: Functional REPEAT — AI-generated follow-up options */}
          {engageSubStep === 5 && (
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
                  {outcome === "victory" ? (
                    <>You crushed it. Now let's build on{"\n"}that momentum. Here are some{"\n"}ways to repeat this battle —{"\n"}some a little harder, one{"\n"}that's outside the box.</>
                  ) : outcome === "partial" ? (
                    <>You went partway — that counts.{"\n"}{"\n"}Let me suggest some ways to{"\n"}repeat that might feel a bit{"\n"}more within reach next time.</>
                  ) : (
                    <>The Storm was too strong this{"\n"}time — and that's data, not{"\n"}failure.{"\n"}{"\n"}Let me suggest some gentler{"\n"}variations that might feel{"\n"}more doable. You've still got this.</>
                  )}
                </PixelText>
              </DialogBox>

              {repeatOptions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>🔨 DARA IS FINDING OPTIONS...</PixelText>
                </div>
              ) : (
                <>
                  {repeatOptions.map((opt, i) => (
                    <button key={i} onClick={() => setSelectedRepeat(opt.text)} style={{
                      display: "block", width: "100%", marginBottom: 8, padding: "12px 14px",
                      borderRadius: 4, border: `2px solid ${selectedRepeat === opt.text ? C.hpGreen : "#5C3A50"}`,
                      background: selectedRepeat === opt.text ? C.hpGreen + "12" : "#1A1218",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 20 }}>{opt.icon}</span>
                        <PixelText size={7} color={selectedRepeat === opt.text ? C.hpGreen : C.cream}>
                          {opt.text}
                        </PixelText>
                      </div>
                      {opt.tag === "creative" && (
                        <PixelText size={6} color={C.goldMd}>✨ OUTSIDE THE BOX</PixelText>
                      )}
                      {opt.tag === "step-up" && (
                        <PixelText size={6} color={C.bossRed}>⚡ STEP UP</PixelText>
                      )}
                    </button>
                  ))}
                </>
              )}

              <button
                onClick={() => { setSelectedRepeat(""); setRepeatOptions([]); generateRepeatOptions(); }}
                style={{
                  width: "100%", padding: "10px 14px", marginTop: 4, marginBottom: 16,
                  background: "transparent", border: "1px dashed #5C3A50",
                  borderRadius: 4, cursor: "pointer",
                }}
              >
                <PixelText size={7} color={C.plumMd}>🎲 I FEEL LUCKY — show me something different</PixelText>
              </button>

              <PixelBtn onClick={() => onVictory(outcome, { prepAnswers, suds, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, battleMessages: battleChat.messages, victoryMessages: victoryChat.messages, repeatChoice: selectedRepeat })} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
                I'M READY TO REPEAT → MISSION COMPLETE
              </PixelBtn>
            </div>
          )}
        </div>
      )}

      {/* === CONTROLS (battle phase only) === */}
      {phase === "battle" && (
        <div style={{ padding: "12px 12px 64px", borderTop: "2px solid #5C3A50" }}>
          {/* AI error notification */}
          {battleChat.error && (
            <div style={{ marginBottom: 8, padding: 8, background: C.bossRed + "20", border: `1px solid ${C.bossRed}`, borderRadius: 4 }}>
              <PixelText size={7} color={C.bossRed}>{battleChat.error}</PixelText>
              <button onClick={() => battleChat.reset()} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", marginLeft: 8, textDecoration: "underline" }}>
                <PixelText size={7} color={C.teal}>Retry</PixelText>
              </button>
            </div>
          )}

          {/* Voice mode toggle */}
          {voice.supported && (
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setBattleVoiceMode(v => !v)}
                style={{
                  padding: "4px 10px",
                  background: battleVoiceMode ? C.plum + "40" : "transparent",
                  border: `1px solid ${battleVoiceMode ? C.plumLt : C.gray + "60"}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  color: battleVoiceMode ? C.plumLt : C.grayLt,
                  fontSize: 9,
                  fontFamily: PIXEL_FONT,
                }}
              >
                {battleVoiceMode ? "🎤 Voice ON" : "🎤 Voice OFF"}
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {[
              `Remember: ${prepAnswers.rise?.split(".")[0] || "breathe"}`,
              "I'm doing it!",
              "The Shadow is lying",
              "I'm allowing the discomfort",
            ].map(q => (
              <button key={q} onClick={async () => { await battleChat.sendMessage(q); }}
                disabled={battleChat.typing} style={{
                  flex: "1 1 45%", padding: 8, borderRadius: 3, border: "2px solid #5C3A50",
                  background: "#1A1218", cursor: battleChat.typing ? "default" : "pointer",
                  opacity: battleChat.typing ? 0.5 : 1,
                }}><PixelText size={7} color={C.cream}>{q}</PixelText></button>
            ))}
          </div>
          {/* Free text input during battle */}
          {battleVoiceMode && voice.supported ? (
            <VoiceInputBar
              input={chatInput}
              onInputChange={setChatInput}
              onSend={(t) => handleSend(battleChat, t)}
              typing={battleChat.typing}
              disabled={false}
              voice={voice}
              placeholder="Say anything to Dara or tap 🎤..."
            />
          ) : (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && chatInput.trim()) { handleSend(battleChat); setChatInput(""); } }}
                placeholder="Say anything to Dara..." disabled={battleChat.typing}
                style={{ flex: 1, padding: 8, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 12, outline: "none" }} />
              <PixelBtn onClick={() => { if (chatInput.trim()) { handleSend(battleChat); setChatInput(""); } }} disabled={battleChat.typing || !chatInput.trim()}>→</PixelBtn>
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <PixelBtn onClick={() => setPhase("result")} color={C.gold} textColor={C.charcoal} style={{ flex: 1 }}>
              BATTLE COMPLETE →
            </PixelBtn>
            <PixelBtn onClick={onRetreat} color={C.plum} textColor={C.cream} style={{ flex: 1 }}>
              🛡 RETREAT
            </PixelBtn>
          </div>
        </div>
      )}
      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218", zIndex: 20,
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: onRetreat },
          { icon: "⚗", label: "ARMORY", active: false, onClick: () => { setActiveBoss(null); setScreen("armory"); } },
          { icon: "🏆", label: "LADDER", active: false, onClick: () => { setActiveBoss(null); setScreen("ladder"); } },
          { icon: "🛡", label: "HERO", active: false, onClick: () => { setActiveBoss(null); setScreen("profile"); } },
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
