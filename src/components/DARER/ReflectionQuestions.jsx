import React from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText } from '../../components/shared';

/**
 * Three sequential reflection questions after exposure.
 * Q2 and Q3 are hidden when Q1 answer is "No, they didn't happen at all".
 */
export default function ReflectionQuestions({
  fearedHappened, setFearedHappened,
  fearedSeverity, setFearedSeverity,
  madeItThrough, setMadeItThrough,
}) {
  const skipFollowUp = fearedHappened === "No, they didn't happen at all";
  const done = skipFollowUp ? fearedHappened : (fearedHappened && fearedSeverity && madeItThrough);

  return (
    <div>
      <PixelText size={10} color={C.goldMd} style={{ display: "block", textAlign: "center", marginBottom: 16 }}>
        REFLECT ON THE BATTLE
      </PixelText>

      {/* Q1 */}
      <div style={{ marginBottom: 16 }}>
        <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
          1. Did the consequences you feared actually happen?
        </PixelText>
        {["No, they didn't happen at all", "Some did, but not like I expected", "Yes, they did happen"].map(opt => (
          <button key={opt} onClick={() => {
            setFearedHappened(opt);
            if (opt === "No, they didn't happen at all") {
              setFearedSeverity("");
              setMadeItThrough("");
            }
          }} style={{
            display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
            borderRadius: 4, border: `2px solid ${fearedHappened === opt ? C.teal : C.mutedBorder}`,
            background: fearedHappened === opt ? C.teal + "20" : C.cardBg,
            cursor: "pointer", textAlign: "left",
          }}>
            <PixelText size={7} color={fearedHappened === opt ? C.teal : C.grayLt}>{opt}</PixelText>
          </button>
        ))}
      </div>

      {/* Q2 */}
      {fearedHappened && !skipFollowUp && (
        <div style={{ marginBottom: 16, animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
            2. If it did happen — how bad was it really?
          </PixelText>
          {["It was much less severe than I feared", "It was about what I expected", "It was as bad as I feared"].map(opt => (
            <button key={opt} onClick={() => setFearedSeverity(opt)} style={{
              display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
              borderRadius: 4, border: `2px solid ${fearedSeverity === opt ? C.teal : C.mutedBorder}`,
              background: fearedSeverity === opt ? C.teal + "20" : C.cardBg,
              cursor: "pointer", textAlign: "left",
            }}>
              <PixelText size={7} color={fearedSeverity === opt ? C.teal : C.grayLt}>{opt}</PixelText>
            </button>
          ))}
        </div>
      )}

      {/* Q3 */}
      {fearedSeverity && !skipFollowUp && (
        <div style={{ marginBottom: 16, animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>
            3. Did you get through it?
          </PixelText>
          {["Yes — I made it through, even if it was hard", "I'm still working on it, but I know I can", "Not this time, but I learned something"].map(opt => (
            <button key={opt} onClick={() => setMadeItThrough(opt)} style={{
              display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
              borderRadius: 4, border: `2px solid ${madeItThrough === opt ? C.teal : C.mutedBorder}`,
              background: madeItThrough === opt ? C.teal + "20" : C.cardBg,
              cursor: "pointer", textAlign: "left",
            }}>
              <PixelText size={7} color={madeItThrough === opt ? C.teal : C.grayLt}>{opt}</PixelText>
            </button>
          ))}
        </div>
      )}

      <PixelText size={6} color={C.subtleText} style={{ display: "block", textAlign: "center", opacity: 0.5 }}>
        {done ? "All questions answered" : `${skipFollowUp ? '' : 'Select all options to continue'}`}
      </PixelText>
    </div>
  );
}
