import React, { useState, useEffect, useRef } from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
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

function CoinAnimation({ amount, onDone }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (amount === 0) { onDone(); return; }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplay(i);
      if (i >= amount) { clearInterval(interval); setTimeout(onDone, 400); }
    }, 80);
    return () => clearInterval(interval);
  }, [amount, onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🪙</div>
      <PixelText size={14} color={C.goldMd} style={{ display: 'block' }}>+{display} COINS</PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>COURAGE COINS EARNED</PixelText>
    </div>
  );
}

function XPAnimation({ xp, onDone }) {
  const [display, setDisplay] = useState(0);
  const step = Math.max(1, Math.ceil(xp / 15));
  useEffect(() => {
    if (xp === 0) { onDone(); return; }
    let current = 0;
    const interval = setInterval(() => {
      current += step;
      if (current >= xp) { current = xp; clearInterval(interval); setTimeout(onDone, 400); }
      setDisplay(current);
    }, 50);
    return () => clearInterval(interval);
  }, [xp, onDone]);

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
      <PixelText size={14} color={C.cream} style={{ display: 'block' }}>+{display} XP</PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>EXPERIENCE EARNED</PixelText>
    </div>
  );
}

function LevelUpAnimation({ level, prevLevel, onDone }) {
  const isLevelUp = level > prevLevel;
  return (
    <div style={{ textAlign: 'center', animation: isLevelUp ? 'victoryFlash 0.8s ease-out' : 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{isLevelUp ? '🏅' : '📊'}</div>
      {isLevelUp ? (
        <>
          <PixelText size={12} color={C.goldMd} style={{ display: 'block' }}>LEVEL UP!</PixelText>
          <PixelText size={20} color={C.cream} style={{ display: 'block', margin: '8px 0' }}>LV {level}</PixelText>
          <PixelText size={7} color={C.subtleText} style={{ display: 'block' }}>YOUR COURAGE GROWS STRONGER</PixelText>
        </>
      ) : (
        <>
          <PixelText size={12} color={C.cream} style={{ display: 'block' }}>LEVEL {level}</PixelText>
          <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>KEEP GOING — NEXT LEVEL AWAITS</PixelText>
        </>
      )}
      {isLevelUp && <div style={{ marginTop: 12, animation: 'lootShimmer 1.5s ease-in-out infinite' }} />}
    </div>
  );
}

function LootAnimation({ loot, onDone }) {
  if (!loot) {
    onDone();
    return null;
  }
  const rarity = loot.rarity || 'common';
  const rarityColor = RARITY_COLORS[rarity] || C.grayLt;

  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{
        fontSize: 48, marginBottom: 12,
        filter: rarity === 'legendary' ? 'drop-shadow(0 0 8px gold)' : rarity === 'rare' ? 'drop-shadow(0 0 6px ' + rarityColor + ')' : 'none',
      }}>
        {loot.icon}
      </div>
      <div style={{
        padding: '12px 16px', borderRadius: 6,
        border: `2px solid ${rarityColor}`,
        background: rarityColor + '15',
      }}>
        <PixelText size={7} color={rarityColor} style={{ display: 'block', marginBottom: 4 }}>{rarity.toUpperCase()}</PixelText>
        <PixelText size={10} color={C.cream} style={{ display: 'block' }}>{loot.name}</PixelText>
        <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>{loot.description}</PixelText>
      </div>
      <PixelBtn onClick={onDone} color={C.gold} textColor={C.charcoal} style={{ width: '100%', marginTop: 24 }}>
        COLLECT →
      </PixelBtn>
    </div>
  );
}

function AchievementPopup({ achievements, onDone }) {
  if (!achievements || achievements.length === 0) {
    onDone();
    return null;
  }
  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
      <PixelText size={10} color={C.goldMd} style={{ display: 'block', marginBottom: 12 }}>ACHIEVEMENT{achievements.length > 1 ? 'S' : ''} UNLOCKED!</PixelText>
      {achievements.map((ach, i) => (
        <div key={ach.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', marginBottom: 8, borderRadius: 6,
          background: C.cardBg, border: `2px solid ${C.goldMd}`,
          animation: `screenFadeIn 0.4s ease-out ${i * 0.2}s both`,
        }}>
          <span style={{ fontSize: 28 }}>{ach.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <PixelText size={8} color={C.goldMd} style={{ display: 'block' }}>{ach.name}</PixelText>
            <PixelText size={6} color={C.subtleText} style={{ display: 'block' }}>{ach.desc}</PixelText>
          </div>
        </div>
      ))}
      <PixelBtn onClick={onDone} color={C.gold} textColor={C.charcoal} style={{ width: '100%', marginTop: 16 }}>
        AMAZING →
      </PixelBtn>
    </div>
  );
}

function LetterNotification({ onDone }) {
  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>💌</div>
      <PixelText size={10} color={C.plumMd} style={{ display: 'block', marginBottom: 8 }}>NEW LETTER FROM DARA</PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginBottom: 16 }}>
        Dara has written a letter about your battle. Find it in your Courage tab when you're ready.
      </PixelText>
      <PixelBtn onClick={onDone} color={C.plumMd} textColor={C.cream} style={{ width: '100%' }}>
        I'LL READ IT LATER →
      </PixelBtn>
    </div>
  );
}

