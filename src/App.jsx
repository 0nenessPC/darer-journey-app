import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, saveProgress, loadProgress, NDA_VERSION, saveNdaAgreement, checkNdaAgreed } from "./utils/supabase";
import NdaAgreementScreen from "./components/NdaAgreementScreen.jsx";

// ============ DESIGN TOKENS — Warm Dusk + Pixel Game ============
const C = {
  plum: "#7B4B6A", plumLt: "#F5EBE8", plumMd: "#C89DB2",
  gold: "#D4A050", goldLt: "#FAF0E0", goldMd: "#E8C87A",
  cream: "#F5EDE8", charcoal: "#3D2E3A", gray: "#7A6B75", grayLt: "#B8A8B2",
  rose: "#D4A59A", roseLt: "#F5EBE8",
  amber: "#C48A5A", amberLt: "#FAF0E0",
  white: "#FFFFFF", red: "#C45A5A", redLt: "#FAE8E8",
  teal: "#6BA5A0", tealLt: "#E0F0EE",
  sky: "#7AADBE",
  // Game-specific
  mapBg: "#2A1F28", mapPath: "#5C3A50", bossRed: "#C45A5A", goalGold: "#E8C87A",
  hpGreen: "#6BA56B", hpRed: "#C45A5A", xpPurple: "#9B7BAA",
};

const PIXEL_FONT = "'Press Start 2P', 'Courier New', monospace";
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

// ============ AI HELPER ============
async function callClaude(systemPrompt, messages, maxTokens = 1000, timeoutMs = 15000) {
  const FALLBACK = "Dara gathers her thoughts...";
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1500)); // 1.5s pause before retry
      const r = await fetch("/api/qwen-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: messages.map(m => ({ role: m.role, text: m.text })),
          options: { model: "qwen3.5-flash", maxTokens },
        }),
        signal: controller.signal,
      });
      const d = await r.json();
      return d.reply || "...";
    } catch(e) {
      console.error(`AI call failed (attempt ${attempt + 1}):`, e);
    }
    finally { clearTimeout(timer); }
  }
  return FALLBACK;
}

function useAIChat(systemPrompt, ctx = "") {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'init' or 'send'
  const hist = useRef([]);
  const FALLBACK = "Dara gathers her thoughts...";

  const sendMessage = useCallback(async (text) => {
    const u = { role: "user", text };
    setMessages(p => [...p, u]); hist.current.push(u); setTyping(true); setError(null); setErrorType(null);
    const api = ctx ? [{ role: "user", text: ctx }, { role: "assistant", text: "Understood." }, ...hist.current] : hist.current;
    const res = await callClaude(systemPrompt, api);
    if (res === FALLBACK) {
      // AI call failed — don't pollute chat with fallback text
      hist.current.pop(); // remove the user message from history too
      setMessages(p => p.slice(0, -1)); // remove user message from display
      setError("Dara lost her thread — tap Send to try again.");
      setErrorType("send");
      setTyping(false);
      return null;
    }
    const a = { role: "assistant", text: res };
    hist.current.push(a); setMessages(p => [...p, a]); setTyping(false);
    return res;
  }, [systemPrompt, ctx]);

  const init = useCallback(async (prompt) => {
    setTyping(true); hist.current = []; setError(null); setErrorType(null);
    const res = await callClaude(systemPrompt, [{ role: "user", text: prompt }]);
    if (res === FALLBACK) {
      setError("Dara is still preparing... retrying.");
      setErrorType("init");
      setTyping(false);
      return null;
    }
    const a = { role: "assistant", text: res };
    hist.current = [{ role: "user", text: prompt }, a];
    setMessages([a]); setTyping(false);
    return res;
  }, [systemPrompt]);

  const reset = useCallback(() => { setMessages([]); hist.current = []; setTyping(false); setError(null); setErrorType(null); }, []);
  return { messages, typing, sendMessage, init, reset, error, errorType };
}

// ============ SYSTEM PROMPTS ============
const SYS = {
  intake: `You are Dara — the Soul Companion of the DARER Order. You are warm, empathetic, and clinically trained in CBT/ERP for social anxiety. Your name means "courage."

CONTEXT: The user has just learned about the Shadow's three tricks (Territory, Inner Storm, Escape) and the Shadow's Infinite Trap (the vicious cycle). They understand the concepts. Your job now is to help them SEE their own personal Shadow — to map what specific forms it takes for THEM.

You are NOT yet defining battles or exposure activities. This step is purely about understanding. Think of it as shining a light on the Shadow so the user can see it for what it really is — for the first time.

This conversation should take 5 to 10 minutes. Be warm but efficient. Ask ONE question at a time. Keep responses to 2-3 sentences max. Use game language but include a parenthetical real-world anchor the FIRST time you use each term: "the Shadow's territory (the social situations where fear shows up)" the first time, then just "territory" after. Similarly "the Inner Storm (the thoughts and body sensations that hit you)" and "the Escape (the ways you avoid or protect yourself)."

=== DOMAIN 1 — THE SHADOW'S TERRITORY (situational triggers) ===

Explore which social situations the Shadow claims as its territory. Draw from these categories based on what the user shares (do NOT list them all at once):
- Using a phone in public or calling someone unfamiliar
- Participating in small group activities
- Eating or drinking in front of others
- Talking to someone in authority
- Performing, acting, or speaking in front of others
- Going to a party or social gathering
- Working or writing while being observed
- Talking face to face with a stranger or meeting new people
- Entering a room when others are already seated
- Being the center of attention
- Speaking up at a meeting
- Expressing disagreement to someone unfamiliar
- Looking someone in the eyes
- Giving a prepared talk to a group
- Trying to make a romantic connection
- Returning goods to a store or resisting a pushy salesperson

Ask: "In your daily life, where does the Shadow show up the most — what social situations are its territory?" and "Are there places where the Shadow is so strong you avoid them entirely?"

=== DOMAIN 2 — THE INNER STORM (cognitions + physiology combined) ===

This domain explores BOTH what the Shadow whispers (cognitive) AND what happens in the body (physiological). These fuel each other — thoughts trigger body sensations, body sensations confirm the thoughts.

COGNITIVE — Explore feared consequences and maladaptive beliefs:
Ask: "When you enter the Shadow's territory, what does the Inner Storm sound like? What does your mind tell you will happen?"
Listen for: overestimates of probability/severity, fears of humiliation, embarrassment, being judged, mind going blank, looking anxious.
Scaffolding: "The Storm whispers different things to different people. For some it says everyone is judging them. For others, it predicts they'll embarrass themselves — their voice will shake, their mind will go blank. For some, it simply says: you don't belong here. What does your Storm say?"

PHYSIOLOGICAL — Explore body sensations and their timing:
Ask: "And what happens in your body when the Storm hits? Does your heart race, do your hands shake, do you blush?"
Follow up on timing: "Does the Storm hit before the situation — like dreading it for hours? During it? Or does it replay afterward — going over everything you said?"
Gauge intensity naturally: "When that happens, does it feel like background noise you can push through, or does it get really intense — like it takes over?"

=== DOMAIN 3 — THE ESCAPE (safety behaviors and avoidance patterns) ===

Explore how the Shadow has maintained control — the strategies the user has developed that feel like protection but actually feed the Shadow's power.
Ask: "When the Storm hits, how do you escape? What do you do to survive those moments?"

SCAFFOLDING — if unsure: "The Shadow is clever at disguising the Escape as helpful habits. Some people avoid eye contact or stay quiet so they won't be noticed. Others rehearse every word before speaking, or replay conversations for hours afterward picking apart what they said. Some always bring a friend as a shield, or use alcohol to take the edge off. Some simply stop going — they cancel, they make excuses, they withdraw. Does any of that feel familiar?"

=== THE SHADOW'S TRUE NATURE (final summary) ===

After exploring the three domains (5-8 exchanges), present the user with a clear summary. This is the first time they see their fear laid out honestly. Frame it with respect and courage.

Structure your final response like this — use the label SHADOW'S TRUE NATURE so the app can detect the summary:

"SHADOW'S TRUE NATURE:

WHERE IT APPEARS: [1-2 sentences summarizing the situations that are Shadow territory — use their own words]

WHAT IT WHISPERS: [1-2 sentences summarizing the Inner Storm — BOTH the cognitive lies AND the body sensations, and when they hit (before/during/after)]

HOW IT KEEPS ITS GRIP: [1-2 sentences summarizing the Escape patterns — safety behaviors and avoidance that feed the Shadow]

The Shadow has been hiding in the dark, counting on you never looking at it this clearly. That changes today."

=== RESPONSE RULES ===
- 2-3 sentences max per response during conversation. The summary can be longer.
- NO bullet points, NO markdown, NO emoji during conversation.
- Use the user's own words when reflecting back. Validate before probing.
- Be genuinely curious. This should feel like a companion helping you understand your enemy, not a clinical assessment.
- If at exchange 6 without reaching the summary, wrap up and present the Shadow Profile.

=== SAFETY ===
If the user expresses suicidal ideation or crisis, pause. Provide: 988 Suicide and Crisis Lifeline, Crisis Text Line (text HOME to 741741).`,

  preBoss: `You are Dara, the companion fairy in D.A.R.E.R. Journey. The hero is about to face a boss battle (real-world exposure). Prepare them: validate courage, teach one grounding technique, reframe their feared outcome. Keep it to 2-3 sentences. Use game language. Never suggest retreating.`,

  battle: `You are Dara, companion fairy in D.A.R.E.R. Journey. The hero is IN a boss battle right now (doing the exposure in real life). Give brief, grounding support. 1-2 sentences MAX. "Stay in the fight. The boss is weaker than it looks." Never suggest fleeing.`,

  victory: `You are Dara, companion fairy in D.A.R.E.R. Journey. The hero just completed a boss battle. Celebrate, reflect on feared-vs-actual outcome, note their SUDS drop as damage dealt to the boss, and suggest the next boss. 2-3 sentences. Warm and proud.`,
};

// ============ ARMORY DATA ============
const DEFAULT_ARMORY = [
  {
    id: "breathing",
    name: "Paced Breathing",
    icon: "🌬️",
    description: "Breathe in 4s → Hold 2s → Breathe out 6s → Hold 2s",
    technique: "4-2-6-2 paced breathing",
    unlockCondition: null, // default unlocked
    unlocked: true,
    practiceCount: 0,
  },
  {
    id: "grounding",
    name: "5-4-3-2-1 Grounding",
    icon: "⚓",
    description: "Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste",
    technique: "5-4-3-2-1 senses grounding",
    unlockCondition: { requiresToolId: "breathing", practiceCount: 2 },
    unlocked: false,
    practiceCount: 0,
  },
  {
    id: "allowing",
    name: "Allow the Storm",
    icon: "🛡️",
    description: "Make space for anxiety without fighting it — let it pass like a wave",
    technique: "Acceptance & defusion",
    unlockCondition: { requiresToolId: "grounding", practiceCount: 2 },
    unlocked: false,
    practiceCount: 0,
  },
  {
    id: "values",
    name: "Value Anchoring",
    icon: "💎",
    description: "Recall your deepest value to steady yourself in the moment",
    technique: "Values-based grounding",
    unlockCondition: { requiresToolId: "allowing", practiceCount: 2 },
    unlocked: false,
    practiceCount: 0,
  },
];

// ============ SAMPLE DATA (replaced after intake) ============
const DEFAULT_QUEST = {
  goal: "Make real friends I can be myself around",
  bosses: [
    { id: "b1", name: "Shy Smile Slime", desc: "Smile at a stranger", difficulty: 1, defeated: true, hp: 0, maxHp: 100 },
    { id: "b2", name: "Direction Specter", desc: "Ask someone for directions", difficulty: 2, defeated: true, hp: 0, maxHp: 100 },
    { id: "b3", name: "Compliment Kobold", desc: "Give a genuine compliment", difficulty: 2, defeated: false, hp: 100, maxHp: 100 },
    { id: "b4", name: "Custom Order Golem", desc: "Modify a food/drink order", difficulty: 3, defeated: false, hp: 100, maxHp: 100 },
    { id: "b5", name: "Queue Chat Phantom", desc: "Small talk in a waiting line", difficulty: 4, defeated: false, hp: 100, maxHp: 100 },
    { id: "b6", name: "Party Gate Guardian", desc: "Introduce yourself at an event", difficulty: 5, defeated: false, hp: 100, maxHp: 100 },
    { id: "b7", name: "Meeting Voice Wyrm", desc: "Share an opinion in a meeting", difficulty: 6, defeated: false, hp: 100, maxHp: 100 },
    { id: "b8", name: "Phone Call Dragon", desc: "Call to resolve an issue", difficulty: 7, defeated: false, hp: 100, maxHp: 100 },
    { id: "b9", name: "Spotlight Titan", desc: "Give a short presentation", difficulty: 8, defeated: false, hp: 100, maxHp: 100 },
    { id: "b10", name: "Social Anxiety King", desc: "Attend a party alone for 30 min", difficulty: 9, defeated: false, hp: 100, maxHp: 100 },
  ],
  strengths: ["Empathy", "Persistence", "Humor", "Curiosity"],
};

const STRENGTH_ICONS = {
  Empathy: "💜", Persistence: "🔥", Humor: "✨", Curiosity: "🔍",
  Creativity: "🎨", Loyalty: "🛡", Kindness: "💚", Courage: "⚔️",
  Wisdom: "📖", Calm: "🌊", Honesty: "💎", Resilience: "🏔",
};

// ============ COMPONENTS ============
function PixelText({ children, size = 10, color = C.cream, style = {} }) {
  return <span style={{ fontFamily: PIXEL_FONT, fontSize: size, color, lineHeight: 1.6, ...style }}>{children}</span>;
}

function PixelBtn({ children, onClick, color = C.plum, textColor = C.cream, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: PIXEL_FONT, fontSize: 10, padding: "12px 20px",
      background: disabled ? C.grayLt : color, color: disabled ? C.gray : textColor,
      border: `3px solid ${disabled ? C.gray : (color === C.plum ? "#5C3A50" : "#A07830")}`,
      borderRadius: 4, cursor: disabled ? "default" : "pointer",
      boxShadow: disabled ? "none" : `0 4px 0 ${color === C.plum ? "#4A2D40" : "#806020"}`,
      transition: "transform 0.1s", imageRendering: "pixelated", ...style,
    }}>{children}</button>
  );
}

