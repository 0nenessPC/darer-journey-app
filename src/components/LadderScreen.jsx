import { C } from "../constants/gameData";
import { PixelText } from "./shared.jsx";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

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

export default LadderScreen;
