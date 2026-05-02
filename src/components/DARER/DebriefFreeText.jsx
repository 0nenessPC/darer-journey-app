import React, { useState, useEffect } from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText, PixelBtn, DialogBox } from '../../components/shared';
import { VoiceInputBar } from '../../components/VoiceToggle';

/**
 * Debrief free-text sub-step: Dara speaks the question, user can type or speak their response.
 * Used in both BossBattle and TutorialBattle after reflection questions.
 */
export default function DebriefFreeText({
  engageFreeText, setEngageFreeText, onNext, voice,
}) {
  const [spoke, setSpoke] = useState(false);
  const DEBRIEF_QUESTION = "Before we look at what the numbers tell us — in your own words, what did you learn from this battle?";

  useEffect(() => {
    if (!spoke) {
      voice?.speak?.(DEBRIEF_QUESTION, { speed: 0.9 });
      setSpoke(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVoiceSend = (text) => {
    setEngageFreeText(text);
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease-out" }}>
      <DialogBox speaker="DARA">
        <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
          Before we look at what the{"\n"}numbers tell us — in your own{"\n"}words, what did you learn{"\n"}from this battle?
        </PixelText>
      </DialogBox>

      {voice?.supported ? (
        <VoiceInputBar
          input={engageFreeText}
          onInputChange={setEngageFreeText}
          onSend={handleVoiceSend}
          typing={voice?.isSpeaking}
          disabled={false}
          voice={voice}
          placeholder="Speak your reflection or type below..."
          style={{ marginTop: 14 }}
        />
      ) : null}

      <textarea
        value={engageFreeText}
        onChange={e => setEngageFreeText(e.target.value)}
        placeholder="What surprised you? What will you carry forward?..."
        rows={3}
        style={{
          width: "100%", minHeight: 80, padding: 10, marginTop: voice?.supported ? 8 : 14,
          background: C.cardBg, border: `2px solid ${C.mutedBorder}`,
          borderRadius: 4, color: C.cream, fontSize: 12,
          fontFamily: PIXEL_FONT, outline: "none", resize: "none",
          lineHeight: 1.6, boxSizing: "border-box",
        }}
      />

      <PixelBtn onClick={onNext} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 16 }}>
        SEE WHAT THE SHADOW DID →
      </PixelBtn>
    </div>
  );
}