function StreakNotification({ streakCount, onDone }) {
  if (!streakCount || streakCount < 1) {
    onDone();
    return null;
  }
  const milestones = [3, 7, 14, 30];
  const isMilestone = milestones.includes(streakCount);
  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{
        fontSize: 48, marginBottom: 12,
        animation: isMilestone ? 'victoryFlash 0.8s ease-out' : 'none',
      }}>
        🔥
      </div>
      <PixelText size={12} color={C.goldMd} style={{ display: 'block' }}>{streakCount} DAY{streakCount > 1 ? 'S' : ''}</PixelText>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 4 }}>
        {isMilestone ? 'STREAK MILESTONE! YOUR DEDICATION SHINES' : 'THE FIRE BURNS BRIGHT'}
      </PixelText>
      {isMilestone && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 6,
          border: `2px solid ${C.goldMd}`, background: C.goldMd + '10',
        }}>
          <PixelText size={7} color={C.goldMd}>
            {streakCount === 7 ? 'A STREAK FREEZE HAS BEEN AWARDED!' : streakCount === 14 ? 'INCONSISTENT — YOUR PERSEVERANCE INSPIRES' : streakCount === 30 ? 'LEGENDARY COMMITMENT — DARER ELITE' : 'KEEP THE FLAME ALIVE'}
          </PixelText>
        </div>
      )}
      <PixelBtn onClick={onDone} color={C.gold} textColor={C.charcoal} style={{ width: '100%', marginTop: 16 }}>
        CONTINUE →
      </PixelBtn>
    </div>
  );
}

function WeeklyRewardsAnimation({ rewards, onDone }) {
  const parts = [];
  if (rewards.coins > 0) parts.push(`+${rewards.coins} 🪙`);
  if (rewards.xp > 0) parts.push(`+${rewards.xp} XP`);
  return (
    <div style={{ textAlign: 'center', animation: 'screenFadeIn 0.4s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
      <PixelText size={10} color={C.goalGold} style={{ display: 'block', marginBottom: 8 }}>WEEKLY CHALLENGES COMPLETE!</PixelText>
      <div style={{
        padding: '12px 16px', borderRadius: 6,
        border: `2px solid ${C.goalGold}`,
        background: C.goalGold + '10',
        marginBottom: 16,
      }}>
        <PixelText size={12} color={C.cream} style={{ display: 'block' }}>{parts.join('  •  ')}</PixelText>
      </div>
      <PixelText size={7} color={C.subtleText} style={{ display: 'block' }}>BONUS REWARDS FOR YOUR WEEKLY PROGRESS</PixelText>
      <PixelBtn onClick={onDone} color={C.goalGold} textColor={C.charcoal} style={{ width: '100%', marginTop: 16 }}>
        CLAIM →
      </PixelBtn>
    </div>
  );
}

export default function CelebrationOverlay({
  xpEarned = 0,
  coinsEarned = 0,
  lootDrop = null,
  achievements = [],
  playerLevel = 1,
  prevLevel = 1,
  streakCount = 0,
  hasLetter = false,
  weeklyChallengeRewards = null,
  onDismiss,
}) {
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);

  // Build the sequence of celebration phases
  const sequence = [];
  if (xpEarned > 0) sequence.push({ type: 'xp', value: xpEarned });
  if (coinsEarned > 0) sequence.push({ type: 'coins', value: coinsEarned });
  if (lootDrop) sequence.push({ type: 'loot', value: lootDrop });
  if (achievements.length > 0) sequence.push({ type: 'achievements', value: achievements });
  sequence.push({ type: 'level', value: { level: playerLevel, prevLevel } });
  if (streakCount > 0) sequence.push({ type: 'streak', value: streakCount });
  if (weeklyChallengeRewards && (weeklyChallengeRewards.coins > 0 || weeklyChallengeRewards.xp > 0)) {
    sequence.push({ type: 'weeklyRewards', value: weeklyChallengeRewards });
  }
  if (hasLetter) sequence.push({ type: 'letter' });

  const advance = () => {
    phaseRef.current++;
    if (phaseRef.current >= sequence.length) {
      onDismiss();
    } else {
      setPhase(phaseRef.current);
    }
  };

  // Auto-advance for simple animations (XP counter, coin counter)
  useEffect(() => {
    phaseRef.current = 0;
    setPhase(0);
  }, [xpEarned, coinsEarned, lootDrop, achievements]);

  if (sequence.length === 0) {
    onDismiss();
    return null;
  }

  const current = sequence[phase];
  if (!current) { onDismiss(); return null; }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div style={{
        background: C.charcoal, borderRadius: 12,
        border: `3px solid ${C.goldMd}`,
        padding: '32px 20px', maxWidth: 360, width: '100%',
        maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 0 40px rgba(232,160,74,0.3)',
      }}>
        {current.type === 'xp' && <XPAnimation xp={current.value} onDone={advance} />}
        {current.type === 'coins' && <CoinAnimation amount={current.value} onDone={advance} />}
        {current.type === 'loot' && <LootAnimation loot={current.value} onDone={advance} />}
        {current.type === 'achievements' && <AchievementPopup achievements={current.value} onDone={advance} />}
        {current.type === 'level' && <LevelUpAnimation level={current.value.level} prevLevel={current.value.prevLevel} onDone={advance} />}
        {current.type === 'streak' && <StreakNotification streakCount={current.value} onDone={advance} />}
        {current.type === 'weeklyRewards' && <WeeklyRewardsAnimation rewards={current.value} onDone={advance} />}
        {current.type === 'letter' && <LetterNotification onDone={advance} />}
      </div>
    </div>
  );
}
