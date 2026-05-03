import { useState, useEffect, useCallback } from 'react';
import { supabase, NDA_VERSION, saveNdaAgreement, checkNdaAgreed } from '../utils/supabase';

/** Manages Supabase auth session state and auth-related actions. */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

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

  const handleLogin = useCallback(async (restoreProgress, newUser) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ndaAgreed = await checkNdaAgreed(user.id, NDA_VERSION);
    if (!ndaAgreed) {
      return 'nda'; // signal that NDA is needed
    }
    const progress = await import('../utils/supabase').then(m => m.loadProgress(user.id));
    if (progress) {
      restoreProgress(progress);
    } else {
      newUser();
    }
    setIsAuthenticated(true);
    return 'restored';
  }, []);

  const handleNdaComplete = useCallback(async (participantName, ndaText, heroDarerId, restoreProgress, newUser) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const result = await saveNdaAgreement(user.id, participantName, heroDarerId, NDA_VERSION, ndaText);
    if (!result) return false;
    const progress = await import('../utils/supabase').then(m => m.loadProgress(user.id));
    if (progress) restoreProgress(progress);
    else newUser();
    return true;
  }, []);

  const handleLogout = useCallback(async (payload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { saveProgress } = await import('../utils/supabase');
        await saveProgress(user.id, payload);
      }
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    setIsAuthenticated,
    authReady,
    setAuthReady,
    handleLogin,
    handleNdaComplete,
    handleLogout,
  };
}
