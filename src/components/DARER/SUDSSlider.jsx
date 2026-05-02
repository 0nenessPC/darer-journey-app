import React from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText } from '../../components/shared';

/**
 * SUDS (Subjective Units of Distress) range slider with dynamic color and subtitle.
 * Used in both RISE (before) and ENGAGE (after) phases.
 */
export default function SUDSSlider({ value, onChange, label = "STORM INTENSITY", subtitle, minLabel = "Calm", maxLabel = "Intense", ariaLabel }) {
  const color = value <= 33 ? C.hpGreen : value <= 66 ? C.amber : C.bossRed;
  return (
    <div>
      {subtitle && (
        <PixelText size={6} color={C.subtleText} style={{ display: "block", marginBottom: 6, fontStyle: "italic" }}>{subtitle}</PixelText>
      )}
      <input
        type="range" min="0" max="100" value={value}
        onChange={e => onChange(+e.target.value)}
        aria-label={ariaLabel || label}
        style={{ width: "100%", accentColor: color }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <PixelText size={6} color={C.subtleText}>{minLabel}</PixelText>
        <PixelText size={8} color={color}>{value}</PixelText>
        <PixelText size={6} color={C.subtleText}>{maxLabel}</PixelText>
      </div>
    </div>
  );
}
