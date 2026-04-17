// D.A.R.E.R. Journey — Landing Page
// Warm Dusk + Pixel Game Aesthetic

const C = {
  plum: "#7B4B6A", plumLt: "#F5EBE8", plumMd: "#C89DB2",
  gold: "#D4A050", goldLt: "#FAF0E0", goldMd: "#E8C87A",
  cream: "#F5EDE8", charcoal: "#3D2E3A", gray: "#7A6B75", grayLt: "#B8A8B2",
  rose: "#D4A59A", roseLt: "#F5EBE8",
  amber: "#C48A5A", amberLt: "#FAF0E0",
  white: "#FFFFFF", red: "#C45A5A", redLt: "#FAE8E8",
  teal: "#6BA5A0", tealLt: "#E0F0EE",
  sky: "#7AADBE",
  mapBg: "#2A1F28", mapPath: "#5C3A50", bossRed: "#C45A5A", goalGold: "#E8C87A",
  hpGreen: "#6BA56B", hpRed: "#C45A5A", xpPurple: "#9B7BAA",
};

const PIXEL_FONT = "'Press Start 2P', 'Courier New', monospace";
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

function PixelText({ children, size = 10, color = C.cream, style = {} }) {
  return <span style={{ fontFamily: PIXEL_FONT, fontSize: size, color, lineHeight: 1.6, ...style }}>{children}</span>;
}

function PixelBtn({ children, onClick, color = C.plum, textColor = C.cream, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: PIXEL_FONT, fontSize: 10, padding: "14px 24px",
      background: disabled ? C.grayLt : color, color: disabled ? C.gray : textColor,
      border: `3px solid ${disabled ? C.gray : (color === C.plum ? "#5C3A50" : "#A07830")}`,
      borderRadius: 4, cursor: disabled ? "default" : "pointer",
      boxShadow: disabled ? "none" : `0 4px 0 ${color === C.plum ? "#4A2D40" : "#806020"}`,
      transition: "transform 0.1s", imageRendering: "pixelated", ...style,
    }}>{children}</button>
  );
}

