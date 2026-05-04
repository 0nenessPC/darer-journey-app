import { useState, useEffect, useRef } from 'react';
import { C } from '../constants/gameData';
import { PixelText, PixelBtn, DialogBox } from '../components/shared.jsx';
import { parseShadowSection } from '../utils/parseShadow.js';
import { useCloudVoice } from '../hooks/useCloudVoice';

function ShadowReveal({ heroName, shadowText, onContinue }) {
  const [revealed, setRevealed] = useState(0);
  const voice = useCloudVoice({ useCloud: false });
  const speechStartedRef = useRef(false);

  const where = parseShadowSection('WHERE IT APPEARS', shadowText);
  const whisper = parseShadowSection('WHAT IT WHISPERS', shadowText);
  const grip = parseShadowSection('HOW IT KEEPS ITS GRIP', shadowText);

  // Chain-read all three sections sequentially using the voice hook's browserSpeak
  // speechStartedRef prevents double-firing in React Strict Mode (dev)
  useEffect(() => {
    if (speechStartedRef.current) return;
    speechStartedRef.current = true;

    let cancelled = false;

    // Use window.speechSynthesis directly for chaining (hook.speak cancels first)
    const speakChain = (texts, idx = 0) => {
      if (idx >= texts.length || cancelled || !window.speechSynthesis) return;
      const text = texts[idx];
      if (!text) {
        speakChain(texts, idx + 1);
        return;
      }

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.9;
      // Use the same voice selection as the hook
      const voices = window.speechSynthesis.getVoices();
      const femaleVoiceNames = [
        'Google US English Female',
        'Samantha',
        'Microsoft Zira',
        'Google UK English Female',
        'Alex',
        'Moira',
        'Tessa',
      ];
      const preferred =
        voices.find(
          (v) => v.lang.startsWith('en') && femaleVoiceNames.some((n) => v.name.includes(n)),
        ) ||
        voices.find(
          (v) => v.lang.startsWith('en') && /female|zira|samantha|moira|tessa/i.test(v.name),
        ) ||
        voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utt.voice = preferred;

      utt.onend = () => speakChain(texts, idx + 1);
      utt.onerror = () => speakChain(texts, idx + 1);
      window.speechSynthesis.speak(utt);
    };

    speakChain([where, whisper, grip]);

    return () => {
      cancelled = true;
      voice.cancelSpeech();
    };
  }, [voice]);

  // Reveal cards on staggered timers (visual only, independent of speech)
  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(1), 600);
    const t2 = setTimeout(() => setRevealed(2), 1800);
    const t3 = setTimeout(() => setRevealed(3), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const sections = [
    {
      icon: '📍',
      title: "THE SHADOW'S TERRITORY",
      text: where,
      color: C.bossRed,
      border: C.bossRed,
    },
    { icon: '🌀', title: 'THE INNER STORM', text: whisper, color: C.amber, border: C.amber },
    { icon: '🏃', title: 'THE ESCAPE', text: grip, color: C.plumMd, border: C.plumMd },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.mapBg,
        padding: '20px 20px 32px',
        overflowY: 'auto',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeIn 0.6s ease-out' }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.8 }}>👁</div>
        <PixelText size={12} color={C.bossRed} style={{ display: 'block', marginBottom: 6 }}>
          THE SHADOW&apos;S TRUE NATURE
        </PixelText>
        <PixelText size={7} color={C.subtleText} style={{ display: 'block' }}>
          {heroName}, for the first time, you see your enemy clearly.
        </PixelText>
      </div>

      {/* Reveal cards */}
      {sections.map((s, i) => (
        <div
          key={s.title}
          style={{
            marginBottom: 12,
            padding: C.padLg,
            background: C.cardBg,
            border: `2px solid ${revealed > i ? s.border + '80' : C.mutedBorder}`,
            borderRadius: 6,
            opacity: revealed > i ? 1 : 0.2,
            transform: revealed > i ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.6s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <PixelText size={9} color={s.color}>
              {s.title}
            </PixelText>
          </div>
          <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
            {s.text || '...'}
          </PixelText>
        </div>
      ))}

      {/* Personalized Infinite Trap */}
      {revealed >= 3 && (
        <div style={{ animation: 'fadeIn 0.8s ease-out', marginTop: 16, marginBottom: 8 }}>
          <PixelText
            size={10}
            color={C.goldMd}
            style={{ display: 'block', textAlign: 'center', marginBottom: 12 }}
          >
            YOUR SHADOW&apos;S INFINITE TRAP
          </PixelText>

          {/* Vertical cycle with user's own data */}
          <div style={{ position: 'relative', padding: '0 12px' }}>
            {[
              {
                label: 'YOU ENTER',
                detail: where
                  ? where.length > 60
                    ? where.slice(0, 60) + '...'
                    : where
                  : 'Social situations',
                icon: '📍',
                color: C.bossRed,
              },
              {
                label: 'THE STORM HITS',
                detail: whisper
                  ? whisper.length > 60
                    ? whisper.slice(0, 60) + '...'
                    : whisper
                  : 'Anxious thoughts and body sensations',
                icon: '🌀',
                color: C.amber,
              },
              {
                label: 'F.E.A.R.',
                detail: 'The storm becomes overwhelming. Your body and mind scream: GET OUT.',
                icon: '😨',
                color: C.fearRed,
                isFear: true,
              },
              {
                label: 'YOU ESCAPE',
                detail: grip
                  ? grip.length > 60
                    ? grip.slice(0, 60) + '...'
                    : grip
                  : 'Avoidance and safety behaviors',
                icon: '🏃',
                color: C.plumMd,
              },
              {
                label: 'BRIEF RELIEF',
                detail: 'The fear fades — but only for now',
                icon: '😮‍💨',
                color: C.hpGreen,
              },
              {
                label: 'SHADOW GROWS',
                detail: "Next time it's harder. The territory expands. The storm gets stronger.",
                icon: '👤',
                color: C.subtleText,
              },
            ].map((node, i, arr) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  animation: `fadeIn 0.4s ease-out ${0.3 + i * 0.2}s both`,
                }}
              >
                {/* Left: icon + connector */}
                <div
                  style={{
                    width: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: node.isFear ? 36 : 28,
                      height: node.isFear ? 36 : 28,
                      borderRadius: '50%',
                      background: node.isFear ? `${C.fearGlow}30` : node.color + '20',
                      border: `${node.isFear ? 3 : 2}px solid ${node.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: node.isFear ? 18 : 14,
                      boxShadow: node.isFear ? `0 0 16px ${C.fearRed}40` : 'none',
                      animation: node.isFear ? 'fearPulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {node.icon}
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 12,
                        background: C.mutedBorder,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: -3,
                          fontSize: 8,
                          color: C.mutedBorder,
                        }}
                      >
                        ▼
                      </div>
                    </div>
                  )}
                </div>
                {/* Right: text */}
                <div
                  style={{
                    flex: 1,
                    padding: node.isFear ? '8px 12px 12px 10px' : '4px 0 12px 10px',
                    background: node.isFear ? `${C.fearGlow}10` : 'transparent',
                    border: node.isFear ? `1px solid ${C.fearRed}30` : 'none',
                    borderRadius: node.isFear ? 6 : 0,
                    marginLeft: node.isFear ? 4 : 0,
                  }}
                >
                  <PixelText size={node.isFear ? 10 : 7} color={node.color}>
                    {node.label}
                  </PixelText>
                  <div style={{ marginTop: 2 }}>
                    <PixelText
                      size={node.isFear ? 7 : 6}
                      color={C.cream}
                      style={{ lineHeight: 1.5 }}
                    >
                      {node.detail}
                    </PixelText>
                  </div>
                  {node.isFear && (
                    <div style={{ marginTop: 6 }}>
                      <PixelText size={6} color={`${C.fearGlow}`} style={{ fontStyle: 'italic' }}>
                        This is the moment that drives the escape.
                      </PixelText>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Loop-back arrow */}
            <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
              <PixelText size={7} color={C.bossRed}>
                ↻ AND THE CYCLE REPEATS
              </PixelText>
            </div>
          </div>
        </div>
      )}

      {/* Dara's closing message */}
      {revealed >= 3 && (
        <div style={{ animation: 'fadeIn 0.6s ease-out 0.3s both' }}>
          <div style={{ marginTop: 12 }}>
            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
                This is YOUR Shadow&apos;s trap —{'\n'}built from your specific fears,{'\n'}your specific
                thoughts, and{'\n'}your specific escapes.{'\n'}
                {'\n'}
                But now you can see it. And{'\n'}a trap you can see is a trap{'\n'}you can break.
                {'\n'}
                {'\n'}
                Remember this moment, {heroName}.{'\n'}This is where your journey truly{'\n'}begins.
              </PixelText>
            </DialogBox>
          </div>

          <PixelBtn
            onClick={onContinue}
            color={C.gold}
            textColor={C.charcoal}
            style={{ width: '100%', marginTop: 12 }}
          >
            THE JOURNEY CONTINUES →
          </PixelBtn>
        </div>
      )}
    </div>
  );
}

export default ShadowReveal;
