import { useState, useEffect, useRef, useCallback } from "react";
import { C, PIXEL_FONT, FONT_LINK } from "../constants/gameData";
import { PixelText, PixelBtn } from "../components/shared";

// Soft tone generator using Web Audio API
function playBreathTone(audioCtx, freq, duration, type = "sine", volume = 0.08) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Tone for each breathing phase: inhale rises, exhale falls, holds are soft pings
const BREATH_TONES = [
  { freq: 396, endFreq: 528, label: "inhale" },   // Breathe In — ascending
  { freq: 528, label: "hold-in" },                 // Hold (after inhale) — single tone
  { freq: 528, endFreq: 396, label: "exhale" },   // Breathe Out — descending
  { freq: 396, label: "hold-out" },                // Hold (after exhale) — single tone
];

export default function PracticeSession({ tool, onComplete, onQuit }) {
  const [phase, setPhase] = useState("intro");
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCycles, setBreathCycles] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    audioCtxRef.current?.close();
  }, []);

  const playToneForPhase = useCallback((bp) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const tone = BREATH_TONES[bp];
    if (tone.endFreq) {
      // Sweeping tone for inhale/exhale
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.freq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(tone.endFreq, ctx.currentTime + breathDurations[bp]);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.15);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + breathDurations[bp]);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + breathDurations[bp]);
    } else {
      playBreathTone(ctx, tone.freq, 0.8, "sine", 0.05);
    }
  }, []);

  const breathLabels = ["BREATHE IN", "HOLD", "BREATHE OUT", "HOLD"];
  const breathDurations = [4, 2, 6, 2];

  // Advance breathing phase when timer reaches duration
  useEffect(() => {
    if (phase !== "running" || tool?.id !== "breathing" || paused) return;
    const dur = breathDurations[breathPhase];
    if (timer >= dur) {
      const nextPhase = (breathPhase + 1) % 4;
      playToneForPhase(nextPhase);
      if (nextPhase === 0) {
        setBreathCycles(c => {
          const next = c + 1;
          if (next >= 1) { setPhase("done"); }
          return next;
        });
      }
      setBreathPhase(nextPhase);
      setTimer(0);
    }
  }, [timer, breathPhase, phase, paused, playToneForPhase, tool?.id]);

  // Manage breathing timer interval — restarts on phase change and pause/resume
  useEffect(() => {
    if (phase !== "running" || tool?.id !== "breathing" || paused) return;
    intervalRef.current = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [breathPhase, phase, paused, tool?.id]);

  // Manage grounding timer interval
  useEffect(() => {
    if (phase !== "running" || tool?.id !== "grounding" || paused) return;
    intervalRef.current = setInterval(() => {
      setStep(s => {
        if (s >= 4) { setPhase("done"); return s; }
        return s + 1;
      });
      setTimer(0);
    }, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step, phase, paused, tool?.id]);

  // Manage allowing timer interval
  useEffect(() => {
    if (phase !== "running" || tool?.id !== "allowing" || paused) return;
    intervalRef.current = setInterval(() => {
      setStep(s => {
        if (s >= 2) { setPhase("done"); return s; }
        return s + 1;
      });
      setTimer(0);
    }, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step, phase, paused, tool?.id]);

  // Manage values timer interval
  useEffect(() => {
    if (phase !== "running" || tool?.id !== "values" || paused) return;
    intervalRef.current = setInterval(() => {
      setStep(s => {
        if (s >= 2) { setPhase("done"); return s; }
        return s + 1;
      });
      setTimer(0);
    }, 12000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step, phase, paused, tool?.id]);

  const startPractice = () => {
    setPhase("running");
    setStep(0);
    setTimer(0);
    setPaused(false);
    if (tool?.id === "breathing") {
      setBreathPhase(0);
      setBreathCycles(0);
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      playToneForPhase(0);
      // Interval managed by useEffect — avoids stale closure issues
    }
    // Grounding/allowing/values intervals managed by their respective useEffects
  };

  const togglePause = () => {
    if (!paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPaused(true);
    } else {
      setPaused(false);
    }
  };

  if (phase === "intro") {
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <div style={{ fontSize: 56, marginBottom: 16 }}>{tool?.icon}</div>
        <PixelText size={12} color={C.cream} style={{ display: "block", marginBottom: 8 }}>{tool?.name}</PixelText>
        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 24, lineHeight: 1.6 }}>{tool?.description}</PixelText>
        <div style={{ padding: 12, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, marginBottom: 24 }}>
          <PixelText size={7} color={C.grayLt}>Follow the rhythm. There is no skip — complete the exercise to earn credit.{"\n"}You can pause at any time.</PixelText>
        </div>
        <PixelBtn onClick={startPractice} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginBottom: 12 }}>▶ START</PixelBtn>
        <button onClick={onQuit} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <PixelText size={7} color={C.grayLt}>← Return to armory</PixelText>
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
        <PixelText size={12} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>PRACTICE COMPLETE!</PixelText>
        <PixelText size={8} color={C.cream} style={{ display: "block", marginBottom: 24 }}>The Storm grows weaker with each practice.</PixelText>
        <PixelBtn onClick={onComplete} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>CONTINUE</PixelBtn>
      </div>
    );
  }

  // Breathing
  if (tool?.id === "breathing") {
    const currentDur = breathDurations[breathPhase];
    const remaining = currentDur - timer;
    const phaseColors = [C.teal, C.amber, C.plumMd, C.amber];
    const phaseColor = phaseColors[breathPhase];

    // Paused overlay
    if (paused) {
      return (
        <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <link href={FONT_LINK} rel="stylesheet" />
          <button onClick={onQuit} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer" }}>
            <PixelText size={7} color={C.grayLt}>← Quit</PixelText>
          </button>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏸</div>
          <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>PAUSED</PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 24 }}>
            You were on: {breathLabels[breathPhase]} · Cycle {breathCycles + 1}/1
          </PixelText>
          <PixelBtn onClick={togglePause} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginBottom: 12 }}>▶ RESUME</PixelBtn>
          <button onClick={onQuit} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <PixelText size={7} color={C.grayLt}>← Quit practice</PixelText>
          </button>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <button onClick={onQuit} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer" }}>
          <PixelText size={7} color={C.grayLt}>← Quit</PixelText>
        </button>
        <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>Cycle {breathCycles + 1}/1</PixelText>
        <PixelText size={14} color={phaseColor} style={{ display: "block", marginBottom: 16 }}>{breathLabels[breathPhase]}</PixelText>
        <div style={{ width: 120, height: 120, borderRadius: "50%", border: `4px solid ${phaseColor}60`, background: `${phaseColor}15`, display: "flex", alignItems: "center", justifyContent: "center", animation: breathPhase === 0 ? "breatheIn 4s ease-in-out" : breathPhase === 2 ? "breatheOut 6s ease-in-out" : "none" }}>
          <PixelText size={20} color={phaseColor}>{remaining}</PixelText>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {breathLabels.map((label, i) => {
            const bColor = i === breathPhase ? phaseColors[i] : "#5C3A50";
            return (
            <div key={i} style={{ padding: "4px 8px", borderRadius: 4, background: i === breathPhase ? phaseColors[i] + "30" : "#1A1218", border: `2px solid ${bColor}` }}>
              <PixelText size={6} color={i === breathPhase ? phaseColors[i] : C.grayLt}>{breathDurations[i]}s</PixelText>
            </div>
            );
          })}
        </div>
        <button onClick={togglePause} style={{
          marginTop: 20, background: "#1A1218", border: `2px solid ${C.grayLt}40`,
          borderRadius: 6, padding: "8px 20px", cursor: "pointer",
        }}>
          <PixelText size={8} color={C.grayLt}>⏸ PAUSE</PixelText>
        </button>
        <style>{`@keyframes breatheIn { from{transform:scale(0.7)} to{transform:scale(1.15)} } @keyframes breatheOut { from{transform:scale(1.15)} to{transform:scale(0.7)} }`}</style>
      </div>
    );
  }

  // Grounding
  if (tool?.id === "grounding") {
    const gSteps = [
      { num: 5, text: "Look around. Name 5 things you can SEE.", hint: "Notice colors, shapes, light..." },
      { num: 4, text: "Now notice 4 things you can FEEL.", hint: "Your feet on the floor, the air on your skin..." },
      { num: 3, text: "Listen for 3 things you can HEAR.", hint: "Traffic, birds, your own breathing..." },
      { num: 2, text: "Notice 2 things you can SMELL.", hint: "Coffee, fresh air, soap..." },
      { num: 1, text: "Name 1 thing you can TASTE.", hint: "Tea, mint, the taste of the air..." },
    ];
    const gs = gSteps[step] || gSteps[gSteps.length - 1];
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <button onClick={onQuit} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer" }}>
          <PixelText size={7} color={C.grayLt}>← Quit</PixelText>
        </button>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.teal + "15", border: `3px solid ${C.teal}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <PixelText size={20} color={C.teal}>{gs.num}</PixelText>
        </div>
        <PixelText size={10} color={C.cream} style={{ display: "block", marginBottom: 8 }}>{gs.text}</PixelText>
        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>{gs.hint}</PixelText>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {gSteps.map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i <= step ? C.teal : "#5C3A50" }} />)}
        </div>
        <PixelText size={8} color={C.grayLt}>Continue in {10 - timer}s</PixelText>
        <button onClick={togglePause} style={{
          marginTop: 16, background: "#1A1218", border: `2px solid ${C.grayLt}40`,
          borderRadius: 6, padding: "8px 20px", cursor: "pointer",
        }}>
          <PixelText size={7} color={C.grayLt}>⏸ PAUSE</PixelText>
        </button>
      </div>
    );
  }

  // Allow the Storm
  if (tool?.id === "allowing") {
    const aSteps = [
      { text: "Close your eyes. Feel the anxiety in your body. Don't fight it. Let it be there.", sub: "The Storm is not your enemy. It's just energy passing through." },
      { text: "Say to yourself: 'This is just anxiety. It will pass. I don't need to escape.'", sub: "You don't need to fix it. Just notice it, like watching clouds." },
      { text: "Take a deep breath. The Storm is still here, but you're still here too. You're bigger than it.", sub: "Every time you allow the Storm without fleeing, you weaken the Shadow." },
    ];
    const as = aSteps[step] || aSteps[aSteps.length - 1];
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <button onClick={onQuit} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer" }}>
          <PixelText size={7} color={C.grayLt}>← Quit</PixelText>
        </button>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
        <div style={{ padding: 16, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, marginBottom: 16 }}>
          <PixelText size={9} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>{as.text}</PixelText>
        </div>
        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>{as.sub}</PixelText>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {aSteps.map((_, i) => <div key={i} style={{ width: 24, height: 6, borderRadius: 3, background: i <= step ? C.hpGreen : "#5C3A50" }} />)}
        </div>
        <PixelText size={8} color={C.grayLt}>Continue in {15 - timer}s</PixelText>
        <button onClick={togglePause} style={{
          marginTop: 16, background: "#1A1218", border: `2px solid ${C.grayLt}40`,
          borderRadius: 6, padding: "8px 20px", cursor: "pointer",
        }}>
          <PixelText size={7} color={C.grayLt}>⏸ PAUSE</PixelText>
        </button>
      </div>
    );
  }

  // Value Anchoring
  if (tool?.id === "values") {
    const vSteps = [
      { text: "Think about what matters most to you. What kind of person do you want to be?", sub: "Not what you should do — what you deeply care about." },
      { text: "Picture a moment when you lived that value. How did it feel? What did it look like?", sub: "That feeling is your anchor. It's always available." },
      { text: "Carry that feeling with you now. This is your compass — not the Storm, not the Shadow.", sub: "When anxiety hits, come back to this. This is who you are." },
    ];
    const vs = vSteps[step] || vSteps[vSteps.length - 1];
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <button onClick={onQuit} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer" }}>
          <PixelText size={7} color={C.grayLt}>← Quit</PixelText>
        </button>
        <div style={{ fontSize: 40, marginBottom: 16 }}>💎</div>
        <div style={{ padding: 16, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, marginBottom: 16 }}>
          <PixelText size={9} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>{vs.text}</PixelText>
        </div>
        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>{vs.sub}</PixelText>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {vSteps.map((_, i) => <div key={i} style={{ width: 24, height: 6, borderRadius: 3, background: i <= step ? C.goalGold : "#5C3A50" }} />)}
        </div>
        <PixelText size={8} color={C.grayLt}>Continue in {12 - timer}s</PixelText>
        <button onClick={togglePause} style={{
          marginTop: 16, background: "#1A1218", border: `2px solid ${C.grayLt}40`,
          borderRadius: 6, padding: "8px 20px", cursor: "pointer",
        }}>
          <PixelText size={7} color={C.grayLt}>⏸ PAUSE</PixelText>
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <PixelText size={10} color={C.grayLt}>Practice session</PixelText>
      <PixelBtn onClick={onComplete} color={C.gold} textColor={C.charcoal} style={{ marginTop: 16 }}>CONTINUE</PixelBtn>
    </div>
  );
}
