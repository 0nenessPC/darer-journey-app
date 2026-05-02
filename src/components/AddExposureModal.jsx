import { C } from "../constants/gameData";
import { PixelText } from "./shared.jsx";

function AddExposureModal({ onClose, onManualEntry, onAskDara }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: C.overlay,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, background: C.cardBg,
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

export default AddExposureModal;
