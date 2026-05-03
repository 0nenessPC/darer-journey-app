import { useCallback } from 'react';
import { supabase, saveProgress } from '../utils/supabase';
import { getMasteryLevel } from '../utils/mastery';

/**
 * useBossHandlers — manages boss delete/achieve actions on the map screen.
 */
export function useBossHandlers({
  pendingDeleteBoss,
  setPendingDeleteBoss,
  activeBoss,
  setActiveBoss,
  setQuest,
  quest,
  hero,
}) {
  const handleDeleteBoss = useCallback(
    (boss) => {
      setPendingDeleteBoss(boss);
    },
    [setPendingDeleteBoss],
  );

  const confirmDeleteBoss = useCallback(async () => {
    if (!pendingDeleteBoss) return;
    const newQuest = {
      ...quest,
      bosses: quest.bosses.filter((b) => b.id !== pendingDeleteBoss.id),
    };
    setQuest(newQuest);
    if (activeBoss?.id === pendingDeleteBoss.id) setActiveBoss(null);
    setPendingDeleteBoss(null);
    // Persist to Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await saveProgress(user.id, { screen: 'map', hero, quest: newQuest });
    }
  }, [pendingDeleteBoss, activeBoss, setQuest, setActiveBoss, setPendingDeleteBoss, quest, hero]);

  const handleAchieveBoss = useCallback(
    async (boss) => {
      const prevCompletions = boss.completions || 0;
      const newCompletions = prevCompletions + 1;
      const mastery = getMasteryLevel(newCompletions);
      const newQuest = {
        ...quest,
        bosses: quest.bosses.map((b) =>
          b.id === boss.id
            ? {
                ...b,
                defeated: true,
                hp: 0,
                attempts: (b.attempts || 0) + 1,
                completions: newCompletions,
                repeats: newCompletions - 1,
                masteryLevel: mastery.label.toLowerCase().replace(/\s+/g, '_'),
                lastPracticedAt: new Date().toISOString(),
                bestSudsDrop: b.bestSudsDrop || 0,
              }
            : b,
        ),
      };
      setQuest(newQuest);
      if (activeBoss?.id === boss.id) setActiveBoss(null);
      // Persist to Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await saveProgress(user.id, { screen: 'map', hero, quest: newQuest });
      }
    },
    [activeBoss, setQuest, setActiveBoss, quest, hero],
  );

  return { handleDeleteBoss, confirmDeleteBoss, handleAchieveBoss };
}
