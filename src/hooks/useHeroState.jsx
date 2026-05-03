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
  });
  const [quest, setQuest] = useState({ bosses: [], goal: '' });
  const [battleHistory, setBattleHistory] = useState([]);
  const [activeBoss, setActiveBoss] = useState(null);
  const [focusedBoss, setFocusedBoss] = useState(null);
  const [shadowText, setShadowText] = useState('');
  const [onboardingState, setOnboardingState] = useState({});

  const restoreProgress = useCallback((progress) => {
    const loadedHero = progress.hero || {};
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

  const getOBState = useCallback((screenKey, defaults = {}) => ({
    ...defaults,
    ...onboardingState[screenKey],
  }), [onboardingState]);

  return {
    hero, setHero,
    quest, setQuest,
    battleHistory, setBattleHistory,
    activeBoss, setActiveBoss,
    focusedBoss, setFocusedBoss,
    shadowText, setShadowText,
    onboardingState, setOnboardingState,
    restoreProgress,
    newUser,
    setOBState,
    getOBState,
  };
}
