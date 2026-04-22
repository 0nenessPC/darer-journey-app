import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, saveProgress, loadProgress, NDA_VERSION, saveNdaAgreement, checkNdaAgreed } from "./utils/supabase";
import { buildHeroContext } from "./utils/aiHelper.jsx";
import NdaAgreementScreen from "./components/NdaAgreementScreen.jsx";
import { C, PIXEL_FONT, FONT_LINK, SYS, DEFAULT_ARMORY, DEFAULT_QUEST, STRENGTH_ICONS, ONBOARDING } from "./constants/gameData";
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

// ============ SCREENS ============

// --- LOGIN ---
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const handle = async () => {
    setErr("");
    if (!email.trim()) { setErr("Enter your email"); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) { setErr(error.message); setLoading(false); return; }
        setErr("Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) { setErr(error.message); setLoading(false); return; }
        onLogin();
      }
    } catch (e) {
      setErr("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px", background: C.mapBg }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <PixelText size={28} color={C.goldMd}>D.A.R.E.R.</PixelText>
        <div style={{ marginTop: 8 }}><PixelText size={8} color={C.plumMd}>DARE TO FEAR. DARE TO ACT.</PixelText></div>
      </div>
      <div style={{ background: "#1A1218", border: "3px solid #5C3A50", borderRadius: 6, padding: 20 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{
              flex: 1, padding: 8, border: "2px solid #5C3A50", borderRadius: 3,
              background: mode === m ? C.plum : "transparent", cursor: "pointer",
              fontFamily: PIXEL_FONT, fontSize: 8, color: mode === m ? C.cream : C.grayLt,
            }}>{m === "login" ? "LOG IN" : "NEW GAME"}</button>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <PixelText size={8} color={C.grayLt}>EMAIL</PixelText>
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()}
            style={{ width: "100%", padding: 10, marginTop: 4, background: C.mapBg, border: "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <PixelText size={8} color={C.grayLt}>PASSWORD</PixelText>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()}
            style={{ width: "100%", padding: 10, marginTop: 4, background: C.mapBg, border: "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        {err && <div style={{ marginBottom: 12 }}><PixelText size={8} color={C.red}>{err}</PixelText></div>}
        <PixelBtn onClick={handle} disabled={loading} style={{ width: "100%" }}>
          {loading ? "..." : mode === "login" ? "START YOUR JOURNEY" : "CREATE HERO"}
        </PixelBtn>
      </div>
    </div>
  );
}

// --- WELCOME / GAME INTRO ---
function GameIntro({ onComplete, obState, setOBState }) {
  const slide = obState?.slide ?? 0;
  const setSlide = (v) => setOBState({ slide: typeof v === 'function' ? v(slide) : v });
  const slides = [
    { text: "For as long as anyone can\nremember, the Shadow of Fear\nhas ruled these lands.", sub: "It turns words into walls.\nIt makes crowds feel like cages.\nIt convinces people that staying\nsmall is the same as staying safe." },
    { text: "Millions have fallen under\nits spell — convinced they are\nnot enough, that they will be\njudged, that they don't belong\nin social contexts.", sub: "But the Shadow holds a secret\nit never wanted you to know.\nIt is terrified of you.\nThe moment you step forward\nand say \"I DARE to FEAR\" —\nit loses its power." },
    { text: "Fear spreads.\nBut so does courage.", sub: "All over the world, ordinary people\nhave chosen to face the Shadow\nrather than hide from it.\n\nNo one knows where they meet\nor how many there are.\n\nPeople call these mystic heroes", emphasis: "THE DARER." },
    { text: "DARERs are not \"chosen ones.\"\nNot people born fearless\nor special. Just ordinary\npeople who have doubted\nthemselves a thousand times.", sub: "Someone who isn't sure they can\ndo this. Who almost didn't\nopen this app.\nBut they did. And that changes\neverything." },
    { text: "No two DARERs walk the same\npath. But every path is shaped\nby the same things — your fears,\nyour strengths, and the choices\nyou make.", sub: "Today, a new DARER awakens.\nFear trembles.\nThe Shadow's reign comes\ncloser to its end." },
  ];
  const cur = slides[slide];
  const last = slide === slides.length - 1;
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", padding: "0 32px", background: C.mapBg, textAlign: "center",
    }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ marginBottom: 24, animation: "fadeIn 0.5s ease-out" }} key={slide}>
        <PixelText size={10} color={C.cream} style={{ display: "block", marginBottom: 16 }}>{cur.text}</PixelText>
        <PixelText size={8} color={C.goldMd} style={{ display: "block" }}>{cur.sub}</PixelText>
        {cur.emphasis && <PixelText size={14} color={C.goldMd} style={{ display: "block", marginTop: 16 }}>{cur.emphasis}</PixelText>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {slides.map((_, i) => <div key={i} style={{ width: i === slide ? 20 : 8, height: 8, borderRadius: 2, background: i === slide ? C.goldMd : "#5C3A50", transition: "all 0.3s" }} />)}
      </div>
      <PixelBtn onClick={() => last ? onComplete() : setSlide(s => s + 1)} color={last ? C.gold : C.plum}>
        {last ? "BEGIN THE JOURNEY" : "NEXT"}
      </PixelBtn>
      {slide > 0 && <button onClick={() => setSlide(s => s - 1)} style={{ background: "none", border: "none", marginTop: 12, cursor: "pointer" }}><PixelText size={7} color={C.grayLt}>BACK</PixelText></button>}
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
    </div>
  );
}

