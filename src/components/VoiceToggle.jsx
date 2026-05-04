import { useState, useEffect } from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';

/**
 * VoiceToggle — a pixel-styled 🎤 mic button + 🔊 speaker button for Dara voice chat.
 *
 * Props:
 *   onSend      — callback(finalTranscript) when user finishes speaking
 *   onSpeak     — callback(text) when user taps speaker icon to hear a message
 *   isActive    — whether the mic button should show as "recording"
 *   onToggleMic — callback() to start/stop recording
 *   isSpeaking  — whether TTS is currently playing
 *   onStopSpeak — callback() to cancel TTS playback
 *   supported   — boolean, false hides the entire component
 *   style       — optional container style overrides
 *   size        — 'sm' (32px) or 'md' (40px, default)
 */
export default function VoiceToggle({
  onSend: _onSend,
  onSpeak,
  isActive = false,
  onToggleMic,
  isSpeaking = false,
  onStopSpeak,
  supported = true,
  style = {},
  size = 'md',
  transcript: _transcript = '',
}) {
  const [_showInterim, _setShowInterim] = useState(false);

  if (!supported) return null;

  const btnSize = size === 'sm' ? 32 : 40;
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...style }}>
      {/* Mic button */}
      <button
        onClick={onToggleMic}
        aria-pressed={isActive}
        aria-label={isActive ? 'Stop recording' : 'Start voice input'}
        style={{
          width: btnSize,
          height: btnSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? C.plum : 'C.inputBg',
          border: `2px solid ${isActive ? C.plumLt : C.teal + '60'}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: iconSize,
          color: C.cream,
          transition: 'all 0.15s ease',
          boxShadow: isActive ? `0 0 8px ${C.plum}80` : 'none',
          animation: isActive ? 'pulse-recording 1.2s ease-in-out infinite' : 'none',
          fontFamily: PIXEL_FONT,
        }}
        title={isActive ? 'Tap to stop recording' : 'Tap to start voice input'}
      >
        {isActive ? '⏹' : '🎤'}
      </button>

      {/* Speaker button (only shown when there's text to speak) */}
      {onSpeak && (
        <button
          onClick={isSpeaking ? onStopSpeak : () => onSpeak()}
          aria-pressed={isSpeaking}
          aria-label={isSpeaking ? 'Stop speaking' : 'Speak aloud'}
          style={{
            width: btnSize,
            height: btnSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isSpeaking ? C.teal + '30' : 'C.inputBg',
            border: `2px solid ${isSpeaking ? C.teal : C.gray + '60'}`,
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: iconSize,
            color: isSpeaking ? C.teal : C.grayLt,
            transition: 'all 0.15s ease',
            fontFamily: PIXEL_FONT,
          }}
          title={isSpeaking ? 'Tap to stop' : 'Tap to hear Dara'}
        >
          {isSpeaking ? '⏸' : '🔊'}
        </button>
      )}

      {/* Inline CSS for pulse animation */}
      <style>{`
        @keyframes pulse-recording {
          0%, 100% { box-shadow: 0 0 4px ${C.plum}40; }
          50% { box-shadow: 0 0 14px ${C.plum}A0; }
        }
      `}</style>
    </div>
  );
}

/**
 * VoiceInputBar — a full-width input replacement combining
 * a text field + mic button + send button for voice-first chats.
 *
 * Props:
 *   input, onInputChange, onSend, typing, disabled
 *   voice: { isListening, startListening, stopListening, transcript, supported }
 *   placeholder
 */
export function VoiceInputBar({
  input,
  onInputChange,
  onSend,
  typing = false,
  disabled = false,
  voice,
  placeholder = 'Type or tap 🎤 to speak...',
}) {
  const { isListening, startListening, stopListening, transcript, supported } = voice || {};

  // When transcript becomes non-empty, auto-send it
  useEffect(() => {
    if (transcript && !isListening) {
      onSend(transcript);
      // Reset transcript after sending
      voice?.resetTranscript?.();
    }
  }, [transcript, isListening]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: `2px solid ${C.teal}40`,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {/* Voice toggle */}
      {supported && (
        <button
          onClick={handleMicToggle}
          aria-pressed={isListening}
          aria-label={isListening ? 'Stop recording' : 'Start voice input'}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isListening ? C.plum : 'C.inputBg',
            border: `2px solid ${isListening ? C.plumLt : C.teal + '60'}`,
            borderRadius: 6,
            cursor: typing || disabled ? 'default' : 'pointer',
            fontSize: 18,
            color: C.cream,
            transition: 'all 0.15s ease',
            boxShadow: isListening ? `0 0 8px ${C.plum}80` : 'none',
            animation: isListening ? 'pulse-recording-bar 1.2s ease-in-out infinite' : 'none',
            fontFamily: PIXEL_FONT,
            opacity: typing || disabled ? 0.5 : 1,
            flexShrink: 0,
          }}
          title={isListening ? 'Tap to stop recording' : 'Tap to start voice input'}
          disabled={typing || disabled}
        >
          {isListening ? '⏹' : '🎤'}
        </button>
      )}

      {/* Text input */}
      <input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim()) {
            onSend(input.trim());
          }
        }}
        placeholder={isListening ? 'Listening...' : placeholder}
        disabled={typing || disabled || isListening}
        style={{
          flex: 1,
          padding: '10px 12px',
          background: C.inputBg,
          border: `2px solid ${isListening ? C.plum : C.teal + '60'}`,
          borderRadius: 6,
          color: C.cream,
          fontSize: 12,
          fontFamily: 'inherit',
          outline: 'none',
          opacity: typing || disabled ? 0.5 : 1,
        }}
      />

      {/* Send button */}
      <button
        onClick={() => {
          if (input.trim()) onSend(input.trim());
        }}
        disabled={typing || !input.trim() || disabled}
        style={{
          padding: '10px 16px',
          background: input.trim() && !typing ? C.teal : C.gray,
          border: `2px solid ${input.trim() && !typing ? C.teal : C.gray}`,
          borderRadius: 6,
          cursor: input.trim() && !typing ? 'pointer' : 'default',
          color: C.cream,
          fontSize: 14,
          fontFamily: PIXEL_FONT,
        }}
      >
        →
      </button>

      <style>{`
        @keyframes pulse-recording-bar {
          0%, 100% { box-shadow: 0 0 4px ${C.plum}40; }
          50% { box-shadow: 0 0 14px ${C.plum}A0; }
        }
      `}</style>
    </div>
  );
}

/**
 * VoiceMessageBubble — a chat bubble with a small 🎤 badge for voice-originated messages.
 *
 * Wraps any child content and adds a subtle indicator.
 */
export function VoiceMessageBubble({ children, isFromVoice, style = {}, ...rest }) {
  return (
    <div style={{ position: 'relative', ...style }} {...rest}>
      {children}
      {isFromVoice && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 4,
            fontSize: 8,
            opacity: 0.6,
          }}
        >
          🎤
        </span>
      )}
    </div>
  );
}
