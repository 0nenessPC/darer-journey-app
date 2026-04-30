import { useState, useEffect, useRef } from "react";
import { C, FONT_LINK } from "../constants/gameData";
import { PixelText, PixelBtn, DialogBox } from "../components/shared";

export default function ArmoryScreen({ heroName, onContinue, obState = {}, setOBState }) {
  const armoryStep = obState.step || "intro";
  const setArmoryStep = (v) => setOBState({ step: typeof v === 'function' ? v(armoryStep) : v });
  const [breathPhase, setBreathPhase] = useState("inhale");
  const [breathTimer, setBreathTimer] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const timerRef = useRef(null);
  const practiceDuration = 180; // 3 minutes
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
                We'll practice for 3 minutes.{"\n"}You don't need to do it{"\n"}perfectly. Just follow the{"\n"}rhythm.
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

    </div>
  );
}