// ============ LANDING PAGE ============
export default function LandingPage({ onStart }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fadeInUp = (delay = 0) => ({
    opacity: scrollY > -1 ? 1 : 0,
    transform: scrollY > -1 ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.mapBg, color: C.cream, overflowX: "hidden" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* ===== HERO SECTION ===== */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", textAlign: "center",
        padding: "80px 24px", position: "relative", overflow: "hidden",
      }}>
        {/* Ambient floating particles */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {Array.from({ length: 20 }).map((_, i) => {
            const left = (i * 37 + 13) % 100;
            const top = (i * 53 + 7) % 100;
            const size = 2 + (i % 3);
            const delay = (i * 0.4) % 5;
            return (
              <div key={i} style={{
                position: "absolute", left: `${left}%`, top: `${top}%`,
                width: size, height: size, borderRadius: "50%",
                background: i % 3 === 0 ? C.goldMd + "40" : i % 3 === 1 ? C.plumMd + "30" : C.teal + "25",
                animation: `float ${3 + (i % 3)}s ease-in-out ${delay}s infinite`,
              }} />
            );
          })}
        </div>

        {/* Logo / Title */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Sword icon */}
          <div style={{
            width: 96, height: 96, margin: "0 auto 28px", borderRadius: 12,
            background: "linear-gradient(135deg, #2A1A28 0%, #1A1218 100%)",
            border: `4px solid ${C.goldMd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${C.goldMd}25, 0 0 80px ${C.goldMd}10`,
          }}>
            <PixelText size={48} color={C.goldMd}>⚔</PixelText>
          </div>

          <PixelText size={32} color={C.goldMd} style={{ display: "block", letterSpacing: 4, marginBottom: 12 }}>
            D.A.R.E.R.
          </PixelText>
          <PixelText size={10} color={C.plumMd} style={{ display: "block", marginBottom: 32, letterSpacing: 3 }}>
            DARE TO FEAR. DARE TO ACT.
          </PixelText>

          {/* Tagline */}
          <div style={{ maxWidth: 520, margin: "0 auto 36px" }}>
            <p style={{
              fontSize: 18, lineHeight: 1.8, color: C.grayLt, margin: 0,
            }}>
              Turn social anxiety into an adventure you can win.
              Face the Shadow of fear, one battle at a time, guided by
              your companion Dara.
            </p>
          </div>

          {/* CTA */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <PixelBtn onClick={onStart} color={C.gold} textColor={C.charcoal}>
              BEGIN YOUR JOURNEY ⚔
            </PixelBtn>
            <a href="#how" style={{ textDecoration: "none" }}>
              <PixelBtn color="transparent" textColor={C.grayLt}
                style={{ borderColor: "#5C3A50" }}>
                LEARN MORE ↓
              </PixelBtn>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
          animation: "bounce 2s ease-in-out infinite",
        }}>
          <div style={{
            width: 20, height: 32, borderRadius: 10, border: `2px solid ${C.grayLt}40`,
            display: "flex", justifyContent: "center", paddingTop: 6,
          }}>
            <div style={{
              width: 3, height: 8, borderRadius: 2, background: C.goldMd + "60",
              animation: "scrollDot 2s ease-in-out infinite",
            }} />
          </div>
        </div>
      </section>

      {/* ===== WHAT IS THE SHADOW? ===== */}
      <section style={{
        padding: "80px 24px", maxWidth: 700, margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <PixelText size={14} color={C.bossRed} style={{ display: "block", marginBottom: 16 }}>
            👁 THE SHADOW
          </PixelText>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: C.grayLt, margin: "0 auto", maxWidth: 560 }}>
            Social anxiety isn't just "being shy." It's a powerful force that
            turns words into walls, makes crowds feel like cages, and convinces
            you that staying small is the same as staying safe.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: C.grayLt, margin: "16px auto 0", maxWidth: 560 }}>
            <strong style={{ color: C.goldMd }}>We call it the Shadow.</strong> And it has been
            winning — until now.
          </p>
        </div>

        {/* Shadow's Cycle */}
        <div style={{
          background: "#1A1218", border: `2px solid ${C.bossRed}30`,
          borderRadius: 12, padding: 32, textAlign: "center",
        }}>
          <PixelText size={9} color={C.bossRed} style={{ display: "block", marginBottom: 20 }}>
            THE SHADOW'S INFINITE TRAP
          </PixelText>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { icon: "📍", label: "Territory", color: C.plumMd },
              { icon: "🌀", label: "Inner Storm", color: C.amber },
              { icon: "😨", label: "F.E.A.R.", color: C.red },
              { icon: "🏃", label: "Escape", color: C.xpPurple },
              { icon: "😮‍💨", label: "Brief Relief", color: C.hpGreen },
              { icon: "👤", label: "Shadow Grows", color: C.gray },
            ].map((node, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, margin: "0 auto 6px", borderRadius: "50%",
                  background: node.color + "15", border: `2px solid ${node.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                }}>{node.icon}</div>
                <PixelText size={6} color={node.color}>{node.label.toUpperCase()}</PixelText>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: C.grayLt, margin: 0 }}>
            Territory triggers the Storm → Storm becomes Fear → Fear drives Escape →
            Escape feeds the Shadow → Shadow claims more territory.
            <br /><strong style={{ color: C.cream }}>Every time around, your world gets smaller.</strong>
          </p>
        </div>
      </section>

      {/* ===== HOW IT WORKS (D.A.R.E.R. Cycle) ===== */}
      <section id="how" style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, transparent 0%, #1E1520 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <PixelText size={14} color={C.goldMd} style={{ display: "block", marginBottom: 16 }}>
              ⚔ YOUR WEAPONS
            </PixelText>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: C.grayLt, margin: 0 }}>
              The D.A.R.E.R. cycle breaks the Shadow's trap — each letter is a
              weapon against a specific trick.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { letter: "D", word: "DECIDE", icon: "🏰", color: C.goalGold, desc: "Choose which territory to reclaim. Your values are your compass — they give you a reason to fight." },
              { letter: "A", word: "ALLOW", icon: "🌊", color: C.hpGreen, desc: "Let the Inner Storm be there without obeying it. Racing heart, anxious thoughts — they're passengers, not drivers." },
              { letter: "R", word: "RISE", icon: "👁", color: C.teal, desc: "Step into the territory, Storm and all. Every time you enter and survive, your brain learns: this place isn't dangerous." },
              { letter: "E", word: "ENGAGE", icon: "⚔️", color: C.bossRed, desc: "Be fully present — no escape, no checking out. Stay in the conversation, the room, the moment." },
              { letter: "R", word: "REPEAT", icon: "🔁", color: C.xpPurple, desc: "Do it again. Each battle weakens the Shadow. What was terrifying becomes tolerable, then normal, then yours again." },
            ].map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: 16, padding: 20,
                background: "#1A1218", border: `2px solid ${step.color}25`,
                borderRadius: 10, alignItems: "flex-start",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: step.color + "20", border: `2px solid ${step.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <PixelText size={16} color={step.color}>{step.letter}</PixelText>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{step.icon}</span>
                    <PixelText size={9} color={step.color}>{step.word}</PixelText>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: C.grayLt, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section style={{
        padding: "80px 24px", maxWidth: 700, margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <PixelText size={14} color={C.goldMd} style={{ display: "block", marginBottom: 16 }}>
            🛡 WHAT AWAITS YOU
          </PixelText>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[
            { icon: "🧚", title: "AI COMPANION", desc: "Meet Dara — your Soul Companion. She knows the Shadow's tricks, walks beside you before every battle, and celebrates every victory.", color: C.goldMd },
            { icon: "⚔️", title: "BOSS BATTLES", desc: "Each real-world social challenge is a boss to defeat. Smile at a stranger. Ask for directions. Speak up in a meeting. Face the Shadow, one battle at a time.", color: C.bossRed },
            { icon: "🗺", title: "YOUR JOURNEY MAP", desc: "See your path unfold — from the Village of Beginnings through Whisper Woods to the Shadow King. Every victory moves you closer to the life beyond fear.", color: C.teal },
            { icon: "🃏", title: "CHARACTER CREATION", desc: "Discover your strengths and challenges through a clinically-informed card sort. Your traits become your weapons — your values become your compass.", color: C.plumMd },
            { icon: "📊", title: "SUDS TRACKING", desc: "Rate your anxiety before and after every battle. Watch the numbers drop as the Shadow weakens. The data proves: the fear was always lying.", color: C.hpGreen },
            { icon: "🏰", title: "VALUES-DRIVEN", desc: "Based on ACT (Acceptance and Commitment Therapy). You're not fighting to be fearless — you're fighting for what truly matters to your heart.", color: C.goalGold },
          ].map((feature, i) => (
            <div key={i} style={{
              padding: 24, background: "#1A1218",
              border: `2px solid ${feature.color}20`, borderRadius: 10,
              textAlign: "center", transition: "all 0.3s",
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{feature.icon}</div>
              <PixelText size={8} color={feature.color} style={{ display: "block", marginBottom: 10 }}>
                {feature.title}
              </PixelText>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: C.grayLt, margin: 0 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CLINICAL FOUNDATION ===== */}
      <section style={{
        padding: "60px 24px",
        background: "linear-gradient(180deg, transparent 0%, #1E1520 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <PixelText size={10} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>
            BUILT ON EVIDENCE-BASED THERAPY
          </PixelText>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: C.grayLt, margin: "0 0 24px" }}>
            The D.A.R.E.R. framework integrates proven clinical approaches:
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              "CBT / Cognitive Behavioral Therapy",
              "ACT / Acceptance & Commitment Therapy",
              "Exposure & Response Prevention (ERP)",
              "Behavioral Activation (BATD-R)",
              "Systematic Graduated Exposure",
              "SUDS Tracking (0-10 Scale)",
            ].map((method, i) => (
              <div key={i} style={{
                padding: "8px 14px", background: "#1A1218",
                border: `1px solid ${C.gray}30`, borderRadius: 4,
              }}>
                <PixelText size={6} color={C.grayLt}>{method}</PixelText>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIAL / QUOTE ===== */}
      <section style={{ padding: "60px 24px", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.6 }}>🧚</div>
        <blockquote style={{
          fontSize: 16, lineHeight: 1.8, color: C.cream, fontStyle: "italic",
          margin: "0 0 16px",
        }}>
          "Every DARER is just an ordinary person who doubted themselves a
          thousand times — but chose to step forward anyway. That changes
          everything."
        </blockquote>
        <PixelText size={7} color={C.goldMd}>— DARA, SOUL COMPANION</PixelText>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={{
        padding: "80px 24px", textAlign: "center",
        background: `linear-gradient(180deg, transparent 0%, ${C.goalGold}08 100%)`,
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🏰</div>
        <PixelText size={16} color={C.goalGold} style={{ display: "block", marginBottom: 16 }}>
          THE LIFE BEYOND FEAR
        </PixelText>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: C.grayLt, margin: "0 auto 32px", maxWidth: 500 }}>
          You don't need to feel ready. You just need to be willing.
          Your journey starts with one small battle.
        </p>
        <PixelBtn onClick={onStart} color={C.gold} textColor={C.charcoal}>
          DARE TO BEGIN ⚔
        </PixelBtn>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        padding: "32px 24px", borderTop: `1px solid ${C.gray}20`,
        textAlign: "center",
      }}>
        <PixelText size={7} color={C.gray} style={{ display: "block", marginBottom: 8 }}>
          D.A.R.E.R. JOURNEY
        </PixelText>
        <p style={{ fontSize: 11, color: C.gray, margin: 0 }}>
          A CBT/ACT-based tool for managing social anxiety.
          <br />Not a substitute for professional mental health treatment.
        </p>
      </footer>

      {/* Global Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        @keyframes scrollDot {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(10px); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        ::selection { background: ${C.plumMd}40; color: ${C.cream}; }
      `}</style>
    </div>
  );
}