// --- CHARACTER TRAIT CARDS (informed by Social Avoidance and Distress Scale) ---
// Each card is adapted from SADS items, rewritten as character traits.
// "strength" cards = SADS items where True=0 (low avoidance/distress)
// "challenge" cards = SADS items where True=1 (high avoidance/distress)
// Claiming a strength boosts stats; claiming a challenge lowers them — but also gives Dara clinical data.
const TRAIT_CARDS = [
  // Strengths — adapted from SADS reverse-scored items (relaxed, approach, comfort)
  { id: "s1", text: "I can relax even in unfamiliar social settings", type: "strength", icon: "🌿", stat: "courage", sads: 1 },
  { id: "s2", text: "It's easy for me to relax around strangers", type: "strength", icon: "☀️", stat: "openness", sads: 3 },
  { id: "s3", text: "I have no real desire to avoid people", type: "strength", icon: "🤝", stat: "openness", sads: 4 },
  { id: "s4", text: "I usually feel calm and comfortable at social events", type: "strength", icon: "🧘", stat: "resilience", sads: 6 },
  { id: "s5", text: "I feel at ease talking to someone new", type: "strength", icon: "💬", stat: "openness", sads: 7 },
  { id: "s6", text: "If there's a chance to meet new people, I take it", type: "strength", icon: "🌟", stat: "courage", sads: 9 },
  { id: "s7", text: "I feel relaxed in groups of people", type: "strength", icon: "🎵", stat: "resilience", sads: 12 },
  { id: "s8", text: "I'm comfortable meeting someone for the first time", type: "strength", icon: "✨", stat: "courage", sads: 15 },
  { id: "s9", text: "I can walk into a room full of strangers", type: "strength", icon: "🚪", stat: "courage", sads: 17 },
  { id: "s10", text: "I talk willingly when someone in charge wants to speak with me", type: "strength", icon: "🗣", stat: "openness", sads: 19 },
  { id: "s11", text: "I'm comfortable talking to people at social events", type: "strength", icon: "🎉", stat: "openness", sads: 22 },
  { id: "s12", text: "I sometimes introduce people to each other", type: "strength", icon: "🔗", stat: "courage", sads: 25 },
  { id: "s13", text: "I usually show up to social plans I've made", type: "strength", icon: "📅", stat: "resilience", sads: 27 },
  { id: "s14", text: "I find it easy to relax with other people", type: "strength", icon: "💚", stat: "resilience", sads: 28 },

  // Challenges — adapted from SADS avoidance/distress items
  { id: "c1", text: "I try to avoid situations that force me to be sociable", type: "challenge", icon: "🚷", stat: "courage", sads: 2 },
  { id: "c2", text: "Social occasions often leave me feeling upset", type: "challenge", icon: "🌧", stat: "resilience", sads: 5 },
  { id: "c3", text: "I avoid talking to people unless I know them well", type: "challenge", icon: "🔇", stat: "openness", sads: 8 },
  { id: "c4", text: "I get nervous in casual hangouts with mixed groups", type: "challenge", icon: "😰", stat: "resilience", sads: 10 },
  { id: "c5", text: "I'm usually nervous around people I don't know", type: "challenge", icon: "🧊", stat: "courage", sads: 11 },
  { id: "c6", text: "I often want to get away from people", type: "challenge", icon: "🏃", stat: "openness", sads: 13 },
  { id: "c7", text: "I feel uncomfortable in groups of people I don't know", type: "challenge", icon: "👥", stat: "courage", sads: 14 },
  { id: "c8", text: "Being introduced to people makes me tense", type: "challenge", icon: "😶", stat: "openness", sads: 16 },
  { id: "c9", text: "I avoid joining large groups of people", type: "challenge", icon: "🚫", stat: "courage", sads: 18 },
  { id: "c10", text: "I often feel on edge in a group", type: "challenge", icon: "⚡", stat: "resilience", sads: 20 },
  { id: "c11", text: "I tend to withdraw from people", type: "challenge", icon: "🐚", stat: "openness", sads: 21 },
  { id: "c12", text: "I am seldom at ease in a large group of people", type: "challenge", icon: "😣", stat: "resilience", sads: 23 },
  { id: "c13", text: "I think up excuses to avoid social events", type: "challenge", icon: "📝", stat: "courage", sads: 24 },
  { id: "c14", text: "I try to avoid formal social occasions", type: "challenge", icon: "🎭", stat: "resilience", sads: 26 },
];


