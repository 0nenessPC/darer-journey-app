import { useState } from "react";
import { C } from "../constants/gameData";
import { PixelText } from "./shared.jsx";

const PIXEL_FONT = "'Press Start 2P', monospace";

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

export default AddManualEntryForm;
