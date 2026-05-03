import React from 'react';
import { C } from '../../constants/gameData';
import { PixelText, PixelBtn, DialogBox, TypingDots } from '../../components/shared';

/**
 * Shared REPEAT phase — psychoeducation block + AI-generated follow-up options.
 * BossBattle: interactive (clickable options + select + "I'M READY TO REPEAT" button)
 * TutorialBattle: read-only preview (faded, non-interactive, "GOT IT" button)
 */
export default function RepeatPhase({
  outcome,          // "victory"|"partial"|"retreat" or "full"|"partial"|"tried"
  repeatOptions,    // array of { text, icon, tag }
  selectedRepeat,   // currently selected option text (BossBattle only)
  setSelectedRepeat,// set selected option (BossBattle only)
  onRegenerate,     // regenerate options (BossBattle only)
  onComplete,       // called by the "continue" button
  isLoading,        // true while options are being generated
  readOnly,         // true = TutorialBattle preview, false = BossBattle interactive
  loadingLabel,     // "DARA IS FINDING OPTIONS" vs "DARA IS FINDING OPTIONS..."
  continueLabel,    // button text
  heroName,         // for personalized message
}) {
  const isVictory = outcome === "victory" || outcome === "full";
  const isPartial = outcome === "partial";

  return (
    <div style={{ animation: "fadeIn 0.6s ease-out" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔁</div>
      <PixelText size={11} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>
        THE POWER OF REPEAT
      </PixelText>

      {/* Psychoeducation block */}
      <div style={{
        background: C.hpGreen + "10", border: `2px solid ${C.hpGreen}30`,
        borderRadius: 6, padding: C.padLg, marginBottom: 16, textAlign: "left",
      }}>
        <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8, letterSpacing: 2 }}>WHY REPEAT?</PixelText>
        <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
          One exposure teaches your brain something. Repeat exposure rewires it.{"\n"}{"\n"}
          Every time you repeat the same exposure, your nervous system learns a little deeper that the threat isn't real. The Shadow's whispers get quieter. The Storm gets smaller.{"\n"}{"\n"}
          This is the heart of ERP therapy — not just facing fear once, but practicing it until it becomes normal. That's how you reclaim your life from the Shadow.
        </PixelText>
      </div>

      <DialogBox speaker="DARA">
        <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
          {readOnly ? (
            <>On your real journey, after every{"\n"}battle you'll get personalized{"\n"}suggestions for how to repeat —{"\n"}slightly harder if you crushed it,{"\n"}a bit gentler if the Storm was{"\n"}too strong today.{"\n"}{"\n"}
            Here's a taste of what that{"\n"}might look like for you:</>
          ) : isVictory ? (
            <>{heroName ? `${heroName}, ` : ""}you crushed it. Now let's build on{"\n"}that momentum. Here are some{"\n"}ways to repeat this battle —{"\n"}some a little harder, one{"\n"}that's outside the box.</>
          ) : isPartial ? (
            <>You went partway — that counts.{"\n"}{"\n"}Let me suggest some ways to{"\n"}repeat that might feel a bit{"\n"}more within reach next time.</>
          ) : (
            <>The Storm was too strong this{"\n"}time — and that's data, not{"\n"}failure.{"\n"}{"\n"}Let me suggest some gentler{"\n"}variations that might feel{"\n"}more doable. You've still got this.</>
          )}
        </PixelText>
      </DialogBox>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>{loadingLabel || "DARA IS FINDING OPTIONS"}</PixelText>
          <TypingDots />
        </div>
      ) : (
        <>
          <div style={readOnly ? { opacity: 0.7, pointerEvents: "none" } : undefined}>
            {repeatOptions.map((opt, i) => (
              readOnly ? (
                <div key={i} style={{
                  display: "block", width: "100%", marginBottom: 8, padding: "12px 14px",
                  borderRadius: 4, border: `2px solid ${C.mutedBorder}`,
                  background: C.cardBg, textAlign: "left",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                    <PixelText size={7} color={C.cream}>{opt.text}</PixelText>
                  </div>
                  {opt.tag === "creative" && (
                    <PixelText size={6} color={C.goldMd}>✨ OUTSIDE THE BOX</PixelText>
                  )}
                  {opt.tag === "step-up" && (
                    <PixelText size={6} color={C.bossRed}>⚡ STEP UP</PixelText>
                  )}
                </div>
              ) : (
                <button key={i} onClick={() => setSelectedRepeat?.(opt.text)} style={{
                  display: "block", width: "100%", marginBottom: 8, padding: "12px 14px",
                  borderRadius: 4, border: `2px solid ${selectedRepeat === opt.text ? C.hpGreen : C.mutedBorder}`,
                  background: selectedRepeat === opt.text ? C.hpGreen + "12" : C.cardBg,
                  cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                    <PixelText size={7} color={selectedRepeat === opt.text ? C.hpGreen : C.cream}>
                      {opt.text}
                    </PixelText>
                  </div>
                  {opt.tag === "creative" && (
                    <PixelText size={6} color={C.goldMd}>✨ OUTSIDE THE BOX</PixelText>
                  )}
                  {opt.tag === "step-up" && (
                    <PixelText size={6} color={C.bossRed}>⚡ STEP UP</PixelText>
                  )}
                </button>
              )
            ))}
          </div>

          {/* Regenerate button — BossBattle only */}
          {!readOnly && onRegenerate && (
            <button
              onClick={() => { setSelectedRepeat?.(""); onRegenerate(); }}
              style={{
                width: "100%", padding: "10px 14px", marginTop: 4, marginBottom: 16,
                background: "transparent", border: `1px dashed ${C.mutedBorder}`,
                borderRadius: 4, cursor: "pointer", boxSizing: "border-box",
              }}
            >
              <PixelText size={7} color={C.plumMd}>🎲 I FEEL LUCKY — show me something different</PixelText>
            </button>
          )}
        </>
      )}

      <PixelBtn onClick={onComplete} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
        {continueLabel || (readOnly ? "GOT IT — ON TO THE PATH →" : "I'M READY TO REPEAT → MISSION COMPLETE")}
      </PixelBtn>
    </div>
  );
}
