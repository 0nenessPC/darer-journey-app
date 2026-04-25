import { useCallback } from "react";
import { supabase, saveProgress } from "../utils/supabase";

/**
 * useCompletionHandlers — manages completion callbacks for character creation,
 * intake, boss battles, and tutorial. Keeps App.jsx focused on routing/rendering.
 */
export function useCompletionHandlers({
  hero,
  quest,
  activeBoss,
  battleHistory,
  setHero,
  setQuest,
  setActiveBoss,
  setScreen,
  setShadowText,
  setBattleHistory,
}) {
  const handleCharacterComplete = useCallback(async (name, stats, traits, sadsScore, actValues) => {
    const strengthNames = traits.filter(t => t.type === "strength").map(t => t.text);
    const newHeroData = { name, stats, traits, strengths: strengthNames, sads: sadsScore, coreValues: actValues || [] };
    setHero(h => ({ ...h, ...newHeroData }));
    setScreen("shadowLore");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgress(user.id, { screen: "shadowLore", hero: newHeroData });
  }, [setHero, setScreen]);

  const handleIntakeComplete = useCallback(async (msgs, summaryText) => {
    setShadowText(summaryText || "");
    setScreen("shadowReveal");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgress(user.id, { screen: "shadowReveal", hero, quest, shadow_text: summaryText || "", intake_complete: true, intake_messages: msgs });
  }, [hero, quest, setShadowText, setScreen]);

  const handleBossVictory = useCallback(async (outcome, details = {}) => {
    const { prepAnswers, suds, exposureWhen, exposureWhere, exposureArmory, exposureScheduledTime, battleMessages, victoryMessages } = details;
    const prevHistory = Array.isArray(battleHistory) ? battleHistory : [];
    const battleRecord = {
      bossId: activeBoss?.id,
      bossName: activeBoss?.name,
      bossDesc: activeBoss?.desc,
      outcome,
      date: new Date().toISOString(),
      heroStats: hero?.stats,
      prepAnswers: prepAnswers || {},
      suds: suds || {},
      exposureWhen: exposureWhen || "",
      exposureWhere: exposureWhere || "",
      exposureArmory: exposureArmory || "",
      exposureScheduledTime: exposureScheduledTime || "",
      battleMessages: battleMessages || [],
      victoryMessages: victoryMessages || [],
    };
    const newHistory = [...prevHistory, battleRecord];
    setBattleHistory(newHistory);
    if (outcome === "victory") {
      const newQuest = { ...quest, bosses: quest.bosses.map(b => b.id === activeBoss.id ? { ...b, defeated: true, hp: 0 } : b) };
      setQuest(newQuest);
      setHero(h => ({
        ...h,
        stats: {
          courage: Math.min(10, h.stats.courage + (Math.random() > 0.5 ? 1 : 0)),
          resilience: Math.min(10, h.stats.resilience + (Math.random() > 0.5 ? 1 : 0)),
          openness: Math.min(10, h.stats.openness + (Math.random() > 0.5 ? 1 : 0)),
        }
      }));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await saveProgress(user.id, { screen: "map", hero, quest: newQuest, battle_history: newHistory });
    } else if (outcome === "partial") {
      const newQuest = { ...quest, bosses: quest.bosses.map(b => b.id === activeBoss.id ? { ...b, hp: Math.max(0, b.hp - 50) } : b) };
      setQuest(newQuest);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await saveProgress(user.id, { screen: "map", hero, quest: newQuest, battle_history: newHistory });
    }
    setActiveBoss(null);
    setScreen("map");
  }, [activeBoss, hero, quest, battleHistory, setQuest, setHero, setActiveBoss, setScreen, setBattleHistory]);

  const handleTutorialComplete = useCallback(async () => {
    setScreen("exposureSort");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveProgress(user.id, { screen: "exposureSort", hero, quest, tutorial_complete: true });
  }, [hero, quest, setScreen]);

  return { handleCharacterComplete, handleIntakeComplete, handleBossVictory, handleTutorialComplete };
}
