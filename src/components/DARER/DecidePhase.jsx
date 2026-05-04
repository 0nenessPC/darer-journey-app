import React from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText, PixelBtn, DialogBox } from '../../components/shared';

/**
 * Shared DECIDE phase — value pick buttons + custom text input + optional voice.
 * Used by both BossBattle (with voice) and TutorialBattle (without).
 */
export default function DecidePhase({
  label, // { icon, title, subtitle, color }
  entityName, // boss.name or chosenExposure.text
  values, // array of { id, text/word, icon }
  selectedVals, // string[]
  setSelectedVals, // (fn) => void
  customText,
  setCustomText,
  onNext, // receives combined whyParts string
  showVoiceInput, // boolean
  voice, // cloud voice hook (only used if showVoiceInput)
  nextLabel, // button text, default "I DECIDE → NEXT: ALLOW"
}) {
  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{label.icon}</span>
        <div>
          <PixelText size={10} color={label.color} style={{ display: 'block' }}>
            {label.title}
          </PixelText>
          <PixelText size={6} color={C.subtleText}>
            {label.subtitle}
          </PixelText>
        </div>
      </div>

      <DialogBox speaker="DARA">
        <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
          Your battle: "{entityName}"{'\n'}
          {'\n'}
          Why are you choosing to{'\n'}face this fear? Pick your "why" —{'\n'}it's your anchor when
          the{'\n'}Shadow strikes.
        </PixelText>
      </DialogBox>

      {/* Value pick buttons — multi-select */}
      <div style={{ marginTop: 14 }}>
        {values.length === 0 ? (
          <div
            style={{
              padding: '12px 14px',
              background: C.cardBg,
              border: `2px solid ${C.mutedBorder}`,
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            <PixelText size={7} color={C.subtleText}>
              No values identified yet.{'\n'}Type your own "why" below.
            </PixelText>
          </div>
        ) : (
          values.slice(0, 5).map((v) => {
            const valText = v.text || v.word || '';
            const valIcon = v.icon || '💫';
            const picked = selectedVals.includes(valText);
            return (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVals((prev) =>
                    picked ? prev.filter((x) => x !== valText) : [...prev, valText],
                  );
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  marginBottom: 6,
                  padding: '10px 14px',
                  borderRadius: 4,
                  border: `2px solid ${picked ? C.goalGold : C.mutedBorder}`,
                  background: picked ? C.goalGold + '15' : C.cardBg,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 18 }}>{valIcon}</span>
                <PixelText size={7} color={picked ? C.goalGold : C.grayLt}>
                  {valText}
                </PixelText>
              </button>
            );
          })
        )}
      </div>

      {/* Custom why input */}
      <div style={{ marginTop: 10 }}>
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Or type your own reason..."
          style={{
            width: '100%',
            padding: 10,
            background: C.cardBg,
            border: `2px solid ${C.mutedBorder}`,
            borderRadius: 4,
            color: C.cream,
            fontSize: 12,
            fontFamily: PIXEL_FONT,
            outline: 'none',
            boxSizing: 'border-box',
            WebkitUserSelect: 'text',
            userSelect: 'text',
            touchAction: 'auto',
          }}
        />
        {showVoiceInput && voice?.supported && (
          <button
            onClick={() => {
              if (voice.isListening) {
                voice.stopListening();
              } else {
                voice.startListening();
              }
            }}
            style={{
              alignSelf: 'flex-end',
              padding: '6px 12px',
              marginTop: 6,
              background: voice.isListening ? C.plum : C.cardBg,
              border: `2px solid ${voice.isListening ? C.plumLt : C.teal + '60'}`,
              borderRadius: 4,
              cursor: 'pointer',
              color: voice.isListening ? C.cream : C.grayLt,
              fontSize: 9,
              fontFamily: PIXEL_FONT,
              boxShadow: voice.isListening ? `0 0 8px ${C.plum}80` : 'none',
            }}
          >
            {voice.isListening ? '⏹ STOP' : '🎤 SPEAK'}
          </button>
        )}
      </div>

      <PixelBtn
        onClick={() => {
          const whyParts = [...selectedVals];
          if (customText.trim()) whyParts.push(customText.trim());
          onNext(whyParts.join('; '));
        }}
        disabled={selectedVals.length === 0 && !customText.trim()}
        color={C.gold}
        textColor={C.charcoal}
        style={{ width: '100%', marginTop: 16 }}
      >
        {nextLabel || 'I DECIDE → NEXT: ALLOW'}
      </PixelBtn>
    </div>
  );
}
