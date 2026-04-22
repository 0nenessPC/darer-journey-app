import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, saveProgress, loadProgress, NDA_VERSION, saveNdaAgreement, checkNdaAgreed } from "./utils/supabase";
import { buildHeroContext } from "./utils/aiHelper.jsx";
import NdaAgreementScreen from "./components/NdaAgreementScreen.jsx";
import { C, PIXEL_FONT, FONT_LINK, SYS, DEFAULT_ARMORY, DEFAULT_QUEST, STRENGTH_ICONS, ONBOARDING, TRAIT_CARDS } from "./constants/gameData";
import { useAIChat } from "./utils/chat";
import { PixelText, PixelBtn, HPBar, TypingDots, DialogBox, OnboardingProgress } from "./components/shared.jsx";
import BossBattle from "./screens/BossBattle.jsx";
import TutorialBattle from "./screens/TutorialBattle.jsx";
import GameMap from "./components/GameMap.jsx";
import HeroProfile from "./components/HeroProfile.jsx";
import ExposureSortScreen from "./screens/ExposureSortScreen.jsx";
import CharacterCreate from "./screens/CharacterCreate.jsx";
import ValuesScreen from "./screens/ValuesScreen.jsx";
import AskDaraChat from "./components/AskDaraChat.jsx";
import PsychoEdScreen from "./screens/PsychoEdScreen.jsx";
import JourneyMapPreview from "./screens/JourneyMapPreview.jsx";
import SwipeableBoss, { closeAllOtherSwipes } from "./components/SwipeableBoss.jsx";
import PracticeSession from "./components/PracticeSession.jsx";
import DARERStrategy from "./screens/DARERStrategy.jsx";
import GameArmory from "./screens/GameArmory.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import GameIntro from "./screens/GameIntro.jsx";
import ShadowLore from "./screens/ShadowLore.jsx";
import IntakeScreen from "./screens/IntakeScreen.jsx";

