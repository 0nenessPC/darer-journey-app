import { useState } from "react";
import { supabase, saveFeedback } from "../utils/supabase";
import { C } from "../constants/gameData";
import { PixelText } from "./shared.jsx";

/**
 * FeedbackModal — a simple feedback dialog with a textarea and submit button.
 * Captures the current screen name automatically.
 */
export default function FeedbackModal({ screen, hero, onClose }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const success = await saveFeedback(user.id, {
      screen,
      feedback_text: text.trim(),
      hero_name: hero?.name || "",
      darer_id: hero?.darerId || "",
      quest_state: hero ? { bosses: hero.quest?.bosses?.length ?? 0 } : null,
    });
    setSubmitting(false);
    if (success) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.7)", padding: 16,
      }}>
        <div style={{
          background: C.charcoal, border: `2px solid ${C.plum}`,
          borderRadius: 12, padding: 24, maxWidth: 360, width: "100%",
          textAlign: "center",
        }}>
          <PixelText size={10} color={C.goldMd}>✦ Thank You ✦</PixelText>
          <br /><br />
          <PixelText size={6} color={C.grayLt}>Your feedback helps strengthen the DARER Order.</PixelText>
          <br /><br />
          <button onClick={onClose} style={{
            background: C.plum, border: "none", borderRadius: 6,
            padding: "8px 20px", cursor: "pointer",
          }}>
            <PixelText size={7} color={C.white}>CLOSE</PixelText>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", padding: 16,
    }}>
      <div style={{
        background: C.charcoal, border: `2px solid ${C.plum}`,
        borderRadius: 12, padding: 20, maxWidth: 400, width: "100%",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <PixelText size={8} color={C.goldMd}>Report Issue</PixelText>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
          }}>
            <PixelText size={7} color={C.gray}>✕</PixelText>
          </button>
        </div>
        <PixelText size={5} color={C.grayLt} style={{ marginBottom: 8, display: "block" }}>
          Screen: {screen}
        </PixelText>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe what went wrong or what could be better..."
          style={{
            width: "100%", minHeight: 100, padding: 10,
            background: C.mapBg, border: `1px solid ${C.plum}`,
            borderRadius: 6, color: C.cream, fontSize: 14,
            fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
          }}
          maxLength={1000}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${C.gray}`, borderRadius: 6,
            padding: "8px 16px", cursor: "pointer",
          }}>
            <PixelText size={7} color={C.gray}>CANCEL</PixelText>
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            style={{
              background: text.trim() ? C.plum : C.gray,
              border: "none", borderRadius: 6,
              padding: "8px 16px", cursor: text.trim() ? "pointer" : "not-allowed",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <PixelText size={7} color={C.white}>{submitting ? "..." : "SEND"}</PixelText>
          </button>
        </div>
      </div>
    </div>
  );
}
