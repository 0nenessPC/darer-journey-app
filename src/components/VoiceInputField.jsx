import React, { useState, useRef } from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText } from './shared';
import { useCloudVoice } from '../hooks/useCloudVoice';

/**
 * VoiceInputField — a textarea with a 🎤 mic button on the left.
 * User taps mic → records → Whisper transcribes → text appears in box.
 * User can then edit or type manually before submitting.
 */
export default function VoiceInputField({
  value,
  onChange,
  placeholder = 'Type or tap 🎤 to speak...',
  rows = 3,
  disabled = false,
}) {
  const [error, setError] = useState(null);
  const expectingTranscript = useRef(false);
  const voice = useCloudVoice({ useCloud: true });

  const handleMicToggle = async () => {
    if (voice.isListening) {
      // Stop recording — transcription will fire via onstop → sets transcript
      expectingTranscript.current = true;
      voice.stopListening();
    } else {
      setError(null);
      expectingTranscript.current = true;
      await voice.startListening();
    }
  };

  // When transcript arrives after we stopped recording, fill the text box
  React.useEffect(() => {
    if (voice.transcript && !voice.isListening && expectingTranscript.current) {
      onChange(voice.transcript);
      voice.resetTranscript?.();
      expectingTranscript.current = false;
    }
  }, [voice.transcript, voice.isListening]);

  // Watch for errors
  React.useEffect(() => {
    if (voice.error) {
      setError(voice.error);
      expectingTranscript.current = false;
    }
  }, [voice.error]);

  const isRecording = voice.isListening;
  const isTranscribing = expectingTranscript.current && !voice.isListening && !voice.transcript;
  const statusText = isRecording ? '🔴 Recording...' : isTranscribing ? '⏳ Transcribing...' : '';

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {/* Mic button */}
        <button
          onClick={handleMicToggle}
          disabled={disabled || isTranscribing}
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isRecording ? C.plum : '#222',
            border: `2px solid ${isRecording ? C.plumLt : C.teal + '60'}`,
            borderRadius: 6,
            cursor: disabled || isTranscribing ? 'default' : 'pointer',
            fontSize: 16,
            color: C.cream,
            transition: 'all 0.15s ease',
            boxShadow: isRecording ? `0 0 8px ${C.plum}80` : 'none',
            animation: isRecording ? 'pulse-recording-bar 1.2s ease-in-out infinite' : 'none',
            fontFamily: PIXEL_FONT,
            opacity: disabled || isTranscribing ? 0.5 : 1,
            marginTop: 0,
          }}
          title={isRecording ? 'Tap to stop recording' : 'Tap to start voice input'}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>

        {/* Text area */}
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={isRecording ? 'Listening...' : isTranscribing ? 'Transcribing...' : placeholder}
          disabled={disabled || isRecording || isTranscribing}
          rows={rows}
          style={{
            flex: 1,
            padding: 12,
            background: '#1A1218',
            border: `2px solid ${isRecording ? C.plum : '#5C3A50'}`,
            borderRadius: 4,
            color: C.cream,
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            opacity: disabled || isRecording || isTranscribing ? 0.6 : 1,
          }}
        />
      </div>

      {/* Status / error */}
      {(statusText || error) && (
        <div style={{ marginTop: 6 }}>
          <PixelText size={6} color={error ? '#e74c3c' : C.grayLt}>
            {error || statusText}
          </PixelText>
        </div>
      )}

      <style>{`
        @keyframes pulse-recording-bar {
          0%, 100% { box-shadow: 0 0 4px ${C.plum}40; }
          50% { box-shadow: 0 0 14px ${C.plum}A0; }
        }
      `}</style>
    </div>
  );
}
