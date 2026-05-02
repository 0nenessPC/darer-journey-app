import React from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText, DialogBox } from '../../components/shared';

/**
 * Psychoeducation card explaining why repeat exposures matter in ERP.
 * Used in both BossBattle (interactive repeat) and TutorialBattle (read-only preview).
 */
export default function RepeatPsychoEdu({ variant = "boss" }) {
  const isBoss = variant === "boss";

  return (
    <div>
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
          {isBoss ? (
            <>You crushed it. Now let's build on{"\n"}that momentum. Here are some{"\n"}ways to repeat this battle —{"\n"}some a little harder, one{"\n"}that's outside the box.</>
          ) : (
            <>On your real journey, after every{"\n"}battle you'll get personalized{"\n"}suggestions for how to repeat —{"\n"}slightly harder if you crushed it,{"\n"}a bit gentler if the Storm was{"\n"}too strong today.{"\n"}{"\n"}
            Here's a taste of what that{"\n"}might look like for you:</>
          )}
        </PixelText>
      </DialogBox>
    </div>
  );
}
