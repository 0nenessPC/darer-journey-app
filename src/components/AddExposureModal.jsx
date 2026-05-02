import { C } from "../constants/gameData";
import { PixelText } from "./shared.jsx";
import Modal from "./Modal";

function AddExposureModal({ onClose, onManualEntry, onAskDara }) {
  return (
    <Modal open onClose={onClose} variant="bottom" title="Add New Exposure">
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
            <PixelText size={7} color={C.subtleText}>Type in your own exposure</PixelText>
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
            <PixelText size={7} color={C.subtleText}>Dara guides you through it</PixelText>
          </div>
        </button>
      </div>
    </Modal>
  );
}

export default AddExposureModal;
