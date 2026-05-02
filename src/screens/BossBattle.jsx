import React, { useState, useEffect, useRef } from 'react';
import { useAIChat } from '../utils/chat';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, DialogBox, TypingDots } from '../components/shared';
import BottomNav from '../components/BottomNav';
import AllowFields from '../components/DARER/AllowFields';
import SUDSSlider from '../components/DARER/SUDSSlider';
import SUDSComparison from '../components/DARER/SUDSComparison';
import ReflectionQuestions from '../components/DARER/ReflectionQuestions';
import DebriefFreeText from '../components/DARER/DebriefFreeText';
import RisePhase from '../components/DARER/RisePhase';
import { useCloudVoice } from '../hooks/useCloudVoice';
import { VoiceInputBar, VoiceMessageBubble } from '../components/VoiceToggle';

function BattleTypewriterBubble({ text, muted, voice }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Start speech simultaneously with text render
  useEffect(() => {
    if (muted || !text || !voice?.speak) return;
    voice.speak(text, { speed: 0.9 });
  }, [text, muted, voice]);

  // Track speaking state from hook
  useEffect(() => {
    if (!voice?.isSpeaking) return;
    if (voice.isSpeaking) setIsSpeaking(true);
    else setIsSpeaking(false);
  }, [voice?.isSpeaking]);

  return (
    <div style={{
      maxWidth: "82%", padding: "10px 12px", borderRadius: 4,
      background: C.cardBg,
      border: `2px solid ${isSpeaking ? C.teal : C.mutedBorder}`,
      boxShadow: isSpeaking ? `0 0 8px ${C.teal}40` : "none",
    }}>
      <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>
        {text}
      </PixelText>
      {isSpeaking && (
        <PixelText size={6} color={C.teal} style={{ display: "block", marginTop: 4, opacity: 0.8 }}>
          🔊 speaking
        </PixelText>
      )}
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
  const [battleVoiceMode, setBattleVoiceMode] = useState(true);
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

  // Engagement loot: proof of completion
  const [showOutcome, setShowOutcome] = useState(false);
  const [lootText, setLootText] = useState("");
  const [lootImage, setLootImage] = useState(null);

  // Track the furthest D.A.R.E.R. step the user has reached (so they can go back but not skip ahead)
  const [maxPrepReached, setMaxPrepReached] = useState(0);
  const advancePrepStep = (to) => {
    const next = typeof to === "function" ? to(prepStep) : to;
    setPrepStep(to);
    if (next > maxPrepReached) setMaxPrepReached(next);
  };

  // Voice hook
  const voice = useCloudVoice({ useCloud: false });

  // Auto-speak Dara's encouragement when Decide section appears (motivational interviewing: express empathy, build self-efficacy)
  const decideSpoken = useRef(false);
  useEffect(() => {
    if (phase === "prep" && prepStep === 0 && !decideSpoken.current) {
      decideSpoken.current = true;
      voice.speak(`${hero.name}, this battle is yours to face. The fear is real, but so is your strength. What matters to you most about facing this? That "why" — that's your anchor.`, { speed: 0.9 });
    }
  }, [phase, prepStep]); // eslint-disable-line react-hooks/exhaustive-deps

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
      decideSpoken.current = false;
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
      voice.speak(last.text, { speed: 0.9 });
    }
  }, [activeChat.messages, battleVoiceMode, phase]);

  // Cancel speech on unmount or phase change
  useEffect(() => {
    return () => { voice.cancelSpeech(); };
  }, [phase]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.mapBg }}>
            {/* Boss header */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid ${C.mutedBorder}", background: phase === "battle" ? C.bossRed + "15" : phase === "repeat" ? C.hpGreen + "10" : C.cardBg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <PixelText size={7} color={phase === "battle" ? C.bossRed : phase === "repeat" ? C.hpGreen : C.goldMd}>
            {phase === "prep" ? "⚔ PREPARING FOR BATTLE" : phase === "battle" ? "🔥 BATTLE IN PROGRESS" : phase === "log" ? "📋 BATTLE LOG" : phase === "repeat" ? "🔁 REPEAT THE EXPOSURE" : "🎉 BATTLE COMPLETE"}
          </PixelText>
          <PixelText size={7} color={C.subtleText}>LV.{boss.level || boss.difficulty}</PixelText>
        </div>
        <PixelText size={10} color={C.cream}>{boss.name}</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={7} color={C.subtleText}>{boss.desc}</PixelText></div>
      </div>

      {/* D.A.R.E.R. progress bar — always visible, clickable to navigate */}
      <div role="navigation" aria-label="DARER phase navigation" style={{ padding: "8px 16px 0", background: C.cardBg }}>
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
                  aria-current={isCurrent ? "step" : undefined}
                  style={{
                    flex: 1, padding: "6px 4px", textAlign: "center", borderRadius: 4, cursor: canClick ? "pointer" : "default",
                    background: i < currentStepIndex ? vs.color + "20" : isCurrent ? vs.color + "10" : C.cardBg,
                    border: isCurrent ? `2px solid ${vs.color}60` : "2px solid transparent",
                    opacity: canClick ? 1 : 0.4,
                  }}>
                  <PixelText size={10} color={vs.color}>{vs.letter}</PixelText>
                  <div><PixelText size={5} color={C.subtleText}>{vs.title}</PixelText></div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* === PREP PHASE: D.A.R.E.R. Framework === */}
      {phase === "prep" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 80px" }}>
          {(() => {
            const vs = darerSteps[prepStep];

            // DECIDE step — value cards + custom input (same as TutorialBattle)
            if (prepStep === 0) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.subtleText}>{vs.subtitle}</PixelText>
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
                          borderRadius: 4, border: `2px solid ${picked ? C.goalGold : C.mutedBorder}`,
                          background: picked ? C.goalGold + "15" : C.cardBg,
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
                    background: C.cardBg, border: "2px solid ${C.mutedBorder}",
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

            // RISE step — extracted shared component
            if (prepStep === 2) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.subtleText}>{vs.subtitle}</PixelText>
                  </div>
                </div>
                <RisePhase
                  riseSubStep={riseSubStep} setRiseSubStep={setRiseSubStep}
                  exposureWhen={exposureWhen} setExposureWhen={setExposureWhen}
                  exposureScheduledTime={exposureScheduledTime} setExposureScheduledTime={setExposureScheduledTime}
                  exposureWhere={exposureWhere} setExposureWhere={setExposureWhere}
                  exposureArmory={exposureArmory} setExposureArmory={setExposureArmory}
                  selectedArmoryTool={selectedArmoryTool} setSelectedArmoryTool={setSelectedArmoryTool}
                  hero={hero}
                  sudsValue={suds.before} setSudsValue={v => setSuds(s => ({...s, before: v}))}
                  onNext={() => advancePrepStep(s => s + 1)}
                  showBackButton={true} onBack={() => setRiseSubStep(riseSubStep - 1)}
                  calendarParams={{
                    title: `DARER: ${boss.name}`,
                    desc: `Face the ${boss.name} exposure: ${boss.desc}. Location: ${exposureWhere || 'TBD'}. Your anchor: ${prepAnswers.value || 'courage'}.`,
                  }}
                />
              </div>
            );

            // ALLOW step — Storm interrogation (detailed)
            if (prepStep === 1) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.subtleText}>{vs.subtitle}</PixelText>
                  </div>
                </div>
                <AllowFields
                  allowFearful={allowFearful} setAllowFearful={setAllowFearful}
                  allowLikelihood={allowLikelihood} setAllowLikelihood={setAllowLikelihood}
                  allowSeverity={allowSeverity} setAllowSeverity={setAllowSeverity}
                  allowCanHandle={allowCanHandle} setAllowCanHandle={setAllowCanHandle}
                  allowFearShowing={allowFearShowing} setAllowFearShowing={setAllowFearShowing}
                  allowPhysicalSensations={allowPhysicalSensations} setAllowPhysicalSensations={setAllowPhysicalSensations}
                  allowCustomSensation={allowCustomSensation} setAllowCustomSensation={setAllowCustomSensation}
                  onComplete={() => {
                    setPrepAnswers(pa => ({
                      ...pa, allow: `Thoughts: "${allowFearful}" Likelihood: ${allowLikelihood}% Severity: ${allowSeverity}/10 Can handle: "${allowCanHandle}" Fear showing: "${allowFearShowing}" Body: [${allowPhysicalSensations.join(", ")}]${allowCustomSensation ? " — " + allowCustomSensation : ""}`,
                    }));
                    advancePrepStep(s => s + 1);
                  }}
                />
              </div>
            );

            // ENGAGE step — choose: go now or talk to Dara
            if (prepStep === 3) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.subtleText}>{vs.subtitle}</PixelText>
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
                <BattleTypewriterBubble text={m.text} muted={!battleVoiceMode} voice={voice} />
              ) : (
                <VoiceMessageBubble isFromVoice={m.fromVoice} style={{
                  maxWidth: "82%", padding: "10px 12px", borderRadius: 4,
                  background: C.plum, border: "2px solid ${C.mutedBorder}",
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

          {/* Sub-step 0: Outcome selection — sequential reveal */}
          {engageSubStep === 0 && (
            <div style={{ animation: "fadeIn 0.4s ease-out" }}>
              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                  You stepped into the arena.{"\n"}Whatever happened — you showed{"\n"}up. That matters.
                </PixelText>
              </DialogBox>

              {!showOutcome ? (
                <PixelBtn onClick={() => setShowOutcome(true)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  📋 I AM READY TO REPORT
                </PixelBtn>
              ) : (
                <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                  <div style={{ marginTop: 14 }}>
                    {[
                      { id: "victory", label: "⚔ BOSS DEFEATED — I did it!", desc: "I stayed all the way through" },
                      { id: "partial", label: "🩹 PARTIAL VICTORY — I went partway", desc: "I didn't finish, but I stayed longer than I usually would" },
                      { id: "retreat", label: "🛡 STRATEGIC RETREAT — Not this time", desc: "The Storm was too strong, but I'm not giving up" },
                    ].map(opt => (
                      <button key={opt.id} onClick={() => setOutcome(opt.id)} style={{
                        display: "block", width: "100%", marginBottom: 8, padding: "14px 12px",
                        borderRadius: 4, border: `2px solid ${outcome === opt.id ? C.goldMd : C.mutedBorder}`,
                        background: outcome === opt.id ? C.goldMd + "12" : C.cardBg,
                        cursor: "pointer", textAlign: "left",
                      }}>
                        <PixelText size={7} color={outcome === opt.id ? C.goldMd : C.cream} style={{ display: "block", lineHeight: 1.5 }}>
                          {opt.label}
                        </PixelText>
                      </button>
                    ))}
                  </div>

                  {outcome && (
                    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
                      {/* Animated outcome banner */}
                      <div style={{
                        marginTop: 16, padding: "20px 16px", textAlign: "center",
                        background: outcome === "victory" ? C.hpGreen + "15" : outcome === "partial" ? C.goldMd + "10" : C.bossRed + "10",
                        border: `2px solid ${outcome === "victory" ? C.hpGreen + "60" : outcome === "partial" ? C.goldMd + "40" : C.bossRed + "40"}`,
                        borderRadius: 8,
                        animation: outcome === "victory" ? "victoryFlash 0.8s ease-out" : outcome === "partial" ? "fadeIn 0.5s ease-out" : "retreatFade 0.5s ease-out",
                      }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>
                          {outcome === "victory" ? "⚔️" : outcome === "partial" ? "🌟" : "🛡️"}
                        </div>
                        <PixelText size={10} color={outcome === "victory" ? C.hpGreen : outcome === "partial" ? C.goldMd : C.bossRed} style={{ display: "block" }}>
                          {outcome === "victory" ? "BOSS DEFEATED" : outcome === "partial" ? "PARTIAL VICTORY" : "STRATEGIC RETREAT"}
                        </PixelText>
                        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginTop: 4 }}>
                          {outcome === "victory" ? "You stayed all the way through" : outcome === "partial" ? "Progress, not perfection" : "The Storm was too strong this time"}
                        </PixelText>
                      </div>
                      <PixelBtn onClick={() => setEngageSubStep(0.5)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                        🎒 SHOW ME THE LOOT
                      </PixelBtn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sub-step 0.5: Loot — proof of completion */}
          {engageSubStep === 0.5 && (
            <div style={{ animation: "fadeIn 0.4s ease-out" }}>
              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                  Every battle leaves a mark.{"\n"}{"\n"}
                  Share a moment from this{"\n"}exposure — a photo, a memory, a{"\n"}feeling. This is your loot.
                </PixelText>
              </DialogBox>

              {/* Image upload */}
              <label style={{
                display: "block", width: "100%", padding: C.padLg, marginTop: 14,
                border: `2px dashed ${C.mutedBorder}`, borderRadius: 6,
                background: C.cardBg, textAlign: "center", cursor: "pointer",
                boxSizing: "border-box",
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setLootImage(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ display: "none" }}
                />
                {lootImage ? (
                  <div style={{ position: "relative" }}>
                    <img src={lootImage} alt="Battle proof" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 6 }} />
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLootImage(null); }} style={{
                      position: "absolute", top: 8, right: 8, background: `${C.cardBg}CC`, border: `1px solid ${C.mutedBorder}`,
                      borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}>
                      <PixelText size={8} color={C.cream}>✕</PixelText>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                    <PixelText size={7} color={C.subtleText}>Tap to upload a photo</PixelText>
                  </div>
                )}
              </label>

              {/* Meaningful moment text */}
              <textarea
                value={lootText}
                onChange={e => setLootText(e.target.value)}
                placeholder="Share a meaningful moment — what did you notice, feel, or create?..."
                rows={3}
                style={{
                  width: "100%", minHeight: 80, padding: 10, marginTop: 12,
                  background: C.cardBg, border: "2px solid ${C.mutedBorder}",
                  borderRadius: 4, color: C.cream, fontSize: 12,
                  fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                  lineHeight: 1.6, boxSizing: "border-box",
                }}
              />

              <PixelBtn onClick={() => setEngageSubStep(1)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
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
                <PixelText size={7} color={C.subtleText} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (after)</PixelText>
                <SUDSSlider
                  value={suds.after}
                  onChange={v => setSuds(s => ({...s, after: v}))}
                  label="STORM INTENSITY (after)"
                  subtitle="How much distress do you feel right now?"
                  ariaLabel="Distress level after exposure"
                />
              </div>

              <PixelBtn onClick={() => setEngageSubStep(2)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 2: Reflection questions */}
          {engageSubStep === 2 && (
            <div style={{ animation: "fadeIn 0.4s ease-out" }}>
              <ReflectionQuestions
                fearedHappened={fearedHappened} setFearedHappened={setFearedHappened}
                fearedSeverity={fearedSeverity} setFearedSeverity={setFearedSeverity}
                madeItThrough={madeItThrough} setMadeItThrough={setMadeItThrough}
              />
              <PixelBtn onClick={() => setEngageSubStep(3)} disabled={fearedHappened === "No, they didn't happen at all" ? false : (!fearedHappened || !fearedSeverity || !madeItThrough)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 3: Free text — what did you learn */}
          {engageSubStep === 3 && (
            <DebriefFreeText
              engageFreeText={engageFreeText}
              setEngageFreeText={setEngageFreeText}
              onNext={() => setEngageSubStep(4)}
              voice={voice}
            />
          )}

          {/* Sub-step 4: SUDs comparison + victory chat */}
          {engageSubStep === 4 && (
            <div style={{ animation: "fadeIn 0.6s ease-out" }}>
              {/* SUDs comparison */}
              <SUDSComparison before={suds.before} after={suds.after} />

              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                  {hero.name}, do you see what{"\n"}happened?{"\n"}{"\n"}
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
              borderRadius: 6, padding: C.padLg, marginBottom: 16, textAlign: "left",
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
                <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>DARA IS FINDING OPTIONS</PixelText>
                <TypingDots />
              </div>
            ) : (
              <>
                {repeatOptions.map((opt, i) => (
                  <button key={i} onClick={() => setSelectedRepeat(opt.text)} style={{
                    display: "block", width: "100%", marginBottom: 8, padding: "12px 14px",
                    borderRadius: 4, border: `2px solid ${selectedRepeat === opt.text ? C.hpGreen : C.mutedBorder}`,
                    background: selectedRepeat === opt.text ? C.hpGreen + "12" : C.cardBg,
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
                background: "transparent", border: "1px dashed ${C.mutedBorder}",
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
        <div style={{ padding: "12px 12px 64px", borderTop: "2px solid ${C.mutedBorder}" }}>
          {/* AI error notification */}
          {battleChat.error && (
            <div style={{ marginBottom: 8, padding: C.padSm, background: C.bossRed + "20", border: `1px solid ${C.bossRed}`, borderRadius: 4 }}>
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
                style={{ flex: 1, padding: C.padSm, background: C.cardBg, border: "2px solid ${C.mutedBorder}", borderRadius: 3, color: C.cream, fontSize: 12, outline: "none" }} />
              <PixelBtn onClick={() => { if (chatInput.trim()) { handleSend(battleChat); setChatInput(""); } }} disabled={battleChat.typing || !chatInput.trim()}>→</PixelBtn>
            </div>
          )}
          <PixelBtn onClick={() => { setPhase("result"); setEngageSubStep(0); }} color={C.bossRed} textColor={C.cream} style={{ width: "100%", marginTop: 8 }}>
            ⚔ I'M READY TO ENGAGE
          </PixelBtn>
        </div>
      )}
      <BottomNav active={null} onNav={(s) => {
        if (s === "map") onRetreat();
        else if (s === "bank") onBank();
        else { setActiveBoss(null); setScreen(s === "profile" ? "profile" : s); }
      }} zIndex={20} />
    </div>
  );
}
