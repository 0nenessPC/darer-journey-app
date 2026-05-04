import React, { useState, useEffect, useRef } from 'react';
import { C } from '../constants/gameData';
import { PixelText, PixelBtn } from './shared';

/**
 * CelebrationOverlay — post-battle positive reinforcement overlay.
 * Shows XP earned, coins, loot drops, achievement unlocks, and level-up
 * as sequential animated cards before letting the user dismiss.
 */

// Rarity colors for loot drops
const RARITY_COLORS = {
  common: C.grayLt,
  uncommon: C.teal,
  rare: C.goldMd,
  legendary: C.fearRed,
};

const OUTCOME_CONFIG = {
  victory: {
    label: 'BOSS DEFEATED!',
    color: C.hpGreen,
    bgTint: C.hpGreen + '30',
    cheer: (heroName, bossName) =>
      `You did it, ${heroName}! The Shadow of "${bossName}" falls before you. Your courage is real.`,
  },
  partial: {
    label: 'YOU SHOWED UP',
    color: C.amber,
    bgTint: C.amber + '30',
    cheer: (heroName) =>
      `That took everything you had, ${heroName}. And you showed up anyway. That counts.`,
  },
  retreat: {
    label: 'YOU STOOD YOUR GROUND',
    color: C.rose,
    bgTint: C.rose + '30',
    cheer: (heroName) =>
      `You're still here, ${heroName}. The Storm was loud today, but you learned. Come back when you're ready.`,
  },
};

