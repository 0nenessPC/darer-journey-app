import { useState, useEffect } from "react";
import { C, FONT_LINK } from "../constants/gameData";
import { PixelText, PixelBtn, DialogBox } from "../components/shared";

export default function JourneyMapPreview({ heroName, onContinue, obState = {}, setOBState }) {
  const [scrollPos, setScrollPos] = useState(obState.scrollPos || 0);
  const [phase, setPhase] = useState(obState.phase || "intro");

  // Sync state to parent for auto-save
  useEffect(() => {
    if (!setOBState) return;
    setOBState({ scrollPos, phase });
  }, [scrollPos, phase, setOBState]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("scroll"), 2500);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "scroll") return;
    let frame; let pos = 0; const maxScroll = 1300;
    const animate = () => { pos += 0.6; setScrollPos(pos); if (pos < maxScroll) frame = requestAnimationFrame(animate); else setPhase("final"); };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const MAP_H = 1600;
  const nodes = [
    { y: 80, x: 50, label: "YOU ARE HERE", icon: "⚔", color: C.goldMd, size: 20, zone: "VILLAGE OF BEGINNINGS" },
    { y: 220, x: 28, label: "WHISPER WOODS", icon: "🌲", color: "#6B8E6B", size: 10, type: "env" },
    { y: 280, x: 70, label: "BOSS 1", icon: "👁", color: C.bossRed, size: 16, name: "The Watcher" },
    { y: 350, x: 20, label: "REST POINT", icon: "🔥", color: C.amber, size: 12, type: "rest" },
    { y: 440, x: 40, label: "BOSS 2", icon: "🐍", color: C.bossRed, size: 16, name: "The Whisperer" },
    { y: 520, x: 75, label: "MISTY BRIDGE", icon: "🌫", color: "#8B7BAA", size: 10, type: "env" },
    { y: 600, x: 55, label: "BOSS 3", icon: "🕷", color: C.bossRed, size: 18, name: "The Tangler" },
    { y: 680, x: 25, label: "REST POINT", icon: "⛺", color: C.amber, size: 12, type: "rest" },
    { y: 760, x: 60, label: "BOSS 4", icon: "👻", color: C.bossRed, size: 18, name: "The Phantom" },
    { y: 830, x: 35, label: "DARK RAVINE", icon: "⛰", color: "#5C4A5C", size: 10, type: "env" },
    { y: 920, x: 50, label: "BOSS 5", icon: "🐉", color: C.bossRed, size: 20, name: "The Dread" },
    { y: 1000, x: 70, label: "REST POINT", icon: "🏕", color: C.amber, size: 12, type: "rest" },
    { y: 1100, x: 45, label: "BOSS 6", icon: "⚡", color: C.bossRed, size: 22, name: "The Storm" },
    { y: 1250, x: 50, label: "SHADOW KING", icon: "💀", color: "#9B3A3A", size: 28, name: "The Shadow King" },
    { y: 1420, x: 50, label: "YOUR GOAL", icon: "🏰", color: C.goalGold, size: 28 },
  ];

  // Build a winding path
  const pathNodes = nodes.filter(n => n.type !== "env");
  const pathD = pathNodes.map((n, i) => {
    const px = (n.x / 100) * 480;
    if (i === 0) return `M ${px} ${n.y + 20}`;
    const prev = pathNodes[i - 1];
    const prevX = (prev.x / 100) * 480;
    const cpX = (prevX + px) / 2;
    return `Q ${cpX} ${(prev.y + n.y) / 2 + (i % 2 === 0 ? -30 : 30)}, ${px} ${n.y}`;
  }).join(" ");

  // Scatter decorations
  const decorations = [
    { y: 150, x: 15, char: "🌿", op: 0.3 }, { y: 170, x: 85, char: "🌿", op: 0.2 },
    { y: 310, x: 82, char: "🍄", op: 0.3 }, { y: 380, x: 65, char: "🌲", op: 0.15 },
    { y: 480, x: 12, char: "🪨", op: 0.25 }, { y: 550, x: 88, char: "🌲", op: 0.2 },
    { y: 650, x: 80, char: "🦇", op: 0.2 }, { y: 720, x: 15, char: "🕯", op: 0.3 },
    { y: 800, x: 85, char: "💎", op: 0.15 }, { y: 880, x: 10, char: "🌲", op: 0.15 },
    { y: 960, x: 90, char: "🪨", op: 0.2 }, { y: 1050, x: 20, char: "🦇", op: 0.25 },
    { y: 1150, x: 80, char: "🕯", op: 0.3 }, { y: 1200, x: 15, char: "💀", op: 0.1 },
    { y: 1320, x: 30, char: "🔥", op: 0.15 }, { y: 1350, x: 70, char: "🔥", op: 0.15 },
  ];

  const isVisible = (y) => scrollPos > y - 400 || phase === "intro";

  return (
    <div style={{ height: "100vh", background: C.mapBg, overflow: "hidden", position: "relative" }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* Scrolling map */}
      <div style={{ position: "absolute", inset: 0, transform: `translateY(-${scrollPos}px)` }}>

        {/* Terrain gradient bands */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: MAP_H }}>
          {/* Green zone (start) */}
          <div style={{ position: "absolute", top: 0, height: 400, left: 0, right: 0, background: "linear-gradient(to bottom, #1A2218 0%, #1E1A22 100%)" }} />
          {/* Purple zone (middle) */}
          <div style={{ position: "absolute", top: 400, height: 400, left: 0, right: 0, background: "linear-gradient(to bottom, #1E1A22 0%, #221520 100%)" }} />
          {/* Dark zone (boss area) */}
          <div style={{ position: "absolute", top: 800, height: 500, left: 0, right: 0, background: "linear-gradient(to bottom, #221520 0%, #1A0A14 100%)" }} />
          {/* Golden zone (goal) */}
          <div style={{ position: "absolute", top: 1300, height: 300, left: 0, right: 0, background: `linear-gradient(to bottom, #1A0A14 0%, ${C.goalGold}10 100%)` }} />
        </div>

        {/* Pixel grid overlay */}
        <div style={{
          position: "absolute", inset: 0, height: MAP_H,
          backgroundImage: `radial-gradient(circle, ${C.plum}08 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }} />

        {/* Scattered decorations */}
        {decorations.map((d, i) => (
          <div key={`d${i}`} style={{
            position: "absolute", top: d.y, left: `${d.x}%`, fontSize: 14,
            opacity: isVisible(d.y) ? d.op : 0, transition: "opacity 1s",
            transform: "translate(-50%, 0)",
          }}>{d.char}</div>
        ))}

        {/* Winding path */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: MAP_H, pointerEvents: "none" }} viewBox={`0 0 480 ${MAP_H}`} preserveAspectRatio="none">
          {/* Path shadow */}
          <path d={pathD} fill="none" stroke="#000000" strokeWidth="12" opacity="0.2" strokeLinecap="round" />
          {/* Main path */}
          <path d={pathD} fill="none" stroke={C.mapPath} strokeWidth="6" strokeDasharray="12 8" opacity="0.5" strokeLinecap="round" />
          {/* Path glow */}
          <path d={pathD} fill="none" stroke={C.plumMd} strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        </svg>

        {/* Map nodes */}
        {nodes.map((node, i) => {
          const isEnv = node.type === "env";
          const isRest = node.type === "rest";
          const isBoss = !isEnv && !isRest && node.label !== "YOU ARE HERE" && node.label !== "YOUR GOAL";
          const isFinal = node.label === "SHADOW KING";
          const isGoal = node.label === "YOUR GOAL";
          const isStart = node.label === "YOU ARE HERE";

          return (
            <div key={i} style={{
              position: "absolute", top: node.y, left: `${node.x}%`,
              transform: "translate(-50%, -50%)", textAlign: "center",
              opacity: isVisible(node.y) ? 1 : 0,
              transition: "opacity 0.8s ease-out",
              zIndex: isFinal || isGoal || isStart ? 5 : isEnv ? 1 : 3,
            }}>
              {/* Environment labels */}
              {isEnv && (
                <div style={{ opacity: 0.4 }}>
                  <span style={{ fontSize: node.size }}>{node.icon}</span>
                  <div><PixelText size={5} color={node.color}>{node.label}</PixelText></div>
                </div>
              )}

              {/* Rest points */}
              {isRest && (
                <div>
                  <div style={{
                    width: 32, height: 32, margin: "0 auto", borderRadius: 4,
                    background: C.amber + "15", border: `1px solid ${C.amber}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}><span style={{ fontSize: node.size }}>{node.icon}</span></div>
                  <div style={{ marginTop: 2 }}><PixelText size={5} color={C.amber}>{node.label}</PixelText></div>
                </div>
              )}

              {/* Start node */}
              {isStart && (
                <div>
                  <div style={{
                    width: 56, height: 56, margin: "0 auto", borderRadius: 6,
                    background: C.goldMd + "20", border: `3px solid ${C.goldMd}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 20px ${C.goldMd}30, 0 0 40px ${C.goldMd}10`,
                    animation: "pulse 2s ease-in-out infinite",
                  }}><span style={{ fontSize: node.size }}>{node.icon}</span></div>
                  {node.zone && <div style={{ marginTop: 6 }}><PixelText size={6} color={C.goldMd}>{node.zone}</PixelText></div>}
                  <div style={{ marginTop: 2 }}><PixelText size={7} color={C.cream}>{node.label}</PixelText></div>
                </div>
              )}

              {/* Boss nodes */}
              {isBoss && !isFinal && (
                <div>
                  <div style={{
                    width: node.size * 2.8, height: node.size * 2.8, margin: "0 auto",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: `radial-gradient(circle, ${C.bossRed}30 0%, ${C.bossRed}08 70%)`,
                    border: `2px solid ${C.bossRed}60`,
                    boxShadow: `0 0 12px ${C.bossRed}20`,
                  }}><span style={{ fontSize: node.size }}>{node.icon}</span></div>
                  <div style={{ marginTop: 4 }}>
                    <PixelText size={6} color={C.bossRed}>{node.name}</PixelText>
                  </div>
                </div>
              )}

              {/* Shadow King */}
              {isFinal && (
                <div>
                  <div style={{
                    width: 80, height: 80, margin: "0 auto", borderRadius: "50%",
                    background: `radial-gradient(circle, #3A1A2A 0%, #1A0A14 70%)`,
                    border: `3px solid ${C.bossRed}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 30px ${C.bossRed}40, 0 0 60px ${C.bossRed}15, inset 0 0 20px ${C.bossRed}20`,
                    animation: "pulse 3s ease-in-out infinite",
                  }}><span style={{ fontSize: node.size }}>{node.icon}</span></div>
                  <div style={{ marginTop: 6 }}><PixelText size={8} color={C.bossRed}>{node.name}</PixelText></div>
                  <div style={{ marginTop: 2 }}><PixelText size={5} color={C.grayLt}>THE FINAL BATTLE</PixelText></div>
                </div>
              )}

              {/* Goal castle */}
              {isGoal && (
                <div>
                  <div style={{
                    width: 72, height: 72, margin: "0 auto", borderRadius: 8,
                    background: `radial-gradient(circle, ${C.goalGold}25 0%, ${C.goalGold}05 70%)`,
                    border: `3px solid ${C.goalGold}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 24px ${C.goalGold}30, 0 0 48px ${C.goalGold}10`,
                  }}><span style={{ fontSize: node.size }}>{node.icon}</span></div>
                  <div style={{ marginTop: 6 }}><PixelText size={8} color={C.goalGold}>YOUR GOAL</PixelText></div>
                  <div style={{ marginTop: 2 }}><PixelText size={5} color={C.grayLt}>THE LIFE BEYOND FEAR</PixelText></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top gradient */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to bottom, ${C.mapBg}, transparent)`, pointerEvents: "none", zIndex: 10 }} />
      {/* Bottom gradient */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to top, ${C.mapBg}, transparent)`, pointerEvents: "none", zIndex: 10 }} />

      {/* Overlay text */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 11, padding: "0 20px 24px", background: `linear-gradient(to top, ${C.mapBg} 60%, transparent)` }}>
        {phase === "intro" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.6s ease-out" }}>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                This is the path every DARER{"\n"}walks. From where you stand now{"\n"}to the heart of the Shadow itself.{"\n"}{"\n"}
                Let me show you...
              </PixelText>
            </DialogBox>
          </div>
        )}
        {phase === "scroll" && (
          <div style={{ textAlign: "center" }}>
            <PixelText size={7} color={C.grayLt}>The path unfolds...</PixelText>
          </div>
        )}
        {phase === "final" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Beyond the Shadow King lies{"\n"}the life you've been fighting{"\n"}for — your treasure, your reason.{"\n"}{"\n"}
                But before we face what's ahead,{"\n"}we need to know what makes it{"\n"}worth fighting for.
              </PixelText>
            </DialogBox>
            <PixelBtn onClick={onContinue} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
              WHAT AM I FIGHTING FOR? →
            </PixelBtn>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow: 0 0 20px ${C.goldMd}30} 50%{box-shadow: 0 0 30px ${C.goldMd}50} }
      `}</style>
    </div>
  );
}
