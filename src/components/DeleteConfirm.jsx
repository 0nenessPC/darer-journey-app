import { C } from "../constants/gameData";
import { PixelText, PixelBtn } from "./shared";

export default function DeleteConfirm({ boss, onConfirm, onCancel }) {
  if (!boss) return null;

  return (
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
          <PixelText size={9} color={C.cream}>{boss.name}</PixelText>
          <div style={{ marginTop: 4 }}><PixelText size={7} color={C.grayLt}>{boss.desc}</PixelText></div>
        </div>
        <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 16, lineHeight: 1.6 }}>
          {boss.isCustom
            ? "This custom exposure will be permanently removed from your journey."
            : "This exposure will be hidden from your map. You can re-add it later."}
        </PixelText>
        <div style={{ display: "flex", gap: 8 }}>
          <PixelBtn onClick={onCancel} color={C.plum} style={{ flex: 1 }}>CANCEL</PixelBtn>
          <PixelBtn onClick={onConfirm} color={C.bossRed} style={{ flex: 1 }}>DELETE</PixelBtn>
        </div>
      </div>
    </div>
  );
}
