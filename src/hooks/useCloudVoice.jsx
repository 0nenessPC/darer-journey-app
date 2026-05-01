import { useState, useRef, useCallback, useEffect } from 'react';

// Browser SpeechRecognition (webkit prefix for Chrome/Safari)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * useCloudVoice — OpenAI Whisper STT + OpenAI TTS for Dara voice chat.
 *
 * Browser STT/TTS as graceful fallback when cloud APIs fail.
 *
 * Returns:
 *   { isListening, isSpeaking, transcript, interimTranscript,
 *     error, supported, startListening, stopListening, speak, cancelSpeech,
 *     resetTranscript }
 *
 * Usage:
 *   const voice = useCloudVoice({ useCloud: true, language: 'en-US' });
 *   - useCloud=true  → records audio → /api/stt → Whisper transcription
 *   - useCloud=false → falls back to browser SpeechRecognition
 *   - speak()       → always uses /api/tts (cloud-quality TTS), fallback to browser
 */
export function useCloudVoice({ useCloud = true, language = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(!!SpeechRecognition);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioElRef = useRef(null);
  const abortControllerRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── Cloud STT: Record audio → send to /api/stt ──────────────────
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    if (useCloud) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Prefer webm/opus, fall back to what the browser supports
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          setIsListening(false);
          // Stop mic
          streamRef.current?.getTracks().forEach(t => t.stop());
          streamRef.current = null;

          if (audioChunksRef.current.length === 0) return;

          const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
          const mime = mimeType.includes('webm') ? 'audio/webm' : 'audio/ogg';
          const blob = new Blob(audioChunksRef.current, { type: mime });

          setInterimTranscript('Transcribing...');

          try {
            const formData = new FormData();
            formData.append('file', blob, `audio.${ext}`);
            formData.append('language', language.split('-')[0]); // 'en-US' → 'en'

            const response = await fetch('/api/stt', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.error || `STT error ${response.status}`);
            }

            const data = await response.json();
            if (data.text) {
              setTranscript(data.text);
            } else {
              setError('No speech detected.');
            }
          } catch (err) {
            console.error('Cloud STT failed, falling back to browser:', err);
            setError(`STT failed: ${err.message}. Try again or switch to browser voice.`);
          }
          setInterimTranscript('');
        };

        recorder.start();
        setIsListening(true);
      } catch (err) {
        console.error('Mic error:', err);
        setError('Could not access microphone.');
        setIsListening(false);
      }
    } else {
      // Browser SpeechRecognition fallback
      if (!SpeechRecognition) {
        setError('Voice input not supported in this browser. Try Chrome or Safari.');
        setIsListening(false);
        return;
      }
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = language;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let interim = '';
          let final = '';
          for (let i = 0; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += text;
            else interim += text;
          }
          setTranscript(final);
          setInterimTranscript(interim);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event) => {
          setIsListening(false);
          if (event.error === 'no-speech') setError('No speech detected. Try speaking louder.');
          else if (event.error === 'not-allowed') setError('Microphone access denied. Please allow mic permissions.');
          else setError(`Voice error: ${event.error}`);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Browser STT error:', err);
        setError('Could not start voice recognition.');
        setIsListening(false);
      }
    }
  }, [useCloud, language]);

  const stopListening = useCallback(() => {
    // Cloud STT: stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    // Browser STT: stop SpeechRecognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // ── Cloud TTS: Send text to /api/tts → play returned audio ──────
  const speak = useCallback(async (text, options = {}) => {
    if (!text) return;

    // Cancel any current speech
    cancelSpeech();

    if (useCloud) {
      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: options.voice || 'nova', // gentle, confident female voice
            speed: options.speed ?? 0.9,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `TTS error ${response.status}`);
        }

        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);

        const audio = new Audio(url);
        audioElRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioElRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioElRef.current = null;
          setError('Could not play audio.');
        };

        await audio.play();
      } catch (err) {
        if (err.name === 'AbortError') return; // cancelled
        console.error('Cloud TTS failed, falling back to browser:', err);
        // Fallback to browser TTS
        browserSpeak(text, options);
      }
    } else {
      browserSpeak(text, options);
    }
  }, [useCloud]);

  // Browser TTS fallback
  const browserSpeak = useCallback((text, options = {}) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = options.speed ?? 0.9;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    // Pick a gentle female voice for Dara
    const langPrefix = language.split('-')[0];
    const voices = window.speechSynthesis.getVoices();

    // Priority order: known gentle-sounding female voices
    const femaleVoiceNames = ['Google US English Female', 'Samantha', 'Microsoft Zira', 'Google UK English Female', 'Alex', 'Moira', 'Tessa'];
    const preferred = voices.find(
      v => v.lang.startsWith(langPrefix) && femaleVoiceNames.some(name => v.name.includes(name))
    ) || voices.find(
      v => v.lang.startsWith(langPrefix) && /female|zira|samantha|moira|tessa/i.test(v.name)
    ) || voices.find(
      v => v.lang.startsWith(langPrefix)
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
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (recognitionRef.current) recognitionRef.current.stop();
      cancelSpeech();
    };
  }, [cancelSpeech]);

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
  };
}