function HPBar({ current, max, width = "100%", height = 12, label }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? C.hpGreen : pct > 25 ? C.amber : C.hpRed;
  return (
    <div style={{ width }}>
      {label && <PixelText size={8} color={C.grayLt}>{label}</PixelText>}
      <div style={{ height, background: "#1A1218", borderRadius: 2, border: "2px solid #5C3A50", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.6s ease", imageRendering: "pixelated" }} />
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[0,1,2].map(i => <span key={i} style={{
        width: 6, height: 6, borderRadius: "50%", background: C.plumMd,
        animation: `bop 1s ease-in-out ${i*0.15}s infinite`,
      }} />)}
      <style>{`@keyframes bop { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
    </span>
  );
}

function DialogBox({ speaker, text, typing, children }) {
  return (
    <div style={{
      background: "#1A1218", border: "3px solid #5C3A50", borderRadius: 6,
      padding: 14, margin: "0 0 12px",
    }}>
      {speaker && <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>{speaker}</PixelText>}
      {typing ? <TypingDots /> : <PixelText size={9} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>{text}</PixelText>}
      {children}
    </div>
  );
}

// ============ ONBOARDING PROGRESS BAR ============
// Shows progress through the journey from intro to training ground (tutorial)
const ONBOARDING = [
  { key: "intro", label: "Story" },
  { key: "character", label: "Hero" },
  { key: "values", label: "Values" },
  { key: "shadowLore", label: "Shadow Lore" },
  { key: "psychoed", label: "Learn" },
  { key: "shadowLorePost", label: "Shadow Lore" },
  { key: "intake", label: "Intake" },
  { key: "shadowReveal", label: "Reveal" },
  { key: "darerStrategy", label: "DARER STRATEGY" },
  { key: "armory", label: "Armory" },
  { key: "tutorial", label: "Training" },
];

function OnboardingProgress({ screen }) {
  const idx = ONBOARDING.findIndex(s => s.key === screen);
  if (idx === -1) return null;
  const pct = ((idx + 1) / ONBOARDING.length) * 100;
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 200,
      background: "#1A1218", borderBottom: "2px solid #5C3A50",
      padding: "8px 12px 6px",
      boxSizing: "border-box",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
      }}>
        <PixelText size={7} color={C.goldMd}>STEP {idx + 1}/{ONBOARDING.length}</PixelText>
        <PixelText size={7} color={C.grayLt}>{ONBOARDING[idx].label.toUpperCase()}</PixelText>
      </div>
      <div style={{
        height: 6, background: "#5C3A50", borderRadius: 3, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: C.goldMd,
          transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 4,
        padding: "0 2px",
      }}>
        {ONBOARDING.map((s, i) => (
          <div key={s.key} style={{
            width: i <= idx ? 6 : 4,
            height: i <= idx ? 6 : 4,
            borderRadius: "50%",
            background: i < idx ? C.goldMd : i === idx ? C.gold : C.gray,
            transition: "all 0.3s",
            flexShrink: 0,
          }} />
        ))}
      </div>
    </div>
  );
}

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

function calcStats(claimed) {
  const base = { courage: 5, resilience: 5, openness: 5 };
  claimed.forEach(card => {
    if (card.type === "strength") base[card.stat] = Math.min(10, base[card.stat] + 1);
    else base[card.stat] = Math.max(1, base[card.stat] - 1);
  });
  return base;
}

function calcSADS(claimed, dismissed) {
  // SADS scoring: challenge cards claimed as "that's me" = 1 point each
  // strength cards dismissed (NOT claimed) = 1 point each
  // Full 28-item SADS (Watson & Friend, 1969)
  let score = 0;
  claimed.forEach(card => { if (card.type === "challenge") score += 1; });
  dismissed.forEach(card => { if (card.type === "strength") score += 1; });
  // Score is already on the 0-28 scale with all 28 items
  const level = score <= 1 ? "low" : score <= 11 ? "average" : "high";
  return { raw: score, normalized: score, level };
}

// --- CHARACTER CREATION (Name → Card Sort → Stat Reveal) ---
// Currently bypassing card sort; goes name → stat reveal (all stats = 1)
// To re-enable card sort: set SKIP_CARD_SORT = false
const SKIP_CARD_SORT = true;

function CharacterCreate({ onComplete, initialName, darerId, obState, setOBState }) {
  const step = obState?.step ?? "name";
  const setStep = (v) => setOBState({ step: typeof v === 'function' ? v(step) : v });
  const name = obState?.name ?? initialName ?? "";
  const setName = (v) => setOBState({ name: typeof v === 'function' ? v(name) : v });
  const nameConfirmed = obState?.nameConfirmed ?? false;
  const setNameConfirmed = (v) => setOBState({ nameConfirmed: typeof v === 'function' ? v(nameConfirmed) : v });
  const [deck, setDeck] = useState(() => [...TRAIT_CARDS].sort(() => Math.random() - 0.5));
  const [currentCard, setCurrentCard] = useState(0);
  const [claimed, setClaimed] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [swipeDir, setSwipeDir] = useState(null);
  const [stats, setStats] = useState(null);
  const [sads, setSads] = useState(null);
  const [statsRevealed, setStatsRevealed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const [coreValues, setCoreValues] = useState([]);
  const [valuesPage, setValuesPage] = useState(0);
  const [expandedValue, setExpandedValue] = useState(null);
  const [dragX, setDragX] = useState(0);
  // Stats defaults — all set to 1 (bypassing card sort calculation)
  const [defaultStats] = useState({ courage: 1, resilience: 1, openness: 1 });

  // ACT Core Values — filtered for social/relational relevance
  // From Russ Harris "A Quick Look at Your Values" (actmindfully.com, 2010)
  const [ACT_VALUES] = useState(() => [
    { id: "a1", word: "Acceptance", desc: "Open to and accepting of myself, others, and life", icon: "🌿", dim: "resilience" },
    { id: "a2", word: "Adventure", desc: "Actively seeking, creating, or exploring novel experiences", icon: "🧭", dim: "courage" },
    { id: "a3", word: "Assertiveness", desc: "Standing up for myself and asking for what I want", icon: "🗣", dim: "courage" },
    { id: "a4", word: "Authenticity", desc: "Being genuine, real, and true to who I am", icon: "💎", dim: "openness" },
    { id: "a5", word: "Caring", desc: "Being caring toward myself and others", icon: "💛", dim: "openness" },
    { id: "a6", word: "Challenge", desc: "Pushing myself to grow, learn, and improve", icon: "⚡", dim: "courage" },
    { id: "a7", word: "Compassion", desc: "Responding with kindness to those who are struggling", icon: "🤲", dim: "resilience" },
    { id: "a8", word: "Connection", desc: "Being fully present with others in what I'm doing", icon: "🔗", dim: "openness" },
    { id: "a9", word: "Cooperation", desc: "Being cooperative and collaborative with others", icon: "🧩", dim: "openness" },
    { id: "a10", word: "Courage", desc: "Being brave and persisting in the face of fear", icon: "⚔️", dim: "courage" },
    { id: "a11", word: "Curiosity", desc: "Being open-minded, interested, willing to explore", icon: "🔍", dim: "openness" },
    { id: "a12", word: "Fairness", desc: "Treating myself and others with fairness and justice", icon: "⚖️", dim: "openness" },
    { id: "a13", word: "Flexibility", desc: "Adjusting and adapting readily to changing circumstances", icon: "🌊", dim: "resilience" },
    { id: "a14", word: "Forgiveness", desc: "Being forgiving toward myself or others", icon: "🕊", dim: "resilience" },
    { id: "a15", word: "Friendliness", desc: "Being warm, open, and approachable toward others", icon: "🤝", dim: "openness" },
    { id: "a16", word: "Fun", desc: "Seeking, creating, and engaging in fun-filled activities", icon: "🎉", dim: "openness" },
    { id: "a17", word: "Generosity", desc: "Being generous, sharing, and giving to myself or others", icon: "🎁", dim: "openness" },
    { id: "a18", word: "Honesty", desc: "Being truthful and sincere with myself and others", icon: "✨", dim: "openness" },
    { id: "a19", word: "Humility", desc: "Being modest; letting my actions speak for themselves", icon: "🌱", dim: "resilience" },
    { id: "a20", word: "Humour", desc: "Seeing and appreciating the humorous side of life", icon: "😄", dim: "openness" },
    { id: "a21", word: "Independence", desc: "Choosing for myself how I live and what I do", icon: "🦅", dim: "courage" },
    { id: "a22", word: "Intimacy", desc: "Opening up and sharing myself in close relationships", icon: "❤️", dim: "openness" },
    { id: "a23", word: "Kindness", desc: "Being considerate, helpful, or caring to myself or others", icon: "🌸", dim: "openness" },
    { id: "a24", word: "Love", desc: "Showing love and affection to myself or others", icon: "💜", dim: "openness" },
    { id: "a25", word: "Open-mindedness", desc: "Seeing things from others' points of view", icon: "🌏", dim: "openness" },
    { id: "a26", word: "Order", desc: "Being orderly, organized, and structured", icon: "📐", dim: "resilience" },
    { id: "a27", word: "Patience", desc: "Waiting calmly for what I want", icon: "⏳", dim: "resilience" },
    { id: "a28", word: "Persistence", desc: "Continuing resolutely despite problems or difficulties", icon: "🔥", dim: "resilience" },
    { id: "a29", word: "Reciprocity", desc: "Building relationships with a fair balance of giving and taking", icon: "🔄", dim: "openness" },
    { id: "a30", word: "Respect", desc: "Being polite, considerate, and showing positive regard", icon: "🙏", dim: "openness" },
    { id: "a31", word: "Self-awareness", desc: "Being aware of my own thoughts, feelings, and actions", icon: "🪞", dim: "resilience" },
    { id: "a32", word: "Sensuality", desc: "Creating and enjoying experiences that stimulate the senses", icon: "🌺", dim: "openness" },
    { id: "a33", word: "Sexuality", desc: "Exploring and expressing my sexuality freely", icon: "💋", dim: "openness" },
    { id: "a34", word: "Supportiveness", desc: "Being helpful, encouraging, and available to others", icon: "🛡", dim: "openness" },
    { id: "a35", word: "Trust", desc: "Being loyal, faithful, sincere, and reliable", icon: "🤝", dim: "openness" },
  ].sort(() => Math.random() - 0.5));
  const [dragging, setDragging] = useState(false);
  const touchStartRef = useRef(null);
  const touchCurrentRef = useRef(null);

  const handleClaim = () => {
    setSwipeDir("right"); setDragX(0); setDragging(false);
    setClaimed(p => [...p, deck[currentCard]]);
    setTimeout(() => { setSwipeDir(null); setCurrentCard(c => c + 1); }, 300);
  };

  const handleDismiss = () => {
    setSwipeDir("left"); setDragX(0); setDragging(false);
    setDismissed(p => [...p, deck[currentCard]]);
    setTimeout(() => { setSwipeDir(null); setCurrentCard(c => c + 1); }, 300);
  };

  const onTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchCurrentRef.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (!touchStartRef.current) return;
    touchCurrentRef.current = e.touches[0].clientX;
    const diff = touchCurrentRef.current - touchStartRef.current;
    setDragX(diff);
  };
  const onTouchEnd = () => {
    if (!touchStartRef.current) return;
    const diff = touchCurrentRef.current - touchStartRef.current;
    if (diff > 60) handleClaim();
    else if (diff < -60) handleDismiss();
    else { setDragX(0); setDragging(false); }
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  };
  const onMouseDown = (e) => {
    touchStartRef.current = e.clientX;
    touchCurrentRef.current = e.clientX;
    setDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragging || !touchStartRef.current) return;
    touchCurrentRef.current = e.clientX;
    setDragX(e.clientX - touchStartRef.current);
  };
  const onMouseUp = () => {
    if (!touchStartRef.current) return;
    const diff = touchCurrentRef.current - touchStartRef.current;
    if (diff > 60) handleClaim();
    else if (diff < -60) handleDismiss();
    else { setDragX(0); setDragging(false); }
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  };

  const dragRotation = Math.max(-15, Math.min(15, dragX * 0.1));
  const dragOpacity = Math.max(0.3, 1 - Math.abs(dragX) / 300);
  const showClaimHint = dragX > 30;
  const showDismissHint = dragX < -30;

  const finishSort = () => {
    const s = calcStats(claimed);
    const sa = calcSADS(claimed, dismissed);
    setStats(s);
    setSads(sa);
    setStep("reveal");
    setTimeout(() => setStatsRevealed(true), 400);
  };

  useEffect(() => {
    if (currentCard >= deck.length && step === "cards") finishSort();
  }, [currentCard, deck.length, step]);

  const card = deck[currentCard];
  const progress = deck.length > 0 ? Math.round((currentCard / deck.length) * 100) : 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: step === "reveal" ? "flex-start" : "center", alignItems: "center", padding: step === "reveal" ? "16px 24px 0" : "0 24px", background: C.mapBg, textAlign: "center", overflowY: step === "reveal" ? "auto" : "hidden" }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* STEP 1: NAME */}
      {step === "name" && (
        <div style={{ animation: "fadeIn 0.5s ease-out", width: "100%" }}>
          <div style={{
            width: 80, height: 80, margin: "0 auto 24px", borderRadius: 6,
            background: "#1A1218", border: `4px solid ${nameConfirmed ? C.goldMd : "#5C3A50"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: nameConfirmed ? `0 0 20px ${C.goldMd}30` : "none",
            transition: "all 0.5s",
          }}>
            <PixelText size={36} color={nameConfirmed ? C.goldMd : C.grayLt}>
              {nameConfirmed ? "⚔" : "?"}
            </PixelText>
          </div>

          <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
            EVERY HERO HAS A NAME
          </PixelText>
          <PixelText size={8} color={C.grayLt} style={{ display: "block", marginBottom: 24 }}>
            What is yours?
          </PixelText>

          <input value={name}
            onChange={e => { setName(e.target.value); setNameConfirmed(false); }}
            onKeyDown={e => { if (e.key === "Enter" && name.trim()) setNameConfirmed(true); }}
            placeholder={darerId || "Enter your name..."}
            autoFocus
            style={{
              width: "100%", padding: 14, textAlign: "center",
              background: "#1A1218", border: `3px solid ${nameConfirmed ? C.goldMd : "#5C3A50"}`,
              borderRadius: 4, color: C.cream, fontSize: 16,
              fontFamily: PIXEL_FONT, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.3s",
            }}
          />

          {(name.trim() || darerId) && !nameConfirmed && (
            <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
              <PixelBtn onClick={() => setNameConfirmed(true)}>
                {name.trim() ? "THAT'S ME" : "USE MY DARER ID"}
              </PixelBtn>
            </div>
          )}

          {nameConfirmed && (
            <div style={{ marginTop: 20, animation: "fadeIn 0.5s ease-out" }}>
              <div style={{ padding: 16, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, marginBottom: 16 }}>
                <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                  {name.trim() || darerId}. A name the Shadow{"\n"}will learn to fear.{"\n"}{"\n"}
                  Welcome to the DARER family.{"\n"}{"\n"}
                  A name alone doesn't make a{"\n"}hero. Your story does. Your{"\n"}actions do. Your strengths matter.{"\n"}{"\n"}
                  Let me introduce someone who{"\n"}will walk beside you from here.
                </PixelText>
              </div>
              <PixelBtn onClick={() => setStep("meetDara")} color={C.gold} textColor={C.charcoal}>
                CONTINUE →
              </PixelBtn>
            </div>
          )}
        </div>
      )}

      {/* STEP 1.5: MEET DARA */}
      {step === "meetDara" && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out" }}>
          {/* Dara portrait */}
          <div style={{
            width: 88, height: 88, margin: "0 auto 20px", borderRadius: "50%",
            background: "linear-gradient(135deg, #2A1A28 0%, #1A1218 100%)",
            border: `4px solid ${C.goldMd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px ${C.goldMd}25, 0 0 48px ${C.goldMd}10`,
          }}>
            <span style={{ fontSize: 40 }}>🧚</span>
          </div>

          <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>DARA</PixelText>
          <PixelText size={7} color={C.plumMd} style={{ display: "block", marginBottom: 20 }}>
            SOUL COMPANION OF THE DARER ORDER
          </PixelText>

          <div style={{ padding: 16, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, marginBottom: 16 }}>
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              Every DARER is assigned a Soul{"\n"}Companion — someone who knows the{"\n"}Shadow's tricks and how to{"\n"}unravel them.{"\n"}{"\n"}
              Dara has walked beside hundreds{"\n"}of DARERs before you. She knows{"\n"}the path. She knows the fear.{"\n"}And she knows it can be beaten.{"\n"}{"\n"}
              She will be with you before{"\n"}every battle, beside you during{"\n"}every struggle, and here to{"\n"}celebrate every victory.
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              {name.trim() || darerId}. I've been waiting for you.{"\n"}{"\n"}
              My name means courage — and{"\n"}that's exactly what we'll build{"\n"}together. But first, I need to{"\n"}understand who you are.{"\n"}{"\n"}
              I'm going to show you some cards.{"\n"}Each one describes a trait. Just{"\n"}tell me — is this you, or not?{"\n"}There are no wrong answers.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => setStep("coreValues")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            I'M READY, DARA →
          </PixelBtn>
        </div>
      )}

      {/* STEP 1.75: CORE VALUES — pick top 3, paginated, swipeable, tap to see description */}
      {step === "coreValues" && (() => {
        const ITEMS_PER_PAGE = 6;
        const totalPages = Math.ceil(ACT_VALUES.length / ITEMS_PER_PAGE);
        const pageItems = ACT_VALUES.slice(valuesPage * ITEMS_PER_PAGE, (valuesPage + 1) * ITEMS_PER_PAGE);
        const handleGridTouchStart = (e) => { e.currentTarget._touchX = e.touches[0].clientX; };
        const handleGridTouchEnd = (e) => {
          const diff = e.changedTouches[0].clientX - (e.currentTarget._touchX || 0);
          if (diff < -50 && valuesPage < totalPages - 1) { setValuesPage(p => p + 1); setExpandedValue(null); }
          else if (diff > 50 && valuesPage > 0) { setValuesPage(p => p - 1); setExpandedValue(null); }
        };
        return (
        <div style={{ width: "100%", animation: "fadeIn 0.4s ease-out" }}>
          <PixelText size={11} color={C.goldMd} style={{ display: "block", textAlign: "center", marginBottom: 4 }}>
            YOUR INNER CHARACTER
          </PixelText>
          <PixelText size={8} color={C.grayLt} style={{ display: "block", textAlign: "center", marginBottom: 12 }}>
            Choose the 3 that best describe you.
          </PixelText>

          {/* Top 3 slots */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[0, 1, 2].map(i => {
              const picked = coreValues[i] ? ACT_VALUES.find(v => v.id === coreValues[i]) : null;
              return (
                <div key={i} style={{
                  flex: 1, padding: "12px 8px", textAlign: "center", borderRadius: 6,
                  background: picked ? C.goldMd + "15" : "#1A1218",
                  border: `2px solid ${picked ? C.goldMd : "#5C3A50"}`,
                  minHeight: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: picked ? "pointer" : "default",
                }} onClick={() => picked && setCoreValues(prev => prev.filter(x => x !== picked.id))}>
                  {picked ? (
                    <>
                      <span style={{ fontSize: 22 }}>{picked.icon}</span>
                      <PixelText size={7} color={C.goldMd}>{picked.word.toUpperCase()}</PixelText>
                    </>
                  ) : (
                    <PixelText size={10} color={"#5C3A50"}>?</PixelText>
                  )}
                </div>
              );
            })}
          </div>

          {/* Value grid — 2 columns, swipeable */}
          <div
            onTouchStart={handleGridTouchStart}
            onTouchEnd={handleGridTouchEnd}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, touchAction: "pan-y" }}>
            {pageItems.map(v => {
              const active = coreValues.includes(v.id);
              const expanded = expandedValue === v.id;
              return (
                <button key={v.id} onClick={() => {
                  if (expanded) {
                    setCoreValues(prev => prev.includes(v.id)
                      ? prev.filter(x => x !== v.id)
                      : prev.length < 3 ? [...prev, v.id] : prev);
                    setExpandedValue(null);
                  } else {
                    setExpandedValue(v.id);
                  }
                }} style={{
                  padding: "14px 10px", background: active ? C.goldMd + "15" : "#1A1218",
                  border: `2px solid ${active ? C.goldMd : expanded ? C.plumMd : "#5C3A50"}`,
                  borderRadius: 6, cursor: "pointer", textAlign: "center",
                  boxShadow: active ? `0 0 8px ${C.goldMd}15` : "none",
                  transition: "all 0.2s",
                  gridColumn: expanded ? "1 / -1" : "auto",
                }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>{v.icon}</span>
                  <PixelText size={8} color={active ? C.goldMd : C.cream}>{v.word.toUpperCase()}</PixelText>
                  {expanded && (
                    <div style={{ marginTop: 8 }}>
                      <PixelText size={7} color={C.grayLt}>{v.desc}</PixelText>
                      <div style={{ marginTop: 8 }}>
                        <PixelText size={7} color={active ? C.bossRed : C.goldMd}>
                          {active ? "TAP TO REMOVE" : "TAP TO SELECT"}
                        </PixelText>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button onClick={() => { setValuesPage(p => p - 1); setExpandedValue(null); }} disabled={valuesPage === 0}
              style={{ background: "none", border: "none", cursor: valuesPage === 0 ? "default" : "pointer", opacity: valuesPage === 0 ? 0.3 : 1 }}>
              <PixelText size={9} color={C.cream}>←</PixelText>
            </button>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <div key={i} style={{
                  width: i === valuesPage ? 16 : 6, height: 6, borderRadius: 3,
                  background: i === valuesPage ? C.goldMd : "#5C3A50", transition: "all 0.3s",
                }} />
              ))}
            </div>
            <button onClick={() => { setValuesPage(p => p + 1); setExpandedValue(null); }} disabled={valuesPage >= totalPages - 1}
              style={{ background: "none", border: "none", cursor: valuesPage >= totalPages - 1 ? "default" : "pointer", opacity: valuesPage >= totalPages - 1 ? 0.3 : 1 }}>
              <PixelText size={9} color={C.cream}>→</PixelText>
            </button>
          </div>

          {/* Continue button */}
          <div style={{ textAlign: "center" }}>
            {coreValues.length === 3 ? (
              <PixelBtn onClick={() => setStep("coreReveal")} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
                THESE DEFINE ME →
              </PixelBtn>
            ) : (
              <PixelText size={7} color={C.grayLt}>
                {coreValues.length}/3 selected
              </PixelText>
            )}
          </div>
        </div>
        );
      })()}

      {/* STEP 1.8: CORE VALUES REVEAL */}
      {step === "coreReveal" && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
              YOUR CORE STRENGTHS
            </PixelText>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {ACT_VALUES.filter(v => coreValues.includes(v.id)).map((v, i) => (
              <div key={v.id} style={{
                padding: 16, background: "#1A1218",
                border: `2px solid ${C.goldMd}60`, borderRadius: 6,
                textAlign: "center",
                animation: `fadeIn 0.5s ease-out ${i * 0.2}s both`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>
                  {v.word.toUpperCase()}
                </PixelText>
                <PixelText size={7} color={C.cream}>{v.desc}</PixelText>
              </div>
            ))}
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              These are the strengths the{"\n"}Shadow cannot take from you.{"\n"}They are yours — and they will{"\n"}grow stronger with every battle.{"\n"}{"\n"}
              I'll call on these strengths{"\n"}when we plan your battles and{"\n"}face the Shadow together. They{"\n"}are your strategies.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => {
            setStats(defaultStats);
            setStep("reveal");
            setTimeout(() => setStatsRevealed(true), 400);
          }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            CONTINUE →
          </PixelBtn>
        </div>
      )}

      {/* STEP 1.9: TRANSITION TO CARD SORT (hidden — skip to reveal) */}
      {false && step === "preCards" && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.7 }}>🔍</div>

          <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 16 }}>
            WHERE FEAR GROWS
          </PixelText>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
              Now let's explore the spaces{"\n"}where the Shadow meets you —{"\n"}the social moments where fear{"\n"}shows up in your life.{"\n"}{"\n"}
              I'm going to show you a series{"\n"}of statements about social{"\n"}situations. For each one, simply{"\n"}tell me — is this you, or not?{"\n"}{"\n"}
              There are no right or wrong{"\n"}answers. Stay true to yourself.{"\n"}The truth within will light the{"\n"}path to our destination.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => setStep("cards")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            I'M READY →
          </PixelBtn>
        </div>
      )}

      {/* STEP 2: CARD SORT (hidden — skipped) */}
      {false && step === "cards" && card && (
        <div style={{ width: "100%", animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>
            YOU IN SOCIAL MOMENTS
          </PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>
            Is this you? Swipe right for Yes, left for No.
          </PixelText>

          {/* Progress bar */}
          <div style={{ height: 4, background: "#1A1218", borderRadius: 2, marginBottom: 20, border: "1px solid #5C3A50" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: C.goldMd, borderRadius: 2, transition: "width 0.3s" }} />
          </div>

          {/* Card */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { if (dragging) { setDragX(0); setDragging(false); touchStartRef.current = null; } }}
            style={{
              width: 260, height: 380, margin: "0 auto 16px",
              background: card.type === "strength"
                ? "linear-gradient(170deg, #1A1218 0%, #2A1A20 50%, #1A1218 100%)"
                : "linear-gradient(170deg, #1A1218 0%, #1E1625 50%, #1A1218 100%)",
              border: `3px solid ${showClaimHint ? C.goldMd : showDismissHint ? C.bossRed : card.type === "strength" ? C.goldMd + "80" : C.plumMd + "80"}`,
              borderRadius: 12, position: "relative", overflow: "hidden",
              transform: swipeDir === "right" ? "translateX(120%) rotate(12deg)"
                : swipeDir === "left" ? "translateX(-120%) rotate(-12deg)"
                : dragging ? `translateX(${dragX}px) rotate(${dragRotation}deg)`
                : "none",
              opacity: swipeDir ? 0 : dragging ? dragOpacity : 1,
              transition: swipeDir ? "transform 0.3s ease-out, opacity 0.3s ease-out"
                : dragging ? "none"
                : "transform 0.3s ease-out, opacity 0.3s ease-out, border-color 0.2s",
              cursor: "grab", userSelect: "none", touchAction: "pan-y",
              boxShadow: `0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Inner border (poker card double frame) */}
            <div style={{
              position: "absolute", inset: 8,
              border: `1px solid ${card.type === "strength" ? C.goldMd + "30" : C.plumMd + "30"}`,
              borderRadius: 8, pointerEvents: "none",
            }} />

            {/* Top-left corner pip */}
            <div style={{ position: "absolute", top: 16, left: 16, textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{card.icon}</div>
              <PixelText size={6} color={card.type === "strength" ? C.goldMd : C.plumMd}>
                {card.type === "strength" ? "STR" : "CHL"}
              </PixelText>
            </div>

            {/* Bottom-right corner pip (inverted) */}
            <div style={{ position: "absolute", bottom: 16, right: 16, textAlign: "center", transform: "rotate(180deg)" }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{card.icon}</div>
              <PixelText size={6} color={card.type === "strength" ? C.goldMd : C.plumMd}>
                {card.type === "strength" ? "STR" : "CHL"}
              </PixelText>
            </div>

            {/* Center content */}
            <div style={{ fontSize: 48, marginBottom: 16 }}>{card.icon}</div>
            <div style={{ padding: "0 28px", textAlign: "center" }}>
              <PixelText size={9} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                "{card.text}"
              </PixelText>
            </div>
            <div style={{ marginTop: 14 }}>
              <span style={{
                padding: "4px 12px", borderRadius: 3,
                background: card.type === "strength" ? C.goldMd + "20" : C.plumMd + "20",
                border: `1px solid ${card.type === "strength" ? C.goldMd + "50" : C.plumMd + "50"}`,
              }}>
                <PixelText size={6} color={card.type === "strength" ? C.goldMd : C.plumMd}>
                  {card.type === "strength" ? "STRENGTH" : "CHALLENGE"}
                </PixelText>
              </span>
            </div>

            {/* Swipe direction overlays */}
            {showClaimHint && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: C.goldMd + "18", borderRadius: 9,
              }}>
                <div style={{ padding: "8px 20px", background: C.goldMd + "40", borderRadius: 6, border: `2px solid ${C.goldMd}` }}>
                  <PixelText size={10} color={C.goldMd}>THAT'S ME</PixelText>
                </div>
              </div>
            )}
            {showDismissHint && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: C.bossRed + "18", borderRadius: 9,
              }}>
                <div style={{ padding: "8px 20px", background: C.bossRed + "40", borderRadius: 6, border: `2px solid ${C.bossRed}` }}>
                  <PixelText size={10} color={C.bossRed}>NOT ME</PixelText>
                </div>
              </div>
            )}
          </div>

          {/* Swipe hint + progress + fallback buttons */}
          <div style={{ textAlign: "center" }}>
            <PixelText size={6} color={C.grayLt}>
              ← NO | YES →
            </PixelText>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
              <button onClick={handleDismiss} style={{
                width: 48, height: 48, borderRadius: "50%", border: "2px solid #5C3A50",
                background: "#1A1218", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>✕</button>
              <div style={{ display: "flex", alignItems: "center" }}>
                <PixelText size={7} color={C.grayLt}>{currentCard + 1} / {deck.length}</PixelText>
              </div>
              <button onClick={handleClaim} style={{
                width: 48, height: 48, borderRadius: "50%", border: `2px solid ${C.goldMd}`,
                background: C.plum, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 18,
                boxShadow: `0 0 12px ${C.goldMd}20`,
              }}>✓</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: STAT REVEAL */}
      {step === "reveal" && stats && (
        <div style={{ width: "100%", animation: "fadeIn 0.6s ease-out", overflowY: "auto", maxHeight: "100%", paddingBottom: 20 }}>
          {/* Character portrait */}
          <div style={{
            width: 80, height: 80, margin: "0 auto 16px", borderRadius: 6,
            background: C.plum, border: `4px solid ${C.goldMd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px ${C.goldMd}30`,
          }}>
            <PixelText size={32} color={C.goldMd}>⚔</PixelText>
          </div>
          <PixelText size={12} color={C.cream} style={{ display: "block" }}>{name.trim() || darerId}</PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginTop: 4, marginBottom: 20 }}>
            {claimed.filter(c => c.type === "strength").length} strengths claimed · {claimed.filter(c => c.type === "weakness").length} challenges acknowledged
          </PixelText>

          {/* Stats — labeled with user's core values */}
          {(() => {
            // Map user's 3 core values to the 3 dimensions, ensuring coverage
            const dims = ["courage", "resilience", "openness"];
            const colors = { courage: C.bossRed, resilience: C.teal, openness: C.plumMd };
            const chosenVals = coreValues.map(id => ACT_VALUES.find(v => v.id === id)).filter(Boolean);
            const assigned = [];
            const usedDims = new Set();
            // First pass: assign each value to its natural dimension if available
            chosenVals.forEach(v => {
              if (!usedDims.has(v.dim)) { assigned.push({ ...v, assignedDim: v.dim }); usedDims.add(v.dim); }
            });
            // Second pass: assign remaining values to unassigned dimensions
            chosenVals.forEach(v => {
              if (!assigned.find(a => a.id === v.id)) {
                const freeDim = dims.find(d => !usedDims.has(d));
                if (freeDim) { assigned.push({ ...v, assignedDim: freeDim }); usedDims.add(freeDim); }
              }
            });
            // Sort by dimension order
            assigned.sort((a, b) => dims.indexOf(a.assignedDim) - dims.indexOf(b.assignedDim));
            return assigned.map((v, i) => (
              <div key={v.id} style={{
                padding: "12px 14px", marginBottom: 8, background: "#1A1218",
                border: "2px solid #5C3A50", borderRadius: 6,
                display: "flex", alignItems: "center", gap: 12,
                animation: statsRevealed ? `fadeIn 0.4s ease-out ${i * 0.15}s both` : "none",
                opacity: statsRevealed ? 1 : 0,
              }}>
                <div style={{ fontSize: 20, width: 28, textAlign: "center" }}>{v.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <PixelText size={8} color={colors[v.assignedDim]}>{v.word.toUpperCase()}</PixelText>
                    <PixelText size={8} color={C.cream}>{stats[v.assignedDim]}/10</PixelText>
                  </div>
                  <div style={{ height: 8, background: C.mapBg, borderRadius: 2, border: "1px solid #5C3A50", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: statsRevealed ? `${stats[v.assignedDim] * 10}%` : "0%",
                      background: colors[v.assignedDim], borderRadius: 2,
                      transition: `width 0.8s ease-out ${0.5 + i * 0.2}s`,
                    }} />
                  </div>
                  <div style={{ marginTop: 3 }}><PixelText size={6} color={C.grayLt}>{v.desc}</PixelText></div>
                </div>
              </div>
            ));
          })()}

          {/* Summary counts — tap to explain */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowTooltip(showTooltip === "strength" ? null : "strength")} style={{
              flex: 1, padding: 10, background: showTooltip === "strength" ? C.goldMd + "15" : "#1A1218",
              border: `2px solid ${showTooltip === "strength" ? C.goldMd : "#5C3A50"}`,
              borderRadius: 6, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            }}>
              <PixelText size={12} color={C.goldMd}>{claimed.filter(c => c.type === "strength").length}</PixelText>
              <div><PixelText size={6} color={C.grayLt}>STRENGTHS ⓘ</PixelText></div>
            </button>
            <button onClick={() => setShowTooltip(showTooltip === "challenge" ? null : "challenge")} style={{
              flex: 1, padding: 10, background: showTooltip === "challenge" ? C.plumMd + "15" : "#1A1218",
              border: `2px solid ${showTooltip === "challenge" ? C.plumMd : "#5C3A50"}`,
              borderRadius: 6, textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            }}>
              <PixelText size={12} color={C.plumMd}>{claimed.filter(c => c.type === "challenge").length}</PixelText>
              <div><PixelText size={6} color={C.grayLt}>CHALLENGES ⓘ</PixelText></div>
            </button>
          </div>

          {/* Tooltip explanation */}
          {showTooltip && (
            <div style={{
              marginTop: 8, padding: 12, background: "#1A1218",
              border: `2px solid ${showTooltip === "strength" ? C.goldMd + "60" : C.plumMd + "60"}`,
              borderRadius: 6, animation: "fadeIn 0.2s ease-out",
            }}>
              <PixelText size={8} color={showTooltip === "strength" ? C.goldMd : C.plumMd} style={{ display: "block", marginBottom: 6 }}>
                {showTooltip === "strength" ? "WHAT ARE STRENGTHS?" : "WHAT ARE CHALLENGES?"}
              </PixelText>
              <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                {showTooltip === "strength"
                  ? "These are the qualities that make you who you are — the parts of you the Shadow cannot touch. They boost your stats and become your strategies in battle."
                  : "These are the places where the Shadow has its grip. They're not weaknesses — they're the battles ahead. Every challenge you claimed is a boss waiting to be defeated, and each victory will raise your stats."}
              </PixelText>
              <button onClick={() => setShowTooltip(null)} style={{
                marginTop: 8, background: "none", border: "none", cursor: "pointer",
              }}><PixelText size={6} color={C.grayLt}>TAP TO CLOSE</PixelText></button>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Now I can see who you are,{"\n"}{name.trim() || darerId}.{" "}
                {(() => {
                  const chosenVals = coreValues.map(id => ACT_VALUES.find(v => v.id === id)).filter(Boolean);
                  const highest = chosenVals.reduce((best, v) => (!best || stats[v.dim] > stats[best.dim]) ? v : best, null);
                  return highest ? `Your ${highest.word.toLowerCase()} shines through — the Shadow hasn't been able to dim that.` : "I can see the fight in you already.";
                })()}
                {" "}Before we go further, let me{"\n"}show you what the journey ahead{"\n"}looks like.
              </PixelText>
            </DialogBox>
          </div>

          <PixelBtn onClick={() => onComplete((name.trim() || darerId), stats, claimed, sads, coreValues.map(id => ACT_VALUES.find(v => v.id === id)))} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
            SEE THE PATH AHEAD →
          </PixelBtn>
        </div>
      )}

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
    </div>
  );
}

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
function ValuesScreen({ heroName, onComplete }) {
  const [step, setStep] = useState("intro");
  const [values, setValues] = useState([]);
  const [freeText, setFreeText] = useState("");
  const [guideStep, setGuideStep] = useState(0);
  const [guideAnswers, setGuideAnswers] = useState(["", "", ""]);
  const [generatedValues, setGeneratedValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [allCards, setAllCards] = useState(null);

  // Outcome-oriented values informed by Behavioral Activation life areas
  // (Lejuez et al., BATD-R) and DBT Wise Mind Values (Linehan/Rathus & Miller, 2015)
  // Weighted toward social/relational domains for social anxiety population
  const DEFAULT_CARDS = [
    { id: "v1", text: "Reach out and build new friendships", icon: "🤝", domain: "friendships" },
    { id: "v2", text: "Feel a sense of belonging in a group", icon: "💜", domain: "friendships" },
    { id: "v3", text: "Show the people I love how much they mean to me", icon: "❤️", domain: "intimacy" },
    { id: "v4", text: "Spend quality time with people I care about", icon: "🔥", domain: "friendships" },
    { id: "v5", text: "Be someone others can trust and count on", icon: "🌟", domain: "friendships" },
    { id: "v6", text: "Open up and let people really know me", icon: "🤗", domain: "intimacy" },
    { id: "v7", text: "Speak up and share what I think and feel", icon: "🗣", domain: "expression" },
    { id: "v8", text: "Share my ideas confidently at work or school", icon: "💡", domain: "employment" },
    { id: "v9", text: "Enjoy social events without dreading them", icon: "🎉", domain: "friendships" },
    { id: "v10", text: "Take on challenges that help me grow", icon: "🏔", domain: "growth" },
    { id: "v11", text: "Be respected and confident at work or school", icon: "⭐", domain: "achievement" },
    { id: "v12", text: "Contribute and help people around me", icon: "🌍", domain: "community" },
  ];

  const VALUE_CARDS = allCards || DEFAULT_CARDS;

  // Guided exploration prompts (inspired by DBT values experiments, Rathus & Miller 2015)
  const GUIDE_PROMPTS = [
    { question: "Imagine someone is telling the story of your best moments with other people — your highlights in social life. What would they describe?", hint: "A time you connected with someone, made a friend laugh, felt like you belonged, or showed up as the real you..." },
    { question: "Think about someone whose social life you admire. What is it about the way they connect with others that you wish you had?", hint: "Maybe they're effortlessly warm, or they speak their mind, or they walk into any room like they belong..." },
    { question: "If the Shadow vanished tomorrow and fear no longer controlled how you showed up around people — what would change?", hint: "Who would you reach out to? What would you say yes to? How would your relationships be different?" },
  ];

  const updateGuideAnswer = (text) => {
    setGuideAnswers(prev => { const next = [...prev]; next[guideStep] = text; return next; });
  };

  const generateValuesFromAnswers = async () => {
    setLoadingValues(true);
    try {
      const combined = guideAnswers.filter(a => a.trim()).join(". ");
      const res = await callClaude(
        `You are a values counselor for a social anxiety RPG game. Based on what the user shared about what matters to them, generate exactly 3 personalized value statements. Each should be an outcome-oriented value (what they want in life, not how they want to behave). Keep each to 8 words or fewer. Return ONLY a JSON array like: [{"text":"value text","icon":"emoji"}]. No other text.`,
        [{ role: "user", text: `Here is what the user shared:\n1. Social highlights: "${guideAnswers[0]}"\n2. Social qualities they admire: "${guideAnswers[1]}"\n3. What they'd do without fear: "${guideAnswers[2]}"` }]
      );
      const jsonMatch = res.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const newCards = parsed.slice(0, 3).map((v, i) => ({
            id: "vg" + i, text: v.text, icon: v.icon || "💫", domain: "personal", generated: true,
          }));
          setGeneratedValues(newCards);
          setAllCards([...newCards, ...DEFAULT_CARDS]);
          setValues([]);
          setStep("cards");
        } else { setStep("cards"); }
      } else { setStep("cards"); }
    } catch (e) { setStep("cards"); }
    setLoadingValues(false);
  };

  const toggleValue = (v) => {
    setValues(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : prev.length < 5 ? [...prev, v.id] : prev);
  };

  const selectedCards = VALUE_CARDS.filter(v => values.includes(v.id));

  return (
    <div style={{
      minHeight: "100vh", background: C.mapBg, padding: "20px 20px 32px",
      overflowY: "auto",
    }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* INTRO — Dara asks the question */}
      {step === "intro" && (
        <div style={{ animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏰</div>
            <PixelText size={11} color={C.goalGold} style={{ display: "block", marginBottom: 8 }}>
              WHY BECOME A DARER?
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
              {heroName}, before we step onto{"\n"}this journey — one that will be{"\n"}rocky, and at times filled with{"\n"}pain and challenges — it is{"\n"}important to ask ourselves and{"\n"}connect with something deeper.{"\n"}{"\n"}
              Why are you here?{"\n"}What motivates you to start{"\n"}this journey?{"\n"}What is worth fighting for?{"\n"}{"\n"}
              This isn't about goals you{"\n"}"should" have. This is about{"\n"}what truly matters to your heart.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => setStep("cards")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            LET ME SHOW YOU →
          </PixelBtn>
        </div>
      )}

      {/* CARDS — Select values that resonate */}
      {step === "cards" && (
        <div style={{ animation: "fadeIn 0.4s ease-out" }}>
          <PixelText size={10} color={C.goalGold} style={{ display: "block", textAlign: "center", marginBottom: 6 }}>
            WHAT MATTERS MOST?
          </PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", textAlign: "center", marginBottom: 16 }}>
            Choose up to 5 that speak to you.
          </PixelText>

          {/* Dara's picks label — only if generated values exist */}
          {generatedValues.length > 0 && (
            <PixelText size={7} color={C.plumMd} style={{ display: "block", marginBottom: 8 }}>
              ✨ DARA'S PICKS FOR YOU
            </PixelText>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {VALUE_CARDS.map((v, i) => {
              const active = values.includes(v.id);
              const isGenerated = v.generated;
              const showDivider = generatedValues.length > 0 && i === generatedValues.length;
              return (
                <div key={v.id} style={{ display: "contents" }}>
                  {showDivider && (
                    <div style={{ gridColumn: "1 / -1", padding: "8px 0 4px" }}>
                      <PixelText size={7} color={C.grayLt}>ALL VALUES</PixelText>
                    </div>
                  )}
                  <button onClick={() => toggleValue(v)} style={{
                    padding: "14px 10px",
                    background: active ? C.goalGold + "15" : isGenerated ? C.plumMd + "08" : "#1A1218",
                    border: `2px solid ${active ? C.goalGold : isGenerated ? C.plumMd + "60" : "#5C3A50"}`,
                    borderRadius: 6, cursor: "pointer", textAlign: "center",
                    boxShadow: active ? `0 0 12px ${C.goalGold}20` : isGenerated ? `0 0 8px ${C.plumMd}15` : "none",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{v.icon}</div>
                    <PixelText size={7} color={active ? C.goalGold : isGenerated ? C.plumMd : C.grayLt}>
                      {v.text}
                    </PixelText>
                    {isGenerated && !active && (
                      <div style={{ marginTop: 4 }}><PixelText size={5} color={C.plumMd}>SUGGESTED</PixelText></div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {values.length >= 2 && (
            <PixelBtn onClick={() => setStep("seal")} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
              THESE MATTER TO ME →
            </PixelBtn>
          )}
          {values.length < 2 && (
            <div style={{ textAlign: "center" }}>
              <PixelText size={7} color={C.grayLt}>Select at least 2 values</PixelText>
            </div>
          )}
          <button onClick={() => setStep("guide")} style={{
            display: "block", margin: "12px auto 0", background: "none", border: "none", cursor: "pointer",
          }}>
            <PixelText size={7} color={C.plumMd}>I need help finding my values →</PixelText>
          </button>
        </div>
      )}

      {/* GUIDED EXPLORATION — collect answers, then AI generates values */}
      {step === "guide" && (
        <div style={{ animation: "fadeIn 0.4s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧚</div>
            <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>
              LET'S FIND YOURS
            </PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>
              {guideStep + 1} of {GUIDE_PROMPTS.length}
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              {GUIDE_PROMPTS[guideStep].question}
            </PixelText>
            <div style={{ marginTop: 8 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", lineHeight: 1.6 }}>
                {GUIDE_PROMPTS[guideStep].hint}
              </PixelText>
            </div>
          </DialogBox>

          <textarea
            value={guideAnswers[guideStep]}
            onChange={e => updateGuideAnswer(e.target.value)}
            placeholder="What comes to mind..."
            rows={3}
            style={{
              width: "100%", padding: 12, marginTop: 12,
              background: "#1A1218", border: "2px solid #5C3A50",
              borderRadius: 4, color: C.cream, fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              outline: "none", resize: "none", boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {guideStep < GUIDE_PROMPTS.length - 1 ? (
              <PixelBtn onClick={() => setGuideStep(g => g + 1)} disabled={!guideAnswers[guideStep].trim()} color={C.plum} style={{ flex: 1 }}>
                NEXT QUESTION →
              </PixelBtn>
            ) : (
              <PixelBtn onClick={generateValuesFromAnswers} disabled={!guideAnswers[guideStep].trim() || loadingValues} color={C.gold} textColor={C.charcoal} style={{ flex: 1 }}>
                {loadingValues ? "DARA IS REFLECTING..." : "DISCOVER MY VALUES →"}
              </PixelBtn>
            )}
          </div>

          {guideStep > 0 && (
            <button onClick={() => setGuideStep(g => g - 1)} style={{
              display: "block", margin: "10px auto", background: "none", border: "none", cursor: "pointer",
            }}>
              <PixelText size={6} color={C.grayLt}>← Previous question</PixelText>
            </button>
          )}

          <button onClick={() => setStep("cards")} style={{
            display: "block", margin: "8px auto", background: "none", border: "none", cursor: "pointer",
          }}>
            <PixelText size={6} color={C.grayLt}>Back to value cards</PixelText>
          </button>
        </div>
      )}

      {/* SEAL — Values confirmed, Dara closes */}
      {step === "seal" && (
        <div style={{ animation: "fadeIn 0.6s ease-out", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <PixelText size={11} color={C.goalGold} style={{ display: "block", marginBottom: 20 }}>
            VALUES SEALED
          </PixelText>

          {selectedCards.length > 0 && (
            <div style={{
              padding: 16, background: C.goalGold + "10", border: `2px solid ${C.goalGold}40`,
              borderRadius: 6, marginBottom: 12,
            }}>
              {selectedCards.map(v => (
                <div key={v.id} style={{ marginBottom: 6 }}>
                  <PixelText size={8} color={C.goalGold}>{v.icon} {v.text}</PixelText>
                </div>
              ))}
            </div>
          )}

          {freeText.trim() && (
            <div style={{
              padding: 14, background: "#1A1218", border: "2px solid #5C3A50",
              borderRadius: 6, marginBottom: 12, textAlign: "left",
            }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 4 }}>IN YOUR WORDS:</PixelText>
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.7, fontStyle: "italic" }}>
                "{freeText.trim()}"
              </PixelText>
            </div>
          )}

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              Remember these, {heroName}.{"\n"}When the Shadow tries to make{"\n"}you forget why you started —{"\n"}and it will — these are what{"\n"}you come back to.{"\n"}{"\n"}
              Now I know what you're fighting{"\n"}for. Let's find out what you're{"\n"}fighting against.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => onComplete(selectedCards, freeText.trim())} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            FACE THE SHADOW →
          </PixelBtn>
        </div>
      )}

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
    </div>
  );
}

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
function IntakeScreen({ heroName, onComplete }) {
  const { messages, typing, sendMessage, init, error, errorType } = useAIChat(SYS.intake);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const chatRef = useRef(null);
  const initPromptRef = useRef(`The hero's name is ${heroName}. They have just seen the lore about the Shadow's true nature and said they are ready to look into its eyes. Begin by acknowledging their courage, mention this will take about 5 to 10 minutes, then ask your first question about where the Shadow shows up in their daily life. Keep it to 2-3 sentences. This should feel like a companion helping them understand their enemy, not a clinical interview.`);
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

function TutorialBattle({ heroName, shadowText, heroValues, heroStrengths = [], heroCoreValues = [], onComplete, obState = {}, setOBState }) {
  const [phase, setPhase] = useState(obState.phase || "intro"); // intro, choose, decide, allow, rehearse, rise, waiting, engage, debrief
  const advancePhase = (newPhase) => { setPhase(newPhase); if (setOBState) setOBState({ phase: newPhase }); };
  const [chosenExposure, setChosenExposure] = useState(obState.chosenExposure || null);
  const [sudsBefore, setSudsBefore] = useState(obState.sudsBefore ?? null);
  const [sudsAfter, setSudsAfter] = useState(null);
  const [rehearsalStep, setRehearsalStep] = useState(0);
  const [allowInput, setAllowInput] = useState("");
  const [engageInput, setEngageInput] = useState("");
  const [riseSubStep, setRiseSubStep] = useState(obState.riseSubStep ?? 0);
  const [exposureWhen, setExposureWhen] = useState(obState.exposureWhen || "");
  const [exposureWhere, setExposureWhere] = useState(obState.exposureWhere || "");
  const [exposureArmory, setExposureArmory] = useState(obState.exposureArmory || "");
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const valueName = heroValues?.[0]?.word || heroValues?.[0]?.text || "courage";

  // AI coach for the rehearsal/coaching moments
  const coachChat = useAIChat(SYS.preBoss, `TUTORIAL BATTLE: This is the hero's very first exposure — a micro-challenge. Hero name: ${heroName}. Their core value: ${valueName}.`);
  const chatRef = useRef(null);
  const [coachInput, setCoachInput] = useState("");

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [coachChat.messages, coachChat.typing]);

  // Persist tutorial state to obState for resume-anywhere
  const initRef = useRef(true);
  useEffect(() => {
    if (initRef.current) { initRef.current = false; return; }
    if (!setOBState) return;
    setOBState({ chosenExposure, sudsBefore, riseSubStep, exposureWhen, exposureWhere, exposureArmory });
  }, [chosenExposure, sudsBefore, riseSubStep, exposureWhen, exposureWhere, exposureArmory, setOBState]);

  // AI-generated micro-exposures tailored to the user's profile
  const [tutorialExposures, setTutorialExposures] = useState([]);
  const [exposuresLoading, setExposuresLoading] = useState(true);
  const [prevExposureTexts, setPrevExposureTexts] = useState([]);
  const fallbackRoundRef = useRef(0);


  const generateTutorialExposures = async (avoidTexts = []) => {
    setExposuresLoading(true);
    try {
      const shadowsText = shadowText || "General social anxiety";
      const strengthsText = heroStrengths.length > 0 ? heroStrengths.join(", ") : "Not specified";
      const valuesText = heroCoreValues.length > 0 ? heroCoreValues.map(v => v.word || v.text).join(", ") : (heroValues?.[0]?.text || "courage");
      const avoidBlock = avoidTexts.length > 0
        ? `\n\nPREVIOUSLY SHOWN — DO NOT REPEAT:\n${avoidTexts.map(t => "❌ " + t).join("\n")}\n\nGenerate 3 COMPLETELY DIFFERENT exposures from the above.`
        : "";
      const res = await callClaude(
        `You are a clinical psychologist designing micro-exposures for someone with social anxiety. Generate exactly 3 very low-SUDS (1-2 out of 10) training exposures for a user's FIRST exposure experience.

User profile:
- Shadow pattern: ${shadowsText}
- Self-identified strengths: ${strengthsText}
- Core value: ${valuesText}${avoidBlock}

Clinical rules:
- SUDS must be 1 or 2 (very gentle, low-stakes micro-actions)
- Each must be completable in 5-15 seconds
- Each must be context-flexible (works in multiple settings)
- Tailor the activities to the user's shadow pattern without being too targeted (this is still a beginner exercise)
- Leverage the user's strengths where possible
- Connect subtly to their core value
- Each activity must be COMPLETELY DIFFERENT from the others and from any previously shown exposures
- Give each a creative RPG-style boss name (1-2 words)
- Include an emoji icon name (use standard emoji names like "smile", "wave", "nod", "greet", etc.)

Return ONLY a JSON array: [{"name":"Boss Name","text":"specific micro-exposure activity","icon":"emoji_name","where":"where to do it","time":"X seconds","suds":1}]
No other text.`,
        [{ role: "user", text: `Generate 3 DIFFERENT training exposures. ${avoidTexts.length > 0 ? "The user has seen " + avoidTexts.length + " already and wants NEW ones." : "This is the first batch."}` }]
      );
      const jsonMatch = res.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const newExposures = parsed.slice(0, 3).map((e, i) => ({
            ...e,
            id: "tutorial_" + (e.name || "exp" + i).replace(/\s+/g, "_").toLowerCase(),
            suds: Math.min(2, e.suds || 1),
            time: e.time || "10 seconds",
            icon: e.icon || "star",
          }));
          // Deduplication: if any new text matches a previously shown text, force fallback
          const allPrev = [...avoidTexts];
          const hasDupe = newExposures.some(ne => allPrev.some(p => p.toLowerCase().trim() === ne.text.toLowerCase().trim()));
          if (hasDupe) {
            console.warn("AI returned duplicate exposures — falling back");
            throw new Error("AI returned duplicates");
          }
          setTutorialExposures(newExposures);
          // Track the texts so next regenerate avoids them
          setPrevExposureTexts(prev => [...prev, ...newExposures.map(e => e.text)]);
          setExposuresLoading(false);
          return;
        }
      }
      throw new Error("Parse failed");
    } catch (e) {
      console.error("Tutorial exposure generation failed:", e);
      // Fallback: rotate through different sets
      const fallbackSets = [
        [
          { id: "smile", text: "Make eye contact and smile at a stranger", icon: "😊", where: "Anywhere — street, shop, café", time: "5 seconds", suds: 1, name: "The Smiler" },
          { id: "hello", text: "Say 'hello' or 'good morning' to someone you don't know", icon: "👋", where: "Walking past someone, a cashier, a neighbor", time: "10 seconds", suds: 1, name: "The Greeter" },
          { id: "nod", text: "Give a small nod of acknowledgment to someone nearby", icon: "🙂", where: "Elevator, waiting in line, shared space", time: "5 seconds", suds: 2, name: "The Nod" },
        ],
        [
          { id: "wave", text: "Give a friendly wave to someone across the room", icon: "👋", where: "Park, grocery store, shared space", time: "5 seconds", suds: 1, name: "The Waver" },
          { id: "door", text: "Hold a door open for someone behind you", icon: "🚪", where: "Any entrance — shop, building, elevator", time: "10 seconds", suds: 1, name: "The Gatekeeper" },
          { id: "thanks", text: "Thank a cashier or service worker by name if their badge is visible", icon: "🙏", where: "Store, restaurant, pharmacy", time: "10 seconds", suds: 2, name: "The Gratitude" },
        ],
        [
          { id: "chair", text: "Sit in a visible spot and stay there for 30 seconds without looking at your phone", icon: "🪑", where: "Café, park bench, waiting area", time: "30 seconds", suds: 2, name: "The Stillness" },
          { id: "queue", text: "Make brief friendly small talk with someone in line", icon: "💬", where: "Grocery checkout, coffee shop, ATM line", time: "15 seconds", suds: 2, name: "The Chatter" },
          { id: "ask", text: "Ask a stranger for simple directions you already know", icon: "🗺️", where: "Street, mall, campus", time: "10 seconds", suds: 2, name: "The Seeker" },
        ],
      ];
      // Skip fallback sets that overlap with previously shown exposures
      const prevSet = new Set(avoidTexts.map(t => t.toLowerCase().trim()));
      let startIdx = (fallbackRoundRef.current + 1) % fallbackSets.length;
      let chosenIdx = startIdx;
      for (let i = 0; i < fallbackSets.length; i++) {
        const idx = (startIdx + i) % fallbackSets.length;
        const hasOverlap = fallbackSets[idx].some(e => prevSet.has(e.text.toLowerCase().trim()));
        if (!hasOverlap) { chosenIdx = idx; break; }
      }
      fallbackRoundRef.current = chosenIdx;
      setTutorialExposures(fallbackSets[chosenIdx]);
      setExposuresLoading(false);
    }
  };

  useEffect(() => { generateTutorialExposures(); }, []);

  // Timer for waiting phase
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [timerActive]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const PhaseLabel = ({ letter, title, active, color }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
      padding: "8px 12px", borderRadius: 6,
      background: active ? color + "15" : "transparent",
      border: active ? `2px solid ${color}40` : "2px solid transparent",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 4,
        background: active ? color + "25" : "#1A1218",
        border: `2px solid ${active ? color : "#5C3A50"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PixelText size={12} color={active ? color : C.grayLt}>{letter}</PixelText>
      </div>
      <div>
        <PixelText size={9} color={active ? color : C.grayLt}>{title}</PixelText>
        <div><PixelText size={6} color={C.grayLt}>{active ? "ACTIVE" : "—"}</PixelText></div>
      </div>
    </div>
  );

  // D.A.R.E.R. mini progress bar
  const phases = ["D", "A", "R", "E", "R"];
  const phaseIndex = phase === "decide" ? 0 : phase === "allow" || phase === "rehearse" ? 1 : phase === "rise" ? 2 : phase === "waiting" || phase === "engage" ? 3 : phase === "debrief" ? 4 : -1;

  const ProgressBar = () => (
    <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
      {phases.map((p, i) => (
        <div key={i} style={{
          flex: 1, padding: "5px 2px", textAlign: "center", borderRadius: 3,
          background: i < phaseIndex ? C.hpGreen + "25" : i === phaseIndex ? C.goldMd + "20" : "#1A1218",
          border: `2px solid ${i < phaseIndex ? C.hpGreen : i === phaseIndex ? C.goldMd : "#5C3A50"}`,
          transition: "all 0.3s",
        }}>
          <PixelText size={7} color={i <= phaseIndex ? (i < phaseIndex ? C.hpGreen : C.goldMd) : C.grayLt}>{p}</PixelText>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, display: "flex", flexDirection: "column" }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* Header */}
      {phase !== "intro" && phase !== "choose" && (
        <div style={{ padding: "10px 16px", borderBottom: "2px solid #5C3A50", background: "#1A1218" }}>
          <PixelText size={7} color={C.goldMd}>🏕 TRAINING GROUNDS</PixelText>
          {chosenExposure && (
            <div style={{ marginTop: 4 }}>
              <PixelText size={7} color={C.cream}>{chosenExposure.text}</PixelText>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 32px" }}>

        {/* === INTRO === */}
        {phase === "intro" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.6s ease-out" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏕</div>
            <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>TRAINING GROUNDS</PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>Practice the DARER Strategy � guided by Dara</PixelText>

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                Before you forge your full path,{"\n"}let's try one small battle{"\n"}together.{"\n"}{"\n"}
                This is your training ground. I'll{"\n"}walk you through every step of{"\n"}the D.A.R.E.R. cycle so you know{"\n"}exactly how it works.{"\n"}{"\n"}
                The battle is tiny — but the{"\n"}process is real. Ready to see{"\n"}what you're made of?
              </PixelText>
            </DialogBox>

            <PixelBtn onClick={() => advancePhase("choose")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              SHOW ME THE BATTLES →
            </PixelBtn>
          </div>
        )}

        {/* === CHOOSE MICRO-EXPOSURE === */}
        {phase === "choose" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>CHOOSE YOUR FIRST BATTLE</PixelText>
              <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>Pick the one that feels right</PixelText>
            </div>

            {exposuresLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>🔨 FORGING YOUR TRAINING</PixelText>
                <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>Dara is studying your Shadow profile...</PixelText>
              </div>
            ) : (
              <>
                {tutorialExposures.map((exp) => {
                  const selected = chosenExposure?.id === exp.id;
                  return (
                    <button key={exp.id} onClick={() => setChosenExposure(exp)} style={{
                      width: "100%", textAlign: "left", padding: 14, marginBottom: 8,
                      background: selected ? C.goldMd + "12" : "#1A1218",
                      border: `2px solid ${selected ? C.goldMd : "#5C3A50"}`,
                      borderRadius: 6, cursor: "pointer",
                      boxShadow: selected ? `0 0 12px ${C.goldMd}15` : "none",
                      transition: "all 0.2s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{exp.icon}</span>
                        <div style={{ flex: 1 }}>
                          <PixelText size={8} color={selected ? C.goldMd : C.cream} style={{ display: "block", lineHeight: 1.5 }}>
                            {exp.text}
                          </PixelText>
                          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                            <PixelText size={6} color={C.grayLt}>📍 {exp.where}</PixelText>
                          </div>
                          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                            <PixelText size={6} color={C.grayLt}>⏱ {exp.time}</PixelText>
                            <PixelText size={6} color={C.hpGreen}>SUDs {exp.suds}/10</PixelText>
                          </div>
                        </div>
                        {selected && <PixelText size={14} color={C.goldMd}>✓</PixelText>}
                      </div>
                    </button>
                  );
                })}

                <PixelBtn onClick={() => chosenExposure && advancePhase("decide")} disabled={!chosenExposure} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
                  BEGIN TRAINING →
                </PixelBtn>
                <button onClick={() => generateTutorialExposures(prevExposureTexts)} style={{
                  width: "100%", marginTop: 8, padding: 10,
                  background: "transparent", border: "1px dashed #5C3A50",
                  borderRadius: 4, cursor: "pointer",
                }}>
                  <PixelText size={6} color={C.grayLt}>🔄 Generate different training exposures</PixelText>
                </button>
              </>
            )}
          </div>
        )}

        {/* === D — DECIDE === */}
        {phase === "decide" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="D" title="DECIDE" active color={C.goalGold} />

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Your battle: "{chosenExposure.text}"{"\n"}{"\n"}
                Before any battle, a DARER asks:{"\n"}Why am I choosing this?{"\n"}{"\n"}
                Your answer is your anchor. When{"\n"}the Shadow strikes, your "why"{"\n"}keeps you on the path.{"\n"}{"\n"}
                Your core value is {valueName}.{"\n"}That's your "why."
              </PixelText>
            </DialogBox>

            <div style={{ background: C.goldMd + "10", border: `1.5px solid ${C.goldMd}30`, borderRadius: 6, padding: 12, marginTop: 12, textAlign: "center" }}>
              <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>YOUR DECISION</PixelText>
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.6 }}>
                "I choose to {chosenExposure.text.toLowerCase()}{"\n"}because {valueName.toLowerCase()} matters to me."
              </PixelText>
            </div>

            <PixelBtn onClick={() => advancePhase("allow")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
              I DECIDE → NEXT: ALLOW
            </PixelBtn>
          </div>
        )}

        {/* === A — ALLOW (with mental rehearsal) === */}
        {phase === "allow" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="A" title="ALLOW" active color={C.hpGreen} />

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                Now, before we do this for real,{"\n"}let's rehearse it in your mind.{"\n"}{"\n"}
                Close your eyes for a moment.{"\n"}Imagine yourself about to{"\n"}{chosenExposure.text.toLowerCase()}.{"\n"}{"\n"}
                What does the Storm whisper?{"\n"}What do you feel in your body?
              </PixelText>
            </DialogBox>

            <div style={{ marginTop: 12 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 6 }}>What comes up when you imagine it?</PixelText>
              <textarea value={allowInput} onChange={e => setAllowInput(e.target.value)}
                placeholder='e.g. "My mind says they will think I am weird. My stomach tightens..."'
                style={{
                  width: "100%", minHeight: 80, padding: 10, background: "#1A1218",
                  border: "2px solid #5C3A50", borderRadius: 4, color: C.cream,
                  fontSize: 12, fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                  lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            <PixelBtn onClick={() => {
              advancePhase("rehearse");
              coachChat.init(`The hero ${heroName} is doing their FIRST ever exposure — a tutorial battle. The exposure is: "${chosenExposure.text}". They just imagined doing it and reported: "${allowInput}". Coach them through ALLOWING: validate what they're feeling is normal, that the Storm is doing its job, and that these feelings are passengers not drivers. Then guide a brief grounding exercise (3 deep breaths, feet on the floor). Keep it warm, brief, 2-3 sentences. Use game language.`);
            }} disabled={!allowInput.trim()} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              THE STORM IS HERE →
            </PixelBtn>
          </div>
        )}

        {/* === REHEARSE — Dara coaches through the Storm === */}
        {phase === "rehearse" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="A" title="ALLOW — DARA COACHING" active color={C.hpGreen} />

            <div ref={chatRef} style={{ maxHeight: 280, overflowY: "auto", marginBottom: 12 }}>
              {coachChat.messages.filter(m => m.role === "assistant").map((m, i) => (
                <DialogBox key={i} speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{m.text}</PixelText>
                </DialogBox>
              ))}
              {coachChat.typing && <DialogBox speaker="DARA" typing />}
            </div>

            {/* Quick-response options or free text */}
            {!coachChat.typing && coachChat.messages.length > 0 && (
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {["I notice the Storm but I can sit with it", "It feels intense but I want to try", "What if it gets worse?"].map(opt => (
                    <button key={opt} onClick={() => coachChat.sendMessage(opt)} style={{
                      padding: "8px 10px", background: "#1A1218", border: "1.5px solid #5C3A50",
                      borderRadius: 4, cursor: "pointer",
                    }}>
                      <PixelText size={6} color={C.cream}>{opt}</PixelText>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={coachInput} onChange={e => setCoachInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && coachInput.trim()) { coachChat.sendMessage(coachInput); setCoachInput(""); } }}
                    placeholder="Talk to Dara..."
                    style={{ flex: 1, padding: 8, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 11, fontFamily: PIXEL_FONT, outline: "none" }}
                  />
                  <PixelBtn onClick={() => { if (coachInput.trim()) { coachChat.sendMessage(coachInput); setCoachInput(""); } }}>→</PixelBtn>
                </div>

                <PixelBtn onClick={() => advancePhase("rise")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 14 }}>
                  I'M ALLOWING IT → NEXT: RISE
                </PixelBtn>
              </div>
            )}
          </div>
        )}

        {/* === R — RISE (plan + SUDs before + go do it) === */}
        {phase === "rise" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="R" title="RISE" active color={C.teal} />

            {/* Sub-step 0: WHEN */}
            {riseSubStep === 0 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    The rehearsal is done. You've{"\n"}felt the Storm and you're still{"\n"}standing.{"\n"}{"\n"}
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
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
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

            {/* Sub-step 2: ARMORY */}
            {riseSubStep === 2 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You've chosen your time and{"\n"}your battlefield.{"\n"}{"\n"}
                    Before you go — which tool{"\n"}from the Armory will you carry?{"\n"}Choose the one that steadies you.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 14 }}>
                  {(hero.armory || []).filter(t => t.unlocked).map(tool => (
                    <button key={tool.id} onClick={() => { setExposureArmory(tool.name); setRiseSubStep(3); }} style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                      borderRadius: 4, border: `2px solid ${exposureArmory === tool.name ? C.teal : "#5C3A50"}`,
                      background: exposureArmory === tool.name ? C.teal + "20" : "#1A1218",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <span style={{ fontSize: 18 }}>{tool.icon}</span>
                      <PixelText size={7} color={exposureArmory === tool.name ? C.teal : C.grayLt}>{tool.name}</PixelText>
                    </button>
                  ))}
                  <button onClick={() => { setExposureArmory("I'll trust the strategy alone"); setRiseSubStep(3); }} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${exposureArmory === "I'll trust the strategy alone" ? C.teal : "#5C3A50"}`,
                    background: exposureArmory === "I'll trust the strategy alone" ? C.teal + "20" : "#1A1218",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 18 }}>🗡️</span>
                    <PixelText size={7} color={exposureArmory === "I'll trust the strategy alone" ? C.teal : C.grayLt}>I'll trust the strategy alone</PixelText>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step 3: Storm Intensity (SUDs) */}
            {riseSubStep === 3 && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    You're armed and ready.{"\n"}{"\n"}
                    One last thing before you{"\n"}step through — how intense is{"\n"}the Storm right now? Rate it{"\n"}honestly. There's no wrong answer.
                  </PixelText>
                </DialogBox>
                <div style={{ marginTop: 12 }}>
                  <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (before)</PixelText>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => {
                      const color = n <= 3 ? C.hpGreen : n <= 6 ? C.goldMd : C.bossRed;
                      return (
                        <button key={n} onClick={() => setSudsBefore(n)} style={{
                          width: 40, height: 40, borderRadius: 4, cursor: "pointer",
                          background: sudsBefore === n ? color + "30" : "#1A1218",
                          border: `2px solid ${sudsBefore === n ? color : "#5C3A50"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <PixelText size={9} color={sudsBefore === n ? color : C.grayLt}>{n}</PixelText>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <PixelBtn onClick={() => { advancePhase("waiting"); setTimerActive(true); }} disabled={!sudsBefore} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
                  I'M GOING IN → RISE!
                </PixelBtn>
              </div>
            )}
          </div>
        )}

        {/* === WAITING (user is doing the exposure IRL) === */}
        {phase === "waiting" && (
          <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />

            <div style={{
              width: 100, height: 100, margin: "20px auto", borderRadius: "50%",
              background: C.goldMd + "10", border: `3px solid ${C.goldMd}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 24px ${C.goldMd}15`,
              animation: "pulse 2s ease-in-out infinite",
            }}>
              <PixelText size={16} color={C.goldMd}>{formatTime(timer)}</PixelText>
            </div>

            <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 6 }}>
              YOU'RE IN THE ARENA
            </PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 20 }}>
              Go {chosenExposure.text.toLowerCase()}.{"\n"}Dara is right here.
            </PixelText>

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                You are doing it right now.{"\n"}The Storm is not in charge.{"\n"}You are.{"\n"}{"\n"}
                Take your time. Come back when{"\n"}you're done.
              </PixelText>
            </DialogBox>

            <PixelBtn onClick={() => { setTimerActive(false); advancePhase("engage"); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
              ✅ I DID IT!
            </PixelBtn>
            <button onClick={() => { setTimerActive(false); advancePhase("engage"); }} style={{ background: "none", border: "none", marginTop: 10, cursor: "pointer" }}>
              <PixelText size={7} color={C.grayLt}>I tried but couldn't finish</PixelText>
            </button>

            <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
          </div>
        )}

        {/* === E — ENGAGE (report back + SUDs after) === */}
        {phase === "engage" && (
          <div style={{ animation: "fadeIn 0.4s ease-out" }}>
            <ProgressBar />
            <PhaseLabel letter="E" title="ENGAGE — REPORT" active color={C.bossRed} />

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                You stepped into the arena.{"\n"}That took real courage.{"\n"}{"\n"}
                What actually happened?{"\n"}How intense is the Storm now?
              </PixelText>
            </DialogBox>

            <div style={{ marginTop: 12 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 6 }}>What happened?</PixelText>
              <textarea value={engageInput} onChange={e => setEngageInput(e.target.value)}
                placeholder='e.g. "They smiled back! It was way less scary than I thought..."'
                style={{
                  width: "100%", minHeight: 60, padding: 10, background: "#1A1218",
                  border: "2px solid #5C3A50", borderRadius: 4, color: C.cream,
                  fontSize: 12, fontFamily: PIXEL_FONT, outline: "none", resize: "none",
                  lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 8 }}>STORM INTENSITY (after)</PixelText>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => {
                  const color = n <= 3 ? C.hpGreen : n <= 6 ? C.goldMd : C.bossRed;
                  return (
                    <button key={n} onClick={() => setSudsAfter(n)} style={{
                      width: 40, height: 40, borderRadius: 4, cursor: "pointer",
                      background: sudsAfter === n ? color + "30" : "#1A1218",
                      border: `2px solid ${sudsAfter === n ? color : "#5C3A50"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <PixelText size={9} color={sudsAfter === n ? color : C.grayLt}>{n}</PixelText>
                    </button>
                  );
                })}
              </div>
            </div>

            <PixelBtn onClick={() => advancePhase("debrief")} disabled={!sudsAfter} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
              NEXT: REPEAT (DEBRIEF) →
            </PixelBtn>
          </div>
        )}

        {/* === R — REPEAT (Debrief) === */}
        {phase === "debrief" && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            <ProgressBar />

            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <PixelText size={12} color={C.goldMd} style={{ display: "block" }}>FIRST BATTLE COMPLETE!</PixelText>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginTop: 4 }}>+50 XP EARNED</PixelText>
            </div>

            {/* SUDs comparison */}
            <div style={{ background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 6, padding: 14, marginBottom: 12 }}>
              <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>THE SHADOW LIED</PixelText>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                <div>
                  <PixelText size={7} color={C.grayLt}>BEFORE</PixelText>
                  <div style={{ fontSize: 28, margin: "4px 0" }}>
                    <PixelText size={20} color={C.bossRed}>{sudsBefore}</PixelText>
                  </div>
                  <PixelText size={6} color={C.bossRed}>FEARED</PixelText>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <PixelText size={16} color={C.goldMd}>→</PixelText>
                </div>
                <div>
                  <PixelText size={7} color={C.grayLt}>AFTER</PixelText>
                  <div style={{ fontSize: 28, margin: "4px 0" }}>
                    <PixelText size={20} color={C.hpGreen}>{sudsAfter}</PixelText>
                  </div>
                  <PixelText size={6} color={C.hpGreen}>ACTUAL</PixelText>
                </div>
              </div>
              {sudsBefore > sudsAfter && (
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <PixelText size={7} color={C.hpGreen}>
                    The Storm dropped {sudsBefore - sudsAfter} point{sudsBefore - sudsAfter !== 1 ? "s" : ""}. That's damage dealt to the Shadow.
                  </PixelText>
                </div>
              )}
            </div>

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
                {heroName}, you just completed your{"\n"}first battle. Do you see what{"\n"}happened?{"\n"}{"\n"}
                The Shadow told you it would be{"\n"}unbearable. {sudsBefore > sudsAfter ? "But the actual experience was less intense than the fear predicted." : "And you survived it."}{"\n"}{"\n"}
                This is the D.A.R.E.R. cycle:{"\n"}Decide. Allow. Rise. Engage.{"\n"}Repeat. Every battle weakens{"\n"}the Shadow.{"\n"}{"\n"}
                Now you're ready to forge your{"\n"}full path — choose which battles{"\n"}to fight on the road toward{"\n"}{valueName.toLowerCase()}.
              </PixelText>
            </DialogBox>

            <PixelBtn onClick={() => { if (setOBState) setOBState({ tutorialComplete: true }); onComplete(); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
              FORGE YOUR PATH →
            </PixelBtn>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
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

function GameMap({ quest, hero, onSelectBoss, onViewProfile, onArmory, onLadder, onAddExposure }) {
  const nextBoss = quest.bosses.find(b => !b.defeated);
  const defeatedCount = quest.bosses.filter(b => b.defeated).length;
  const totalXp = defeatedCount * 100;
  const [pendingBoss, setPendingBoss] = useState(null); // boss pending high-SUDs warning
  const [addPulse, setAddPulse] = useState(false); // FAB pulse animation trigger

  const handleBossSelect = (boss) => {
    if (!nextBoss || boss.difficulty - nextBoss.difficulty >= 2) {
      // Show warning dialog
      setPendingBoss(boss);
    } else {
      onSelectBoss(boss);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "0 0 100px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Hero status bar */}
      <div style={{ padding: "12px 16px", borderBottom: "2px solid #5C3A50", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, background: C.plum, border: "2px solid #5C3A50", borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><PixelText size={14} color={C.goldMd}>⚔</PixelText></div>
        <div style={{ flex: 1 }}>
          <PixelText size={8} color={C.cream}>{hero.name}</PixelText>
          <HPBar current={totalXp} max={quest.bosses.length * 100} height={8} />
        </div>
        <div style={{ textAlign: "right" }}>
          <PixelText size={10} color={C.goldMd}>{totalXp} XP</PixelText>
          <div><PixelText size={7} color={C.grayLt}>{defeatedCount}/{quest.bosses.length} BOSSES</PixelText></div>
        </div>
      </div>

      {/* Journey goal banner */}
      <div style={{ padding: "12px 16px", background: "#1A1218", borderBottom: "2px solid #5C3A50", textAlign: "center" }}>
        <PixelText size={7} color={C.grayLt}>JOURNEY GOAL</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={9} color={C.goalGold}>🏰 {quest.goal}</PixelText></div>
      </div>

      {/* Boss path */}
      <div style={{ padding: 16 }}>
        {quest.bosses.map((boss, i) => {
          const isNext = nextBoss?.id === boss.id;
          const isHighLevel = nextBoss && boss.difficulty - nextBoss.difficulty >= 2;
          const bgColor = boss.defeated ? "#1A2818" : isNext ? "#2A1A28" : "#1A1218";
          const borderColor = boss.defeated ? C.hpGreen : isNext ? C.goldMd : isHighLevel ? C.amber + "60" : "#5C3A50";

          return (
            <div key={boss.id}>
              {/* Connector line */}
              {i > 0 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <div style={{ width: 3, height: 20, background: boss.defeated || isNext ? C.plumMd : "#5C3A50" }} />
                </div>
              )}
              <button onClick={() => handleBossSelect(boss)} style={{
                width: "100%", padding: 14, background: bgColor,
                border: `3px solid ${borderColor}`, borderRadius: 6,
                cursor: "pointer", textAlign: "left",
                opacity: boss.defeated ? 0.6 : 1, transition: "all 0.2s",
                boxShadow: isNext ? `0 0 16px ${C.goldMd}20` : "none",
                position: "relative",
              }}>
                {isHighLevel && !boss.defeated && (
                  <div style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: C.amber, border: `2px solid #1A1218`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10 }}>⚠</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 4,
                    background: boss.defeated ? C.hpGreen + "30" : isNext ? C.bossRed + "30" : "#2A1F28",
                    border: `2px solid ${boss.defeated ? C.hpGreen : isNext ? C.bossRed : "#5C3A50"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PixelText size={boss.defeated ? 16 : 12} color={boss.defeated ? C.hpGreen : isNext ? C.bossRed : C.grayLt}>
                      {boss.defeated ? "✓" : "👾"}
                    </PixelText>
                  </div>
                  <div style={{ flex: 1 }}>
                    <PixelText size={9} color={boss.defeated ? C.hpGreen : isNext ? C.cream : C.grayLt}>
                      {boss.name}
                    </PixelText>
                    <div style={{ marginTop: 3 }}>
                      <PixelText size={7} color={C.grayLt}>{boss.desc}</PixelText>
                    </div>
                    {!boss.defeated && (
                      <div style={{ marginTop: 6 }}>
                        <HPBar current={boss.hp} max={boss.maxHp} height={6} label={isNext ? "BOSS HP" : ""} />
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <PixelText size={8} color={boss.defeated ? C.hpGreen : isHighLevel ? C.amber : C.grayLt}>
                      LV.{boss.difficulty}
                    </PixelText>
                  </div>
                </div>
                {isNext && (
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <PixelText size={8} color={C.goldMd}>⚔ NEXT BATTLE ⚔</PixelText>
                  </div>
                )}
              </button>
            </div>
          );
        })}

        {/* Goal castle at end */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
          <div style={{ width: 3, height: 20, background: "#5C3A50" }} />
        </div>
        <div style={{
          padding: 16, background: C.goalGold + "15", border: `3px solid ${C.goalGold}`,
          borderRadius: 6, textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏰</div>
          <PixelText size={10} color={C.goalGold}>{quest.goal.toUpperCase()}</PixelText>
          <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>Defeat all bosses to reach your goal</PixelText></div>
        </div>
      </div>

      {/* High-SUDs Warning Dialog */}
      {pendingBoss && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{
            width: "100%", maxWidth: 400, background: "#1A1218",
            border: `3px solid ${C.amber}`, borderRadius: 8,
            padding: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <PixelText size={11} color={C.amber} style={{ display: "block", marginBottom: 8 }}>HIGH DIFFICULTY WARNING</PixelText>
            <div style={{ padding: 12, background: "#222", borderRadius: 6, marginBottom: 16 }}>
              <PixelText size={9} color={C.cream}>{pendingBoss.name}</PixelText>
              <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{pendingBoss.desc}</PixelText></div>
              <div style={{ marginTop: 6 }}>
                <PixelText size={8} color={C.amber}>LV.{pendingBoss.difficulty}</PixelText>
                <PixelText size={6} color={C.grayLt}> · Recommended: LV.{nextBoss?.difficulty || 1}-{(nextBoss?.difficulty || 1) + 1}</PixelText>
              </div>
            </div>
            <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16, lineHeight: 1.6 }}>
              This exposure has a significantly higher anxiety level than your current path. It's recommended to work through lower-SUDs activities first to build confidence.
            </PixelText>
            <div style={{ display: "flex", gap: 8 }}>
              <PixelBtn onClick={() => setPendingBoss(null)} color={C.plum} style={{ flex: 1 }}>← GO BACK</PixelBtn>
              <PixelBtn onClick={() => { setPendingBoss(null); onSelectBoss(pendingBoss); }} color={C.amber} textColor={C.charcoal} style={{ flex: 1 }}>I'M READY →</PixelBtn>
            </div>
          </div>
        </div>
      )}

      {/* Floating "+" FAB for adding exposures */}
      {onAddExposure && (
        <button
          onClick={() => { setAddPulse(true); setTimeout(() => setAddPulse(false), 400); onAddExposure(); }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = `0 0 24px ${C.teal}50, 0 6px 0 #4A7A60`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 0 16px ${C.teal}40, 0 4px 0 #4A7A60`; }}
          style={{
            position: "fixed", bottom: 64, right: 16,
            width: 48, height: 48, borderRadius: "50%",
            background: C.teal, border: `3px solid ${C.teal}`,
            color: C.cream, fontSize: 24, fontWeight: "bold",
            cursor: "pointer", zIndex: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 16px ${C.teal}40, 0 4px 0 #4A7A60`,
            transition: "transform 0.15s, box-shadow 0.15s",
            transform: addPulse ? "scale(1.15)" : "scale(1)",
            maxWidth: 480,
          }}
          aria-label="Add new exposure"
        >
          +
        </button>
      )}

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, display: "flex", borderTop: "3px solid #5C3A50", background: "#1A1218",
      }}>
        {[
          { icon: "🗺", label: "MAP", onClick: () => {} },
          { icon: "⚗", label: "ARMORY", onClick: onArmory },
          { icon: "🏆", label: "LADDER", onClick: onLadder },
          { icon: "🛡", label: "HERO", onClick: onViewProfile },
        ].map(t => (
          <button key={t.label} onClick={t.onClick} style={{
            flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
            background: "transparent", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <PixelText size={6} color={C.grayLt}>{t.label}</PixelText>
          </button>
        ))}
      </div>
    </div>
  );
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

// --- BOSS BATTLE ---
function BossBattle({ boss, quest, hero, onVictory, onRetreat, obState = {}, setOBState }) {
  const [phase, setPhase] = useState(obState.phase || "prep");
  const [prepStep, setPrepStep] = useState(obState.prepStep ?? 0);
  const [prepAnswers, setPrepAnswers] = useState(obState.prepAnswers || { value: "", allow: "", rise: "" });
  const [suds, setSuds] = useState(obState.suds || { before: 50, during: 60, after: 30 });
  const [outcome, setOutcome] = useState(obState.outcome || null);
  const [riseSubStep, setRiseSubStep] = useState(obState.riseSubStep ?? 0);
  const [exposureWhen, setExposureWhen] = useState(obState.exposureWhen || "");
  const [exposureWhere, setExposureWhere] = useState(obState.exposureWhere || "");
  const [exposureArmory, setExposureArmory] = useState(obState.exposureArmory || "");
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef(null);

  // Persist battle progress so resume-anywhere survives refresh/close
  useEffect(() => {
    if (!setOBState) return;
    setOBState({ phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory });
  }, [phase, prepStep, prepAnswers, suds, outcome, riseSubStep, exposureWhen, exposureWhere, exposureArmory, setOBState]);

  const battleChat = useAIChat(SYS.battle, `BOSS: "${boss.name}" — ${boss.desc}. The hero is fighting this boss RIGHT NOW in real life.`);
  const victoryChat = useAIChat(SYS.victory, "");

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; },
    [battleChat.messages, victoryChat.messages, battleChat.typing, victoryChat.typing]);

  const heroValue = hero.values?.[0]?.text || "building the social life I want";
  const heroStrength = hero.coreValues?.[0]?.word || "courage";

  // D.A.R.E.R. prep steps (VITAL framework underneath)
  // D=Decide (V-Values), A=Allow (AL-Allow), R=Rise (I-In moment + T-Take notice), E=Engage (battle), R=Repeat (next boss)
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

  const handleSend = async (chat) => {
    if (!chatInput.trim()) return;
    const t = chatInput; setChatInput("");
    await chat.sendMessage(t);
  };

  const activeChat = phase === "battle" ? battleChat : victoryChat;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.mapBg }}>
      <link href={FONT_LINK} rel="stylesheet" />
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
                border: `2px solid ${i <= prepStep ? vs.color : "#5C3A50"}`,
                transition: "all 0.3s",
              }}>
                <PixelText size={8} color={i <= prepStep ? vs.color : C.grayLt}>{vs.letter}</PixelText>
              </div>
            ))}
            {/* R for Repeat — shown as grayed, comes after battle */}
            <div style={{ flex: 1, padding: "6px 4px", textAlign: "center", borderRadius: 4, background: "#1A1218", border: "2px solid #5C3A50" }}>
              <PixelText size={8} color={C.grayLt}>R</PixelText>
            </div>
          </div>

          {prepStep < darerSteps.length && (() => {
            const vs = darerSteps[prepStep];

            // ENGAGE step — final summary + enter battle
            if (vs.isFinal) return (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{vs.icon}</span>
                  <div>
                    <PixelText size={10} color={vs.color} style={{ display: "block" }}>{vs.title}</PixelText>
                    <PixelText size={6} color={C.grayLt}>{vs.subtitle}</PixelText>
                  </div>
                </div>

                {/* D.A.R. summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {darerSteps.filter(s => !s.isFinal).map((s, i) => (
                    <div key={i} style={{
                      padding: "8px 10px", background: "#1A1218",
                      border: `1px solid ${s.color}30`, borderRadius: 4,
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}>
                      <PixelText size={9} color={s.color}>{s.letter}</PixelText>
                      <div>
                        <PixelText size={6} color={s.color}>{s.title}</PixelText>
                        <div><PixelText size={7} color={C.cream}>{prepAnswers[s.field]}</PixelText></div>
                      </div>
                    </div>
                  ))}
                </div>

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                    {vs.prompt}
                  </PixelText>
                </DialogBox>

                <div style={{ margin: "12px 0" }}>
                  <PixelText size={7} color={C.grayLt}>PRE-BATTLE ANXIETY (0-100):</PixelText>
                  <input type="range" min="0" max="100" value={suds.before} onChange={e => setSuds(s => ({...s, before: +e.target.value}))}
                    style={{ width: "100%", accentColor: C.bossRed }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <PixelText size={6} color={C.grayLt}>Calm</PixelText>
                    <PixelText size={8} color={C.cream}>{suds.before}</PixelText>
                    <PixelText size={6} color={C.grayLt}>Intense</PixelText>
                  </div>
                </div>

                <PixelBtn onClick={startBattle} color={C.bossRed} style={{ width: "100%" }}>
                  ⚔ ENGAGE ⚔
                </PixelBtn>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
                  <button onClick={() => setPrepStep(s => s - 1)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <PixelText size={6} color={C.grayLt}>← Back to prep</PixelText>
                  </button>
                  <button onClick={onRetreat} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <PixelText size={6} color={C.grayLt}>Not ready — return to map</PixelText>
                  </button>
                </div>
              </div>
            );

            // RISE step — 4-sub-step flow (when, where, armory, SUDs)
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

                {/* Sub-step 2: ARMORY */}
                {riseSubStep === 2 && (
                  <div>
                    <DialogBox speaker="DARA">
                      <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
                        You've chosen your time and{"\n"}your battlefield.{"\n"}{"\n"}
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
                        <button key={tool.key} onClick={() => { setExposureArmory(tool.label); setRiseSubStep(3); }} style={{
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

                <textarea
                  value={prepAnswers[vs.field]}
                  onChange={e => setPrepAnswers(prev => ({ ...prev, [vs.field]: e.target.value }))}
                  placeholder={vs.placeholder}
                  rows={3}
                  style={{
                    width: "100%", padding: 12, marginTop: 10,
                    background: "#1A1218", border: `2px solid ${vs.color}40`,
                    borderRadius: 4, color: C.cream, fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none", resize: "none", boxSizing: "border-box",
                  }}
                />

                {vs.prefill && !prepAnswers[vs.field] && (
                  <button onClick={() => setPrepAnswers(prev => ({ ...prev, [vs.field]: vs.prefill }))}
                    style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer" }}>
                    <PixelText size={6} color={vs.color}>↑ Use my sealed value</PixelText>
                  </button>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {prepStep > 0 && (
                    <PixelBtn onClick={() => setPrepStep(s => s - 1)} color={C.plum} style={{ flex: 1 }}>← BACK</PixelBtn>
                  )}
                  <PixelBtn
                    onClick={() => setPrepStep(s => s + 1)}
                    disabled={!prepAnswers[vs.field]?.trim()}
                    color={vs.color} textColor={C.charcoal}
                    style={{ flex: 1 }}
                  >
                    NEXT →
                  </PixelBtn>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* === BATTLE + RESULT PHASES === */}
      {(phase === "battle" || phase === "result") && (
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {activeChat.messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{
                maxWidth: "82%", padding: "10px 12px", borderRadius: 4,
                background: m.role === "user" ? C.plum : "#1A1218", border: "2px solid #5C3A50",
              }}>
                <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap" }}>{m.text}</PixelText>
              </div>
            </div>
          ))}
          {activeChat.typing && <DialogBox speaker="DARA" typing />}
        </div>
      )}

      {/* === CONTROLS === */}
      <div style={{ padding: 12, borderTop: phase !== "prep" ? "2px solid #5C3A50" : "none" }}>
        {phase === "battle" && (
          <>
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
            <PixelBtn onClick={() => setPhase("log")} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
              BATTLE COMPLETE →
            </PixelBtn>
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
            <div style={{ display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSend(victoryChat)}
                placeholder="Reflect with Dara..." disabled={victoryChat.typing}
                style={{ flex: 1, padding: 8, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 3, color: C.cream, fontSize: 12, outline: "none" }} />
              <PixelBtn onClick={() => handleSend(victoryChat)} disabled={victoryChat.typing || !chatInput.trim()}>→</PixelBtn>
            </div>
            <PixelBtn onClick={() => onVictory(outcome)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 8 }}>
              RETURN TO MAP
            </PixelBtn>
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
          { icon: "⚗", label: "ARMORY", active: false },
          { icon: "🏆", label: "LADDER", active: false },
          { icon: "🛡", label: "HERO", active: false },
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
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
    </div>
  );
}

// --- HERO PROFILE ---
function HeroProfile({ hero, quest, onBack }) {
  const defeated = quest.bosses.filter(b => b.defeated).length;
  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "16px 16px 80px" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}>
        <PixelText size={8} color={C.grayLt}>← BACK TO MAP</PixelText>
      </button>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, margin: "0 auto 12px", borderRadius: 6,
          background: C.plum, border: "4px solid #5C3A50",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><PixelText size={32} color={C.goldMd}>⚔</PixelText></div>
        <PixelText size={14} color={C.cream}>{hero.name}</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={8} color={C.goldMd}>{defeated}/{quest.bosses.length} BOSSES DEFEATED</PixelText></div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>CHARACTER STATS</PixelText>
        {(() => {
          const dims = ["courage", "resilience", "openness"];
          const colors = { courage: C.bossRed, resilience: C.teal, openness: C.plumMd };
          const fallbacks = { courage: { word: "COURAGE", icon: "⚔️" }, resilience: { word: "RESILIENCE", icon: "🛡" }, openness: { word: "OPENNESS", icon: "💜" } };
          const cv = hero.coreValues || [];
          const assigned = [];
          const usedDims = new Set();
          cv.forEach(v => { if (!usedDims.has(v.dim)) { assigned.push({ ...v, assignedDim: v.dim }); usedDims.add(v.dim); } });
          cv.forEach(v => { if (!assigned.find(a => a.id === v.id)) { const fd = dims.find(d => !usedDims.has(d)); if (fd) { assigned.push({ ...v, assignedDim: fd }); usedDims.add(fd); } } });
          // Fill any remaining dims with fallbacks
          dims.forEach(d => { if (!usedDims.has(d)) { assigned.push({ ...fallbacks[d], assignedDim: d, id: d }); } });
          assigned.sort((a, b) => dims.indexOf(a.assignedDim) - dims.indexOf(b.assignedDim));
          return assigned.map(v => (
            <div key={v.assignedDim} style={{ padding: "10px 12px", marginBottom: 6, background: "#1A1218", border: "2px solid #5C3A50", borderRadius: 4, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{v.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <PixelText size={7} color={colors[v.assignedDim]}>{v.word.toUpperCase()}</PixelText>
                  <PixelText size={7} color={C.cream}>{hero.stats?.[v.assignedDim] || 5}/10</PixelText>
                </div>
                <div style={{ height: 6, background: C.mapBg, borderRadius: 2, border: "1px solid #5C3A50", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(hero.stats?.[v.assignedDim] || 5) * 10}%`, background: colors[v.assignedDim], borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Core Strengths */}
      {hero.coreValues && hero.coreValues.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>CORE STRENGTHS</PixelText>
          <div style={{ display: "flex", gap: 6 }}>
            {hero.coreValues.map(v => (
              <div key={v.id} style={{
                flex: 1, padding: "10px 6px", background: "#1A1218",
                border: `2px solid ${C.goldMd}40`, borderRadius: 6, textAlign: "center",
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{v.icon}</div>
                <PixelText size={6} color={C.goldMd}>{v.word.toUpperCase()}</PixelText>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sealed Values — Why I Fight */}
      {hero.values && hero.values.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PixelText size={9} color={C.goalGold} style={{ display: "block", marginBottom: 10 }}>WHY I FIGHT</PixelText>
          <div style={{
            padding: 14, background: C.goalGold + "08",
            border: `2px solid ${C.goalGold}40`, borderRadius: 6,
          }}>
            {hero.values.map(v => (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{v.icon}</span>
                <PixelText size={7} color={C.goalGold}>{v.text}</PixelText>
              </div>
            ))}
          </div>
        </div>
      )}

      {hero.traits && hero.traits.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>CLAIMED TRAITS</PixelText>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {hero.traits.map(t => (
              <span key={t.id} style={{
                padding: "4px 8px", borderRadius: 3,
                background: t.type === "strength" ? C.goldMd + "20" : C.plumMd + "20",
                border: `1px solid ${t.type === "strength" ? C.goldMd + "50" : C.plumMd + "50"}`,
                fontFamily: PIXEL_FONT, fontSize: 8, color: t.type === "strength" ? C.goldMd : C.plumMd,
              }}>{t.icon} {t.text.length > 20 ? t.text.slice(0, 20) + "..." : t.text}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>JOURNEY GOAL</PixelText>
        <div style={{ padding: 14, background: C.goalGold + "15", border: `2px solid ${C.goalGold}`, borderRadius: 4, textAlign: "center" }}>
          <PixelText size={9} color={C.goalGold}>🏰 {quest.goal}</PixelText>
        </div>
      </div>

      <div>
        <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>BATTLE LOG</PixelText>
        {quest.bosses.filter(b => b.defeated).map(b => (
          <div key={b.id} style={{ padding: 10, marginBottom: 6, background: "#1A1218", border: "2px solid " + C.hpGreen + "60", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <PixelText size={7} color={C.hpGreen}>✓ {b.name}</PixelText>
            <PixelText size={7} color={C.goldMd}>+100 XP</PixelText>
          </div>
        ))}
        {quest.bosses.filter(b => b.defeated).length === 0 && (
          <div style={{ padding: 14, textAlign: "center" }}><PixelText size={8} color={C.grayLt}>No bosses defeated yet. Your journey awaits!</PixelText></div>
        )}
      </div>
    </div>
  );
}

// --- PSYCHOEDUCATION (The Shadow's Cycle + Exposure as the Cure) ---
// Informed by: Hope, Heimberg, Juster & Turk "Managing Social Anxiety" Ch 2-3;
// CBT Psychoeducation handout (group therapy format)
function PsychoEdScreen({ heroName, heroValues, onContinue }) {
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
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
    </div>
  );
}

// --- EXPOSURE HIERARCHY SORT (AI generates personalized battles, user swipes) ---
function ExposureSortScreen({ hero, shadowText, onComplete, obState = {}, setOBState }) {
  const [exposures, setExposures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState(obState.currentCard || 0);
  const [accepted, setAccepted] = useState(obState.accepted || []);
  const [rejected, setRejected] = useState(obState.rejected || []);
  const [done, setDone] = useState(obState.done || false);
  const [swipeDir, setSwipeDir] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [levelRejectCounts, setLevelRejectCounts] = useState(obState.levelRejectCounts || {});
  const [generatingReplacement, setGeneratingReplacement] = useState(false);
  const [allSuggestions, setAllSuggestions] = useState(obState.allSuggestions || []);
  const touchStartRef = useRef(null);
  const touchCurrentRef = useRef(null);

  const levelColor = (lv) => lv <= 3 ? C.hpGreen : lv <= 6 ? C.goldMd : lv <= 8 ? "#E8A04A" : C.bossRed;
  const levelLabel = (lv) => lv <= 3 ? "SHALLOW WATER" : lv <= 6 ? "GETTING DEEPER" : lv <= 8 ? "DEEP END" : "BOSS TERRITORY";

  useEffect(() => { generateExposures(); }, []);

  // Persist card-sort progress so resume-anywhere survives refresh/close
  useEffect(() => {
    if (!setOBState) return;
    setOBState({ currentCard, accepted, rejected, done, levelRejectCounts, allSuggestions });
  }, [currentCard, accepted, rejected, done, levelRejectCounts, allSuggestions, setOBState]);

  // Mark done when all cards have been seen
  useEffect(() => {
    if (!loading && exposures.length > 0 && currentCard >= exposures.length && !done) {
      setDone(true);
    }
  }, [loading, exposures.length, currentCard, done]);

  const generateExposures = async () => {
    try {
      const valuesText = (hero.values || []).map(v => v.text).join(", ");
      const strengthsText = (hero.coreValues || []).map(v => v.word).join(", ");
      const traitsText = (hero.traits || []).filter(t => t.type === "challenge").map(t => t.text).join("; ");
      const res = await callClaude(
        `You are a clinical psychologist designing a graduated exposure hierarchy for someone with social anxiety, following systematic graduated exposure principles (Hope, Heimberg, Juster & Turk). Based on the user's profile, generate exactly 10 exposure activities.

Clinical rules:
- Activities must form a graduated hierarchy from SUDS 10 (minimal anxiety) to SUDS 100 (maximum)
- Levels 1-3: Very low anxiety exposures (brief, low-stakes interactions like smiling, making eye contact, saying thank you)
- Levels 4-6: Moderate anxiety (initiating brief conversations, asking questions, joining groups)
- Levels 7-8: High anxiety (sharing opinions, being assertive, initiating deeper social contact)
- Levels 9-10: Peak anxiety (vulnerability, public attention, confronting core fears)
- Each must be concrete, specific, and completable in a single real-world attempt
- Tailor to the user's specific feared situations and avoidance patterns
- Connect higher-level exposures to the user's stated values where possible
- Give each a creative 2-3 word RPG boss name (fantasy/game themed)
- IMPORTANT: Each activity must be clearly distinct from activities at other levels, in case the system needs to generate alternatives at a specific level later.

Return ONLY a JSON array: [{"name":"Boss Name","activity":"specific activity","level":1}]
No other text.`,
        [{ role: "user", text: `User profile:
- Core strengths: ${strengthsText || "Not specified"}
- Values (why they fight): ${valuesText || "Build meaningful social connections"}
- Social challenges: ${traitsText || "General social avoidance and discomfort"}
- Shadow assessment: ${shadowText || "Avoidance of social situations, fear of judgment"}` }],
        4000
      );
      const jsonMatch = res.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const initial = parsed.slice(0, 10).map((e, i) => ({ ...e, id: "exp" + i, level: e.level || i + 1 }));
          setExposures(initial);
          setAllSuggestions(initial.map(e => ({ name: e.name, activity: e.activity, level: e.level })));
        }
      }
    } catch (e) { /* AI generation failed — will show retry */ }
    setLoading(false);
  };

  // Generate a single replacement exposure at a specific SUDS level
  const generateReplacementForLevel = async (level, exclusions) => {
    try {
      const valuesText = (hero.values || []).map(v => v.text).join(", ");
      const strengthsText = (hero.coreValues || []).map(v => v.word).join(", ");
      const traitsText = (hero.traits || []).filter(t => t.type === "challenge").map(t => t.text).join("; ");
      const exclusionList = exclusions.map(e => `"${e.name}" - ${e.activity}`).join("; ");
      const res = await callClaude(
        `You are a clinical psychologist designing a graduated exposure hierarchy. Generate EXACTLY ONE exposure activity at SUDS level ${level} (out of 10). It must be concrete, specific, and completable in a single real-world attempt. Give it a creative 2-3 word RPG boss name (fantasy/game themed).

CRITICAL: The new exposure must be DIFFERENT from these already-suggested activities:
${exclusionList || "None"}

Return ONLY a JSON object: {"name":"Boss Name","activity":"specific activity","level":${level}}
No other text.`,
        [{ role: "user", text: `User profile:
- Core strengths: ${strengthsText || "Not specified"}
- Values (why they fight): ${valuesText || "Build meaningful social connections"}
- Social challenges: ${traitsText || "General social avoidance and discomfort"}
- Shadow assessment: ${shadowText || "Avoidance of social situations, fear of judgment"}` }],
        2000
      );
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.name && parsed.activity) {
          return { ...parsed, id: "exp_r_" + Date.now(), level: parsed.level || level };
        }
      }
    } catch (e) { console.warn("Replacement generation failed:", e); }
    return null;
  };

  const card = exposures[currentCard];

  const handleAccept = () => {
    if (!card || generatingReplacement) return;
    setSwipeDir("right");
    setAccepted(prev => [...prev, card]);
    // Reset reject counter for this level — they found one they like
    setLevelRejectCounts(prev => { const next = { ...prev }; delete next[card.level]; return next; });
    setTimeout(() => { setSwipeDir(null); setDragX(0); setDragging(false); setCurrentCard(i => i + 1); }, 300);
  };

  const handleReject = async () => {
    if (!card || generatingReplacement) return;
    const level = card.level;
    const rejectionsSoFar = levelRejectCounts[level] || 0;

    if (rejectionsSoFar < 2) {
      // Generate a replacement at the same SUDS level
      setSwipeDir("left");
      setGeneratingReplacement(true);
      const replacement = await generateReplacementForLevel(level, allSuggestions);
      setGeneratingReplacement(false);

      if (replacement) {
        // Insert replacement at current position
        setExposures(prev => {
          const next = [...prev];
          next[currentCard] = replacement;
          return next;
        });
        // Track this suggestion for duplicate avoidance
        setAllSuggestions(prev => [...prev, { name: replacement.name, activity: replacement.activity, level }]);
        // Increment reject count for this level
        setLevelRejectCounts(prev => ({ ...prev, [level]: rejectionsSoFar + 1 }));
        // Reset swipe and stay on same card (replacement will be shown next)
        setTimeout(() => { setSwipeDir(null); setDragX(0); setDragging(false); }, 300);
        return;
      }
      // AI failed to generate replacement — fall through to normal reject
    }

    // No more alternatives or AI failed — move to next card
    setSwipeDir("left");
    setRejected(prev => [...prev, card]);
    setTimeout(() => { setSwipeDir(null); setDragX(0); setDragging(false); setCurrentCard(i => i + 1); }, 300);
  };

  const onTouchStart = (e) => { touchStartRef.current = e.touches[0].clientX; touchCurrentRef.current = e.touches[0].clientX; setDragging(true); };
  const onTouchMove = (e) => { if (!touchStartRef.current) return; touchCurrentRef.current = e.touches[0].clientX; setDragX(touchCurrentRef.current - touchStartRef.current); };
  const onTouchEnd = () => { if (!touchStartRef.current) return; const diff = touchCurrentRef.current - touchStartRef.current; if (diff > 60) handleAccept(); else if (diff < -60) handleReject(); else { setDragX(0); setDragging(false); } touchStartRef.current = null; };
  const onMouseDown = (e) => { touchStartRef.current = e.clientX; touchCurrentRef.current = e.clientX; setDragging(true); };
  const onMouseMove = (e) => { if (!dragging) return; touchCurrentRef.current = e.clientX; setDragX(e.clientX - touchStartRef.current); };
  const onMouseUp = () => { if (!touchStartRef.current) return; const diff = touchCurrentRef.current - touchStartRef.current; if (diff > 60) handleAccept(); else if (diff < -60) handleReject(); else { setDragX(0); setDragging(false); } touchStartRef.current = null; };

  // === COMPLETION: PATH FORGED ===
  if (done) {
    // "Forge is Cold" only when AI generated cards but user rejected ALL of them
    // (not when AI failed to generate — that shows a different screen)
    if (accepted.length === 0 && exposures.length > 0) {
      return (
        <div style={{ minHeight: "100vh", background: C.mapBg, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <link href={FONT_LINK} rel="stylesheet" />
          <PixelText size={12} color={C.bossRed} style={{ display: "block", marginBottom: 4 }}>THE FORGE IS COLD</PixelText>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              You passed on all the battles I suggested.{"\n"}{"\n"}That's okay — sometimes I miss the mark.{"\n"}Let me try again with a different approach.
            </PixelText>
          </DialogBox>
          <PixelBtn onClick={() => { setDone(false); setAccepted([]); setRejected([]); setCurrentCard(0); generateExposures(); }} color={C.gold} textColor={C.charcoal} style={{ width: "100%", maxWidth: 340, marginTop: 12 }}>
            FORGE AGAIN →
          </PixelBtn>
        </div>
      );
    }
    const finalBosses = accepted.sort((a, b) => a.level - b.level).map((e, i) => ({
      id: "boss" + i, name: e.name, desc: e.activity, level: e.level, hp: 100, defeated: false,
    }));
    return (
      <div style={{ minHeight: "100vh", background: C.mapBg, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <link href={FONT_LINK} rel="stylesheet" />
        <PixelText size={12} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>PATH FORGED</PixelText>
        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16 }}>
          {finalBosses.length} battles accepted · {rejected.length} passed
        </PixelText>

        {/* Visual path preview */}
        <div style={{ width: "100%", maxWidth: 340, marginBottom: 16, position: "relative" }}>
          {finalBosses.map((b, i) => (
            <div key={b.id} style={{ display: "flex", alignItems: "stretch", animation: `fadeIn 0.4s ease-out ${i * 0.08}s both` }}>
              {/* Vertical connector line */}
              <div style={{ width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: levelColor(b.level) + "30", border: `2px solid ${levelColor(b.level)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontFamily: PIXEL_FONT, color: levelColor(b.level),
                }}>{b.level}</div>
                {i < finalBosses.length - 1 && <div style={{ width: 2, flex: 1, background: "#5C3A50", minHeight: 12 }} />}
              </div>
              {/* Boss card */}
              <div style={{
                flex: 1, padding: "8px 12px", marginBottom: 4, marginLeft: 8,
                background: "#1A1218", border: `1px solid ${levelColor(b.level)}30`,
                borderRadius: 4,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <PixelText size={7} color={levelColor(b.level)}>{b.name}</PixelText>
                  <PixelText size={5} color={C.grayLt}>{levelLabel(b.level)}</PixelText>
                </div>
                <PixelText size={6} color={C.grayLt}>{b.desc}</PixelText>
              </div>
            </div>
          ))}
          {/* Goal at end */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 32, display: "flex", justifyContent: "center" }}>
              <div style={{ fontSize: 16 }}>🏰</div>
            </div>
            <div style={{ marginLeft: 8 }}>
              <PixelText size={7} color={C.goalGold}>{hero.values?.[0]?.text || "Freedom from the Shadow"}</PixelText>
            </div>
          </div>
        </div>

        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
            Your path is forged. Each{"\n"}battle is a chance to carry{"\n"}fear and move forward anyway.{"\n"}{"\n"}
            Start with the first step.{"\n"}You don't need to feel ready.{"\n"}You just need to be willing.{"\n"}I'll be with you every step.
          </PixelText>
        </DialogBox>
        <PixelBtn onClick={() => onComplete(finalBosses)} color={C.gold} textColor={C.charcoal} style={{ width: "100%", maxWidth: 340, marginTop: 12 }}>
          BEGIN THE JOURNEY →
        </PixelBtn>
        <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} }`}</style>
      </div>
    );
  }

  // === MAIN: Loading / Card Sort ===
  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "40px 24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {loading ? (
        <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔨</div>
          <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>FORGING YOUR BATTLES</PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>Dara is studying your Shadow profile...</PixelText>
        </div>
      ) : exposures.length === 0 ? (
        <div style={{ textAlign: "center" }}>
          <PixelText size={10} color={C.bossRed} style={{ display: "block", marginBottom: 12 }}>THE FORGE NEEDS MORE FIRE</PixelText>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              I couldn't generate your battles{"\n"}this time. Let me try again.
            </PixelText>
          </DialogBox>
          <PixelBtn onClick={() => { setLoading(true); generateExposures(); }} color={C.gold} textColor={C.charcoal} style={{ marginTop: 12 }}>
            TRY AGAIN
          </PixelBtn>
        </div>
      ) : card ? (
        <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
          <PixelText size={9} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>FORGE YOUR PATH</PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 14 }}>
            Could you try this? Swipe right to accept, left to pass.
          </PixelText>

          {/* Progress */}
          <div style={{ height: 4, background: "#1A1218", borderRadius: 2, marginBottom: 14, border: "1px solid #5C3A50" }}>
            <div style={{ height: "100%", width: `${(currentCard / exposures.length) * 100}%`, background: C.goldMd, borderRadius: 2, transition: "width 0.3s" }} />
          </div>

          {/* Replacement loading indicator */}
          {generatingReplacement && (
            <div style={{ textAlign: "center", marginBottom: 14, padding: "12px 16px", animation: "fadeIn 0.3s ease-out" }}>
              <div style={{ fontSize: 28, marginBottom: 8, animation: "pulse 1.2s ease-in-out infinite" }}>🔨</div>
              <PixelText size={8} color={C.goldMd} style={{ display: "block" }}>Dara is finding another option...</PixelText>
            </div>
          )}

          {/* Exposure card */}
          <div
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            style={{
              padding: "20px 18px", position: "relative",
              background: `linear-gradient(180deg, ${levelColor(card.level)}08 0%, #1A1218 100%)`,
              border: `2px solid ${swipeDir === "right" ? C.hpGreen : swipeDir === "left" ? C.bossRed : levelColor(card.level) + "60"}`,
              borderRadius: 8, cursor: "grab", userSelect: "none", marginBottom: 14,
              transform: `translateX(${swipeDir === "right" ? 200 : swipeDir === "left" ? -200 : dragX}px) rotate(${(swipeDir === "right" ? 12 : swipeDir === "left" ? -12 : dragX * 0.08)}deg)`,
              opacity: swipeDir ? 0 : 1, transition: swipeDir ? "all 0.3s" : "none",
            }}
          >
            {/* Difficulty badge */}
            <div style={{
              display: "inline-block", padding: "3px 10px", borderRadius: 3, marginBottom: 12,
              background: levelColor(card.level) + "20", border: `1px solid ${levelColor(card.level)}40`,
            }}>
              <PixelText size={6} color={levelColor(card.level)}>LV.{card.level} · {levelLabel(card.level)}</PixelText>
            </div>

            {/* Alternative badge — shown when this is a replacement card */}
            {levelRejectCounts[card.level] > 0 && (
              <div style={{
                position: "absolute", top: 10, right: 10,
                padding: "2px 8px", borderRadius: 3,
                background: C.plum + "80", border: `1px solid ${C.goldMd}60`,
                animation: "fadeIn 0.3s ease-out",
              }}>
                <PixelText size={5} color={C.goldMd}>Alt {levelRejectCounts[card.level]} of 2</PixelText>
              </div>
            )}

            <PixelText size={11} color={C.cream} style={{ display: "block", marginBottom: 10 }}>{card.name}</PixelText>
            <PixelText size={8} color={C.grayLt} style={{ display: "block", lineHeight: 1.7 }}>{card.activity}</PixelText>

            {/* Swipe indicators */}
            {dragX > 20 && <div style={{ position: "absolute", top: 12, right: 12 }}><PixelText size={9} color={C.hpGreen}>ACCEPT ✓</PixelText></div>}
            {dragX < -20 && <div style={{ position: "absolute", top: 12, left: 12 }}><PixelText size={9} color={C.bossRed}>PASS ✗</PixelText></div>}
          </div>

          {/* Labels + count */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 10 }}>
            <PixelText size={7} color={C.bossRed}>← PASS</PixelText>
            <PixelText size={8} color={C.grayLt}>{currentCard + 1} / {exposures.length}</PixelText>
            <PixelText size={7} color={C.hpGreen}>ACCEPT →</PixelText>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, opacity: generatingReplacement ? 0.4 : 1, pointerEvents: generatingReplacement ? "none" : "auto" }}>
            <button onClick={handleReject} style={{
              width: 48, height: 48, borderRadius: "50%", border: "2px solid #5C3A50",
              background: C.plum, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>✗</button>
            <button onClick={handleAccept} style={{
              width: 48, height: 48, borderRadius: "50%", border: `2px solid ${C.goldMd}`,
              background: C.plum, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 18,
              boxShadow: `0 0 12px ${C.goldMd}20`,
            }}>✓</button>
          </div>

          {/* Accepted count */}
          {accepted.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <PixelText size={6} color={C.hpGreen}>{accepted.length} battle{accepted.length !== 1 ? "s" : ""} on your path</PixelText>
            </div>
          )}
        </div>
      ) : null}

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } @keyframes fearPulse { 0%,100%{box-shadow:0 0 8px #FF444420} 50%{box-shadow:0 0 24px #FF444450} } @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </div>
  );
}

// ============ MAIN APP ============
export default function DARERQuest() {
  const [screen, setScreenRaw] = useState("login");
  const [screenHistory, setScreenHistory] = useState([]);
  const [hero, setHero] = useState({ name: "Hero", darerId: "", strengths: [], stats: { courage: 5, resilience: 5, openness: 5 }, traits: [], armory: JSON.parse(JSON.stringify(DEFAULT_ARMORY)) });
  const [quest, setQuest] = useState(DEFAULT_QUEST);
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
    if (user) await saveProgress(user.id, { screen: "shadowReveal", hero, quest, shadow_text: summaryText || "", intake_complete: true });
  };

  const handleBossVictory = async (outcome) => {
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
      // Load existing battle_history, append this result, save back
      const existing = await loadProgress(user.id);
      const prevHistory = Array.isArray(existing?.battle_history) ? existing.battle_history : [];
      const battleRecord = {
        bossId: activeBoss?.id,
        bossName: activeBoss?.name,
        bossDesc: activeBoss?.desc,
        outcome,
        date: new Date().toISOString(),
        heroStats: hero?.stats,
      };
      const newHistory = [...prevHistory, battleRecord];
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
      {screen === "intake" && <IntakeScreen heroName={hero.name} onComplete={handleIntakeComplete} obState={getOBState("intake", { chatHistory: [] })} setOBState={(s) => setOBState("intake", s)} />}
      {screen === "shadowReveal" && <ShadowReveal heroName={hero.name} shadowText={shadowText} onContinue={() => setScreen("darerStrategy")} obState={getOBState("shadowReveal", { revealed: false })} setOBState={(s) => setOBState("shadowReveal", s)} />}
      {screen === "darerStrategy" && <DARERStrategy heroName={hero.name} shadowText={shadowText} heroValues={hero.values || []} onContinue={() => setScreen("armoryIntro")} obState={getOBState("darerStrategy", { step: 0 })} setOBState={(s) => setOBState("darerStrategy", s)} />}
      {screen === "armoryIntro" && <ArmoryScreen heroName={hero.name} onContinue={() => setScreen("tutorial")} obState={getOBState("armoryIntro", { step: "intro" })} setOBState={(s) => setOBState("armoryIntro", s)} />}
      {screen === "tutorial" && <TutorialBattle heroName={hero.name} shadowText={shadowText} heroValues={hero.values || []} heroStrengths={hero.strengths || []} heroCoreValues={hero.coreValues || []} onComplete={handleTutorialComplete} obState={getOBState("tutorial", { step: 0 })} setOBState={(s) => setOBState("tutorial", s)} />}
      {screen === "exposureSort" && <ExposureSortScreen hero={hero} shadowText={shadowText} onComplete={(bosses) => {
        setQuest(q => ({ ...q, bosses, goal: hero.values?.[0]?.text || q.goal }));
        setScreen("map");
      }} obState={getOBState("exposureSort", { currentCard: 0, accepted: [], rejected: [], done: false })} setOBState={(s) => setOBState("exposureSort", s)} />}
      {/* === END CLINICAL FLOW === */}
      {screen === "map" && <GameMap quest={quest} hero={hero} onSelectBoss={b => { setActiveBoss(b); setScreen("battle"); }} onViewProfile={() => setScreen("profile")} onArmory={() => setScreen("armory")} onLadder={() => setScreen("ladder")} onAddExposure={() => setAddMode("menu")} />}
      {screen === "battle" && activeBoss && <BossBattle boss={activeBoss} quest={quest} hero={hero} onVictory={handleBossVictory} onRetreat={() => { setActiveBoss(null); setScreen("map"); }} obState={getOBState("battle", { phase: "prep", prepStep: 0, prepAnswers: { value: "", allow: "", rise: "" }, suds: { before: 50, during: 60, after: 30 }, outcome: null })} setOBState={(s) => setOBState("battle", s)} />}
      {screen === "profile" && <HeroProfile hero={hero} quest={quest} onBack={() => setScreen("map")} />}
      {screen === "armory" && <GameArmory hero={hero} setHero={setHero} setScreen={setScreen} onBack={() => setScreen("map")} />}
      {screen === "ladder" && <LadderScreen hero={hero} quest={quest} setScreen={setScreen} onBack={() => setScreen("map")} />}

      {/* Add Exposure Modal — menu */}
      {addMode === "menu" && (
        <AddExposureModal
          onClose={() => setAddMode(null)}
          onManualEntry={() => setAddMode("manual")}
          onAskDara={() => { setAddMode(null); alert("Ask Dara to help — coming soon!"); }}
        />
      )}

      {/* Add Exposure Modal — manual entry form */}
      {addMode === "manual" && (
        <AddManualEntryForm
          onClose={() => setAddMode(null)}
          onSubmit={(data) => {
            const newBoss = {
              id: `custom_${Date.now()}`,
              name: data.name,
              desc: data.desc,
              difficulty: data.difficulty,
              defeated: false,
              hp: 100,
              maxHp: 100,
              isCustom: true,
            };
            setQuest(q => ({ ...q, bosses: [...q.bosses, newBoss] }));
            setAddMode(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
