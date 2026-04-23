import { useState, useEffect, useRef } from "react";
import { buildHeroContext } from "../utils/aiHelper.jsx";
import { useAIChat } from "../utils/chat";
import { useTTS } from "../hooks/useVoiceRecorder.jsx";
import { useCloudVoice } from "../hooks/useCloudVoice";
import { VoiceInputBar } from "../components/VoiceToggle";
import { C, SYS } from "../constants/gameData";
import { PixelText, PixelBtn, DialogBox } from "../components/shared.jsx";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

function IntakeScreen({ heroName, hero, quest, onComplete }) {
  const heroContext = buildHeroContext(hero, quest, "");
  const { messages, typing, sendMessage, init, error, errorType } = useAIChat(SYS.intake, heroContext);
  const { speak, cancel } = useTTS();
  const voice = useCloudVoice({ useCloud: true });
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const chatRef = useRef(null);
  const initPromptRef = useRef(`The hero's name is ${heroName}. They have just seen the lore about the Shadow's true nature and said they are ready to look into its eyes. Refer to their personal context provided above — their strengths, values, traits, and goal. Tailor your questions around what matters to them. Begin by acknowledging their courage, mention this will take about 5 to 10 minutes, then ask your first question about where the Shadow shows up in their daily life. Keep it to 2-3 sentences. This should feel like a companion helping them understand their enemy, not a clinical interview.`);
  useEffect(() => {
    if (!started) { setStarted(true); init(initPromptRef.current); }
  }, [started, init, heroName]);
  // Retry init when it failed
  const retryInit = () => { init(initPromptRef.current); };

  // Cancel speech when new typing starts
  useEffect(() => { if (typing) cancel(); }, [typing, cancel]);

  // Auto-speak new assistant messages (when not muted)
  const prevCount = useRef(0);
  useEffect(() => {
    const count = messages.filter(m => m.role === "assistant").length;
    if (count > prevCount.current && !muted) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") speak(last.text);
    }
    prevCount.current = count;
  }, [messages, muted, speak]);

  const handleSend = async (text) => {
    const message = text !== undefined ? text : input;
    if (!message.trim() || typing) return;
    const ok = await sendMessage(message);
    if (ok) setInput("");
  };

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, typing]);
  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  const hasShadowSummary = lastAssistant?.text?.includes("SHADOW'S TRUE NATURE") || lastAssistant?.text?.includes("WHERE IT APPEARS");

  // Auto-transition when Dara generates the shadow summary
  useEffect(() => {
    if (hasShadowSummary && lastAssistant) {
      cancel(); // stop any lingering speech
      const timer = setTimeout(() => onComplete(messages, lastAssistant.text), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasShadowSummary, lastAssistant, messages, onComplete, cancel]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.mapBg }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "2px solid #5C3A50" }}>
        <div style={{ width: 32, height: 32, borderRadius: 4, background: "#1A1218", border: "2px solid #5C3A50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧚</div>
        <div>
          <PixelText size={9} color={C.goldMd}>DARA</PixelText>
          <div><PixelText size={7} color={typing ? C.rose : C.grayLt}>{typing ? "thinking..." : "soul companion"}</PixelText></div>
        </div>
        <button
          onClick={() => { if (muted) setMuted(false); else { setMuted(true); cancel(); } }}
          style={{ background: "transparent", border: "1px solid #5C3A50", borderRadius: 4, cursor: "pointer", padding: "4px 6px", fontSize: 14, lineHeight: 1 }}
          title={muted ? "Unmute DARER's voice" : "Mute DARER's voice"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
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
                <PixelBtn onClick={() => handleSend()} color={C.gold} textColor={C.charcoal} style={{ width: "auto" }}>
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
        <VoiceInputBar
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          typing={typing}
          disabled={false}
          voice={voice}
          placeholder="Speak to Dara..."
        />
      )}
    </div>
  );
}

export default IntakeScreen;