// Confetti particles for victory
const CONFETTI_COLORS = [C.hpGreen, C.goldMd, C.teal, C.cream, C.plum];
function ConfettiParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 1.5,
    size: 4 + Math.random() * 8,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 10001,
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 2,
            animation: `confettiDrop ${p.duration}s ease-in ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}

function VictoryBurst({ outcome = 'victory', onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const cfg = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.victory;

  return (
    <>
      {outcome === 'victory' && <ConfettiParticles />}
      <div
        style={{
          textAlign: 'center',
          animation: 'screenShake 0.5s ease-out, burstFlash 0.8s ease-out',
        }}
      >
        <div
          style={{
            fontSize: 64,
            marginBottom: 12,
            animation: 'sparkleBurst 0.6s ease-out',
            display: 'inline-block',
          }}
        >
          {outcome === 'victory' ? '⚔️' : outcome === 'partial' ? '🛡️' : '💪'}
        </div>
        <PixelText size={16} color={cfg.color} style={{ display: 'block' }}>
          {cfg.label}
        </PixelText>
        <div
          style={{
            marginTop: 16,
            width: 60,
            height: 3,
            borderRadius: 2,
            background: cfg.color,
            margin: '16px auto 0',
            animation: 'screenFadeIn 0.8s ease-out 0.6s both',
          }}
        />
      </div>
    </>
  );
}

function DaraCheer({ outcome = 'victory', heroName = 'Hero', bossName = 'the Shadow', onDone }) {
  const spokenRef = useRef(false);

  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;

    const cfg = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.victory;
    const msg = cfg.cheer(heroName, bossName);

    // Browser TTS — instant, no server round-trip
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(msg);
      utter.rate = 0.9;
      utter.pitch = 1.1;
      utter.volume = 0.85;
      utter.onend = onDone;
      utter.onerror = () => setTimeout(onDone, 2500);
      speechSynthesis.speak(utter);
      // Fallback timeout: if speech never fires, dismiss after 3s
      return () => {};
    }
    // No TTS available — dismiss after 2.5s
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [outcome, heroName, bossName, onDone]);

  const cfg = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.victory;
  const cheerText = cfg.cheer(heroName, bossName);

  return (
    <div style={{ textAlign: 'center', animation: 'cheerPopIn 0.5s ease-out' }}>
      <div
        style={{
          fontSize: 36,
          marginBottom: 8,
        }}
      >
        💬
      </div>
      <PixelText size={7} color={C.plumMd} style={{ display: 'block', marginBottom: 8 }}>
        DARA
      </PixelText>
      <div
        style={{
          padding: '14px 16px',
          background: C.cardBg,
          border: `2px solid ${cfg.color}60`,
          borderRadius: 8,
          maxWidth: 320,
          margin: '0 auto',
        }}
      >
        <PixelText size={7} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
          {cheerText}
        </PixelText>
      </div>
      <PixelText size={6} color={C.subtleText} style={{ display: 'block', marginTop: 8 }}>
        Tap anywhere to continue →
      </PixelText>
    </div>
  );
}

function CoinAnimation({ amount, onDone }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (amount === 0) {
      onDone();
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplay(i);
      if (i >= amount) {
        clearInterval(interval);
        setTimeout(onDone, 400);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [amount, onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🪙</div>
      <PixelText size={14} color={C.goldMd} style={{ display: 'block' }}>
        +{display} COINS
      </PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>
        COURAGE COINS EARNED
      </PixelText>
    </div>
  );
}

function DiamondAnimation({ amount, onDone }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (amount === 0) {
      onDone();
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplay(i);
      if (i >= amount) {
        clearInterval(interval);
        setTimeout(onDone, 400);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [amount, onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12, filter: 'drop-shadow(0 0 8px #60A5FA)' }}>
        💎
      </div>
      <PixelText size={14} color="#60A5FA" style={{ display: 'block' }}>
        +{display} DIAMONDS
      </PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>
        VERIFIED EXPOSURE REWARD
      </PixelText>
    </div>
  );
}

function XPAnimation({ xp, onDone }) {
  const [display, setDisplay] = useState(0);
  const step = Math.max(1, Math.ceil(xp / 15));
  useEffect(() => {
    if (xp === 0) {
      onDone();
      return;
    }
    let current = 0;
    const interval = setInterval(() => {
      current += step;
      if (current >= xp) {
        current = xp;
        clearInterval(interval);
        setTimeout(onDone, 400);
      }
      setDisplay(current);
    }, 50);
    return () => clearInterval(interval);
  }, [xp, onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
      <PixelText size={14} color={C.cream} style={{ display: 'block' }}>
        +{display} XP
      </PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>
        EXPERIENCE EARNED
      </PixelText>
    </div>
  );
}

function LevelUpAnimation({ level, prevLevel, onDone }) {
  const isLevelUp = level > prevLevel;
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      style={{
        textAlign: 'center',
        animation: isLevelUp ? 'victoryFlash 0.8s ease-out' : 'screenFadeIn 0.4s ease-out',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>{isLevelUp ? '🏅' : '📊'}</div>
      {isLevelUp ? (
        <>
          <PixelText size={12} color={C.goldMd} style={{ display: 'block' }}>
            LEVEL UP!
          </PixelText>
          <PixelText size={20} color={C.cream} style={{ display: 'block', margin: '8px 0' }}>
            LV {level}
          </PixelText>
          <PixelText size={7} color={C.subtleText} style={{ display: 'block' }}>
            YOUR COURAGE GROWS STRONGER
          </PixelText>
        </>
      ) : (
        <>
          <PixelText size={12} color={C.cream} style={{ display: 'block' }}>
            LEVEL {level}
          </PixelText>
          <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>
            KEEP GOING — NEXT LEVEL AWAITS
          </PixelText>
        </>
      )}
      {isLevelUp && (
        <div style={{ marginTop: 12, animation: 'lootShimmer 1.5s ease-in-out infinite' }} />
      )}
    </div>
  );
}

function LootAnimation({ loot, onDone }) {
  // Auto-dismiss after 3s so the celebration doesn't hang if user is inactive
  useEffect(() => {
    if (!loot) {
      onDone();
      return;
    }
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [loot, onDone]);

  if (!loot) return null;

  const rarity = loot.rarity || 'common';
  const rarityColor = RARITY_COLORS[rarity] || C.grayLt;

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div
        style={{
          fontSize: 48,
          marginBottom: 12,
          filter:
            rarity === 'legendary'
              ? 'drop-shadow(0 0 8px gold)'
              : rarity === 'rare'
                ? 'drop-shadow(0 0 6px ' + rarityColor + ')'
                : 'none',
        }}
      >
        {loot.icon}
      </div>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 6,
          border: `2px solid ${rarityColor}`,
          background: rarityColor + '15',
        }}
      >
        <PixelText size={7} color={rarityColor} style={{ display: 'block', marginBottom: 4 }}>
          {rarity.toUpperCase()}
        </PixelText>
        <PixelText size={10} color={C.cream} style={{ display: 'block' }}>
          {loot.name}
        </PixelText>
        <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>
          {loot.description}
        </PixelText>
      </div>
      <PixelBtn
        onClick={onDone}
        color={C.gold}
        textColor={C.charcoal}
        style={{ width: '100%', marginTop: 24 }}
      >
        COLLECT →
      </PixelBtn>
    </div>
  );
}

function AchievementPopup({ achievements, onDone }) {
  // Auto-dismiss after 4s so celebration doesn't hang
  useEffect(() => {
    if (!achievements || achievements.length === 0) {
      onDone();
      return;
    }
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [achievements, onDone]);

  if (!achievements || achievements.length === 0) return null;

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
      <PixelText size={10} color={C.goldMd} style={{ display: 'block', marginBottom: 12 }}>
        ACHIEVEMENT{achievements.length > 1 ? 'S' : ''} UNLOCKED!
      </PixelText>
      {achievements.map((ach, i) => (
        <div
          key={ach.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            marginBottom: 8,
            borderRadius: 6,
            background: C.cardBg,
            border: `2px solid ${C.goldMd}`,
            animation: `screenFadeIn 0.4s ease-out ${i * 0.2}s both`,
          }}
        >
          <span style={{ fontSize: 28 }}>{ach.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <PixelText size={8} color={C.goldMd} style={{ display: 'block' }}>
              {ach.name}
            </PixelText>
            <PixelText size={6} color={C.subtleText} style={{ display: 'block' }}>
              {ach.desc}
            </PixelText>
          </div>
        </div>
      ))}
      <PixelBtn
        onClick={onDone}
        color={C.gold}
        textColor={C.charcoal}
        style={{ width: '100%', marginTop: 16 }}
      >
        AMAZING →
      </PixelBtn>
    </div>
  );
}

function LetterNotification({ onDone }) {
  // Auto-dismiss after 3s
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>💌</div>
      <PixelText size={10} color={C.plumMd} style={{ display: 'block', marginBottom: 8 }}>
        NEW LETTER FROM DARA
      </PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginBottom: 16 }}>
        Dara has written a letter about your battle. Find it in your Courage tab when you&apos;re
        ready.
      </PixelText>
      <PixelBtn onClick={onDone} color={C.plumMd} textColor={C.cream} style={{ width: '100%' }}>
        I&apos;LL READ IT LATER →
      </PixelBtn>
    </div>
  );
}

function StreakNotification({ streakCount, onDone }) {
  const milestones = [3, 7, 14, 30];
  const isMilestone = milestones.includes(streakCount || 0);

  // Auto-dismiss after display time so celebration doesn't hang
  useEffect(() => {
    if (!streakCount || streakCount < 1) {
      onDone();
      return;
    }
    const delay = isMilestone ? 3500 : 2000;
    const timer = setTimeout(onDone, delay);
    return () => clearTimeout(timer);
  }, [streakCount, isMilestone, onDone]);

  if (!streakCount || streakCount < 1) return null;

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div
        style={{
          fontSize: 48,
          marginBottom: 12,
          animation: isMilestone ? 'victoryFlash 0.8s ease-out' : 'none',
        }}
      >
        🏮
      </div>
      <PixelText size={12} color={C.goldMd} style={{ display: 'block' }}>
        {streakCount} DAY{streakCount > 1 ? 'S' : ''}
      </PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>
        {isMilestone
          ? `MILESTONE: ${streakCount} DAYS. YOUR PRACTICE IS GROWING`
          : "YOU'RE SHOWING UP CONSISTENTLY"}
      </PixelText>
      {isMilestone && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 6,
            border: `2px solid ${C.goldMd}`,
            background: C.goldMd + '10',
          }}
        >
          <PixelText size={7} color={C.goldMd}>
            {streakCount === 7
              ? "YOU'VE EARNED A LANTERN — YOUR PATH STAYS LIT"
              : streakCount === 14
                ? '14 DAYS. YOU KEEP COMING BACK. THAT IS WHAT MATTERS.'
                : streakCount === 30
                  ? '30 DAYS. YOUR PRACTICE IS DEEPER THAN YOUR FEAR.'
                  : 'KEEP THE LIGHT BURNING'}
          </PixelText>
        </div>
      )}
      <PixelBtn
        onClick={onDone}
        color={C.gold}
        textColor={C.charcoal}
        style={{ width: '100%', marginTop: 16 }}
      >
        CONTINUE →
      </PixelBtn>
    </div>
  );
}

function EvidenceCardView({ card, onDone }) {
  const lines = card.text.split('\n');

  // Auto-dismiss after 3.5s
  useEffect(() => {
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{card.icon}</div>
      <PixelText size={9} color={card.color} style={{ display: 'block', marginBottom: 4 }}>
        EVIDENCE COLLECTED
      </PixelText>
      <PixelText size={10} color={card.color} style={{ display: 'block', marginBottom: 12 }}>
        {card.label}
      </PixelText>
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 6,
          border: `2px solid ${card.border}`,
          background: card.bg,
          textAlign: 'left',
        }}
      >
        <PixelText size={7} color={C.cream} style={{ display: 'block', marginBottom: 6 }}>
          {card.bossName}
        </PixelText>
        {lines.map((line, i) => (
          <PixelText
            key={i}
            size={6}
            color={line.startsWith('Evidence') ? card.color : C.grayLt}
            style={{
              display: 'block',
              lineHeight: 1.7,
              fontStyle: line.startsWith('Evidence') ? 'italic' : 'normal',
            }}
          >
            {line}
          </PixelText>
        ))}
      </div>
      <PixelText size={6} color={C.subtleText} style={{ display: 'block', marginTop: 8 }}>
        {new Date(card.date).toLocaleDateString()}
      </PixelText>
      <PixelBtn
        onClick={onDone}
        color={card.color}
        textColor={C.charcoal}
        style={{ width: '100%', marginTop: 16 }}
      >
        COLLECT EVIDENCE →
      </PixelBtn>
    </div>
  );
}

function WeeklyRewardsAnimation({ rewards, onDone }) {
  const parts = [];
  if (rewards.coins > 0) parts.push(`+${rewards.coins} 🪙`);
  if (rewards.xp > 0) parts.push(`+${rewards.xp} XP`);

  // Auto-dismiss after 3s
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
      <PixelText size={10} color={C.goalGold} style={{ display: 'block', marginBottom: 8 }}>
        WEEKLY CHALLENGES COMPLETE!
      </PixelText>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 6,
          border: `2px solid ${C.goalGold}`,
          background: C.goalGold + '10',
          marginBottom: 16,
        }}
      >
        <PixelText size={12} color={C.cream} style={{ display: 'block' }}>
          {parts.join('  •  ')}
        </PixelText>
      </div>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block' }}>
        BONUS REWARDS FOR YOUR WEEKLY PROGRESS
      </PixelText>
      <PixelBtn
        onClick={onDone}
        color={C.goalGold}
        textColor={C.charcoal}
        style={{ width: '100%', marginTop: 16 }}
      >
        CLAIM →
      </PixelBtn>
    </div>
  );
}

export default function CelebrationOverlay({
  outcome = 'victory',
  heroName = 'Hero',
  bossName = 'the Shadow',
  xpEarned = 0,
  coinsEarned = 0,
  diamondsEarned = 0,
  lootDrop = null,
  achievements = [],
  playerLevel = 1,
  prevLevel = 1,
  streakCount = 0,
  hasLetter = false,
  weeklyChallengeRewards = null,
  evidenceCards = [],
  onDismiss,
}) {
  const [phase, setPhase] = useState(0);
  const dismissedRef = useRef(false);

  // Build sequence once — stable reference
  const sequence = React.useMemo(() => {
    const s = [];
    s.push({ type: 'victoryBurst', value: outcome });
    s.push({ type: 'daraCheer', value: { outcome, heroName, bossName } });
    if (xpEarned > 0) s.push({ type: 'xp', value: xpEarned });
    if (coinsEarned > 0) s.push({ type: 'coins', value: coinsEarned });
    if (diamondsEarned > 0) s.push({ type: 'diamonds', value: diamondsEarned });
    if (lootDrop) s.push({ type: 'loot', value: lootDrop });
    if (achievements.length > 0) s.push({ type: 'achievements', value: achievements });
    s.push({ type: 'level', value: { level: playerLevel, prevLevel } });
    if (streakCount > 0) s.push({ type: 'streak', value: streakCount });
    if (
      weeklyChallengeRewards &&
      (weeklyChallengeRewards.coins > 0 || weeklyChallengeRewards.xp > 0)
    ) {
      s.push({ type: 'weeklyRewards', value: weeklyChallengeRewards });
    }
    if (evidenceCards.length > 0) {
      evidenceCards.forEach((card) => s.push({ type: 'evidence', value: card }));
    }
    if (hasLetter) s.push({ type: 'letter' });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeDismiss = React.useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  }, [onDismiss]);

  const advance = React.useCallback(() => {
    setPhase((p) => {
      const next = p + 1;
      if (next >= sequence.length) {
        setTimeout(safeDismiss, 0);
        return p; // stay on last phase visually until dismissed
      }
      return next;
    });
  }, [sequence.length, safeDismiss]);

  if (sequence.length === 0) {
    safeDismiss();
    return null;
  }

  const current = sequence[phase];
  if (!current) {
    safeDismiss();
    return null;
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background:
          current.type === 'victoryBurst'
            ? OUTCOME_CONFIG[outcome]?.bgTint || 'rgba(0,0,0,0.9)'
            : 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onDismiss}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        style={{
          background: C.charcoal,
          borderRadius: 12,
          border: `3px solid ${current.type === 'victoryBurst' ? OUTCOME_CONFIG[outcome]?.color || C.hpGreen : C.goldMd}`,
          padding: current.type === 'victoryBurst' ? '48px 20px' : '32px 20px',
          maxWidth: 360,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: `0 0 40px ${OUTCOME_CONFIG[outcome]?.color || C.goldMd}30`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === 'victoryBurst' && (
          <VictoryBurst outcome={current.value} onDone={advance} />
        )}
        {current.type === 'daraCheer' && (
          <DaraCheer
            outcome={current.value.outcome}
            heroName={current.value.heroName}
            bossName={current.value.bossName}
            onDone={advance}
          />
        )}
        {current.type === 'xp' && <XPAnimation xp={current.value} onDone={advance} />}
        {current.type === 'coins' && <CoinAnimation amount={current.value} onDone={advance} />}
        {current.type === 'diamonds' && (
          <DiamondAnimation amount={current.value} onDone={advance} />
        )}
        {current.type === 'loot' && <LootAnimation loot={current.value} onDone={advance} />}
        {current.type === 'achievements' && (
          <AchievementPopup achievements={current.value} onDone={advance} />
        )}
        {current.type === 'level' && (
          <LevelUpAnimation
            level={current.value.level}
            prevLevel={current.value.prevLevel}
            onDone={advance}
          />
        )}
        {current.type === 'streak' && (
          <StreakNotification streakCount={current.value} onDone={advance} />
        )}
        {current.type === 'weeklyRewards' && (
          <WeeklyRewardsAnimation rewards={current.value} onDone={advance} />
        )}
        {current.type === 'letter' && <LetterNotification onDone={advance} />}
        {current.type === 'evidence' && <EvidenceCardView card={current.value} onDone={advance} />}
      </div>
    </div>
  );
}
