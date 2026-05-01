import React, { useState, useEffect, useRef } from 'react';
import { useAIChat } from '../utils/chat';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, DialogBox } from '../components/shared';
import { useCloudVoice } from '../hooks/useCloudVoice';
import { VoiceInputBar, VoiceMessageBubble } from '../components/VoiceToggle';
import PracticeSession from '../components/PracticeSession';

function BattleTypewriterBubble({ text, muted }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Start speech simultaneously with text render
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

  return (
    <div style={{
      maxWidth: "82%", padding: "10px 12px", borderRadius: 4,
      background: "#1A1218", border: "2px solid #5C3A50",
    }}>
      <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>
        {text}
      </PixelText>
    </div>
  );
}

export default function BossBattle({ boss, quest, hero, onVictory, onRetreat, setActiveBoss, setScreen, onBank, obState = {}, setOBState, shadowText = "", battleHistory = [] }) {
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
  const [selectedArmoryTool, setSelectedArmoryTool] = useState(null); // tool object for practice prompt
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

  // Allow step detailed fields
  const [allowFearful, setAllowFearful] = useState(obState.allowFearful || "");
  const [allowLikelihood, setAllowLikelihood] = useState(obState.allowLikelihood ?? null);
  const [allowSeverity, setAllowSeverity] = useState(obState.allowSeverity ?? null);
  const [allowCanHandle, setAllowCanHandle] = useState(obState.allowCanHandle || "");
  const [allowFearShowing, setAllowFearShowing] = useState(obState.allowFearShowing || "");
  const [allowPhysicalSensations, setAllowPhysicalSensations] = useState(obState.allowPhysicalSensations || []);
  const [allowCustomSensation, setAllowCustomSensation] = useState(obState.allowCustomSensation || "");

  // Decide custom input (separate from value picks)
  const [decideCustom, setDecideCustom] = useState("");
  // Track selected values separately for toggle highlighting
  const [decideSelectedVals, setDecideSelectedVals] = useState([]);

  // Track the furthest D.A.R.E.R. step the user has reached (so they can go back but not skip ahead)
  const [maxPrepReached, setMaxPrepReached] = useState(0);
  const advancePrepStep = (to) => {
    const next = typeof to === "function" ? to(prepStep) : to;
    setPrepStep(to);
    if (next > maxPrepReached) setMaxPrepReached(next);
  };

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
      setMaxPrepReached(0);
      setAllowFearful("");
      setAllowLikelihood(null);
      setAllowSeverity(null);
      setAllowCanHandle("");
      setAllowFearShowing("");
      setAllowPhysicalSensations([]);
      setAllowCustomSensation("");
      setDecideCustom("");
      setDecideSelectedVals([]);
    }
  }, [boss?.id]);

  // Persist battle progress so resume-anywhere survives refresh/close
  useEffect(() => {
    if (!setOBState) return;
    setOBState({ phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, engageSubStep, engageFreeText, fearedHappened, fearedSeverity, madeItThrough, allowFearful, allowLikelihood, allowSeverity, allowCanHandle, allowFearShowing, allowPhysicalSensations, allowCustomSensation });
  }, [phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, engageSubStep, engageFreeText, fearedHappened, fearedSeverity, madeItThrough, allowFearful, allowLikelihood, allowSeverity, allowCanHandle, allowFearShowing, allowPhysicalSensations, allowCustomSensation, setOBState]);

  const heroContext = buildHeroContext(hero, quest, shadowText, battleHistory);
  const battleChat = useAIChat(SYS.battle, `${heroContext}\n\nBOSS: "${boss.name}" — ${boss.desc}. The hero is fighting this boss RIGHT NOW in real life. Reference their strengths, values, and past battles when relevant.`);
  const victoryChat = useAIChat(SYS.victory, `${heroContext}\n\nThe hero just completed a battle. Reference their actual strengths, values, and progress when celebrating.`);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; },
    [battleChat.messages, victoryChat.messages, battleChat.typing, victoryChat.typing]);

  const heroStrength = hero.coreValues?.[0]?.word || hero.values?.[0]?.text || "courage";

  // D.A.R.E.R. prep steps (VITAL framework underneath)
  const darerSteps = [
    { letter: "D", title: "DECIDE", subtitle: "Why this battle matters", color: C.goalGold, icon: "🏰" },
    { letter: "A", title: "ALLOW", subtitle: "Make space for the storm", color: C.hpGreen, icon: "🌊" },
    { letter: "R", title: "RISE", subtitle: "Ground yourself and observe", color: C.teal, icon: "👁" },
    { letter: "E", title: "ENGAGE", subtitle: "Step into the arena", color: C.bossRed, icon: "⚔️" },
    { letter: "R", title: "REPEAT", subtitle: "Rewire through repetition", color: C.hpGreen, icon: "🔁" },
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
    if (phase === "repeat" && repeatOptions.length === 0) {
      generateRepeatOptions();
    }
  }, [phase]);

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
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", background: phase === "battle" ? C.bossRed + "15" : phase === "repeat" ? C.hpGreen + "10" : "#1A1218" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <PixelText size={7} color={phase === "battle" ? C.bossRed : phase === "repeat" ? C.hpGreen : C.goldMd}>
            {phase === "prep" ? "⚔ PREPARING FOR BATTLE" : phase === "battle" ? "🔥 BATTLE IN PROGRESS" : phase === "log" ? "📋 BATTLE LOG" : phase === "repeat" ? "🔁 REPEAT THE EXPOSURE" : "🎉 BATTLE COMPLETE"}
          </PixelText>
          <PixelText size={7} color={C.grayLt}>LV.{boss.level || boss.difficulty}</PixelText>
        </div>
        <PixelText size={10} color={C.cream}>{boss.name}</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{boss.desc}</PixelText></div>
      </div>

      {/* D.A.R.E.R. progress bar — always visible, clickable to navigate */}
      <div style={{ padding: "8px 16px 0", background: "#1A1218" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(() => {
            const currentStepIndex = phase === "repeat" ? 4 : phase === "result" ? 4 : phase === "battle" ? 3 : prepStep;
            return darerSteps.map((vs, i) => {
              const canClick = i <= maxPrepReached;
              const isCurrent = i === currentStepIndex;
              return (
                <button key={i}
                  onClick={() => {
                    if (!canClick) return;
                    if (i <= 3) { setPhase("prep"); setPrepStep(i); }
                    else if (i === 3 && phase !== "battle") { setPhase("battle"); }
                    else if (i === 4) { setPhase(phase === "result" ? "result" : "repeat"); }
                  }}
                  style={{
                    flex: 1, padding: "6px 4px", textAlign: "center", borderRadius: 4, cursor: canClick ? "pointer" : "default",
                    background: i < currentStepIndex ? vs.color + "20" : isCurrent ? vs.color + "10" : "#1A1218",
                    border: isCurrent ? `2px solid ${vs.color}60` : "2px solid transparent",
                    opacity: canClick ? 1 : 0.4,
                  }}>
                  <PixelText size={10} color={vs.color}>{vs.letter}</PixelText>
                  <div><PixelText size={5} color={C.grayLt}>{vs.title}</PixelText></div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* === PREP PHASE: D.A.R.E.R. Framework === */}
      {phase === "prep" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 12px" }}>
          {(() => {
            const vs = darerSteps[prepStep];

            // DECIDE step — value cards + custom input (same as TutorialBattle)
            if (prepStep === 0) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.grayLt}>{vs.subtitle}</PixelText>
                  </div>
                </div>

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    Your battle: "{boss.name}"{"\n"}{"\n"}
                    Why are you choosing to{"\n"}face this fear? Pick your "why" —{"\n"}it's your anchor when the{"\n"}Shadow strikes.
                  </PixelText>
                </DialogBox>

                {/* Value pick buttons — multi-select */}
                <div style={{ marginTop: 14 }}>
                  {(() => {
                    const pickValues = (hero.values && hero.values.length)
                      ? hero.values
                      : (hero.coreValues && hero.coreValues.length)
                        ? hero.coreValues
                        : [];
                    return pickValues.slice(0, 5).map(v => {
                      const valText = v.text || v.word || "";
                      const valIcon = v.icon || "💫";
                      const picked = decideSelectedVals.includes(valText);
                      return (
                        <button key={v.id} onClick={() => {
                          setDecideSelectedVals(prev =>
                            picked ? prev.filter(x => x !== valText) : [...prev, valText]
                          );
                        }} style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 6, padding: "10px 14px",
                          borderRadius: 4, border: `2px solid ${picked ? C.goalGold : "#5C3A50"}`,
                          background: picked ? C.goalGold + "15" : "#1A1218",
                          cursor: "pointer", textAlign: "left",
                        }}>
                          <span style={{ fontSize: 18 }}>{valIcon}</span>
                          <PixelText size={7} color={picked ? C.goalGold : C.grayLt}>{valText}</PixelText>
                        </button>
                      );
                    });
                  })()}
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
                    setPrepAnswers(pa => ({ ...pa, value: whyParts.join("; ") }));
                    advancePrepStep(s => s + 1);
                  }}
                  disabled={decideSelectedVals.length === 0 && !decideCustom.trim()}
                  color={C.gold} textColor={C.charcoal}
                  style={{ width: "100%", marginTop: 16 }}
                >
                  I DECIDE → NEXT: ALLOW
                </PixelBtn>
              </div>
            );

            // RISE step — 4-sub-step flow (when, where, schedule, armory, SUDs)
            if (prepStep === 2) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.grayLt}>{vs.subtitle}</PixelText>
                  </div>
                </div>

                {/* Sub-step 0: WHEN + TIME + WHERE */}
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
                            const title = encodeURIComponent(`DARER: ${boss.name}`);
                            const desc = encodeURIComponent(`Face the ${boss.name} exposure: ${boss.desc}. Location: ${exposureWhere || 'TBD'}. Your anchor: ${prepAnswers.value || 'courage'}.`);
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
                      disabled={!exposureWhen}
                      color={C.gold} textColor={C.charcoal}
                      style={{ width: "100%", marginTop: 16 }}
                    >
                      LOCK IT IN →
                    </PixelBtn>
                  </div>
                )}

                {/* Sub-step 1: ARMORY */}
                {riseSubStep === 1 && (
                  <div>
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
                  <div>
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
                  <div>
                    <PracticeSession
                      tool={selectedArmoryTool}
                      onComplete={() => setRiseSubStep(3)}
                      onQuit={() => setRiseSubStep(3)}
                    />
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
                      <PixelText size={6} color={C.grayLt} style={{ display: "block", marginBottom: 6, fontStyle: "italic" }}>How much distress do you feel right now?</PixelText>
                      {(() => {
                        const pct = suds.before;
                        const color = pct <= 33 ? C.hpGreen : pct <= 66 ? C.amber : C.bossRed;
                        return (
                        <div>
                          <input type="range" min="0" max="100" value={pct} onChange={e => setSuds(s => ({...s, before: +e.target.value}))}
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
                    <PixelBtn onClick={() => advancePrepStep(s => s + 1)} color={vs.color} textColor={C.charcoal} style={{ width: "100%" }}>
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

            // ALLOW step — Storm interrogation (detailed)
            if (prepStep === 1) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.grayLt}>{vs.subtitle}</PixelText>
                  </div>
                </div>

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
                    // Save allow summary into prepAnswers.allow for AI context
                    setPrepAnswers(pa => ({
                      ...pa, allow: `Thoughts: "${allowFearful}" Likelihood: ${allowLikelihood}% Severity: ${allowSeverity}/10 Can handle: "${allowCanHandle}" Fear showing: "${allowFearShowing}" Body: [${allowPhysicalSensations.join(", ")}]${allowCustomSensation ? " — " + allowCustomSensation : ""}`,
                    }));
                    advancePrepStep(s => s + 1);
                  }}
                  disabled={!allowFearful.trim() || allowLikelihood === null || allowSeverity === null || !allowCanHandle || !allowFearShowing || allowPhysicalSensations.length === 0}
                  color={C.gold} textColor={C.charcoal}
                  style={{ width: "100%", marginTop: 16 }}
                >
                  I'M ALLOWING IT → NEXT: RISE
                </PixelBtn>
              </div>
            );

            // ENGAGE step — choose: go now or talk to Dara
            if (prepStep === 3) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.grayLt}>{vs.subtitle}</PixelText>
                  </div>
                </div>

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You've prepared. Your value{"\n"}is clear. Your anchor is set.{"\n"}The Shadow's tricks are named.{"\n"}{"\n"}Now — are you ready to{"\n"}step forward?
                  </PixelText>
                </DialogBox>

                <PixelBtn
                  onClick={() => {
                    setPhase("result");
                    setEngageSubStep(0);
                  }}
                  color={C.bossRed} textColor={C.cream}
                  style={{ width: "100%", marginTop: 16 }}
                >
                  ⚔ ENGAGE RIGHT AWAY
                </PixelBtn>
                <PixelBtn
                  onClick={() => {
                    setPhase("battle");
                    const prepSummary = `D.A.R.E.R. prep: Decide="${prepAnswers.value}" Allow="${prepAnswers.allow}" Rise="${prepAnswers.rise}"`;
                    battleChat.init(`The hero is NOW facing "${boss.name}" (${boss.desc}) in real life. Their prep: ${prepSummary}. They want to talk before engaging. Ask them how they're feeling right now, what's on their mind, what they need before stepping forward. Be warm and personal. 1-2 sentences.`);
                  }}
                  color={C.teal} textColor={C.cream}
                  style={{ width: "100%", marginTop: 8 }}
                >
                  💬 TALK TO DARA FIRST
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
                <PixelText size={6} color={C.grayLt} style={{ display: "block", marginBottom: 6, fontStyle: "italic" }}>How much distress do you feel right now?</PixelText>
                {(() => {
                  const pct = suds.after;
                  const color = pct <= 33 ? C.hpGreen : pct <= 66 ? C.amber : C.bossRed;
                  return (
                  <div>
                    <input type="range" min="0" max="100" value={pct} onChange={e => setSuds(s => ({...s, after: +e.target.value}))}
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

              {/* Q2 */}
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

              {/* Q3 */}
              {fearedSeverity && fearedHappened !== "No, they didn't happen at all" && (
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

              <PixelBtn onClick={() => setEngageSubStep(3)} disabled={fearedHappened === "No, they didn't happen at all" ? false : (!fearedHappened || !fearedSeverity || !madeItThrough)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
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

              <PixelBtn onClick={() => setPhase("repeat")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
                THE POWER OF REPEAT →
              </PixelBtn>
            </div>
          )}
        </div>
      )}

      {/* === REPEAT PHASE: AI-generated follow-up exposure options === */}
      {phase === "repeat" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px 80px" }}>
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
          <PixelBtn onClick={() => { setPhase("result"); setEngageSubStep(0); }} color={C.bossRed} textColor={C.cream} style={{ width: "100%", marginTop: 8 }}>
            ⚔ I'M READY TO ENGAGE
          </PixelBtn>
        </div>
      )}
      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218", zIndex: 20,
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: onRetreat },
          { icon: "📚", label: "BANK", active: false, onClick: onBank },
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