// ============ SCREENS ============
// --- SHADOW'S TRUE NATURE REVEAL ---
function ShadowReveal({ heroName, shadowText, onContinue }) {
  const [revealed, setRevealed] = useState(0);

  // Parse the shadow summary from AI text — robust section extraction
  const parseSection = (label) => {
    if (!shadowText) return "";
    // Match label followed by content, stopping at the next section header or closing line
    const regex = new RegExp(label + "[:\\s]*(.+?)(?=(?:WHERE IT APPEARS|WHAT IT WHISPERS|HOW IT KEEPS ITS GRIP|The Shadow has been|SHADOW'S TRUE NATURE)(?::|\\b)|$)", "is");
    const match = shadowText.match(regex);
    if (!match) return "";
    // Clean up: remove leading colons/whitespace, trailing whitespace/newlines
    return match[1].replace(/^[:\s]+/, "").replace(/[\s\n]+$/, "").trim();
  };

  const where = parseSection("WHERE IT APPEARS");
  const whisper = parseSection("WHAT IT WHISPERS");
  const grip = parseSection("HOW IT KEEPS ITS GRIP");

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(1), 600);
    const t2 = setTimeout(() => setRevealed(2), 1800);
    const t3 = setTimeout(() => setRevealed(3), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const sections = [
    { icon: "📍", title: "THE SHADOW'S TERRITORY", text: where, color: C.bossRed, border: C.bossRed },
    { icon: "🌀", title: "THE INNER STORM", text: whisper, color: C.amber, border: C.amber },
    { icon: "🏃", title: "THE ESCAPE", text: grip, color: C.plumMd, border: C.plumMd },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: C.mapBg, padding: "20px 20px 32px",
      overflowY: "auto",
    }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 24, animation: "fadeIn 0.6s ease-out" }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.8 }}>👁</div>
        <PixelText size={12} color={C.bossRed} style={{ display: "block", marginBottom: 6 }}>
          THE SHADOW'S TRUE NATURE
        </PixelText>
        <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>
          {heroName}, for the first time, you see your enemy clearly.
        </PixelText>
      </div>

      {/* Reveal cards */}
      {sections.map((s, i) => (
        <div key={s.title} style={{
          marginBottom: 12, padding: 16,
          background: "#1A1218",
          border: `2px solid ${revealed > i ? s.border + "80" : "#5C3A50"}`,
          borderRadius: 6,
          opacity: revealed > i ? 1 : 0.2,
          transform: revealed > i ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.6s ease-out",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <PixelText size={9} color={s.color}>{s.title}</PixelText>
          </div>
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
            {s.text || "..."}
          </PixelText>
        </div>
      ))}

      {/* Personalized Infinite Trap */}
      {revealed >= 3 && (
        <div style={{ animation: "fadeIn 0.8s ease-out", marginTop: 16, marginBottom: 8 }}>
          <PixelText size={10} color={C.goldMd} style={{ display: "block", textAlign: "center", marginBottom: 12 }}>
            YOUR SHADOW'S INFINITE TRAP
          </PixelText>

          {/* Vertical cycle with user's own data */}
          <div style={{ position: "relative", padding: "0 12px" }}>
            {[
              { label: "YOU ENTER", detail: where ? (where.length > 60 ? where.slice(0, 60) + "..." : where) : "Social situations", icon: "📍", color: C.bossRed },
              { label: "THE STORM HITS", detail: whisper ? (whisper.length > 60 ? whisper.slice(0, 60) + "..." : whisper) : "Anxious thoughts and body sensations", icon: "🌀", color: C.amber },
              { label: "F.E.A.R.", detail: "The storm becomes overwhelming. Your body and mind scream: GET OUT.", icon: "😨", color: "#FF4444", isFear: true },
              { label: "YOU ESCAPE", detail: grip ? (grip.length > 60 ? grip.slice(0, 60) + "..." : grip) : "Avoidance and safety behaviors", icon: "🏃", color: C.plumMd },
              { label: "BRIEF RELIEF", detail: "The fear fades — but only for now", icon: "😮‍💨", color: C.hpGreen },
              { label: "SHADOW GROWS", detail: "Next time it's harder. The territory expands. The storm gets stronger.", icon: "👤", color: C.grayLt },
            ].map((node, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "stretch", animation: `fadeIn 0.4s ease-out ${0.3 + i * 0.2}s both` }}>
                {/* Left: icon + connector */}
                <div style={{ width: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: node.isFear ? 36 : 28, height: node.isFear ? 36 : 28, borderRadius: "50%",
                    background: node.isFear ? "#FF444430" : node.color + "20",
                    border: `${node.isFear ? 3 : 2}px solid ${node.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: node.isFear ? 18 : 14,
                    boxShadow: node.isFear ? "0 0 16px #FF444440" : "none",
                    animation: node.isFear ? "fearPulse 2s ease-in-out infinite" : "none",
                  }}>{node.icon}</div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 12, background: "#5C3A50", position: "relative" }}>
                      <div style={{ position: "absolute", bottom: 0, left: -3, fontSize: 8, color: "#5C3A50" }}>▼</div>
                    </div>
                  )}
                </div>
                {/* Right: text */}
                <div style={{
                  flex: 1, padding: node.isFear ? "8px 12px 12px 10px" : "4px 0 12px 10px",
                  background: node.isFear ? "#FF444410" : "transparent",
                  border: node.isFear ? "1px solid #FF444430" : "none",
                  borderRadius: node.isFear ? 6 : 0,
                  marginLeft: node.isFear ? 4 : 0,
                }}>
                  <PixelText size={node.isFear ? 10 : 7} color={node.color}>{node.label}</PixelText>
                  <div style={{ marginTop: 2 }}>
                    <PixelText size={node.isFear ? 7 : 6} color={C.cream} style={{ lineHeight: 1.5 }}>{node.detail}</PixelText>
                  </div>
                  {node.isFear && (
                    <div style={{ marginTop: 6 }}>
                      <PixelText size={6} color={"#FF4444"} style={{ fontStyle: "italic" }}>
                        This is the moment that drives the escape.
                      </PixelText>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Loop-back arrow */}
            <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
              <PixelText size={7} color={C.bossRed}>↻ AND THE CYCLE REPEATS</PixelText>
            </div>
          </div>
        </div>
      )}

      {/* Dara's closing message */}
      {revealed >= 3 && (
        <div style={{ animation: "fadeIn 0.6s ease-out 0.3s both" }}>
          <div style={{ marginTop: 12 }}>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                This is YOUR Shadow's trap —{"\n"}built from your specific fears,{"\n"}your specific thoughts, and{"\n"}your specific escapes.{"\n"}{"\n"}
                But now you can see it. And{"\n"}a trap you can see is a trap{"\n"}you can break.{"\n"}{"\n"}
                Remember this moment, {heroName}.{"\n"}This is where your journey truly{"\n"}begins.
              </PixelText>
            </DialogBox>
          </div>

          <PixelBtn onClick={onContinue} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            THE JOURNEY CONTINUES →
          </PixelBtn>
        </div>
      )}

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
    </div>
  );
}

// --- TUTORIAL BATTLE ("Training Grounds") ---
// --- THE ARMORY (Psychological Tools) ---
function ArmoryScreen({ heroName, onContinue, obState = {}, setOBState }) {
  const armoryStep = obState.step || "intro";
  const setArmoryStep = (v) => setOBState({ step: typeof v === 'function' ? v(armoryStep) : v });
  const [breathPhase, setBreathPhase] = useState("inhale");
  const [breathTimer, setBreathTimer] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const timerRef = useRef(null);
  const practiceDuration = 300; // 5 minutes
  const breatheDurations = { inhale: 4, hold: 2, exhale: 6, rest: 2 };

  useEffect(() => {
    if (armoryStep !== "practice") return;
    timerRef.current = setInterval(() => {
      setBreathTimer(t => {
        const phaseTime = breatheDurations[breathPhase];
        if (t + 1 >= phaseTime) {
          setBreathPhase(prev => {
            const order = ["inhale", "hold", "exhale", "rest"];
            const idx = order.indexOf(prev);
            return order[(idx + 1) % 4];
          });
          return 0;
        }
        return t + 1;
      });
      setTotalElapsed(prev => {
        if (prev + 1 >= practiceDuration) {
          clearInterval(timerRef.current);
          setArmoryStep("complete");
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [armoryStep, breathPhase]);

  const breathText = { inhale: "Breathe in slowly…", hold: "Hold gently…", exhale: "Breathe out, let go…", rest: "Rest…" };
  const breathColor = { inhale: C.teal, hold: C.goldMd, exhale: C.hpGreen, rest: C.gray };
  const phaseTime = breatheDurations[breathPhase] - breathTimer;
  const pulseScale = breathPhase === "inhale" ? 1 + (breathTimer / 4) * 0.4 : breathPhase === "hold" ? 1.4 : breathPhase === "exhale" ? 1.4 - (breathTimer / 6) * 0.4 : 1;
  const formatTime = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  const progress = Math.min(100, (totalElapsed / practiceDuration) * 100);

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", overflowY: "auto" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ maxWidth: 380, width: "100%" }}>

        {armoryStep === "intro" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🛡️</div>
            <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>THE ARMORY</PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>Tools for the Inner Storm</PixelText>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                {heroName}, the strategies I've{"\n"}shown you are the path. But{"\n"}every DARER needs tools to{"\n"}steady themselves when the{"\n"}Storm hits.{"\n"}{"\n"}
                The Armory holds these tools.{"\n"}As you journey forward, you'll{"\n"}unlock new ones — each designed{"\n"}to help you carry fear and{"\n"}move forward anyway.{"\n"}{"\n"}
                Your first tool is ancient and{"\n"}simple. It is always with you.{"\n"}It costs nothing. And the{"\n"}Shadow cannot take it away.
              </PixelText>
            </DialogBox>
            <PixelBtn onClick={() => setArmoryStep("learn")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              REVEAL THE FIRST TOOL →
            </PixelBtn>
          </div>
        )}

        {armoryStep === "learn" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌊</div>
            <PixelText size={11} color={C.teal} style={{ display: "block", marginBottom: 6 }}>PACED BREATHING</PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>The Steady Breath — Your First Armory Tool</PixelText>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                When the Storm hits, your{"\n"}breath becomes shallow. Your{"\n"}body reads this as danger.{"\n"}{"\n"}
                Paced breathing reverses it.{"\n"}Slow, deep breaths tell your{"\n"}nervous system: "I am safe.{"\n"}I am choosing this."{"\n"}{"\n"}
                The rhythm is 4-2-6-2. Breathe{"\n"}in for 4, hold for 2, out{"\n"}for 6, rest for 2. The long{"\n"}exhale activates calm.{"\n"}{"\n"}
                We'll practice for 5 minutes.{"\n"}You don't need to do it{"\n"}perfectly. Just follow the{"\n"}rhythm.
              </PixelText>
            </DialogBox>
            <PixelBtn onClick={() => setArmoryStep("ready")} color={C.teal} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              BEGIN PRACTICE →
            </PixelBtn>
          </div>
        )}

        {armoryStep === "ready" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🫁</div>
            <PixelText size={10} color={C.teal} style={{ display: "block", marginBottom: 6 }}>PACED BREATHING</PixelText>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                Ready to try it, {heroName}?{"\n"}{"\n"}
                Press the button when you're{"\n"}ready. The timer will start{"\n"}and I'll guide you through{"\n"}each breath.{"\n\n"}
                Take as long as you need.{"\n"}There's no rush.
              </PixelText>
            </DialogBox>
            <PixelBtn onClick={() => setArmoryStep("practice")} color={C.teal} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              BEGIN BREATHING EXERCISE →
            </PixelBtn>
            <button onClick={onContinue} style={{
              width: "100%", marginTop: 10, padding: 10,
              background: "transparent", border: "1px dashed #5C3A50",
              borderRadius: 4, cursor: "pointer",
            }}>
              <PixelText size={6} color={C.grayLt}>Skip the practice?</PixelText>
            </button>
          </div>
        )}

        {armoryStep === "practice" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ marginBottom: 16 }}>
              <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>PACED BREATHING</PixelText>
              <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>{formatTime(totalElapsed)} / {formatTime(practiceDuration)}</PixelText>
            </div>
            <div style={{ height: 6, background: "#1A1218", borderRadius: 3, marginBottom: 24, border: "1px solid #5C3A50" }}>
              <div style={{ height: "100%", width: progress + "%", background: C.teal, borderRadius: 3, transition: "width 1s linear" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "30px 0" }}>
              <div style={{ width: 180, height: 180, borderRadius: "50%", background: breathColor[breathPhase] + "15", border: "3px solid " + breathColor[breathPhase] + "40", display: "flex", justifyContent: "center", alignItems: "center", transform: "scale(" + pulseScale + ")", transition: "transform 1s ease-in-out" }}>
                <div style={{ width: 120, height: 120, borderRadius: "50%", background: breathColor[breathPhase] + "25", border: "2px solid " + breathColor[breathPhase] + "60", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: breathColor[breathPhase] + "40" }} />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <PixelText size={10} color={breathColor[breathPhase]} style={{ display: "block", marginBottom: 4 }}>{breathText[breathPhase]}</PixelText>
              <PixelText size={14} color={C.goldMd} style={{ display: "block" }}>{phaseTime}</PixelText>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {["inhale", "hold", "exhale", "rest"].map(p => (
                <div key={p} style={{ padding: "4px 10px", borderRadius: 3, background: breathPhase === p ? breathColor[p] + "20" : "transparent", border: breathPhase === p ? "1px solid " + breathColor[p] + "60" : "1px solid #5C3A50" }}>
                  <PixelText size={6} color={breathPhase === p ? breathColor[p] : C.grayLt}>{p === "inhale" ? "IN" : p === "hold" ? "HOLD" : p === "exhale" ? "OUT" : "REST"}</PixelText>
                </div>
              ))}
            </div>
            <DialogBox speaker="DARA">
              <PixelText size={7} color={C.grayLt} style={{ display: "block", lineHeight: 1.7 }}>
                Follow the rhythm. Let each{"\n"}exhale be longer than the inhale.{"\n"}If your mind wanders — it will —{"\n"}just return to the breath.{"\n"}No judgment. Just return.
              </PixelText>
            </DialogBox>
            <button onClick={onContinue} style={{ width: "100%", marginTop: 10, padding: 10, background: "transparent", border: "1px dashed #5C3A50", borderRadius: 4, cursor: "pointer" }}><PixelText size={6} color={C.grayLt}>Skip the practice ?</PixelText></button>
          </div>
        )}

        {armoryStep === "complete" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
            <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>ARMORY UNLOCKED</PixelText>
            <div style={{ background: C.teal + "10", border: "2px solid " + C.teal + "30", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <PixelText size={9} color={C.teal} style={{ display: "block", marginBottom: 4 }}>🌊 PACED BREATHING — EQUIPPED</PixelText>
              <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
                4-2-6-2 rhythm{"\n"}Always available. Always free.{"\n"}The Storm cannot take it.
              </PixelText>
            </div>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                You've earned your first tool,{"\n"}{heroName}. Use it whenever the{"\n"}Storm rises — before a battle,{"\n"}during one, or after.{"\n"}{"\n"}
                More tools await as you{"\n"}journey deeper. For now, let's{"\n"}test your strategies in the{"\n"}training grounds.
              </PixelText>
            </DialogBox>
            <PixelBtn onClick={onContinue} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              ENTER TRAINING GROUNDS →
            </PixelBtn>
          </div>
        )}

      </div>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// --- GAME MAP ---
// ============ ADD EXPOSURE MODAL ============
function AddExposureModal({ onClose, onManualEntry, onAskDara }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.8)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, background: "#1A1218",
          borderTop: `3px solid ${C.teal}`, borderRadius: "12px 12px 0 0",
          padding: "24px 20px 32px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <PixelText size={12} color={C.teal}>Add New Exposure</PixelText>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: C.grayLt, fontSize: 18, padding: "4px 8px",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Two options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={onManualEntry}
            style={{
              width: "100%", padding: "16px 20px",
              background: C.plum + "20", border: `2px solid ${C.plum}`,
              borderRadius: 8, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 14,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 28 }}>✏️</span>
            <div>
              <PixelText size={10} color={C.cream} style={{ display: "block" }}>Write it myself</PixelText>
              <PixelText size={7} color={C.grayLt}>Type in your own exposure</PixelText>
            </div>
          </button>

          <button
            onClick={onAskDara}
            style={{
              width: "100%", padding: "16px 20px",
              background: C.teal + "20", border: `2px solid ${C.teal}`,
              borderRadius: 8, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 14,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 28 }}>🤖</span>
            <div>
              <PixelText size={10} color={C.cream} style={{ display: "block" }}>Ask Dara to help</PixelText>
              <PixelText size={7} color={C.grayLt}>Dara guides you through it</PixelText>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ ADD MANUAL ENTRY FORM ============
function AddManualEntryForm({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(3);

  const difficultyLabels = {
    1: "Very Easy", 2: "Easy", 3: "Moderate",
    4: "Challenging", 5: "Hard", 6: "Very Hard",
    7: "Intense", 8: "Very Intense", 9: "Extreme", 10: "Maximum",
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      desc: description.trim() || "Custom exposure",
      difficulty,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.8)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, background: "#1A1218",
          borderTop: `3px solid ${C.teal}`, borderRadius: "12px 12px 0 0",
          padding: "24px 20px 32px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <PixelText size={12} color={C.teal}>Write Your Exposure</PixelText>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: C.grayLt, fontSize: 18, padding: "4px 8px",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 16 }}>
          <PixelText size={8} color={C.cream} style={{ display: "block", marginBottom: 6 }}>Exposure name *</PixelText>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Say hi to a coworker"
            style={{
              width: "100%", padding: "12px 14px",
              background: "#222", border: `2px solid ${name.trim() ? C.teal : "#5C3A50"}`,
              borderRadius: 6, color: C.cream, fontSize: 14,
              fontFamily: "inherit", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Description input */}
        <div style={{ marginBottom: 16 }}>
          <PixelText size={8} color={C.cream} style={{ display: "block", marginBottom: 6 }}>Description (optional)</PixelText>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What makes this challenging?"
            rows={3}
            style={{
              width: "100%", padding: "12px 14px",
              background: "#222", border: `2px solid #5C3A50`,
              borderRadius: 6, color: C.cream, fontSize: 14,
              fontFamily: "inherit", outline: "none",
              resize: "vertical", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Difficulty slider */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <PixelText size={8} color={C.cream}>Anxiety level</PixelText>
            <PixelText size={9} color={difficulty >= 7 ? C.amber : difficulty >= 4 ? C.goldMd : C.hpGreen}>
              LV.{difficulty} — {difficultyLabels[difficulty]}
            </PixelText>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            style={{ width: "100%", accentColor: C.teal }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <PixelText size={6} color={C.grayLt}>1 — Easy</PixelText>
            <PixelText size={6} color={C.grayLt}>10 — Extreme</PixelText>
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          style={{
            width: "100%", padding: "14px 20px",
            background: name.trim() ? C.teal : C.gray,
            border: `3px solid ${name.trim() ? C.teal : C.gray}`,
            borderRadius: 6, cursor: name.trim() ? "pointer" : "default",
            color: C.cream, fontSize: 12, fontFamily: PIXEL_FONT,
            boxShadow: name.trim() ? `0 4px 0 #4A7A60` : "none",
            transition: "all 0.2s",
          }}
        >
          Add to My Journey
        </button>
      </div>
    </div>
  );
}

// --- LADDER SCREEN (placeholder) ---
function LadderScreen({ hero, quest, setScreen, onBack }) {
  const totalXp = (quest.bosses || []).filter(b => b.defeated).length * 100;

  // Mock ladder entries
  const mockEntries = [
    { rank: 1, name: "ShadowSlayer99", xp: 1200, badges: "🔥⚡" },
    { rank: 2, name: "CourageKnight", xp: 950, badges: "🔥" },
    { rank: 3, name: "DARER_Champion", xp: 800, badges: "💎" },
    { rank: 4, name: "FearlessFox", xp: 600, badges: "" },
    { rank: 5, name: "StormRider", xp: 450, badges: "" },
  ];

  // Insert user into the mock list at appropriate position
  const userRank = mockEntries.length + 1;

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <PixelText size={9} color={C.grayLt}>←</PixelText>
        </button>
        <PixelText size={10} color={C.goldMd}>🏆 DARER SCORE</PixelText>
      </div>

      {/* Your score card */}
      <div style={{ padding: 16, background: C.goalGold + "10", border: `3px solid ${C.goalGold}40`, borderRadius: 6, margin: "16px 0", textAlign: "center" }}>
        <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 4 }}>YOUR SCORE</PixelText>
        <PixelText size={16} color={C.goalGold} style={{ display: "block", marginBottom: 4 }}>{totalXp} XP</PixelText>
        <PixelText size={7} color={C.grayLt}>{(quest.bosses || []).filter(b => b.defeated).length} boss{(quest.bosses || []).filter(b => b.defeated).length !== 1 ? "es" : ""} defeated</PixelText>
      </div>

      {/* Leaderboard */}
      <div style={{ padding: "0 0 8px" }}>
        <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 8, textAlign: "center" }}>🏆 LEADERBOARD 🏆</PixelText>
        {mockEntries.map(entry => (
          <div key={entry.rank} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            background: entry.rank <= 3 ? "#1A1218" : "#15101a",
            border: `2px solid ${entry.rank === 1 ? C.goalGold : entry.rank === 2 ? C.plumMd : entry.rank === 3 ? C.amber : "#333"}`,
            borderRadius: 6, marginBottom: 6,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: entry.rank === 1 ? C.goalGold + "30" : entry.rank === 2 ? C.plumMd + "20" : entry.rank === 3 ? C.amber + "20" : "#222",
              border: `2px solid ${entry.rank === 1 ? C.goalGold : entry.rank === 2 ? C.plumMd : entry.rank === 3 ? C.amber : "#555"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PixelText size={8} color={entry.rank <= 3 ? (entry.rank === 1 ? C.goalGold : entry.rank === 2 ? C.plumMd : C.amber) : C.grayLt}>{entry.rank}</PixelText>
            </div>
            <div style={{ flex: 1 }}>
              <PixelText size={8} color={entry.rank <= 3 ? C.cream : C.grayLt}>{entry.name}</PixelText>
              {entry.badges && <div style={{ marginTop: 2 }}><PixelText size={7}>{entry.badges}</PixelText></div>}
            </div>
            <PixelText size={9} color={entry.rank <= 3 ? C.goalGold : C.grayLt}>{entry.xp} XP</PixelText>
          </div>
        ))}

        {/* User position */}
        <div style={{ margin: "8px 0 4px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            background: C.plum + "20", border: `2px solid ${C.plum}60`, borderRadius: 6,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: C.plum + "30",
              border: `2px solid ${C.plum}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PixelText size={8} color={C.plumMd}>{userRank}</PixelText>
            </div>
            <div style={{ flex: 1 }}>
              <PixelText size={8} color={C.cream}>{hero.name}</PixelText>
            </div>
            <PixelText size={9} color={C.plumMd}>{totalXp} XP</PixelText>
          </div>
        </div>
      </div>

      {/* Coming soon note */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <PixelText size={6} color={C.grayLt}>Leaderboard coming soon — earn XP by defeating bosses!</PixelText>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218",
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: () => setScreen("map") },
          { icon: "⚗", label: "ARMORY", active: false, onClick: () => setScreen("armory") },
          { icon: "🏆", label: "LADDER", active: true },
          { icon: "🛡", label: "HERO", active: false, onClick: () => setScreen("profile") },
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


// ============ MAIN APP ============
export default function DARERQuest() {
  const [screen, setScreenRaw] = useState("login");
  const [screenHistory, setScreenHistory] = useState([]);
  const [hero, setHero] = useState({ name: "Hero", darerId: "", strengths: [], stats: { courage: 5, resilience: 5, openness: 5 }, traits: [], armory: JSON.parse(JSON.stringify(DEFAULT_ARMORY)) });
  const [quest, setQuest] = useState(DEFAULT_QUEST);
  const [battleHistory, setBattleHistory] = useState([]);
  const [activeBoss, setActiveBoss] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Granular onboarding state — tracks internal progress within each screen
  const [onboardingState, setOnboardingState] = useState({});

  // Shadow text from intake (declared here so auto-save can reference it)
  const [shadowText, setShadowText] = useState("");

  // Add exposure modal state
  const [showAddModal, setShowAddModal] = useState(false); // false | 'menu' | 'manual'
  const [addMode, setAddMode] = useState(null); // 'menu' | 'manual' | 'ask-dara'
  const [pendingDeleteBoss, setPendingDeleteBoss] = useState(null); // boss pending delete confirmation
  const [justAddedBossId, setJustAddedBossId] = useState(null); // triggers highlight on newly added boss

  // Achieve a boss — mark as defeated regardless of battle state
  const handleAchieveBoss = (boss) => {
    setQuest(q => ({
      ...q,
      bosses: q.bosses.map(b =>
        b.id === boss.id ? { ...b, defeated: true, hp: 0 } : b
      ),
    }));
    // If this was the active battle, abort it
    if (activeBoss?.id === boss.id) {
      setActiveBoss(null);
    }
  };

  // Delete a boss — open confirmation dialog
  const handleDeleteBoss = (boss) => {
    setPendingDeleteBoss(boss);
  };

  const confirmDeleteBoss = () => {
    if (!pendingDeleteBoss) return;
    setQuest(q => ({
      ...q,
      bosses: q.bosses.filter(b => b.id !== pendingDeleteBoss.id),
    }));
    // If this was the active battle, abort it
    if (activeBoss?.id === pendingDeleteBoss.id) {
      setActiveBoss(null);
    }
    setPendingDeleteBoss(null);
  };

  // Check for active session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-save progress on every onboarding screen change (includes granular onboarding state)
  const lastSavedAt = useRef(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (screen === "login" || screen === "profile" || screen === "armory" || screen === "ladder") return;
    const now = Date.now();
    if (now - lastSavedAt.current < 2000) return; // throttle to every 2s
    lastSavedAt.current = now;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveProgress(user.id, {
          screen,
          hero,
          quest,
          shadow_text: shadowText,
          onboarding_state: onboardingState,
        });
      }
    })();
  }, [screen, isAuthenticated, onboardingState, shadowText, hero, quest]);

  // Save on tab/browser close so progress isn't lost mid-screen
  useEffect(() => {
    if (!isAuthenticated) return;
    const saveNow = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveProgress(user.id, {
            screen,
            hero,
            quest,
            shadow_text: shadowText,
            onboarding_state: onboardingState,
          });
        }
      } catch (e) { /* ignore save errors on close */ }
    };
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveNow();
    });
    return () => {
      window.removeEventListener('beforeunload', saveNow);
      document.removeEventListener('visibilitychange', () => {});
    };
  }, [isAuthenticated, screen, hero, quest, shadowText, onboardingState]);

  const setScreen = (s) => {
    if (s === screen) return; // Don't navigate to the same screen
    setScreenHistory(prev => {
      const last = prev.length > 0 ? prev[prev.length - 1] : null;
      if (last === screen && prev.length > 1) {
        // Replace duplicate entry so rapid navigations don't stack
        return [...prev.slice(0, -1), screen];
      }
      return [...prev, screen];
    });
    setScreenRaw(s);
  };

  // Helper to merge partial state into onboardingState (auto-triggers save)
  const setOBState = (screenKey, partial) => {
    setOnboardingState(prev => ({
      ...prev,
      [screenKey]: { ...prev[screenKey], ...partial },
    }));
  };

  // Restore a single screen's state with defaults
  const getOBState = (screenKey, defaults = {}) => ({ ...defaults, ...onboardingState[screenKey] });
  const goBack = () => {
    setScreenHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      // Deduplicate: collapse repeated adjacent entries at the top
      while (next.length > 1 && next[next.length - 1] === next[next.length - 2]) {
        next.pop();
      }
      const last = next.pop();
      setScreenRaw(last);
      return next;
    });
  };

  const handleLogin = async () => {
    // Check for existing progress
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Check NDA agreement before routing
    const ndaAgreed = await checkNdaAgreed(user.id, NDA_VERSION);
    if (!ndaAgreed) {
      // Must agree to NDA before anything else
      setScreen("nda");
      setIsAuthenticated(true);
      return;
    }
    
    const progress = await loadProgress(user.id);
    if (progress) {
      // Restore saved state — migrate armory if missing
      const loadedHero = progress.hero || {};
      const migratedArmory = loadedHero.armory ? loadedHero.armory.map((item, i) => {
        const def = DEFAULT_ARMORY[i];
        return def ? { ...def, ...item } : item;
      }) : JSON.parse(JSON.stringify(DEFAULT_ARMORY));
      setHero({ ...loadedHero, armory: migratedArmory });
      if (progress.quest) setQuest(progress.quest);
      if (progress.battle_history) setBattleHistory(progress.battle_history);
      setShadowText(progress.shadow_text || '');
      if (progress.onboarding_state) setOnboardingState(progress.onboarding_state);
      setScreenHistory([]); // Clear history on fresh login
      // Priority routing: check quest data first (most reliable signal of completion)
      if (progress.quest?.bosses?.length > 0) {
        setScreen("map");
      } else if (progress.onboarding_state?.exposureSort?.done) {
        setScreen("map");
      } else if (progress.tutorial_complete || progress.onboarding_state?.tutorial?.tutorialComplete) {
        // Finished tutorial but not exposure sort — go pick battles
        setScreen("exposureSort");
      } else if (progress.screen && progress.screen !== 'login') {
        setScreen(progress.screen); // Use setScreen to track history
      } else {
        setScreen("intro");
      }
    } else {
      // New user
      const id = "DARER_" + Math.floor(100000 + Math.random() * 900000);
      setHero(h => ({ ...h, darerId: id, name: id }));
      setScreen("intro");
    }
    setIsAuthenticated(true);
  };

  // Called when user agrees to the NDA — saves the agreement and continues onboarding
  const handleNdaComplete = async (participantName, ndaText) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const result = await saveNdaAgreement(user.id, participantName, hero.darerId || "", NDA_VERSION, ndaText);
    if (!result) return false;
    // NDA signed — route to intro (new user) or restore progress (returning)
    const progress = await loadProgress(user.id);
    if (progress) {
      // Returning user who just signed NDA — restore state
      const loadedHero = progress.hero || {};
      const migratedArmory = loadedHero.armory ? loadedHero.armory.map((item, i) => {
        const def = DEFAULT_ARMORY[i];
        return def ? { ...def, ...item } : item;
      }) : JSON.parse(JSON.stringify(DEFAULT_ARMORY));
      setHero({ ...loadedHero, armory: migratedArmory });
      if (progress.quest) setQuest(progress.quest);
      if (progress.battle_history) setBattleHistory(progress.battle_history);
      setShadowText(progress.shadow_text || '');
      if (progress.onboarding_state) setOnboardingState(progress.onboarding_state);
      setScreenHistory([]);
      if (progress.quest?.bosses?.length > 0) {
        setScreen("map");
      } else if (progress.onboarding_state?.exposureSort?.done) {
        setScreen("map");
      } else if (progress.tutorial_complete || progress.onboarding_state?.tutorial?.tutorialComplete) {
        setScreen("exposureSort");
      } else if (progress.screen && progress.screen !== 'login') {
        setScreen(progress.screen);
      } else {
        setScreen("intro");
      }
    } else {
      // Brand new user — set DARER ID and go to intro
      const id = "DARER_" + Math.floor(100000 + Math.random() * 900000);
      setHero(h => ({ ...h, darerId: id, name: id }));
      setScreen("intro");
    }
    return true;
  };

  const handleLogout = async () => {
    // Save progress before signing out so state isn't lost
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const payload = {
          screen,
          hero,
          quest,
          shadow_text: shadowText,
          onboarding_state: onboardingState,
        };
        if (onboardingState.tutorialComplete) {
          payload.tutorial_complete = true;
        }
        await saveProgress(user.id, payload);
      }
    } catch (e) { /* ignore save errors on logout */ }
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setScreenRaw("login");
    setScreenHistory([]);
  };

  const handleCharacterComplete = async (name, stats, traits, sadsScore, actValues) => {
    const strengthNames = traits.filter(t => t.type === "strength").map(t => t.text);
    setHero(h => ({ ...h, name, stats, traits, strengths: strengthNames, sads: sadsScore, coreValues: actValues || [] }));
    setScreen("values");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgress(user.id, { screen: "values", hero: { name, stats, traits, strengths: strengthNames, sads: sadsScore, coreValues: actValues || [] } });
  };

  const handleIntakeComplete = async (msgs, summaryText) => {
    setShadowText(summaryText || "");
    setScreen("shadowReveal");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgress(user.id, { screen: "shadowReveal", hero, quest, shadow_text: summaryText || "", intake_complete: true, intake_messages: msgs });
  };

  const handleBossVictory = async (outcome, details = {}) => {
    const { prepAnswers, suds, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, battleMessages, victoryMessages } = details;
    if (outcome === "victory") {
      setQuest(q => ({
        ...q,
        bosses: q.bosses.map(b => b.id === activeBoss.id ? { ...b, defeated: true, hp: 0 } : b),
      }));
      // Level up stats slightly on victory
      setHero(h => ({
        ...h,
        stats: {
          courage: Math.min(10, h.stats.courage + (Math.random() > 0.5 ? 1 : 0)),
          resilience: Math.min(10, h.stats.resilience + (Math.random() > 0.5 ? 1 : 0)),
          openness: Math.min(10, h.stats.openness + (Math.random() > 0.5 ? 1 : 0)),
        }
      }));
    } else if (outcome === "partial") {
      setQuest(q => ({
        ...q,
        bosses: q.bosses.map(b => b.id === activeBoss.id ? { ...b, hp: Math.max(0, b.hp - 50) } : b),
      }));
    }
    setActiveBoss(null);
    setScreen("map");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const prevHistory = Array.isArray(battleHistory) ? battleHistory : [];
      const battleRecord = {
        bossId: activeBoss?.id,
        bossName: activeBoss?.name,
        bossDesc: activeBoss?.desc,
        outcome,
        date: new Date().toISOString(),
        heroStats: hero?.stats,
        // Pre-battle preparation
        prepAnswers: prepAnswers || {},
        suds: suds || {},
        exposureWhen: exposureWhen || "",
        exposureWhere: exposureWhere || "",
        exposureArmory: exposureArmory || "",
        exposureScheduledTime: exposureScheduledTime || "",
        // Full AI conversations
        battleMessages: battleMessages || [],
        victoryMessages: victoryMessages || [],
      };
      const newHistory = [...prevHistory, battleRecord];
      setBattleHistory(newHistory);
      await saveProgress(user.id, { screen: "map", hero, quest, battle_history: newHistory });
    }
  };

  const handleTutorialComplete = async () => {
    setScreen("exposureSort");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgress(user.id, { screen: "exposureSort", hero, quest, tutorial_complete: true });
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      {/* Global back button — shown on all screens except login and map */}
      {!["login", "map", "battle"].includes(screen) && screenHistory.length > 0 && (
        <button onClick={goBack} style={{
          position: "absolute", top: ONBOARDING.some(s => s.key === screen) ? 68 : 12, left: 8, zIndex: 100,
          background: "#1A1218CC", border: "1px solid #5C3A50",
          borderRadius: 6, padding: "6px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          backdropFilter: "blur(4px)",
        }}>
          <PixelText size={7} color={C.grayLt}>← BACK</PixelText>
        </button>
      )}
      {screen === "login" && !authReady && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.mapBg }}>
          <link href={FONT_LINK} rel="stylesheet" />
          <PixelText size={10} color={C.goldMd}>Checking for existing hero...</PixelText>
        </div>
      )}
      {screen === "login" && authReady && <LoginScreen onLogin={handleLogin} />}
      {isAuthenticated && screen === "nda" && (
        <NdaAgreementScreen
          heroName={hero.name}
          darerId={hero.darerId}
          onAgree={handleNdaComplete}
          onDecline={handleLogout}
        />
      )}
      {isAuthenticated && screen !== "login" && screen !== "nda" && (
        <button onClick={handleLogout} style={{
          position: "absolute", top: ONBOARDING.some(s => s.key === screen) ? 68 : 12, right: 8, zIndex: 100,
          background: "#1A1218CC", border: "1px solid #5C3A50",
          borderRadius: 6, padding: "6px 12px", cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}>
          <PixelText size={7} color={C.grayLt}>LOGOUT</PixelText>
        </button>
      )}
      {/* Onboarding progress bar — shown from intro through training ground */}
      <OnboardingProgress screen={screen} />
      <div style={{ paddingTop: ONBOARDING.some(s => s.key === screen) ? 56 : 0 }}>
      {screen === "intro" && <GameIntro onComplete={() => setScreen("character")} obState={getOBState("intro", { slide: 0 })} setOBState={(s) => setOBState("intro", s)} />}
      {screen === "character" && <CharacterCreate initialName="" darerId={hero.darerId} onComplete={handleCharacterComplete} obState={getOBState("character", { name: "", nameConfirmed: false })} setOBState={(s) => setOBState("character", s)} />}
      {screen === "mapPreview" && <JourneyMapPreview heroName={hero.name} onContinue={() => setScreen("values")} obState={getOBState("mapPreview", { scrollPos: 0, phase: "intro" })} setOBState={(s) => setOBState("mapPreview", s)} />}
      {screen === "values" && <ValuesScreen heroName={hero.name} onComplete={(cards, text) => {
        setHero(h => ({ ...h, values: cards, valuesText: text }));
        setScreen("shadowLore");
      }} obState={getOBState("values", { step: "default", values: [], guideAnswers: [], guideStep: 0 })} setOBState={(s) => setOBState("values", s)} />}
      {/* === FULL CLINICAL FLOW === */}
      {/* shadowLore → psychoed → shadowLorePost → intake → shadowReveal → darerStrategy → tutorial → exposureSort */}
      {screen === "shadowLore" && <ShadowLore heroName={hero.name} onPsychoed={() => setScreen("psychoed")} onReady={() => setScreen("intake")} obState={getOBState("shadowLore", { step: 0 })} setOBState={(s) => setOBState("shadowLore", s)} />}
      {screen === "psychoed" && <PsychoEdScreen heroName={hero.name} heroValues={hero.values || []} onContinue={() => setScreen("shadowLorePost")} obState={getOBState("psychoed", { step: 0 })} setOBState={(s) => setOBState("psychoed", s)} />}
      {screen === "shadowLorePost" && <ShadowLore heroName={hero.name} initialStep={2} onPsychoed={() => {}} onReady={() => setScreen("intake")} obState={getOBState("shadowLorePost", { step: 2 })} setOBState={(s) => setOBState("shadowLorePost", s)} />}
      {screen === "intake" && <IntakeScreen heroName={hero.name} hero={hero} quest={quest} onComplete={handleIntakeComplete} obState={getOBState("intake", { chatHistory: [] })} setOBState={(s) => setOBState("intake", s)} />}
      {screen === "shadowReveal" && <ShadowReveal heroName={hero.name} shadowText={shadowText} onContinue={() => setScreen("darerStrategy")} obState={getOBState("shadowReveal", { revealed: false })} setOBState={(s) => setOBState("shadowReveal", s)} />}
      {screen === "darerStrategy" && <DARERStrategy heroName={hero.name} shadowText={shadowText} heroValues={hero.values || []} onContinue={() => setScreen("armoryIntro")} obState={getOBState("darerStrategy", { step: 0 })} setOBState={(s) => setOBState("darerStrategy", s)} />}
      {screen === "armoryIntro" && <ArmoryScreen heroName={hero.name} onContinue={() => setScreen("tutorial")} obState={getOBState("armoryIntro", { step: "intro" })} setOBState={(s) => setOBState("armoryIntro", s)} />}
      {screen === "tutorial" && <TutorialBattle heroName={hero.name} hero={hero} quest={quest} shadowText={shadowText} heroValues={hero.values || []} heroStrengths={hero.strengths || []} heroCoreValues={hero.coreValues || []} onComplete={handleTutorialComplete} obState={getOBState("tutorial", { step: 0 })} setOBState={(s) => setOBState("tutorial", s)} />}
      {screen === "exposureSort" && <ExposureSortScreen hero={hero} shadowText={shadowText} onComplete={(bosses) => {
        setQuest(q => ({ ...q, bosses, goal: hero.values?.[0]?.text || q.goal }));
        setScreen("map");
      }} obState={getOBState("exposureSort", { currentCard: 0, accepted: [], rejected: [], done: false })} setOBState={(s) => setOBState("exposureSort", s)} />}
      {/* === END CLINICAL FLOW === */}
      {screen === "map" && <GameMap quest={quest} hero={hero} battleHistory={battleHistory} onSelectBoss={b => { setActiveBoss(b); setScreen("battle"); }} onViewProfile={() => setScreen("profile")} onArmory={() => setScreen("armory")} onLadder={() => setScreen("ladder")} onAddExposure={() => setAddMode("menu")} onAchieveBoss={handleAchieveBoss} onDeleteBoss={handleDeleteBoss} justAddedBossId={justAddedBossId} />}
      {screen === "battle" && activeBoss && <BossBattle boss={activeBoss} quest={quest} hero={hero} shadowText={shadowText} battleHistory={battleHistory} onVictory={handleBossVictory} onRetreat={() => { setActiveBoss(null); setScreen("map"); }} obState={getOBState("battle", { phase: "prep", prepStep: 0, prepAnswers: { value: "", allow: "", rise: "" }, suds: { before: 50, during: 60, after: 30 }, outcome: null })} setOBState={(s) => setOBState("battle", s)} />}
      {screen === "profile" && <HeroProfile hero={hero} quest={quest} battleHistory={battleHistory} onBack={() => setScreen("map")} setScreen={setScreen} />}
      {screen === "armory" && <GameArmory hero={hero} setHero={setHero} setScreen={setScreen} onBack={() => setScreen("map")} />}
      {screen === "ladder" && <LadderScreen hero={hero} quest={quest} setScreen={setScreen} onBack={() => setScreen("map")} />}

      {/* Delete Confirmation Dialog */}
      {pendingDeleteBoss && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{
            width: "100%", maxWidth: 400, background: "#1A1218",
            border: `3px solid ${C.bossRed}`, borderRadius: 8,
            padding: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <PixelText size={11} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>DELETE EXPOSURE?</PixelText>
            <div style={{ padding: 12, background: "#222", borderRadius: 6, marginBottom: 16 }}>
              <PixelText size={9} color={C.cream}>{pendingDeleteBoss.name}</PixelText>
              <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{pendingDeleteBoss.desc}</PixelText></div>
            </div>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16, lineHeight: 1.6 }}>
              {pendingDeleteBoss.isCustom
                ? "This custom exposure will be permanently removed from your journey."
                : "This exposure will be hidden from your map. You can re-add it later."}
            </PixelText>
            <div style={{ display: "flex", gap: 8 }}>
              <PixelBtn onClick={() => setPendingDeleteBoss(null)} color={C.plum} style={{ flex: 1 }}>CANCEL</PixelBtn>
              <PixelBtn onClick={confirmDeleteBoss} color={C.bossRed} style={{ flex: 1 }}>DELETE</PixelBtn>
            </div>
          </div>
        </div>
      )}

      {/* Add Exposure Modal — menu */}
      {addMode === "menu" && (
        <AddExposureModal
          onClose={() => setAddMode(null)}
          onManualEntry={() => setAddMode("manual")}
          onAskDara={() => setAddMode("ask-dara")}
        />
      )}

      {/* Add Exposure Modal — Ask Dara chat */}
      {addMode === "ask-dara" && (
        <AskDaraChat
          onClose={() => setAddMode(null)}
          heroContext={buildHeroContext(hero, quest, shadowText, battleHistory)}
          onSubmit={(data) => {
            const id = `custom_${Date.now()}`;
            const newBoss = {
              id,
              name: data.name,
              desc: data.desc,
              difficulty: data.difficulty,
              defeated: false,
              hp: 100,
              maxHp: 100,
              isCustom: true,
            };
            setQuest(q => ({ ...q, bosses: [...q.bosses, newBoss] }));
            setJustAddedBossId(id);
            setTimeout(() => setJustAddedBossId(null), 3000);
            setAddMode(null);
          }}
          onFallback={() => setAddMode("manual")}
        />
      )}

      {/* Add Exposure Modal — manual entry form */}
      {addMode === "manual" && (
        <AddManualEntryForm
          onClose={() => setAddMode(null)}
          onSubmit={(data) => {
            const id = `custom_${Date.now()}`;
            const newBoss = {
              id,
              name: data.name,
              desc: data.desc,
              difficulty: data.difficulty,
              defeated: false,
              hp: 100,
              maxHp: 100,
              isCustom: true,
            };
            setQuest(q => ({ ...q, bosses: [...q.bosses, newBoss] }));
            setJustAddedBossId(id);
            setTimeout(() => setJustAddedBossId(null), 3000);
            setAddMode(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
