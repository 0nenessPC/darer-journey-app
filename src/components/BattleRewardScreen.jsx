import { C } from '../constants/gameData';
import { PixelText, PixelBtn } from './shared';

/**
 * BattleRewardScreen — Dara's cheerleader moment.
 * Shown immediately after battle completion, before the celebration overlay.
 * Three visual variants: victory (green/gold), partial (amber), retreat (rose).
 */

const OUTCOME_CONFIG = {
  victory: {
    icon: '🏆',
    title: 'BOSS DEFEATED!',
    subtitle: (bossName, heroName) => `The Shadow of "${bossName}" falls before you, ${heroName}!`,
    titleColor: C.hpGreen,
    borderColor: C.hpGreen,
    bgTint: C.hpGreen + '10',
    animation: 'victoryFlash 0.8s ease-out',
    btnColor: C.gold,
    btnText: C.charcoal,
    btnLabel: 'SEE MY REWARDS →',
  },
  partial: {
    icon: '⚔️',
    title: 'YOU ENTERED THE ARENA',
    subtitle: () => 'You showed up. That counts.',
    titleColor: C.amber,
    borderColor: C.amber,
    bgTint: C.amber + '10',
    animation: 'screenFadeIn 0.4s ease-out',
    btnColor: C.gold,
    btnText: C.charcoal,
    btnLabel: 'SEE MY REWARDS →',
  },
  retreat: {
    icon: '🛡️',
    title: 'YOU SHOWED UP',
    subtitle: () => 'You learned where the Storm got loudest. That is data.',
    titleColor: C.rose,
    borderColor: C.rose,
    bgTint: C.rose + '10',
    animation: 'retreatFade 0.5s ease-out',
    btnColor: C.rose,
    btnText: C.cream,
    btnLabel: 'CONTINUE →',
  },
};

export default function BattleRewardScreen({
  outcome = 'victory',
  bossName = 'Unknown',
  heroName = 'Hero',
  xpBreakdown = [],
  totalXP = 0,
  coinsEarned = 0,
  sudsDrop = 0,
  evidenceCards = [],
  onDismiss,
}) {
  const cfg = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.victory;
  const firstEvidence = evidenceCards?.[0];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: C.charcoal,
          borderRadius: 12,
          border: `3px solid ${cfg.borderColor}`,
          padding: '28px 20px 24px',
          maxWidth: 400,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: `0 0 50px ${cfg.borderColor}30`,
          animation: cfg.animation,
        }}
      >
        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 56,
              marginBottom: 8,
              animation: 'sparkleBurst 0.6s ease-out',
              display: 'inline-block',
            }}
          >
            {cfg.icon}
          </div>
          <PixelText size={12} color={cfg.titleColor} style={{ display: 'block' }}>
            {cfg.title}
          </PixelText>
          <PixelText
            size={7}
            color={C.subtleText}
            style={{ display: 'block', marginTop: 6, lineHeight: 1.7, fontStyle: 'italic' }}
          >
            {cfg.subtitle(bossName, heroName)}
          </PixelText>
        </div>

        {/* SUDS drop callout */}
        {sudsDrop > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '8px 12px',
              marginBottom: 14,
              borderRadius: 6,
              background: C.hpGreen + '08',
              border: `1px solid ${C.hpGreen}30`,
            }}
          >
            <PixelText size={7} color={C.hpGreen} style={{ display: 'block' }}>
              📉 SUDS DROPPED BY {sudsDrop} POINTS
            </PixelText>
            <PixelText size={6} color={C.subtleText} style={{ display: 'block', marginTop: 2 }}>
              YOUR NERVOUS SYSTEM IS LEARNING
            </PixelText>
          </div>
        )}

        {/* Battle Recap */}
        <div
          style={{
            padding: '14px 16px',
            marginBottom: 14,
            borderRadius: 6,
            background: C.cardBg,
            border: `2px solid ${C.mutedBorder}`,
          }}
        >
          <PixelText size={8} color={C.goldMd} style={{ display: 'block', marginBottom: 10 }}>
            BATTLE RECAP
          </PixelText>

          {xpBreakdown.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                animation: `screenFadeIn 0.3s ease-out ${0.1 * i}s both`,
              }}
            >
              <PixelText size={7} color={C.cream}>
                +{entry.xp} XP
              </PixelText>
              <PixelText size={7} color={C.subtleText}>
                {entry.label}
              </PixelText>
            </div>
          ))}

          {coinsEarned > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10,
                paddingTop: 8,
                borderTop: `1px solid ${C.mutedBorder}`,
              }}
            >
              <PixelText size={8} color={C.goldMd}>
                🪙 +{coinsEarned}
              </PixelText>
              <PixelText size={7} color={C.subtleText}>
                COURAGE COINS
              </PixelText>
            </div>
          )}

          {/* Total */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: `2px solid ${C.goldMd}40`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <PixelText size={10} color={C.goldMd}>
              {totalXP} XP
            </PixelText>
            <PixelText size={7} color={C.subtleText}>
              TOTAL EARNED
            </PixelText>
          </div>
        </div>

        {/* Evidence unlocked */}
        {firstEvidence && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 14,
              borderRadius: 6,
              background: C.teal + '08',
              border: `2px solid ${C.teal}40`,
            }}
          >
            <PixelText size={7} color={C.teal} style={{ display: 'block', marginBottom: 4 }}>
              🛡️ EVIDENCE UNLOCKED
            </PixelText>
            <PixelText
              size={7}
              color={C.cream}
              style={{ display: 'block', fontStyle: 'italic', lineHeight: 1.7 }}
            >
              {firstEvidence.text?.split('\n')[0]}
            </PixelText>
          </div>
        )}

        {/* Continue button */}
        <PixelBtn
          onClick={onDismiss}
          color={cfg.btnColor}
          textColor={cfg.btnText}
          style={{ width: '100%', animation: 'screenFadeIn 0.3s ease-out 0.3s both' }}
        >
          {cfg.btnLabel}
        </PixelBtn>
      </div>
    </div>
  );
}
