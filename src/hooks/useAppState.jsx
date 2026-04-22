import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, saveProgress, loadProgress, NDA_VERSION, saveNdaAgreement, checkNdaAgreed } from "../utils/supabase";
import { DEFAULT_ARMORY } from "../constants/gameData";

/**
 * useAppState — manages auth, auto-save, screen navigation, and onboarding routing
 * for the DARER Quest app. Keeps App.jsx focused on screen rendering.
 */
export function useAppState() {
  const [screen, setScreenRaw] = useState("login");
  const [screenHistory, setScreenHistory] = useState([]);
  const [hero, setHero] = useState({
    name: "Hero",
    darerId: "",
    strengths: [],
    stats: { courage: 5, resilience: 5, openness: 5 },
    traits: [],
    armory: JSON.parse(JSON.stringify(DEFAULT_ARMORY)),
  });
  const [quest, setQuest] = useState({ bosses: [], goal: "" });
  const [battleHistory, setBattleHistory] = useState([]);
  const [activeBoss, setActiveBoss] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [onboardingState, setOnboardingState] = useState({});
  const [shadowText, setShadowText] = useState("");

  // --- Auth lifecycle ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- Auto-save on screen/state changes ---
  const lastSavedAt = useRef(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (["login", "profile", "armory", "ladder"].includes(screen)) return;
    const now = Date.now();
    if (now - lastSavedAt.current < 2000) return;
    lastSavedAt.current = now;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveProgress(user.id, {
          screen, hero, quest,
          shadow_text: shadowText,
          onboarding_state: onboardingState,
          battle_history: battleHistory,
        });
      }
    })();
  }, [screen, isAuthenticated, onboardingState, shadowText, hero, quest, battleHistory]);

  // --- Save on tab/browser close ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const saveNow = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveProgress(user.id, {
            screen, hero, quest,
            shadow_text: shadowText,
            onboarding_state: onboardingState,
            battle_history: battleHistory,
          });
        }
      } catch (e) { /* ignore save errors on close */ }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    window.addEventListener("beforeunload", saveNow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", saveNow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, screen, hero, quest, shadowText, onboardingState]);

  // --- Navigation helpers ---
  const setScreen = useCallback((s) => {
    if (s === screen) return;
    setScreenHistory(prev => {
      const last = prev.length > 0 ? prev[prev.length - 1] : null;
      if (last === screen && prev.length > 1) {
        return [...prev.slice(0, -1), screen];
      }
      return [...prev, screen];
    });
    setScreenRaw(s);
  }, [screen]);

  const setOBState = useCallback((screenKey, partial) => {
    setOnboardingState(prev => ({
      ...prev,
      [screenKey]: { ...prev[screenKey], ...partial },
    }));
  }, []);

  const getOBState = useCallback((screenKey, defaults = {}) => ({
    ...defaults,
    ...onboardingState[screenKey],
  }), [onboardingState]);

  const goBack = useCallback(() => {
    setScreenHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      while (next.length > 1 && next[next.length - 1] === next[next.length - 2]) {
        next.pop();
      }
      const last = next.pop();
      setScreenRaw(last);
      return next;
    });
  }, []);

  // --- Shared restore logic ---
  const _restoreProgress = useCallback((progress) => {
    const loadedHero = progress.hero || {};
    const migratedArmory = loadedHero.armory
      ? loadedHero.armory.map((item, i) => {
          const def = DEFAULT_ARMORY[i];
          return def ? { ...def, ...item } : item;
        })
      : JSON.parse(JSON.stringify(DEFAULT_ARMORY));
    setHero({ ...loadedHero, armory: migratedArmory });
    if (progress.quest) setQuest(progress.quest);
    if (progress.battle_history) setBattleHistory(progress.battle_history);
    setShadowText(progress.shadow_text || "");
    if (progress.onboarding_state) setOnboardingState(progress.onboarding_state);
    setScreenHistory([]);

    if (progress.quest?.bosses?.length > 0) {
      setScreen("map");
    } else if (progress.onboarding_state?.exposureSort?.done) {
      setScreen("map");
    } else if (progress.tutorial_complete || progress.onboarding_state?.tutorial?.tutorialComplete) {
      setScreen("exposureSort");
    } else if (progress.screen && progress.screen !== "login") {
      setScreen(progress.screen);
    } else {
      setScreen("intro");
    }
  }, []);

  const _newUser = useCallback(() => {
    const id = "DARER_" + Math.floor(100000 + Math.random() * 900000);
    setHero(h => ({ ...h, darerId: id, name: id }));
    setScreen("intro");
  }, []);

  // --- Auth handlers ---
  const handleLogin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ndaAgreed = await checkNdaAgreed(user.id, NDA_VERSION);
    if (!ndaAgreed) {
      setScreen("nda");
      setIsAuthenticated(true);
      return;
    }
    const progress = await loadProgress(user.id);
    if (progress) {
      _restoreProgress(progress);
    } else {
      _newUser();
    }
    setIsAuthenticated(true);
  }, [_restoreProgress, _newUser]);

  const handleNdaComplete = useCallback(async (participantName, ndaText) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const result = await saveNdaAgreement(user.id, participantName, hero.darerId || "", NDA_VERSION, ndaText);
    if (!result) return false;
    const progress = await loadProgress(user.id);
    if (progress) {
      _restoreProgress(progress);
    } else {
      _newUser();
    }
    return true;
  }, [hero.darerId, _restoreProgress, _newUser]);

  const handleLogout = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const payload = { screen, hero, quest, shadow_text: shadowText, onboarding_state: onboardingState };
        if (onboardingState.tutorialComplete) payload.tutorial_complete = true;
        await saveProgress(user.id, payload);
      }
    } catch (e) { /* ignore save errors on logout */ }
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setScreenRaw("login");
    setScreenHistory([]);
  }, [screen, hero, quest, shadowText, onboardingState]);

  return {
    screen, setScreen, setScreenRaw,
    screenHistory, setScreenHistory,
    hero, setHero,
    quest, setQuest,
    battleHistory, setBattleHistory,
    activeBoss, setActiveBoss,
    isAuthenticated, setIsAuthenticated,
    authReady, setAuthReady,
    onboardingState, setOnboardingState,
    shadowText, setShadowText,
    setOBState, getOBState, goBack,
    handleLogin, handleNdaComplete, handleLogout,
  };
}
