import React, { useState, useEffect, useRef } from 'react';
import { C, PIXEL_FONT, FONT_LINK } from '../constants/gameData';
import { PixelText, PixelBtn, TypingDots } from '../components/shared';
import { callAI } from '../utils/chat';
export default function AskDaraChat({ onClose, onSubmit, onFallback, heroContext = "" }) {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0); // 0 = intro, 1-4 = questions, 5 = review
  const [generatedExposure, setGeneratedExposure] = useState(null);
  const [chatError, setChatError] = useState(false);
  const messagesEndRef = useRef(null);
  const chatHistory = useRef([]);

  const USER_NAME = heroContext?.match(/HERO: (.+)/)?.[1]?.split(',')[0] || "Hero"; // Extract name from hero context

  // Dara's system prompt for exposure design
  const DARA_SYS = `${heroContext ? heroContext + "\n\n" : ""}You are Dara, a warm clinical psychologist helping someone design a personalized micro-exposure for social anxiety.

RULES:
- Ask exactly ONE question per turn, keep responses to 2-3 sentences max.
- Use game language but anchor to real world.
- After 4-5 exchanges, generate a JSON exposure card.
- Reference the user's strengths, values, and shadow profile to make exposures personally meaningful.
- Design exposures that align with their journey goal.

CONVERSATION FLOW:
1. FIRST MESSAGE: Start with the greeting below. Ask what situation makes them most anxious right now.
2. Follow-up questions to understand: the situation, what they fear will happen, what they currently do to avoid it, and what a small brave step would look like.
3. AFTER 4-5 exchanges: Generate a JSON object like:
{"name": "Short exposure name", "desc": "What it involves", "difficulty": 1-10}

Always keep the exposure small, actionable, and specific.`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize — Dara's first message
  useEffect(() => {
    if (step === 0 && messages.length === 0) {
      setTyping(true);
      const initMsg = { role: "assistant", text: `Hey there. I'm Dara — and I'm here to help you design your very own exposure challenge. Think of it as a small, brave step toward ${heroContext ? "your goal" : "the things that feel hard right now"}.\n\nWhat's one social situation that makes you feel the most anxious lately?` };
      chatHistory.current = [initMsg];
      setMessages([initMsg]);
      setTyping(false);
      setStep(1);
    }
  }, [step, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const userText = input.trim();
    setInput("");

    // Add user message
    const userMsg = { role: "user", text: userText };
    chatHistory.current.push(userMsg);
    setMessages(prev => [...prev, userMsg]);

    // After enough exchanges, generate the exposure card
    if (step >= 4) {
      setTyping(true);
      setStep(5);
      try {
        const res = await callAI(
          DARA_SYS + `\n\nThe user has shared enough. Now generate ONLY a JSON exposure card with: {"name": "...", "desc": "...", "difficulty": 1-10}. Do NOT add any other text.`,
          chatHistory.current,
          500,
          20000
        );

        if (res && res.includes("{")) {
          // Try to parse the JSON from the response
          let jsonStr = res;
          const jsonMatch = res.match(/\{[^}]+\}/s);
          if (jsonMatch) jsonStr = jsonMatch[0];

          try {
            const exposure = JSON.parse(jsonStr);
            if (exposure.name && exposure.difficulty) {
              const finalMsg = { role: "assistant", text: `I've designed an exposure challenge for you based on what you shared! Take a look — if it feels right, tap "Add to My Journey." If not, you can tweak it or write your own instead.` };
              chatHistory.current.push(finalMsg);
              setMessages(prev => [...prev, finalMsg]);
              setGeneratedExposure({
                name: exposure.name,
                desc: exposure.desc || `Based on your conversation with Dara`,
                difficulty: Math.min(10, Math.max(1, Number(exposure.difficulty))),
              });
              setTyping(false);
              return;
            }
          } catch (parseErr) {
            console.warn("Failed to parse Dara's JSON:", parseErr);
          }
        }

        // If parsing failed, fall back to manual form
        setChatError(true);
        onFallback();
      } catch (err) {
        console.error("Dara chat error:", err);
        setChatError(true);
        onFallback();
      }
      return;
    }

    // Normal conversation turn
    setTyping(true);
    setStep(prev => prev + 1);
    const res = await callAI(DARA_SYS, chatHistory.current, 300, 15000);
    if (res) {
      const aiMsg = { role: "assistant", text: res };
      chatHistory.current.push(aiMsg);
      setMessages(prev => [...prev, aiMsg]);
    }
    setTyping(false);
  };

  // Show review screen if we have a generated exposure
  if (generatedExposure) {
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <PixelText size={12} color={C.teal}>Dara's Suggestion</PixelText>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.grayLt, fontSize: 18 }}>✕</button>
          </div>

          {/* Generated card preview */}
          <div style={{
            padding: 14, background: C.teal + "15", border: `2px solid ${C.teal}`,
            borderRadius: 6, marginBottom: 20,
          }}>
            <PixelText size={9} color={C.cream} style={{ display: "block", marginBottom: 6 }}>✏ {generatedExposure.name}</PixelText>
            <PixelText size={7} color={C.grayLt}>{generatedExposure.desc}</PixelText>
            <div style={{ marginTop: 8 }}>
              <PixelText size={8} color={C.teal}>Anxiety level: LV.{generatedExposure.difficulty}</PixelText>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => onSubmit({
                name: generatedExposure.name,
                desc: generatedExposure.desc,
                difficulty: generatedExposure.difficulty,
              })}
              style={{
                width: "100%", padding: "14px 20px",
                background: C.teal, border: `3px solid ${C.teal}`,
                borderRadius: 6, cursor: "pointer",
                color: C.cream, fontSize: 10, fontFamily: PIXEL_FONT,
                boxShadow: `0 4px 0 #4A7A60`,
              }}
            >
              ✅ Add to My Journey
            </button>
            <button
              onClick={onFallback}
              style={{
                width: "100%", padding: "12px 20px",
                background: "transparent", border: `2px solid ${C.grayLt}`,
                borderRadius: 6, cursor: "pointer",
                color: C.grayLt, fontSize: 9, fontFamily: PIXEL_FONT,
              }}
            >
              ✏️ Edit or write my own
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, height: "80vh",
          background: "#1A1218", border: `3px solid ${C.teal}`,
          borderRadius: 12, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "12px 16px", borderBottom: `2px solid ${C.teal}40`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <PixelText size={9} color={C.teal}>🤖 Ask Dara</PixelText>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.grayLt, fontSize: 16 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "85%", padding: "10px 14px",
                background: m.role === "user" ? C.plum + "30" : "#222",
                border: `2px solid ${m.role === "user" ? C.plum + "60" : C.teal + "40"}`,
                borderRadius: 8,
              }}>
                <PixelText size={7} color={m.role === "user" ? C.plumLt : C.cream} style={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </PixelText>
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                maxWidth: "85%", padding: "10px 14px",
                background: "#222", border: `2px solid ${C.teal}40`,
                borderRadius: 8,
              }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 16px", borderTop: `2px solid ${C.teal}40`,
          display: "flex", gap: 8,
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={step >= 5 ? "Generating your exposure..." : "Type your answer..."}
            disabled={typing || step >= 5}
            style={{
              flex: 1, padding: "10px 12px",
              background: "#222", border: `2px solid ${C.teal}60`,
              borderRadius: 6, color: C.cream, fontSize: 12,
              fontFamily: "inherit", outline: "none",
              opacity: typing || step >= 5 ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={typing || !input.trim() || step >= 5}
            style={{
              padding: "10px 16px",
              background: input.trim() && !typing ? C.teal : C.gray,
              border: `2px solid ${input.trim() && !typing ? C.teal : C.gray}`,
              borderRadius: 6, cursor: input.trim() && !typing ? "pointer" : "default",
              color: C.cream, fontSize: 14, fontFamily: PIXEL_FONT,
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

