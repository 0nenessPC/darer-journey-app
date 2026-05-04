import { useState, useEffect, useRef } from 'react';
import { C } from '../constants/gameData';
import { PixelText, DialogBox } from './shared';
import { DaraAvatar } from '../assets/DaraAvatar';

/**
 * DaraDialog — JRPG-style dialog with Dara's avatar on the left side
 * inside the bubble. Wraps the plain DialogBox.
 *
 * Props: identical to DialogBox + optional hero + interactionKey.
 *   interactionKey — string that identifies the current "interaction"
 *     (e.g. screen name + phase). When it changes, the hide-toggle resets.
 *   hero             — hero state object (reads activeAvatar, hideDaraAvatar)
 */
export default function DaraDialog({ speaker, text, typing, children, hero, interactionKey }) {
  const isDara = speaker === 'DARA';
  const [hidden, setHidden] = useState(hero?.hideDaraAvatar || false);
  const prevKey = useRef(interactionKey);

  // Reset hidden state when interaction changes (new screen/phase)
  useEffect(() => {
    if (interactionKey !== prevKey.current) {
      setHidden(hero?.hideDaraAvatar || false);
      prevKey.current = interactionKey;
    }
  }, [interactionKey, hero?.hideDaraAvatar]);

  // Not Dara — render plain DialogBox
  if (!isDara) {
    return (
      <DialogBox speaker={speaker} text={text} typing={children}>
        {children}
      </DialogBox>
    );
  }

  const avatarId = hero?.activeAvatar || 'dara_default';

  return (
    <div
      role="region"
      aria-label="Message from Dara"
      style={{
        position: 'relative',
        background: C.cardBg,
        border: `3px solid ${C.mutedBorder}`,
        borderRadius: 6,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Hide toggle button — top-right corner */}
      {!hidden && (
        <button
          onClick={() => setHidden(true)}
          title="Hide Dara's avatar for this interaction"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 10,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            opacity: 0.4,
            transition: 'opacity 0.2s',
            padding: 2,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.target.style.opacity = '0.4')}
        >
          ✕
        </button>
      )}

      {/* Avatar on the left side — JRPG layout */}
      {!hidden && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            top: 0,
            width: 72,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        >
          <DaraAvatar size={64} variant={avatarId} glow />
        </div>
      )}

      {/* Content area — left padding for avatar */}
      <div
        style={{
          paddingLeft: hidden ? 14 : 76,
          paddingRight: 14,
          paddingTop: 12,
          paddingBottom: 12,
        }}
      >
        {speaker && (
          <div style={{ marginBottom: 4 }}>
            <PixelText size={7} color={C.goldMd}>
              {speaker}
              {!hidden && (
                <PixelText size={6} color={C.subtleText} style={{ marginLeft: 4 }}>
                  ({getAvatarName(hero?.activeAvatar)})
                </PixelText>
              )}
            </PixelText>
          </div>
        )}
        {text && (
          <PixelText
            size={8}
            color={C.cream}
            style={{ display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
          >
            {text}
          </PixelText>
        )}
        {typing && (
          <div style={{ display: 'inline-flex', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: C.plumMd,
                  animation: `bop 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
            <style>{`@keyframes bop { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function getAvatarName(id) {
  const names = {
    dara_default: 'The Guide',
    dara_sage: 'The Sage',
    dara_ember: 'The Ember',
    dara_storm: 'The Storm',
    dara_phantom: 'The Phantom',
  };
  return names[id] || 'The Guide';
}
