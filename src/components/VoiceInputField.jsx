import React, { useState, useRef, useEffect, useCallback } from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText } from './shared';

// Browser SpeechRecognition (webkit prefix for Chrome/Safari)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * VoiceInputField — a textarea with a 🎤 mic button on the left.
 * Uses browser-native SpeechRecognition for instant real-time transcription.
 * User taps mic → speaks → text streams into box in real-time.
 * User can then edit or type manually before submitting.
 */
export default function VoiceInputField({
  value,
  onChange,
  placeholder = 'Type or tap 🎤 to speak...',
  rows = 3,
  disabled = false,
}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const supported = !!SpeechRecognition;

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      // Stop recognition — final result already applied
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!supported) {
        setError('Voice input not supported in this browser. Try Chrome or Safari.');
        return;
      }
      setError(null);
      finalTranscriptRef.current = '';

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }
        // Update textarea with accumulated text
        const current = finalTranscriptRef.current || value;
        onChange(current + final + interim);
      };

      recognition.onend = () => {
        // Commit final transcript, stop listening state
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          setError('No speech detected. Try speaking louder.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow mic permissions.');
        } else {
          setError(`Voice error: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  }, [isListening, supported, value, onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const isTranscribing = false; // Browser STT is real-time, no transcribing delay
  const statusText = isListening ? '🔴 Listening...' : '';

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {/* Mic button */}
        <button
          onClick={handleMicToggle}
          disabled={disabled || isTranscribing || !supported}
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isListening ? C.plum : C.inputBg,
            border: `2px solid ${isListening ? C.plumLt : C.teal + '60'}`,
            borderRadius: 6,
            cursor: disabled || isTranscribing || !supported ? 'default' : 'pointer',
            fontSize: 16,
            color: C.cream,
            transition: 'all 0.15s ease',
            boxShadow: isListening ? `0 0 8px ${C.plum}80` : 'none',
            animation: isListening ? 'pulse-recording-bar 1.2s ease-in-out infinite' : 'none',
            fontFamily: PIXEL_FONT,
            opacity: disabled || isTranscribing || !supported ? 0.5 : 1,
            marginTop: 0,
          }}
          title={!supported ? 'Voice input not supported in this browser' : isListening ? 'Tap to stop' : 'Tap to start voice input'}
        >
          {isListening ? '⏹' : '🎤'}
        </button>

        {/* Text area */}
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={isListening ? 'Listening...' : placeholder}
          disabled={disabled || isListening || isTranscribing}
          rows={rows}
          style={{
            flex: 1,
            padding: 12,
            background: C.cardBg,
            border: `2px solid ${isListening ? C.plum : C.mutedBorder}`,
            borderRadius: 4,
            color: C.cream,
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            opacity: disabled || isListening || isTranscribing ? 0.6 : 1,
          }}
        />
      </div>

      {/* Status / error */}
      {(statusText || error) && (
        <div style={{ marginTop: 6 }}>
          <PixelText size={6} color={error ? C.red : C.grayLt}>
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
