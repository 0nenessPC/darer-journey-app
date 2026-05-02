import React from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText } from '../../components/shared';

/**
 * "THE SHADOW LIED" comparison card showing before/after SUDS values.
 */
export default function SUDSComparison({ before, after }) {
  return (
    <div style={{
      background: C.cardBg, border: `2px solid ${C.mutedBorder}`,
      borderRadius: 6, padding: 14, marginBottom: 12,
    }}>
      <PixelText size={8} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>THE SHADOW LIED</PixelText>
      <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <div>
          <PixelText size={7} color={C.subtleText}>BEFORE</PixelText>
          <div style={{ fontSize: 28, margin: "4px 0" }}>
            <PixelText size={20} color={C.bossRed}>{before}</PixelText>
          </div>
          <PixelText size={6} color={C.bossRed}>FEARED</PixelText>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <PixelText size={16} color={C.goldMd}>→</PixelText>
        </div>
        <div>
          <PixelText size={7} color={C.subtleText}>AFTER</PixelText>
          <div style={{ fontSize: 28, margin: "4px 0" }}>
            <PixelText size={20} color={C.hpGreen}>{after}</PixelText>
          </div>
          <PixelText size={6} color={C.hpGreen}>ACTUAL</PixelText>
        </div>
      </div>
      {before > after && (
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <PixelText size={7} color={C.hpGreen}>
            The Storm dropped {before - after} points. That's damage dealt to the Shadow.
          </PixelText>
        </div>
      )}
    </div>
  );
}
