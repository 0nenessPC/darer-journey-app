import { C } from "../constants/gameData";
import { PixelText, PixelBtn } from "./shared";
import Modal from "./Modal";

export default function DeleteConfirm({ boss, onConfirm, onCancel }) {
  if (!boss) return null;

  return (
    <Modal open={!!boss} onClose={onCancel} variant="center" maxWidth={400} backdropClose={false} borderColor={C.bossRed}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
      <PixelText size={11} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>DELETE EXPOSURE?</PixelText>
      <div style={{ padding: C.padMd, background: C.inputBg, borderRadius: 6, marginBottom: 16 }}>
        <PixelText size={9} color={C.cream}>{boss.name}</PixelText>
        <div style={{ marginTop: 4 }}><PixelText size={7} color={C.subtleText}>{boss.desc}</PixelText></div>
      </div>
      <PixelText size={7} color={C.subtleText} style={{ display: "block", marginBottom: 16, lineHeight: 1.6 }}>
        {boss.isCustom
          ? "This custom exposure will be permanently removed from your journey."
          : "This exposure will be hidden from your map. You can re-add it later."}
      </PixelText>
      <div style={{ display: "flex", gap: 8 }}>
        <PixelBtn onClick={onCancel} color={C.plum} style={{ flex: 1 }}>CANCEL</PixelBtn>
        <PixelBtn onClick={onConfirm} color={C.bossRed} style={{ flex: 1 }}>DELETE</PixelBtn>
      </div>
    </Modal>
  );
}
