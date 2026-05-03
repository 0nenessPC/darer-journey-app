import { useEffect, useRef, useCallback } from 'react';
import { supabase, saveProgress, loadProgress, NDA_VERSION } from '../utils/supabase';
import { useAuth } from './useAuth';
import { useNavigation } from './useNavigation';
import { useHeroState } from './useHeroState';

/**
 * useAppState — orchestrates auth, navigation, and hero state sub-hooks.
 * Adds: auto-save on state changes, browser-close save, and post-login routing.
 */
export function useAppState() {
  const auth = useAuth();
  const nav = useNavigation();
  const hero = useHeroState();

  // --- Auto-save on screen/state changes (debounced, 500ms trailing) ---
  const saveTimerRef = useRef(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    if (['login', 'profile', 'armory', 'ladder', 'bank'].includes(nav.screen)) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await saveProgress(user.id, {
            screen: nav.screen,
            hero: hero.hero,
            quest: hero.quest,
            shadow_text: hero.shadowText,
            onboarding_state: hero.onboardingState,
            battle_history: hero.battleHistory,
          });
        }
      } finally {
        isSavingRef.current = false;
      }
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nav.screen,
    auth.isAuthenticated,
    hero.onboardingState,
    hero.shadowText,
    hero.hero,
    hero.quest,
    hero.battleHistory,
  ]);

  // --- Save on tab/browser close ---
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const saveNow = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await saveProgress(user.id, {
            screen: nav.screen,
            hero: hero.hero,
            quest: hero.quest,
            shadow_text: hero.shadowText,
            onboarding_state: hero.onboardingState,
            battle_history: hero.battleHistory,
          });
        }
      } catch {
        /* ignore */
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', saveNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    auth.isAuthenticated,
    nav.screen,
    hero.hero,
    hero.quest,
    hero.shadowText,
    hero.onboardingState,
    hero.battleHistory,
  ]);

  // --- Login handler — wires restoreProgress/newUser to sub-hooks ---
  const handleLogin = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { checkNdaAgreed } = await import('../utils/supabase');
    const ndaAgreed = await checkNdaAgreed(user.id, NDA_VERSION);
    if (!ndaAgreed) {
      nav.setScreen('nda');
      auth.setIsAuthenticated(true);
      return;
    }
    const progress = await loadProgress(user.id);
    if (progress) {
      hero.restoreProgress(progress);
    } else {
      hero.newUser();
    }
    // Route based on restored state
    if (progress?.quest?.bosses?.length > 0) {
      nav.setScreen('map');
    } else if (progress?.onboarding_state?.exposureSort?.done) {
      nav.setScreen('map');
    } else if (
      progress?.tutorial_complete ||
      progress?.onboarding_state?.tutorial?.tutorialComplete
    ) {
      nav.setScreen('exposureSort');
    } else if (progress?.screen && progress.screen !== 'login') {
      nav.setScreen(progress.screen === 'mapPreview' ? 'shadowLore' : progress.screen);
    } else {
      nav.setScreen('intro');
    }
    auth.setIsAuthenticated(true);
  }, [auth, nav, hero]);

  const handleNdaComplete = useCallback(
    async (participantName, ndaText) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { saveNdaAgreement } = await import('../utils/supabase');
      const result = await saveNdaAgreement(
        user.id,
        participantName,
        hero.hero.darerId || '',
        NDA_VERSION,
        ndaText,
      );
      if (!result) return false;
      const progress = await loadProgress(user.id);
      if (progress) hero.restoreProgress(progress);
      else hero.newUser();
      if (progress?.quest?.bosses?.length > 0) {
        nav.setScreen('map');
      } else if (progress?.onboarding_state?.exposureSort?.done) {
        nav.setScreen('map');
      } else if (
        progress?.tutorial_complete ||
        progress?.onboarding_state?.tutorial?.tutorialComplete
      ) {
        nav.setScreen('exposureSort');
      } else if (progress?.screen && progress.screen !== 'login') {
        nav.setScreen(progress.screen === 'mapPreview' ? 'shadowLore' : progress.screen);
      } else {
        nav.setScreen('intro');
      }
      return true;
    },
    [nav, hero],
  );

  const handleLogout = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await saveProgress(user.id, {
          screen: nav.screen,
          hero: hero.hero,
          quest: hero.quest,
          shadow_text: hero.shadowText,
          onboarding_state: hero.onboardingState,
          tutorial_complete: hero.onboardingState.tutorialComplete || undefined,
        });
      }
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    auth.setIsAuthenticated(false);
    nav.setScreenRaw('login');
    nav.setScreenHistory([]);
  }, [auth, nav, hero]);

  return {
    screen: nav.screen,
    setScreen: nav.setScreen,
    setScreenRaw: nav.setScreenRaw,
    screenHistory: nav.screenHistory,
    setScreenHistory: nav.setScreenHistory,
    hero: hero.hero,
    setHero: hero.setHero,
    quest: hero.quest,
    setQuest: hero.setQuest,
    battleHistory: hero.battleHistory,
    setBattleHistory: hero.setBattleHistory,
    activeBoss: hero.activeBoss,
    setActiveBoss: hero.setActiveBoss,
    focusedBoss: hero.focusedBoss,
    setFocusedBoss: hero.setFocusedBoss,
    isAuthenticated: auth.isAuthenticated,
    setIsAuthenticated: auth.setIsAuthenticated,
    authReady: auth.authReady,
    setAuthReady: auth.setAuthReady,
    onboardingState: hero.onboardingState,
    setOnboardingState: hero.setOnboardingState,
    shadowText: hero.shadowText,
    setShadowText: hero.setShadowText,
    setOBState: hero.setOBState,
    getOBState: hero.getOBState,
    goBack: nav.goBack,
    handleLogin,
    handleNdaComplete,
    handleLogout,
  };
}
