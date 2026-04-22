import { useState, useEffect } from "react";
import { C, PIXEL_FONT, FONT_LINK } from "../constants/gameData";
import { PixelText, PixelBtn, DialogBox } from "../components/shared.jsx";

export default function PsychoEdScreen({ heroName, heroValues, onContinue }) {
  const [step, setStep] = useState(0);
  const valueName = heroValues?.[0]?.text || "the life you deserve";

  // Cycle animation step
  const [cycleHighlight, setCycleHighlight] = useState(0);
  useEffect(() => {
    if (step === 4) {
      const interval = setInterval(() => setCycleHighlight(h => (h + 1) % 6), 1200);
      return () => clearInterval(interval);
    }
  }, [step]);

  const CycleDiagram = () => {
    const nodes = [
      { label: "SHADOW'S\nTERRITORY", icon: "📍", color: C.plumMd },
      { label: "INNER\nSTORM", icon: "🌀", color: C.bossRed },
      { label: "F.E.A.R.", icon: "😨", color: "#FF4444" },
      { label: "THE\nESCAPE", icon: "🏃", color: "#E8A04A" },
      { label: "BRIEF\nRELIEF", icon: "😮‍💨", color: C.hpGreen },
      { label: "SHADOW\nGROWS", icon: "👤", color: "#888" },
    ];
    const size = 280;
    const cx = size / 2, cy = size / 2, r = 100;
    return (
      <div style={{ width: size, height: size, position: "relative", margin: "0 auto 12px" }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {/* Arrow circle */}
          {nodes.map((_, i) => {
            const a1 = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const a2 = ((i + 1) / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x1 = cx + Math.cos(a1) * r;
            const y1 = cy + Math.sin(a1) * r;
            const x2 = cx + Math.cos(a2) * r;
            const y2 = cy + Math.sin(a2) * r;
            const active = cycleHighlight === i;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={active ? nodes[i].color : "#5C3A50"}
                strokeWidth={active ? 3 : 1.5}
                strokeDasharray={active ? "none" : "4,4"}
                markerEnd="url(#arrow)"
                style={{ transition: "all 0.3s" }}
              />
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#5C3A50" />
            </marker>
          </defs>
        </svg>
        {/* Node labels */}
        {nodes.map((n, i) => {
          const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const active = cycleHighlight === i;
          const isFear = n.label === "F.E.A.R.";
          return (
            <div key={i} style={{
              position: "absolute", left: x - (isFear ? 36 : 32), top: y - (isFear ? 32 : 28),
              width: isFear ? 72 : 64, textAlign: "center",
              opacity: active ? 1 : isFear ? 0.9 : 0.6,
              transform: active ? "scale(1.2)" : isFear ? "scale(1.1)" : "scale(1)",
              transition: "all 0.3s",
              zIndex: isFear ? 10 : 1,
            }}>
              {isFear && <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                background: "#FF444425", border: "2px solid #FF444480",
                boxShadow: active ? "0 0 30px #FF444460, 0 0 60px #FF444420" : "0 0 16px #FF444430, 0 0 40px #FF444415",
                animation: "fearPulse 1.5s ease-in-out infinite",
              }} />}
              <div style={{ fontSize: isFear ? 24 : 18, position: "relative" }}>{n.icon}</div>
              <div style={{
                fontFamily: PIXEL_FONT, fontSize: isFear ? 9 : 6,
                color: active ? n.color : isFear ? "#FF4444" : C.grayLt,
                lineHeight: 1.3, whiteSpace: "pre-line",
                fontWeight: isFear ? "bold" : "normal",
                position: "relative",
                textShadow: isFear ? "0 0 8px #FF444460" : "none",
              }}>{n.label}</div>
            </div>
          );
        })}
        {/* Center text */}
        <div style={{
          position: "absolute", left: cx - 40, top: cy - 16, width: 80,
          textAlign: "center",
        }}>
          <div style={{ fontFamily: PIXEL_FONT, fontSize: 6, color: C.bossRed }}>THE INFINITE</div>
          <div style={{ fontFamily: PIXEL_FONT, fontSize: 6, color: C.bossRed }}>TRAP</div>
        </div>
      </div>
    );
  };

  // Shadow defenses (top) vs DARER strategies (bottom) layout helper
  const TopSection = ({ children }) => (
    <div style={{ background: C.bossRed + "08", border: `1px solid ${C.bossRed}20`, borderRadius: 8, padding: "16px 12px", marginBottom: 12 }}>
      {children}
    </div>
  );
  const BottomSection = ({ children }) => (
    <div style={{ background: C.hpGreen + "08", border: `1px solid ${C.hpGreen}20`, borderRadius: 8, padding: "16px 12px" }}>
      <PixelText size={6} color={C.hpGreen} style={{ display: "block", marginBottom: 8, letterSpacing: 2 }}>THE DARER'S COUNTER</PixelText>
      {children}
    </div>
  );

  const slides = [
    // Slide 0: Intro
    { render: () => (
      <div>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>⚔️</div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 16 }}>THE SHADOW'S TRICKS</PixelText>
        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
            {heroName}, now that we've seen{"\n"}where the Shadow hides, you need{"\n"}to understand how it fights.{"\n"}{"\n"}
            The Shadow uses three tricks{"\n"}against you — and they feed{"\n"}each other in a vicious cycle.
          </PixelText>
        </DialogBox>
      </div>
    )},
    // Slide 1: Shadow's Territory (red only)
    { render: () => (
      <div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>SHADOW'S TRICK ONE</PixelText>
        <TopSection>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
          <PixelText size={9} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>THE SHADOW'S TERRITORY</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            The Shadow chooses its{"\n"}battlegrounds carefully —{"\n"}parties, meetings, phone calls,{"\n"}small talk, being watched.{"\n"}{"\n"}
            Over time, more and more places{"\n"}become "Shadow territory" — and{"\n"}your world gets smaller.
          </PixelText>
        </TopSection>
      </div>
    )},
    // Slide 2: Inner Storm (red only)
    { render: () => (
      <div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>SHADOW'S TRICK TWO</PixelText>
        <TopSection>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌀</div>
          <PixelText size={9} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>THE INNER STORM</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            When you enter its territory,{"\n"}the Shadow strikes from within.{"\n"}{"\n"}
            Your mind fills with whispers:{"\n"}"They'll judge me." "I'll freeze."{"\n"}"Everyone can see I'm nervous."{"\n"}{"\n"}
            Your body sounds the alarm:{"\n"}racing heart, sweating palms,{"\n"}shaking, blushing, a knot in{"\n"}your stomach.{"\n"}{"\n"}
            Thoughts and body fuel each{"\n"}other — the storm intensifies.
          </PixelText>
        </TopSection>
      </div>
    )},
    // Slide 3: The Escape (red only)
    { render: () => (
      <div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>SHADOW'S TRICK THREE</PixelText>
        <TopSection>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏃</div>
          <PixelText size={9} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>THE ESCAPE</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            When the Inner Storm hits,{"\n"}the urge to escape is powerful.{"\n"}Avoid eye contact. Stay quiet.{"\n"}Leave early. Cancel plans.{"\n"}{"\n"}
            The relief is instant — but{"\n"}every escape teaches your brain{"\n"}the danger was real. The Shadow{"\n"}grows. The territory expands.{"\n"}{"\n"}
            What you're avoiding leads to{"\n"}{valueName}.
          </PixelText>
        </TopSection>
      </div>
    )},
    // Slide 4: The Cycle (visual diagram)
    { render: () => (
      <div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>THE SHADOW'S INFINITE TRAP</PixelText>
        <CycleDiagram />
        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
            Territory triggers the Storm.{"\n"}The Storm becomes F.E.A.R.{"\n"}F.E.A.R. drives the Escape.{"\n"}The Escape feeds the Shadow.{"\n"}The Shadow claims more territory.{"\n"}{"\n"}
            Each time around, your world{"\n"}gets smaller.
          </PixelText>
        </DialogBox>
      </div>
    )},
    // Slide 5: Wrap-up (no mention of counters)
    { render: () => (
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👁</div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>NOW YOU SEE IT</PixelText>
        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
            You now understand how the{"\n"}Shadow fights — its Territory,{"\n"}the Inner Storm, and the Escape.{"\n"}{"\n"}
            You see the vicious cycle that{"\n"}keeps it alive.{"\n"}{"\n"}
            The Shadow has survived this{"\n"}long because nobody stopped to{"\n"}look at it this clearly.{"\n"}{"\n"}
            That changes now.
          </PixelText>
        </DialogBox>
      </div>
    )},
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "32px 20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div key={step} style={{ animation: "fadeIn 0.5s ease-out", maxWidth: 380, width: "100%" }}>
        {slides[step].render()}
      </div>
      <div style={{ display: "flex", gap: 6, margin: "16px 0" }}>
        {slides.map((_, i) => <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? C.goldMd : "#5C3A50", transition: "all 0.3s" }} />)}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && <PixelBtn onClick={() => setStep(s => s - 1)} color={C.plum}>← BACK</PixelBtn>}
        <PixelBtn onClick={() => step < slides.length - 1 ? setStep(s => s + 1) : onContinue()} color={step === slides.length - 1 ? C.gold : C.plum} textColor={step === slides.length - 1 ? C.charcoal : C.cream}>
          {step === slides.length - 1 ? "CONTINUE →" : "NEXT"}
        </PixelBtn>
      </div>

    </div>
  );
}
