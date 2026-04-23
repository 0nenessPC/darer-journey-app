import React, { useState, useEffect, useRef } from 'react';
import { useAIChat } from '../utils/chat';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, DialogBox } from '../components/shared';
import { useCloudVoice } from '../hooks/useCloudVoice';
import { VoiceInputBar, VoiceMessageBubble } from '../components/VoiceToggle';

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
  const [showAlarmSuggestion, setShowAlarmSuggestion] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [battleVoiceMode, setBattleVoiceMode] = useState(false);
  const [victoryVoiceMode, setVictoryVoiceMode] = useState(false);
  const chatRef = useRef(null);

  // Voice hook
  const voice = useCloudVoice({ useCloud: true });

  // Persist battle progress so resume-anywhere survives refresh/close
  useEffect(() => {
    if (!setOBState) return;
    setOBState({ phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime });
  }, [phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, setOBState]);

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

  const handleSend = async (chat, textOverride) => {
    const t = (textOverride || chatInput).trim();
    if (!t) return;
    setChatInput("");
    await chat.sendMessage(t);
  };

  const activeChat = phase === "battle" ? battleChat : victoryChat;

  // Auto-speak AI replies when voice mode is on
  useEffect(() => {
    if (!battleVoiceMode || !voice.supported) return;
    const msgs = activeChat.messages;
    if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last?.role === "assistant" && !last._spoken) {
      // Mark as spoken so we don't repeat
      last._spoken = true;
      voice.speak(last.text);
    }
  }, [activeChat.messages, battleVoiceMode, voice.supported, voice.speak]);

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

                {/* Sub-step 0: WHEN */}
                {riseSubStep === 0 && (
                  <div>
                    <DialogBox speaker="DARA">
                      <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
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
                  <div>
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
                  <div>
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
                          boxSizing: "border-box",
                          colorScheme: "dark",
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

                    {/* Phone alarm/reminder suggestion */}
                    {showAlarmSuggestion && exposureScheduledTime && (
                      <div style={{
                        marginTop: 16, padding: 14,
                        background: C.teal + "15", border: `2px solid ${C.teal}60`,
                        borderRadius: 6,
                      }}>
                        <PixelText size={8} color={C.teal} style={{ display: "block", marginBottom: 8 }}>⏰ SET A REMINDER</PixelText>
                        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 10, lineHeight: 1.6 }}>
                          You scheduled this for {new Date(exposureScheduledTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
                          {"\n"}{"\n"}
                          Setting an alarm or reminder on your phone right now will make you much more likely to follow through. Tap the button below to open your phone's alarm app.
                        </PixelText>
                        <button
                          onClick={() => {
                            const dt = new Date(exposureScheduledTime);
                            const title = encodeURIComponent(`DARER: ${boss.name}`);
                            const desc = encodeURIComponent(`Face the ${boss.name} exposure: ${boss.desc}`);
                            const startStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                            const endStr = new Date(dt.getTime() + 30*60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                            window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&dates=${startStr}/${endStr}`, '_blank');
                          }}
                          style={{
                            width: "100%", padding: "10px 14px", background: C.teal,
                            border: "none", borderRadius: 4, cursor: "pointer",
                            marginBottom: 6,
                          }}
                        >
                          <PixelText size={8} color={C.charcoal}>📱 ADD TO CALENDAR + ALARM</PixelText>
                        </button>
                        <button
                          onClick={() => setShowAlarmSuggestion(false)}
                          style={{
                            width: "100%", padding: "8px 14px", background: "transparent",
                            border: `1px solid #5C3A50`, borderRadius: 4, cursor: "pointer",
                          }}
                        >
                          <PixelText size={7} color={C.grayLt}>I already set a reminder</PixelText>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-step 3: ARMORY */}
                {riseSubStep === 3 && (
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
                        <button key={tool.key} onClick={() => { setExposureArmory(tool.label); setRiseSubStep(4); }} style={{
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

                {/* Sub-step 4: SUDs before */}
                {riseSubStep === 4 && (
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
                      I'M GOING IN → RISE!
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

      {/* === BATTLE PHASE: Real-time exposure === */}
      {(phase === "battle" || phase === "result") && (
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {activeChat.messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
              {m.role === "assistant" && voice.supported && (
                <button
                  onClick={() => voice.isSpeaking ? voice.cancelSpeech() : voice.speak(m.text)}
                  style={{
                    width: 28, height: 28, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "none",
                    cursor: "pointer", fontSize: 14,
                    color: voice.isSpeaking ? C.teal : C.grayLt,
                    opacity: 0.5,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = 1}
                  onMouseLeave={(e) => e.target.style.opacity = 0.5}
                  title={voice.isSpeaking ? "Stop" : "Listen"}
                >
                  {voice.isSpeaking ? "⏸" : "🔊"}
                </button>
              )}
              <VoiceMessageBubble isFromVoice={m.fromVoice} style={{
                maxWidth: voice.supported && m.role === "assistant" ? "78%" : "82%", padding: "10px 12px", borderRadius: 4,
                background: m.role === "user" ? C.plum : "#1A1218", border: "2px solid #5C3A50",
              }}>
                <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>{m.text}</PixelText>
              </VoiceMessageBubble>
            </div>
          ))}
          {activeChat.typing && <DialogBox speaker="DARA" typing />}
        </div>
      )}

      {/* === CONTROLS === */}
      <div style={{ padding: "12px 12px 64px", borderTop: phase !== "prep" ? "2px solid #5C3A50" : "none" }}>
        {phase === "battle" && (
          <>
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
              <PixelBtn onClick={() => setPhase("log")} color={C.gold} textColor={C.charcoal} style={{ flex: 1 }}>
                BATTLE COMPLETE →
              </PixelBtn>
              <PixelBtn onClick={onRetreat} color={C.plum} textColor={C.cream} style={{ flex: 1 }}>
                🛡 RETREAT
              </PixelBtn>
            </div>
          </>
        )}

        {phase === "log" && (
          <div>
            <div style={{ marginBottom: 12 }}><PixelText size={9} color={C.goldMd}>BATTLE RESULT</PixelText></div>
            {["victory", "partial", "retreat"].map(o => (
              <button key={o} onClick={() => setOutcome(o)} style={{
                display: "block", width: "100%", padding: 12, marginBottom: 6, borderRadius: 4,
                border: `3px solid ${outcome === o ? C.goldMd : "#5C3A50"}`,
                background: outcome === o ? C.plum : "#1A1218", cursor: "pointer", textAlign: "left",
              }}>
                <PixelText size={8} color={outcome === o ? C.goldMd : C.cream}>
                  {o === "victory" ? "⚔ BOSS DEFEATED — I did it!" : o === "partial" ? "🩹 PARTIAL VICTORY — I tried" : "🛡 STRATEGIC RETREAT — Not this time"}
                </PixelText>
              </button>
            ))}
            <div style={{ margin: "10px 0" }}>
              <PixelText size={7} color={C.grayLt}>PEAK BATTLE ANXIETY: {suds.during}</PixelText>
              <input type="range" min="0" max="100" value={suds.during} onChange={e => setSuds(s => ({...s, during: +e.target.value}))}
                style={{ width: "100%", accentColor: C.bossRed }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <PixelText size={7} color={C.grayLt}>POST-BATTLE ANXIETY: {suds.after}</PixelText>
              <input type="range" min="0" max="100" value={suds.after} onChange={e => setSuds(s => ({...s, after: +e.target.value}))}
                style={{ width: "100%", accentColor: C.hpGreen }} />
            </div>
            <PixelBtn onClick={finishBattle} disabled={!outcome} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
              SEE RESULTS
            </PixelBtn>
          </div>
        )}

        {phase === "result" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0", marginBottom: 8, background: "#1A1218", borderRadius: 4, border: "2px solid #5C3A50" }}>
              <div style={{ textAlign: "center" }}><PixelText size={12} color={C.bossRed}>{suds.before}</PixelText><div><PixelText size={6} color={C.grayLt}>BEFORE</PixelText></div></div>
              <div style={{ textAlign: "center" }}><PixelText size={12} color={"#E8A04A"}>{suds.during}</PixelText><div><PixelText size={6} color={C.grayLt}>PEAK</PixelText></div></div>
              <div style={{ textAlign: "center" }}><PixelText size={12} color={C.hpGreen}>{suds.after}</PixelText><div><PixelText size={6} color={C.grayLt}>AFTER</PixelText></div></div>
              <div style={{ textAlign: "center" }}><PixelText size={12} color={C.goldMd}>+{outcome === "victory" ? 100 : outcome === "partial" ? 50 : 10}</PixelText><div><PixelText size={6} color={C.grayLt}>XP</PixelText></div></div>
            </div>

            {/* Voice mode toggle for result phase */}
            {voice.supported && (
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setVictoryVoiceMode(v => !v)}
                  style={{
                    padding: "4px 10px",
                    background: victoryVoiceMode ? C.plum + "40" : "transparent",
                    border: `1px solid ${victoryVoiceMode ? C.plumLt : C.gray + "60"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    color: victoryVoiceMode ? C.plumLt : C.grayLt,
                    fontSize: 9,
                    fontFamily: PIXEL_FONT,
                  }}
                >
                  {victoryVoiceMode ? "🎤 Voice ON" : "🎤 Voice OFF"}
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {victoryVoiceMode && voice.supported ? (
                <VoiceInputBar
                  input={chatInput}
                  onInputChange={setChatInput}
                  onSend={(t) => handleSend(victoryChat, t)}
                  typing={victoryChat.typing}
                  disabled={false}
                  voice={voice}
                  placeholder="Reflect with Dara or tap 🎤..."
                />
              ) : (
                <>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && chatInput.trim() && handleSend(victoryChat)}
                    placeholder="Reflect with Dara... (optional)" disabled={victoryChat.typing}
                    style={{ flex: 1, padding: 8, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 12, outline: "none" }} />
                  <PixelBtn onClick={() => chatInput.trim() && handleSend(victoryChat)} disabled={victoryChat.typing || !chatInput.trim()}>→</PixelBtn>
                </>
              )}
            </div>
            <button onClick={() => onVictory(outcome, { prepAnswers, suds, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, battleMessages: battleChat.messages, victoryMessages: victoryChat.messages })} style={{
              width: "100%", padding: "14px 16px", background: C.gold, border: "none", borderRadius: 6,
              cursor: "pointer", boxShadow: "0 2px 8px rgba(200,170,80,0.3)",
              marginBottom: 6,
            }}>
              <PixelText size={10} color={C.charcoal}>⚔ RETURN TO MAP</PixelText>
            </button>
          </>
        )}
      </div>
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
