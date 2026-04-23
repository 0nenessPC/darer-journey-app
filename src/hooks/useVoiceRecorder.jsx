import { useState, useRef, useCallback, useEffect } from 'react';

// ── Feature Detection ──────────────────────────────────────────────
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export const hasSTT = !!SpeechRecognition;
export const hasTTS = 'speechSynthesis' in window;

/**
 * useVoiceRecorder — browser-native voice input + output for Dara.
 *
 * Returns:
 *   { isListening, isSpeaking, transcript, interimTranscript,
 *     error, supported, startListening, stopListening, speak, cancelSpeech }
 */
export function useVoiceRecorder({ language = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(hasSTT && hasTTS);

  const recognitionRef = useRef(null);
  const onResultRef = useRef(null);
  const onErrorRef = useRef(null);

  // ── Speech → Text ───────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech first
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    setTranscript('');
    setInterimTranscript('');
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) setTranscript(prev => prev + final);
      setInterimTranscript(interim);
      onResultRef.current?.({ final, interim });
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // silent, user said nothing
      if (event.error === 'aborted') return; // we stopped it
      setError(`Voice error: ${event.error}`);
      onErrorRef.current?.(event.error);
    };

    // Load voices eagerly so they're ready when speak() is called
    window.speechSynthesis?.getVoices();

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still "listening" flag was set externally
      // (handles browser auto-pause after silence)
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch (e) {
      setError('Could not start microphone.');
      setIsListening(false);
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    // Clear interim on stop
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // ── Text → Speech ────────────────────────────────────────────────
  const speak = useCallback((text, options = {}) => {
    if (!window.speechSynthesis) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = options.rate ?? 0.9; // slightly slower, calming
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    // Try to pick a warm-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = options.voice || voices.find(
      v => v.lang.startsWith(language.split('-')[0]) && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Moira') || v.name.includes('Tessa'))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setError('Could not play audio.');
    };

    window.speechSynthesis.speak(utterance);
  }, [language]);

  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Expose callbacks for external hook users ─────────────────────
  const setOnResult = useCallback((fn) => { onResultRef.current = fn; }, []);
  const setOnError = useCallback((fn) => { onErrorRef.current = fn; }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    supported,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    cancelSpeech,
    setOnResult,
    setOnError,
  };
}
