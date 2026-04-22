import { useCallback } from "react";

/**
 * useBossHandlers — manages boss delete/achieve actions on the map screen.
 */
export function useBossHandlers({ pendingDeleteBoss, setPendingDeleteBoss, activeBoss, setActiveBoss, setQuest }) {
  const handleDeleteBoss = useCallback((boss) => {
    setPendingDeleteBoss(boss);
  }, [setPendingDeleteBoss]);

  const confirmDeleteBoss = useCallback(() => {
    if (!pendingDeleteBoss) return;
    setQuest(q => ({ ...q, bosses: q.bosses.filter(b => b.id !== pendingDeleteBoss.id) }));
    if (activeBoss?.id === pendingDeleteBoss.id) setActiveBoss(null);
    setPendingDeleteBoss(null);
  }, [pendingDeleteBoss, activeBoss, setQuest, setActiveBoss, setPendingDeleteBoss]);

  const handleAchieveBoss = useCallback((boss) => {
    setQuest(q => ({ ...q, bosses: q.bosses.map(b => b.id === boss.id ? { ...b, defeated: true, hp: 0 } : b) }));
    if (activeBoss?.id === boss.id) setActiveBoss(null);
  }, [activeBoss, setQuest, setActiveBoss]);

  return { handleDeleteBoss, confirmDeleteBoss, handleAchieveBoss };
}
