import { C } from "../constants/gameData";
import { PixelText, PixelBtn, DialogBox } from "../components/shared.jsx";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

function ShadowLore({ heroName, onPsychoed, onReady, initialStep = 0, obState, setOBState }) {
  const step = obState?.step ?? initialStep;
  const setStep = (v) => setOBState({ step: typeof v === 'function' ? v(step) : v });
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", padding: "0 28px", background: C.mapBg, textAlign: "center",
    }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* STEP 0 — Dara: meeting + F.E.A.R. reveal (combined) */}
      {step === 0 && (
        <div style={{ animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.7 }}>👁</div>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
              {heroName}, now that we've{"\n"}found each other... before we{"\n"}can walk this road together,{"\n"}there's something you need{"\n"}to face.{"\n"}{"\n"}
              F.E.A.R. Not the feeling —{"\n"}the enemy itself.{"\n"}{"\n"}
              The Shadow of Fear has no{"\n"}fixed shape. That's what makes{"\n"}it so dangerous. It reaches{"\n"}into the deepest corners of{"\n"}your mind and body, and turns{"\n"}what it finds there into a{"\n"}monster — one so terrifying{"\n"}you dare not look at it, or{"\n"}even be in the same room{"\n"}with it.{"\n"}{"\n"}
              It feeds on avoidance. Every{"\n"}time you look away, it grows{"\n"}stronger.{"\n"}{"\n"}
              Looking into its eyes is how{"\n"}we map where to go.
            </PixelText>
          </DialogBox>
          <PixelBtn onClick={onPsychoed} style={{ marginTop: 12 }}>
            CONTINUE
          </PixelBtn>
        </div>
      )}

      {/* STEP 1 — Dara post-PsychoEd: ready to map personal Shadow */}
      {step === 1 && (
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


    </div>
  );
}

export default ShadowLore;
