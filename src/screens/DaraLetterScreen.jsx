import React from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
import { getDaraTone } from '../constants/daraLetters';

export default function DaraLetterScreen({ letter, date, onBack, hero }) {
  const tone = getDaraTone(hero?.playerLevel || 1);

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '16px 16px 100px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <PixelText size={8} color={C.grayLt}>← BACK</PixelText>
      </button>

      {/* Letter header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 60, height: 60, margin: '0 auto 12px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.plum}, ${C.goldMd})`,
          border: `3px solid ${C.goldMd}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          ✉
        </div>
        <PixelText size={10} color={C.goldMd}>A LETTER FROM DARA</PixelText>
        {date && (
          <PixelText size={7} color={C.grayLt} style={{ display: 'block', marginTop: 4 }}>
            {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </PixelText>
        )}
        <div style={{ marginTop: 4 }}>
          <PixelText size={6} color={tone.stage === 'guide' ? C.teal : tone.stage === 'partner' ? C.plumMd : tone.stage === 'mentor' ? C.goldMd : C.goalGold}>
            {tone.label}
          </PixelText>
        </div>
      </div>

      {/* Letter body */}
      <div style={{
        padding: C.padXl,
        background: C.cardBg,
        border: `2px solid ${C.goalGold}30`,
        borderRadius: 8,
        marginBottom: 20,
      }}>
        {letter.split('\n').map((line, i) => (
          <PixelText
            key={i}
            size={8}
            color={C.cream}
            style={{
              display: 'block',
              lineHeight: 2,
              marginBottom: line === '' ? 12 : 0,
            }}
          >
            {line}
          </PixelText>
        ))}
      </div>

      <PixelBtn onClick={onBack} color={C.gold} textColor={C.charcoal}>
        CONTINUE →
      </PixelBtn>
    </div>
  );
}
