import { useState, useCallback } from 'react';
import { DEFAULT_ARMORY } from '../constants/gameData';

/** Hero, quest, battle, shadow, and onboarding state + restore/new-user logic. */
export function useHeroState() {
  const [hero, setHero] = useState({
    name: 'Hero',
    darerId: '',
    strengths: [],
    stats: { courage: 5, resilience: 5, openness: 5 },
    traits: [],
    armory: JSON.parse(JSON.stringify(DEFAULT_ARMORY)),
    courageCoins: 0,
    diamonds: 0,
    purchasedItems: [],
    streakCount: 0,
    bestStreak: 0,
    lastActiveDate: null,
    lanterns: 0,
    totalXP: 0,
    playerLevel: 1,
  });
  const [quest, setQuest] = useState({ bosses: [], goal: '' });
  const [battleHistory, setBattleHistory] = useState([]);
  const [activeBoss, setActiveBoss] = useState(null);
  const [focusedBoss, setFocusedBoss] = useState(null);
  const [shadowText, setShadowText] = useState('');
  const [onboardingState, setOnboardingState] = useState({});

  const restoreProgress = useCallback((progress) => {
    const loadedHero = progress.hero || {};

    // Migration: platinum → courageCoins (renamed back)
    if (loadedHero.platinum !== undefined && loadedHero.courageCoins === undefined) {
      loadedHero.courageCoins = loadedHero.platinum;
      delete loadedHero.platinum;
    }
    // Migration: streakFreezes → lanterns
    if (loadedHero.streakFreezes !== undefined && loadedHero.lanterns === undefined) {
      loadedHero.lanterns = loadedHero.streakFreezes;
      delete loadedHero.streakFreezes;
    }
    if (loadedHero.diamonds === undefined) loadedHero.diamonds = 0;
    if (loadedHero.bestStreak === undefined) loadedHero.bestStreak = 0;

    const migratedArmory = loadedHero.armory
      ? loadedHero.armory.map((item, i) => {
          const def = DEFAULT_ARMORY[i];
          return def ? { ...def, ...item } : item;
        })
      : JSON.parse(JSON.stringify(DEFAULT_ARMORY));
    setHero({ ...loadedHero, armory: migratedArmory });
    if (progress.quest) {
      setQuest(progress.quest);
      const firstUndefeated = progress.quest.bosses?.find((b) => !b.defeated);
      if (firstUndefeated) setFocusedBoss(firstUndefeated);
    }
    if (progress.battle_history) setBattleHistory(progress.battle_history);
    setShadowText(progress.shadow_text || '');
    if (progress.onboarding_state) setOnboardingState(progress.onboarding_state);
  }, []);

  /** Check if user should see a welcome-back letter (2+ days away) */
  const checkWelcomeBack = useCallback((hero, battleHistory) => {
    const lastActive = hero.lastActiveDate || hero.lastLoginDate;
    if (!lastActive) return null;
    const daysSince = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
    if (daysSince < 2) return null;

    const lastBattle = battleHistory[battleHistory.length - 1];
    const totalDefeated = (battleHistory || [])
      .filter((b) => b.outcome === 'victory' || b.outcome === 'partial')
      .filter((b, i, arr) => arr.findIndex((x) => x.bossId === b.bossId) === i).length;
    const bestSudsDrop = Math.max(
      ...(battleHistory || []).map((b) => (b.suds?.before || 0) - (b.suds?.after || 0)).concat([0]),
    );
    const streakCount = hero.streakCount || 0;

    return {
      daysSinceLastActive: daysSince,
      lastBossName: lastBattle?.bossName || '',
      totalDefeated,
      bestSudsDrop,
      streakCount,
    };
  }, []);

  const newUser = useCallback(() => {
    const id = 'DARER_' + Math.floor(100000 + Math.random() * 900000);
    setHero((h) => ({ ...h, darerId: id, name: id }));
  }, []);

  // Helpers for setOBState/getOBState (wired to onboardingState)
  const setOBState = useCallback((screenKey, partial) => {
    setOnboardingState((prev) => ({
      ...prev,
      [screenKey]: { ...prev[screenKey], ...partial },
    }));
  }, []);

  const getOBState = useCallback(
    (screenKey, defaults = {}) => ({
      ...defaults,
      ...onboardingState[screenKey],
    }),
    [onboardingState],
  );

  return {
    hero,
    setHero,
    quest,
    setQuest,
    battleHistory,
    setBattleHistory,
    activeBoss,
    setActiveBoss,
    focusedBoss,
    setFocusedBoss,
    shadowText,
    setShadowText,
    onboardingState,
    setOnboardingState,
    restoreProgress,
    newUser,
    setOBState,
    getOBState,
    checkWelcomeBack,
  };
}