// --- STRENGTH SELECTION (removed — replaced by card sort above) ---

// --- JOURNEY MAP PREVIEW (animated flyover to keep users engaged) ---
function JourneyMapPreview({ heroName, onContinue, obState = {}, setOBState }) {
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
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }
        @keyframes pulse { 0%,100%{box-shadow: 0 0 20px ${C.goldMd}30} 50%{box-shadow: 0 0 30px ${C.goldMd}50} }
      `}</style>
    </div>
  );
}

// --- VALUES EXPLORATION (ACT-informed — why are you here?) ---

// --- SHADOW LORE (before intake — reveals the true nature of the Shadow) ---
function ShadowLore({ heroName, onPsychoed, onReady, initialStep = 0, obState, setOBState }) {
  const step = obState?.step ?? initialStep;
  const setStep = (v) => setOBState({ step: typeof v === 'function' ? v(step) : v });
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", padding: "0 28px", background: C.mapBg, textAlign: "center",
    }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* STEP 0 — Narrative bridge */}
      {step === 0 && (
        <div style={{ animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⚔</div>
          <PixelText size={10} color={C.cream} style={{ display: "block", lineHeight: 1.8, marginBottom: 20 }}>
            We've met the hero.{"\n"}
            We know what they're fighting for.{"\n"}{"\n"}
            Now it's time to face what{"\n"}stands between them and{"\n"}the life they deserve.
          </PixelText>
          <PixelText size={28} color={C.bossRed} style={{ display: "block", marginBottom: 24, letterSpacing: 6 }}>
            F.E.A.R.
          </PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>
            Looking into its eyes is how{"\n"}we map the road ahead.
          </PixelText>
          <PixelBtn onClick={() => setStep(1)}>
            CONTINUE
          </PixelBtn>
        </div>
      )}

      {step === 1 && (
        <div style={{ animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.7 }}>👁</div>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
              {heroName}, before we go further,{"\n"}you need to understand the true{"\n"}nature of the Shadow.{"\n"}{"\n"}
              The Shadow of Fear has no fixed{"\n"}shape. That is what makes it so{"\n"}dangerous. It reaches into the{"\n"}deepest corners of your mind and{"\n"}body, and turns what it finds{"\n"}there into a monster — one so{"\n"}terrifying you dare not look at{"\n"}it, or even be in the same room{"\n"}with it.{"\n"}{"\n"}
              It feeds on avoidance. Every{"\n"}time you look away, it grows{"\n"}stronger.
            </PixelText>
          </DialogBox>
          <PixelBtn onClick={onPsychoed} style={{ marginTop: 12 }}>
            CONTINUE
          </PixelBtn>
        </div>
      )}

      {step === 2 && (
        <div style={{ animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 16 }}>
            UNDERSTAND YOUR FEAR
          </PixelText>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
              Now you know the Shadow's{"\n"}tricks — its Territory, the{"\n"}Inner Storm, and the Escape.{"\n"}You've seen the Infinite Trap.{"\n"}{"\n"}
              It's time to map YOUR Shadow.{"\n"}I need to understand what{"\n"}specific shapes it takes for{"\n"}you — where it claims territory,{"\n"}what storms it stirs inside you,{"\n"}and how it keeps you trapped.{"\n"}{"\n"}
              This may bring some discomfort.{"\n"}That's the Inner Storm —{"\n"}you already know what it is.{"\n"}You got this. I'm with you.
            </PixelText>
          </DialogBox>
          <PixelBtn onClick={onReady} color={C.gold} textColor={C.charcoal} style={{ marginTop: 12 }}>
            I'M READY, DARA
          </PixelBtn>
        </div>
      )}

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
    </div>
  );
}

// --- INTAKE (Dara conversation — mapping the bosses) ---
function IntakeScreen({ heroName, hero, quest, onComplete }) {
  const heroContext = buildHeroContext(hero, quest, "");
  const { messages, typing, sendMessage, init, error, errorType } = useAIChat(SYS.intake, heroContext);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const chatRef = useRef(null);
  const initPromptRef = useRef(`The hero's name is ${heroName}. They have just seen the lore about the Shadow's true nature and said they are ready to look into its eyes. Refer to their personal context provided above — their strengths, values, traits, and goal. Tailor your questions around what matters to them. Begin by acknowledging their courage, mention this will take about 5 to 10 minutes, then ask your first question about where the Shadow shows up in their daily life. Keep it to 2-3 sentences. This should feel like a companion helping them understand their enemy, not a clinical interview.`);
  useEffect(() => {
    if (!started) { setStarted(true); init(initPromptRef.current); }
  }, [started, init, heroName]);
  // Retry init when it failed
  const retryInit = () => { init(initPromptRef.current); };
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, typing]);
  const send = async () => { if (!input.trim() || typing) return; const t = input; const ok = await sendMessage(t); if (ok) setInput(""); };
  const assistantCount = messages.filter(m => m.role === "assistant").length;
  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  const hasShadowSummary = lastAssistant?.text?.includes("SHADOW'S TRUE NATURE") || lastAssistant?.text?.includes("WHERE IT APPEARS");

  // Auto-transition when Dara generates the shadow summary
  useEffect(() => {
    if (hasShadowSummary && lastAssistant) {
      const timer = setTimeout(() => onComplete(messages, lastAssistant.text), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasShadowSummary, lastAssistant, messages, onComplete]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.mapBg }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "2px solid #5C3A50" }}>
        <div style={{ width: 32, height: 32, borderRadius: 4, background: "#1A1218", border: "2px solid #5C3A50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧚</div>
        <div>
          <PixelText size={9} color={C.goldMd}>DARA</PixelText>
          <div><PixelText size={7} color={typing ? C.rose : C.grayLt}>{typing ? "thinking..." : "soul companion"}</PixelText></div>
        </div>
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px", borderRadius: 4,
              background: m.role === "user" ? C.plum : "#1A1218",
              border: "2px solid #5C3A50",
            }}>
              <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>{m.text}</PixelText>
            </div>
          </div>
        ))}
        {typing && <DialogBox speaker="DARA" typing />}
        {error && (
          <div style={{ textAlign: "center", marginTop: 16, marginBottom: 10, animation: "fadeIn 0.3s ease-out" }}>
            <div style={{
              padding: "10px 16px", background: "#1A1218", border: "1px solid #FF444440",
              borderRadius: 4, display: "inline-block",
            }}>
              <PixelText size={7} color={C.amber} style={{ display: "block", marginBottom: 6 }}>{error}</PixelText>
              {errorType === "init" ? (
                <PixelBtn onClick={retryInit} color={C.gold} textColor={C.charcoal} style={{ width: "auto" }}>
                  RETRY →
                </PixelBtn>
              ) : (
                <PixelBtn onClick={send} color={C.gold} textColor={C.charcoal} style={{ width: "auto" }}>
                  TRY AGAIN →
                </PixelBtn>
              )}
            </div>
          </div>
        )}
        {hasShadowSummary && (
          <div style={{ textAlign: "center", marginTop: 16, animation: "fadeIn 0.6s ease-out" }}>
            <PixelText size={8} color={C.goldMd}>The Shadow's true nature has been revealed...</PixelText>
          </div>
        )}
      </div>
      {!hasShadowSummary && (
        <div style={{ padding: 12, borderTop: "2px solid #5C3A50" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Speak to Dara..." disabled={typing}
              style={{ flex: 1, padding: 10, background: "#1A1218", border: error ? "1px solid #FF444460" : "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 13, outline: "none" }} />
            <PixelBtn onClick={send} disabled={typing || !input.trim()}>→</PixelBtn>
          </div>
        </div>
      )}
    </div>
  );
}

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

// --- DARER'S STRATEGIES (post-intake split-screen psychoeducation) ---
function DARERStrategy({ heroName, shadowText, heroValues, onContinue }) {
  const [step, setStep] = useState(0);
  const valueName = heroValues?.[0]?.word || heroValues?.[0]?.text || "the life you want";

  // Parse shadow data for personalized examples
  const parseSection = (label) => {
    if (!shadowText) return "";
    const regex = new RegExp(label + "[:\\s]*(.+?)(?=(?:WHERE IT APPEARS|WHAT IT WHISPERS|HOW IT KEEPS ITS GRIP|The Shadow has been|SHADOW'S TRUE NATURE)(?::|\\b)|$)", "is");
    const match = shadowText.match(regex);
    return match ? match[1].replace(/^[:\s]+/, "").replace(/[\s\n]+$/, "").trim() : "";
  };
  const territory = parseSection("WHERE IT APPEARS");
  const storm = parseSection("WHAT IT WHISPERS");
  const escape = parseSection("HOW IT KEEPS ITS GRIP");

  const ShadowSide = ({ children }) => (
    <div style={{ background: C.bossRed + "0A", border: `1.5px solid ${C.bossRed}30`, borderRadius: 8, padding: "14px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>💀</span>
        <PixelText size={6} color={C.bossRed} style={{ letterSpacing: 2 }}>THE SHADOW'S TRICK</PixelText>
      </div>
      {children}
    </div>
  );
  const DARERSide = ({ children }) => (
    <div style={{ background: C.hpGreen + "0A", border: `1.5px solid ${C.hpGreen}30`, borderRadius: 8, padding: "14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>⚔️</span>
        <PixelText size={6} color={C.hpGreen} style={{ letterSpacing: 2 }}>THE DARER'S STRATEGY</PixelText>
      </div>
      {children}
    </div>
  );

  const VSdivider = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#5C3A5040" }} />
      <PixelText size={7} color={C.goldMd} style={{ margin: "0 10px" }}>VS</PixelText>
      <div style={{ flex: 1, height: 1, background: "#5C3A5040" }} />
    </div>
  );

  const slides = [
    // Slide 0: Intro — now you know the Shadow, here's how to fight it
    { render: () => (
      <div>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>⚔️</div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>THE DARER STRATEGY</PixelText>
        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
            Now you've seen your Shadow's{"\n"}true nature — its territory, its{"\n"}storm, and its escape.{"\n"}{"\n"}
            Every trick the Shadow uses{"\n"}has a counter. The D.A.R.E.R.{"\n"}path was built to break each{"\n"}one.{"\n"}{"\n"}
            Let me show you your strategies.
          </PixelText>
        </DialogBox>
      </div>
    )},
    // Slide 1: Territory vs DECIDE + RISE (Exposure)
    { render: () => (
      <div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>
          📍 TERRITORY vs EXPOSURE
        </PixelText>
        <ShadowSide>
          <PixelText size={8} color={C.bossRed} style={{ display: "block", marginBottom: 6 }}>THE SHADOW'S TERRITORY</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            The Shadow claims places as{"\n"}dangerous. Over time, more places{"\n"}become off-limits.{"\n"}
            {territory ? `\nYour Shadow's territory: ${territory.length > 80 ? territory.slice(0, 80) + "..." : territory}` : ""}
          </PixelText>
        </ShadowSide>
        <VSdivider />
        <DARERSide>
          <PixelText size={8} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>DECIDE + RISE</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            You DECIDE which territory to{"\n"}reclaim — then RISE into it.{"\n"}{"\n"}
            Every time you enter the{"\n"}Shadow's territory and survive,{"\n"}your brain learns: "This place{"\n"}is not actually dangerous."{"\n"}{"\n"}
            The territory shrinks. Your{"\n"}world grows.
          </PixelText>
        </DARERSide>
      </div>
    )},
    // Slide 2: Inner Storm vs ALLOW (Acceptance)
    { render: () => (
      <div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>
          🌀 INNER STORM vs ALLOW
        </PixelText>
        <ShadowSide>
          <PixelText size={8} color={C.bossRed} style={{ display: "block", marginBottom: 6 }}>THE INNER STORM</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            The Storm hits with whispers{"\n"}and body alarm — telling you{"\n"}something terrible will happen.{"\n"}It wants you to believe the{"\n"}feelings ARE the danger.{"\n"}
            {storm ? `\nYour Storm: ${storm.length > 80 ? storm.slice(0, 80) + "..." : storm}` : ""}
          </PixelText>
        </ShadowSide>
        <VSdivider />
        <DARERSide>
          <PixelText size={8} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>ALLOW</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            You ALLOW the Storm to be there{"\n"}without obeying it.{"\n"}{"\n"}
            The racing heart, the thoughts —{"\n"}they are passengers, not drivers.{"\n"}You don't fight them. You don't{"\n"}run. You let them ride along.{"\n"}{"\n"}
            The Storm passes. It always does.{"\n"}And each time, it gets quieter.
          </PixelText>
        </DARERSide>
      </div>
    )},
    // Slide 3: The Escape vs ENGAGE (Stay in the fight)
    { render: () => (
      <div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>
          🏃 ESCAPE vs ENGAGE
        </PixelText>
        <ShadowSide>
          <PixelText size={8} color={C.bossRed} style={{ display: "block", marginBottom: 6 }}>THE ESCAPE</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            Every escape brings relief — but{"\n"}feeds the Shadow. Avoidance,{"\n"}safety behaviors, leaving early.{"\n"}Each one tells your brain the{"\n"}threat was real.{"\n"}
            {escape ? `\nYour escapes: ${escape.length > 80 ? escape.slice(0, 80) + "..." : escape}` : ""}
          </PixelText>
        </ShadowSide>
        <VSdivider />
        <DARERSide>
          <PixelText size={8} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>ENGAGE + REPEAT</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            You ENGAGE fully instead of{"\n"}checking out. You stay present{"\n"}in the moment — the conversation,{"\n"}the room, the person.{"\n"}{"\n"}
            Then you REPEAT. Each time you{"\n"}stay, the Shadow's grip loosens.{"\n"}What used to be terrifying becomes{"\n"}tolerable, then normal, then{"\n"}yours again.
          </PixelText>
        </DARERSide>
      </div>
    )},
    // Slide 4: Summary — the full DARER cycle as the antidote
    { render: () => (
      <div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛡</div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>
          THE DARER'S STRATEGY
        </PixelText>
        <div style={{ background: C.hpGreen + "08", border: `1.5px solid ${C.hpGreen}25`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          {[
            { letter: "D", word: "DECIDE", desc: "Choose to face the Shadow's territory" },
            { letter: "A", word: "ALLOW", desc: "Let the Storm be there — don't fight it" },
            { letter: "R", word: "RISE", desc: "Step into the territory, Storm and all" },
            { letter: "E", word: "ENGAGE", desc: "Be fully present — no escape, no checking out" },
            { letter: "R", word: "REPEAT", desc: "Do it again. The Shadow weakens every time" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 4 ? "1px solid #5C3A5025" : "none" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 4,
                background: C.goldMd + "20", border: `1.5px solid ${C.goldMd}60`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PixelText size={10} color={C.goldMd}>{item.letter}</PixelText>
              </div>
              <div>
                <PixelText size={7} color={C.hpGreen}>{item.word}</PixelText>
                <div><PixelText size={6} color={C.cream}>{item.desc}</PixelText></div>
              </div>
            </div>
          ))}
        </div>
        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
            Each letter is a strategy against{"\n"}a specific Shadow trick. Together{"\n"}they break the Infinite Trap.{"\n"}{"\n"}
            {heroName}, you now know your enemy{"\n"}AND your strategies. But every{"\n"}DARER needs tools to steady{"\n"}themselves when the Storm hits.{"\n"}{"\n"}Let me show you the Armory.
          </PixelText>
        </DialogBox>
      </div>
    )},
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", overflowY: "auto" }}>
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
          {step === slides.length - 1 ? "ENTER THE ARMORY →" : "NEXT"}
        </PixelBtn>
      </div>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
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

// ============ ASK DARA CHAT ============

// ============ SWIPEABLE BOSS CARD ============
function SwipeableBoss({ boss, onBossSelect, onAchieve, onDelete, children }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 160; // Width of action buttons
  const containerRef = useRef(null);

  const closeSwipe = () => {
    setSwipeOffset(0);
    setIsOpen(false);
  };

  const handlePointerDown = (e) => {
    if (e.button && e.button !== 0) return; // Only left click / touch
    closeAllOtherSwipes(boss.id);
    startXRef.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    currentXRef.current = 0;
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const dx = x - startXRef.current;
    currentXRef.current = dx;
    // Only allow left swipe (negative dx), ignore right swipe
    if (dx < 0) {
      setSwipeOffset(Math.max(dx, -MAX_SWIPE));
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (currentXRef.current < -SWIPE_THRESHOLD) {
      // Snap open
      setSwipeOffset(-MAX_SWIPE);
      setIsOpen(true);
    } else if (currentXRef.current > SWIPE_THRESHOLD / 2) {
      // Right swipe past threshold → close
      closeSwipe();
    } else {
      // Not enough swipe → close back
      closeSwipe();
    }
  };

  const handleBossClick = () => {
    if (isOpen || isDragging) return;
    onBossSelect(boss);
  };

  const handleAchieve = () => {
    closeSwipe();
    onAchieve(boss);
  };

  const handleDelete = () => {
    closeSwipe();
    onDelete(boss);
  };

  // Close swipe on scroll
  useEffect(() => {
    const handleScroll = () => closeSwipe();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close when another card is swiped open
  useEffect(() => {
    const handler = (e) => {
      if (e.detail !== boss.id) closeSwipe();
    };
    window.addEventListener('darer-swipe-close', handler);
    return () => window.removeEventListener('darer-swipe-close', handler);
  }, [boss.id]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 6,
      }}
    >
      {/* Action buttons (behind the card) */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        display: "flex", width: MAX_SWIPE, zIndex: 0,
      }}>
        <button
          onClick={handleAchieve}
          style={{
            width: MAX_SWIPE / 2, background: C.hpGreen,
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 8, color: C.cream }}>ACHIEVE</span>
        </button>
        <button
          onClick={handleDelete}
          style={{
            width: MAX_SWIPE / 2, background: C.bossRed,
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}
        >
          <span style={{ fontSize: 18 }}>🗑️</span>
          <span style={{ fontFamily: PIXEL_FONT, fontSize: 8, color: C.cream }}>DELETE</span>
        </button>
      </div>

      {/* Card (slides over buttons) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={isDragging ? handlePointerMove : undefined}
        onPointerUp={handlePointerUp}
        onPointerLeave={isDragging ? handlePointerUp : undefined}
        onClick={handleBossClick}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
          position: "relative",
          zIndex: 1,
          width: "100%",
          boxSizing: "border-box",
          background: C.mapBg,
          touchAction: "pan-y", // Allow vertical scroll, prevent horizontal
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Shared registry for closing other swiped cards
let activeSwipeId = null;
function closeAllOtherSwipes(id) {
  // Simple pattern: setting activeSwipeId triggers re-render if needed
  // In practice, each card manages its own state; we just close via event
  activeSwipeId = id;
  window.dispatchEvent(new CustomEvent('darer-swipe-close', { detail: id }));
}

// --- PRACTICE SESSION (real-time, no skip) ---
function PracticeSession({ tool, onComplete, onQuit }) {
  const [phase, setPhase] = useState("intro");
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCycles, setBreathCycles] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const breathLabels = ["BREATHE IN", "HOLD", "BREATHE OUT", "HOLD"];
  const breathDurations = [4, 2, 6, 2];

  const startPractice = () => {
    setPhase("running");
    setStep(0);
    setTimer(0);
    if (tool?.id === "breathing") {
      setBreathPhase(0);
      setBreathCycles(0);
      intervalRef.current = setInterval(() => {
        setBreathPhase(bp => {
          const dur = breathDurations[bp];
          setTimer(prev => {
            if (prev + 1 >= dur) {
              const nextPhase = (bp + 1) % 4;
              if (nextPhase === 0) {
                setBreathCycles(c => {
                  if (c + 1 >= 1) { clearInterval(intervalRef.current); setPhase("done"); }
                  return c + 1;
                });
              }
              return 0;
            }
            return prev + 1;
          });
          return bp;
        });
      }, 1000);
    } else if (tool?.id === "grounding") {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= 4) { clearInterval(intervalRef.current); setPhase("done"); return s; }
          return s + 1;
        });
        setTimer(0);
      }, 10000);
    } else if (tool?.id === "allowing") {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= 2) { clearInterval(intervalRef.current); setPhase("done"); return s; }
          return s + 1;
        });
        setTimer(0);
      }, 15000);
    } else if (tool?.id === "values") {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= 2) { clearInterval(intervalRef.current); setPhase("done"); return s; }
          return s + 1;
        });
        setTimer(0);
      }, 12000);
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
          <PixelText size={7} color={C.grayLt}>This practice takes about 1 minute.{"\n"}There is no skip — complete the exercise to earn credit.</PixelText>
        </div>
        <PixelBtn onClick={startPractice} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginBottom: 12 }}>BEGIN</PixelBtn>
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

// --- GAME ARMORY (post-onboarding) ---
function GameArmory({ hero, setHero, setScreen, onBack }) {
  const armory = hero.armory || [];
  const [practiceMode, setPracticeMode] = useState(null); // { toolId } or null

  const incrementPractice = (toolId) => {
    setHero(h => {
      const updatedArmory = (h.armory || []).map(item => {
        if (item.id !== toolId) return item;
        const newCount = (item.practiceCount || 0) + 1;
        const newItem = { ...item, practiceCount: newCount };
        // Check if the NEXT item should unlock
        const nextIdx = (h.armory || []).findIndex(a => a.id === toolId) + 1;
        const nextItem = (h.armory || [])[nextIdx];
        if (nextItem && !nextItem.unlocked && nextItem.unlockCondition) {
          const cond = nextItem.unlockCondition;
          if (cond.requiresToolId === toolId && newCount >= cond.practiceCount) {
            return { ...newItem, unlocked: true, practiceCount: nextItem.practiceCount };
          }
        }
        return newItem;
      });
      return { ...h, armory: updatedArmory };
    });
  };

  const handleComplete = (toolId) => {
    incrementPractice(toolId);
    // Check what was unlocked
    const nextIdx = (hero.armory || []).findIndex(a => a.id === toolId) + 1;
    const nextItem = (hero.armory || [])[nextIdx];
    if (nextItem && nextItem.unlocked) {
      setPracticeMode({ toolId, justUnlocked: nextItem });
    } else {
      setPracticeMode(null);
    }
  };

  if (practiceMode && !practiceMode.justUnlocked) {
    const tool = armory.find(a => a.id === practiceMode.toolId);
    return <PracticeSession tool={tool} onComplete={() => handleComplete(practiceMode.toolId)} onQuit={() => setPracticeMode(null)} />;
  }

  if (practiceMode && practiceMode.justUnlocked) {
    const unlocked = practiceMode.justUnlocked;
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 100px" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16, animation: "fearPulse 1.5s ease-in-out infinite" }}>{unlocked.icon}</div>
          <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>NEW ARMORY ITEM UNLOCKED!</PixelText>
          <div style={{ padding: 16, background: "#1A1218", border: `3px solid ${C.goldMd}`, borderRadius: 6, marginBottom: 24 }}>
            <PixelText size={10} color={C.cream}>{unlocked.name}</PixelText>
            <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{unlocked.description}</PixelText></div>
          </div>
          <PixelBtn onClick={() => setPracticeMode(null)} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>CONTINUE</PixelBtn>
        </div>
        <style>{`@keyframes fearPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "20px 20px 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <PixelText size={9} color={C.grayLt}>←</PixelText>
        </button>
        <PixelText size={10} color={C.goldMd}>⚗ ARMORY</PixelText>
      </div>
      <div style={{ padding: 12, textAlign: "center" }}>
        <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>Practice to unlock new tools</PixelText>
      </div>

      {/* Armory cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {armory.map((item, i) => {
          const isLocked = !item.unlocked;
          const cond = item.unlockCondition;
          const prevItem = armory.find(a => a.id === cond?.requiresToolId);
          const progressNeeded = cond?.practiceCount || 2;
          const currentProgress = prevItem ? (prevItem.practiceCount || 0) : 0;
          const progressPct = Math.min(1, currentProgress / progressNeeded);

          return (
            <div key={item.id} style={{
              padding: 16, borderRadius: 6,
              background: isLocked ? "#15101a" : "#1A1218",
              border: `3px solid ${isLocked ? "#333" : C.plum + "80"}`,
              opacity: isLocked ? 0.55 : 1,
              transition: "all 0.3s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 6,
                  background: isLocked ? "#222" : C.plum + "20",
                  border: `2px solid ${isLocked ? "#444" : C.plum + "60"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  {isLocked && (
                    <div style={{
                      position: "absolute", top: -4, right: -4,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#333", border: "2px solid #555",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 9 }}>🔒</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <PixelText size={9} color={isLocked ? C.grayLt : C.cream}>{item.name}</PixelText>
                  <div style={{ marginTop: 2 }}>
                    <PixelText size={6} color={C.grayLt}>{item.description}</PixelText>
                  </div>
                </div>
              </div>

              {/* Locked: show progress to unlock */}
              {isLocked && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <PixelText size={6} color={C.amber}>Practice {prevItem?.name || ""} to unlock</PixelText>
                    <PixelText size={6} color={C.grayLt}>{currentProgress}/{progressNeeded}</PixelText>
                  </div>
                  <div style={{ height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${progressPct * 100}%`,
                      background: progressPct >= 1 ? C.hpGreen : C.amber,
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>
              )}

              {/* Unlocked: practice count + action */}
              {!isLocked && (
                <div>
                  <div style={{ marginTop: 8, marginBottom: 10 }}>
                    <PixelText size={6} color={C.teal}>Practiced {item.practiceCount || 0}×{item.practiceCount >= 2 ? "" : ` (${2 - (item.practiceCount || 0)} more to unlock next)`}</PixelText>
                  </div>
                  <button onClick={() => setPracticeMode({ toolId: item.id })} style={{
                    width: "100%", padding: "10px 14px", borderRadius: 4,
                    background: C.plum + "30", border: `2px solid ${C.plum + "80"}`,
                    cursor: "pointer",
                  }}>
                    <PixelText size={8} color={C.plumMd}>⚗ PRACTICE →</PixelText>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218",
      }}>
        {[
          { icon: "🗺", label: "MAP", active: false, onClick: () => setScreen("map") },
          { icon: "⚗", label: "ARMORY", active: true },
          { icon: "🏆", label: "LADDER", active: false, onClick: () => setScreen("ladder") },
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
