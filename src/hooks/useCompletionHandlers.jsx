import { useCallback } from 'react';
import { supabase, saveProgress, saveBattleRecord } from '../utils/supabase';
import { recordActivity } from '../utils/streak';
import { rollLoot } from '../utils/lootTable';
import { checkAchievements, ACHIEVEMENTS } from '../constants/achievements';
import { getWeeklyChallenges, checkWeeklyChallenges } from '../constants/weeklyChallenges';
import { battleXP, calcTotalXP, getPlayerLevel, xpToNextLevel } from '../utils/xpSystem';
import { generatePostBattleLetter } from '../constants/daraLetters';
import { getMasteryLevel } from '../utils/mastery';
import { generateEvidenceCards } from '../utils/evidenceCards';
import { verifyGPS, diamondReward } from '../utils/verification';

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
  const handleCharacterComplete = useCallback(
    async (name, stats, traits, sadsScore, actValues) => {
      const strengthNames = traits.filter((t) => t.type === 'strength').map((t) => t.text);
      const newHeroData = {
        name,
        stats,
        traits,
        strengths: strengthNames,
        sads: sadsScore,
        coreValues: actValues || [],
      };
      setHero((h) => ({ ...h, ...newHeroData }));
      setScreen('shadowLore');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await saveProgress(user.id, { screen: 'shadowLore', hero: newHeroData });
    },
    [setHero, setScreen],
  );

  const handleIntakeComplete = useCallback(
    async (msgs, summaryText) => {
      setShadowText(summaryText || '');
      setScreen('shadowReveal');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user)
        await saveProgress(user.id, {
          screen: 'shadowReveal',
          hero,
          quest,
          shadow_text: summaryText || '',
          intake_complete: true,
          intake_messages: msgs,
        });
    },
    [hero, quest, setShadowText, setScreen],
  );

  const handleBossVictory = useCallback(
    async (outcome, details = {}) => {
      const {
        prepAnswers,
        suds,
        exposureWhen,
        exposureWhere,
        exposureWhereCoords,
        exposureArmory,
        exposureScheduledTime,
        battleMessages,
        victoryMessages,
        lootImage,
        lootText,
        decideSelectedVals,
        decideCustom,
        allowFearful,
        allowLikelihood,
        allowSeverity,
        allowCanHandle,
        allowFearShowing,
        allowPhysicalSensations,
        allowCustomSensation,
        fearedHappened,
        fearedSeverity,
        madeItThrough,
        engageFreeText,
        repeatChoice,
      } = details;
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
        exposureWhen: exposureWhen || '',
        exposureWhere: exposureWhere || '',
        exposureArmory: exposureArmory || '',
        exposureScheduledTime: exposureScheduledTime || '',
        battleMessages: battleMessages || [],
        victoryMessages: victoryMessages || [],
        lootImage: lootImage || null,
        lootText: lootText || '',
        // Structured fields for normalized battles table
        decideSelectedVals: decideSelectedVals || [],
        decideCustom: decideCustom || '',
        allowFearful: allowFearful || '',
        allowLikelihood: allowLikelihood ?? null,
        allowSeverity: allowSeverity ?? null,
        allowCanHandle: allowCanHandle || '',
        allowFearShowing: allowFearShowing || '',
        allowPhysicalSensations: allowPhysicalSensations || [],
        allowCustomSensation: allowCustomSensation || '',
        fearedHappened: fearedHappened || '',
        fearedSeverity: fearedSeverity || '',
        madeItThrough: madeItThrough || '',
        engageFreeText: engageFreeText || '',
        repeatChoice: repeatChoice || '',
      };
      const newHistory = [...prevHistory, battleRecord];
      setBattleHistory(newHistory);

      // Earn Courage Coins: 5-15 based on boss level
      const bossLevel = activeBoss?.level || activeBoss?.difficulty || 1;
      let coinsEarned = 0;
      if (outcome === 'victory' || outcome === 'partial') {
        coinsEarned = bossLevel <= 3 ? 5 : bossLevel <= 6 ? 10 : 15;
      }
      let diamondsEarned = 0;
      let verified = false;
      let verificationMethod = null;

      // Verify exposure for diamond reward (GPS or photo)
      if (exposureWhereCoords) {
        const gpsResult = await verifyGPS(exposureWhereCoords);
        if (gpsResult.verified) {
          verified = true;
          verificationMethod = gpsResult.method;
          diamondsEarned = diamondReward(bossLevel);
        }
      }
      // Photo upload also counts as verification
      if (!verified && lootImage) {
        verified = true;
        verificationMethod = 'photo';
        diamondsEarned = diamondReward(bossLevel);
      }

      // Record activity for streak tracking
      const isRepeat = activeBoss?.id?.startsWith('repeat_');
      const streakUpdate = recordActivity({
        streakCount: hero.streakCount || 0,
        lanterns: hero.lanterns || 0,
        bestStreak: hero.bestStreak || 0,
        isRepeat,
      });

      // Roll loot drop (victory only)
      const lootDrop = outcome === 'victory' ? rollLoot() : null;

      // Check achievements
      const defeatedCount = newHistory
        .filter((b) => b.outcome === 'victory' || b.outcome === 'partial')
        .filter((b, i, arr) => arr.findIndex((x) => x.bossId === b.bossId) === i).length;
      const victoryCount = newHistory.filter((b) => b.outcome === 'victory').length;
      const repeatCount = newHistory.filter((b) => b.bossId?.startsWith('repeat_')).length;
      const maxSudsDrop = Math.max(
        ...newHistory
          .map((b) => {
            const peak = b.suds?.during ?? b.suds?.before ?? 0;
            const after = b.suds?.after ?? 0;
            return peak - after;
          })
          .filter((v) => v > 0),
        0,
      );
      const lootCount = newHistory.filter((b) => b.lootImage || b.lootText).length;
      const nightBattles = newHistory.filter((b) => {
        const h = new Date(b.date).getHours();
        return h >= 22 || h < 6;
      }).length;
      const diffTiers = new Set(
        newHistory.map((b) => {
          const boss = quest.bosses?.find((qb) => qb.id === b.bossId);
          const lv = boss?.level || boss?.difficulty || 1;
          return lv <= 3 ? 'easy' : lv <= 6 ? 'medium' : lv <= 9 ? 'hard' : 'extreme';
        }),
      );
      const allDiffTiers = diffTiers.size;
      const customBossCount = newHistory.filter((b) => {
        const boss = quest.bosses?.find((qb) => qb.id === b.bossId);
        return boss?.isCustom;
      }).length;
      const zonesVisited = Math.min(5, Math.floor(defeatedCount / 3) + 1);

      // Repeat SUDS comparison: compare peak SUDS of same-named bosses across repeats
      const repeatBosses = newHistory.filter(
        (b) => b.bossId?.startsWith('repeat_') && b.suds?.during,
      );
      const bestRepeatSudsDrop =
        repeatBosses.length > 0
          ? Math.max(
              ...repeatBosses
                .map((rb) => {
                  const original = newHistory.find(
                    (ob) =>
                      ob.bossName === rb.bossName &&
                      !ob.bossId?.startsWith('repeat_') &&
                      ob.suds?.during,
                  );
                  return original ? original.suds.during - rb.suds.during : 0;
                })
                .filter((v) => v > 0),
              0,
            )
          : 0;
      const minRepeatSudsAfter =
        repeatBosses.length > 0
          ? Math.min(...repeatBosses.map((rb) => rb.suds.after ?? 100), 100)
          : 100;
      const repeatVariations = new Set(repeatBosses.map((rb) => rb.bossName)).size;

      // Calculate XP earned from this battle (apply double XP if available)
      let xpEarned = battleXP(activeBoss, outcome, suds?.before, suds?.after);
      const hasDoubleXP = (hero.doubleXP || 0) > 0;
      if (hasDoubleXP) {
        xpEarned *= 2;
      }
      battleRecord.xpEarned = xpEarned;

      // Build XP breakdown for BattleRewardScreen
      const sudsDelta = (suds?.before || 0) - (suds?.after || 0);
      const sudsBonus = sudsDelta > 0 ? Math.floor(sudsDelta / 10) * 10 : 0;
      const xpBreakdown = [];
      if (outcome === 'victory') {
        xpBreakdown.push({ label: 'Full Exposure', xp: 100 });
        xpBreakdown.push({ label: 'SUDS Check-in', xp: 25 });
        xpBreakdown.push({ label: 'Reflection', xp: 25 });
      } else if (outcome === 'partial') {
        xpBreakdown.push({ label: 'Partial Exposure', xp: 75 });
      } else {
        xpBreakdown.push({ label: 'Attempted', xp: 30 });
      }
      if (sudsBonus > 0) xpBreakdown.push({ label: 'SUDS Drop Bonus', xp: sudsBonus });
      battleRecord.coinsEarned = coinsEarned;
      battleRecord.diamondsEarned = diamondsEarned;
      battleRecord.verified = verified;
      battleRecord.verificationMethod = verificationMethod;

      // Recalculate total XP and level from full history
      const totalXP = calcTotalXP(newHistory, quest.bosses);
      const playerLevel = getPlayerLevel(totalXP);

      const prevAchievements = hero.achievements || [];
      const { unlocked: newAchievements } = checkAchievements(
        {
          defeatedCount,
          victoryCount,
          streakCount: streakUpdate.streakCount,
          coins: (hero.courageCoins || 0) + coinsEarned,
          maxSudsDrop,
          lootCount,
          repeatCount,
          nightBattles,
          allDiffTiers,
          customBossCount,
          zonesVisited,
          bestRepeatSudsDrop,
          minRepeatSudsAfter,
          repeatVariations,
        },
        prevAchievements,
      );

      // Generate Dara's post-battle letter
      const isFirstVictory = victoryCount === 1;
      const isRepeatBattle = activeBoss?.id?.startsWith('repeat_') || false;
      const previousBattle = newHistory.find(
        (b) => b.bossName === activeBoss?.name && b.bossId !== activeBoss?.id,
      );
      const sudsImprovement =
        isRepeatBattle && previousBattle?.suds?.during
          ? Math.max(0, previousBattle.suds.during - (suds?.during || 0))
          : 0;
      const sudsDrop = (suds?.before || 0) - (suds?.after || 0);
      const prevLevel = hero.playerLevel || 1;
      const justLeveledUp = playerLevel > prevLevel;

      const letter = generatePostBattleLetter({
        heroName: hero.name,
        bossName: activeBoss?.name || 'this Shadow',
        outcome,
        sudsBefore: suds?.before || 0,
        sudsAfter: suds?.after || 0,
        sudsDrop,
        streakCount: streakUpdate.streakCount,
        defeatedCount,
        playerLevel,
        isFirstVictory,
        isRepeat: isRepeatBattle,
        sudsImprovement,
        justLeveledUp,
        prevPeakSUDS: previousBattle?.suds?.during,
        currentPeakSUDS: suds?.during,
      });

      battleRecord.daraLetter = letter;

      if (outcome === 'victory') {
        const sudsDrop = (suds?.before || 0) - (suds?.after || 0);
        const isRepeat = activeBoss?.id?.startsWith('repeat_');
        const newQuest = {
          ...quest,
          bosses: quest.bosses.map((b) => {
            // If this is a repeat, update the ORIGINAL boss (matched by name)
            const targetBoss = isRepeat && b.name === activeBoss?.name ? b : b;
            if (b.id !== activeBoss.id && !isRepeat) return b;
            if (isRepeat && b.name !== activeBoss?.name) return b;
            const prevCompletions = b.completions || 0;
            const prevAttempts = b.attempts || 0;
            const newCompletions = prevCompletions + 1;
            const newAttempts = isRepeat ? prevAttempts + 1 : prevAttempts || 1;
            const prevBest = b.bestSudsDrop || 0;
            const mastery = getMasteryLevel(newCompletions);
            return {
              ...b,
              defeated: true,
              hp: 0,
              attempts: newAttempts,
              completions: newCompletions,
              repeats: newCompletions - 1,
              masteryLevel: mastery.label.toLowerCase().replace(/\s+/g, '_'),
              lastPracticedAt: new Date().toISOString(),
              bestSudsDrop: Math.max(prevBest, sudsDrop),
            };
          }),
        };
        setQuest(newQuest);
        setHero((h) => {
          const updates = {
            stats: {
              courage: Math.min(10, h.stats.courage + (Math.random() > 0.5 ? 1 : 0)),
              resilience: Math.min(10, h.stats.resilience + (Math.random() > 0.5 ? 1 : 0)),
              openness: Math.min(10, h.stats.openness + (Math.random() > 0.5 ? 1 : 0)),
            },
            courageCoins: (h.courageCoins || 0) + coinsEarned,
            diamonds: (h.diamonds || 0) + diamondsEarned,
            streakCount: streakUpdate.streakCount,
            lanterns: streakUpdate.lanterns,
            bestStreak: streakUpdate.bestStreak,
            lastActiveDate: streakUpdate.lastActiveDate,
            pendingLetter: letter,
            pendingLetterDate: new Date().toISOString(),
          };
          // Consume double XP token if used this battle
          if (hasDoubleXP) {
            updates.doubleXP = Math.max(0, (h.doubleXP || 0) - 1);
          }
          // Apply loot rewards
          if (lootDrop) {
            const collectibles = h.collectibles || [];
            const doubleXPCount = h.doubleXP || 0;
            if (lootDrop.type === 'xp') {
              // Bonus XP from loot — applied on top of battle XP
              updates.bonusXP = (h.bonusXP || 0) + lootDrop.value;
            } else if (lootDrop.type === 'coins') {
              updates.courageCoins = (updates.courageCoins || 0) + lootDrop.value;
            } else if (lootDrop.type === 'lantern') {
              updates.lanterns = (updates.lanterns || 0) + lootDrop.value;
            } else if (lootDrop.type === 'double_xp') {
              updates.doubleXP = doubleXPCount + lootDrop.value;
            } else if (lootDrop.type === 'collectible') {
              collectibles.push({
                id: lootDrop.id,
                name: lootDrop.name,
                date: new Date().toISOString(),
              });
              updates.collectibles = collectibles;
            }
          }
          if (newAchievements.length > 0) {
            updates.achievements = [...(h.achievements || []), ...newAchievements];
          }
          updates.totalXP = totalXP;
          updates.playerLevel = playerLevel;
          if (evidenceForBattle.length > 0) {
            updates.evidenceCards = [...(h.evidenceCards || []), ...evidenceForBattle];
          }
          return { ...h, ...updates };
        });
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await saveProgress(user.id, {
            screen: 'map',
            hero,
            quest: newQuest,
            battle_history: newHistory,
          });
          await saveBattleRecord(user.id, battleRecord);
        }
      } else if (outcome === 'partial') {
        const sudsDrop = (suds?.before || 0) - (suds?.after || 0);
        const isRepeat = activeBoss?.id?.startsWith('repeat_');
        const newQuest = {
          ...quest,
          bosses: quest.bosses.map((b) => {
            if (b.id !== activeBoss.id && !(isRepeat && b.name === activeBoss?.name)) return b;
            const prevAttempts = b.attempts || 0;
            const prevBest = b.bestSudsDrop || 0;
            return {
              ...b,
              hp: Math.max(0, b.hp - 50),
              attempts: isRepeat ? prevAttempts + 1 : prevAttempts || 1,
              lastPracticedAt: new Date().toISOString(),
              bestSudsDrop: Math.max(prevBest, sudsDrop),
            };
          }),
        };
        setQuest(newQuest);
        setHero((h) => {
          const updates = {
            courageCoins: (h.courageCoins || 0) + coinsEarned,
            diamonds: (h.diamonds || 0) + diamondsEarned,
            streakCount: streakUpdate.streakCount,
            lanterns: streakUpdate.lanterns,
            bestStreak: streakUpdate.bestStreak,
            lastActiveDate: streakUpdate.lastActiveDate,
            totalXP: totalXP,
            playerLevel: playerLevel,
            pendingLetter: letter,
            pendingLetterDate: new Date().toISOString(),
          };
          // Partial outcome also applies loot rewards (minus stat upgrades)
          if (lootDrop) {
            if (lootDrop.type === 'xp') {
              updates.bonusXP = (h.bonusXP || 0) + lootDrop.value;
            } else if (lootDrop.type === 'coins') {
              updates.courageCoins = (updates.courageCoins || 0) + lootDrop.value;
            } else if (lootDrop.type === 'lantern') {
              updates.lanterns = (updates.lanterns || 0) + lootDrop.value;
            } else if (lootDrop.type === 'double_xp') {
              updates.doubleXP = (h.doubleXP || 0) + lootDrop.value;
            } else if (lootDrop.type === 'collectible') {
              const collectibles = h.collectibles || [];
              collectibles.push({
                id: lootDrop.id,
                name: lootDrop.name,
                date: new Date().toISOString(),
              });
              updates.collectibles = collectibles;
            }
          }
          if (newAchievements.length > 0) {
            updates.achievements = [...(h.achievements || []), ...newAchievements];
          }
          if (evidenceForBattle.length > 0) {
            updates.evidenceCards = [...(h.evidenceCards || []), ...evidenceForBattle];
          }
          return { ...h, ...updates };
        });
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await saveProgress(user.id, {
            screen: 'map',
            hero,
            quest: newQuest,
            battle_history: newHistory,
          });
          await saveBattleRecord(user.id, battleRecord);
        }
      }
      setActiveBoss(null);
      setScreen('map');

      // Generate evidence cards from this battle
      const originalBoss = quest.bosses.find(
        (b) => b.name === activeBoss?.name && b.id !== activeBoss?.id,
      );
      const bossCompletions = isRepeat
        ? (originalBoss?.completions || 0) + 1
        : outcome === 'victory'
          ? 1
          : 0;
      const evidenceForBattle = generateEvidenceCards({
        ...battleRecord,
        bossId: activeBoss?.id,
        masteryLevel: isRepeat ? originalBoss?.masteryLevel || 'uncharted' : null,
        bossCompletions,
        battleId: newHistory.length,
      });

      // Return celebration data for the caller to display
      const { unlocked: newAchObjects } =
        newAchievements.length > 0
          ? {
              unlocked: newAchievements.map((id) =>
                ({ id, ...ACHIEVEMENTS.find((a) => a.id === id) }).filter(Boolean),
              ),
            }
          : { unlocked: [] };

      // Check and award weekly challenge rewards
      const challenges = getWeeklyChallenges(hero.darerId);
      const weekStats = {
        weeklyBattles: newHistory.filter((b) => {
          const d = new Date(b.date);
          return d >= new Date(Date.now() - 7 * 86400000);
        }).length,
        maxBossLevel: Math.max(
          ...newHistory
            .filter((b) => {
              const d = new Date(b.date);
              return d >= new Date(Date.now() - 7 * 86400000);
            })
            .map((b) => {
              const boss = quest.bosses?.find((qb) => qb.id === b.bossId);
              return boss?.level || boss?.difficulty || 1;
            })
            .concat([0]),
        ),
        activeDays: new Set(
          newHistory
            .filter((b) => {
              const d = new Date(b.date);
              return d >= new Date(Date.now() - 7 * 86400000);
            })
            .map((b) => new Date(b.date).toDateString()),
        ).size,
        bestSudsDrop: Math.max(
          ...newHistory
            .map((b) => {
              const peak = b.suds?.during ?? b.suds?.before ?? 0;
              const after = b.suds?.after ?? 0;
              return peak - after;
            })
            .filter((v) => v > 0),
          0,
        ),
        uniqueBossTypes: new Set(
          newHistory
            .filter((b) => {
              const d = new Date(b.date);
              return d >= new Date(Date.now() - 7 * 86400000);
            })
            .map((b) => b.bossId),
        ).size,
        repeats: newHistory.filter((b) => {
          const d = new Date(b.date);
          return d >= new Date(Date.now() - 7 * 86400000) && b.bossId?.startsWith('repeat_');
        }).length,
        lootSaved: newHistory.filter((b) => {
          const d = new Date(b.date);
          return d >= new Date(Date.now() - 7 * 86400000) && (b.lootImage || b.lootText);
        }).length,
        minSudsAfter: Math.min(
          ...newHistory
            .filter((b) => {
              const d = new Date(b.date);
              return d >= new Date(Date.now() - 7 * 86400000) && b.suds?.after !== undefined;
            })
            .map((b) => b.suds.after)
            .concat([100]),
        ),
        toolsUsed: new Set(
          newHistory
            .filter((b) => {
              const d = new Date(b.date);
              return d >= new Date(Date.now() - 7 * 86400000) && b.exposureArmory;
            })
            .map((b) => b.exposureArmory),
        ).size,
      };
      const weeklyResults = checkWeeklyChallenges(challenges, weekStats);
      const weeklyRewards = weeklyResults
        .filter((ch) => ch.completed)
        .reduce(
          (acc, ch) => ({
            coins: acc.coins + (ch.reward?.coins || 0),
            xp: acc.xp + (ch.reward?.xp || 0),
          }),
          { coins: 0, xp: 0 },
        );

      return {
        outcome,
        bossName: battleRecord.bossName,
        coinsEarned: coinsEarned + weeklyRewards.coins,
        diamondsEarned,
        xpEarned: xpEarned + weeklyRewards.xp,
        playerLevel,
        prevLevel: hero.playerLevel || 1,
        newAchievements: newAchObjects,
        lootDrop,
        streakCount: streakUpdate.streakCount,
        hasLetter: true,
        sudsDrop: (suds?.before || 0) - (suds?.after || 0),
        xpBreakdown,
        weeklyChallengeRewards:
          weeklyRewards.coins > 0 || weeklyRewards.xp > 0 ? weeklyRewards : null,
        evidenceCards: evidenceForBattle,
      };
    },
    [
      activeBoss,
      hero,
      quest,
      battleHistory,
      setQuest,
      setHero,
      setActiveBoss,
      setScreen,
      setBattleHistory,
    ],
  );

  const handleTutorialComplete = useCallback(
    async (details = {}) => {
      const {
        lootImage,
        lootText,
        chosenExposure,
        engageOutcome,
        sudsBefore,
        sudsAfter,
        decideWhy,
        exposureWhen,
        exposureWhere,
        exposureArmory,
      } = details;

      // Record activity for streak tracking (tutorial counts as first exposure)
      const streakUpdate = recordActivity({
        streakCount: hero.streakCount || 0,
        lanterns: hero.lanterns || 0,
        bestStreak: hero.bestStreak || 0,
        isRepeat: false,
      });

      // Fixed XP for tutorial: 50 base + SUDS bonus
      const sudsDelta = (sudsBefore || 0) - (sudsAfter || 0);
      const sudsBonus = sudsDelta > 0 ? Math.floor(sudsDelta / 10) * 10 : 0;
      const xpEarned = 50 + sudsBonus;
      const coinsEarned = 5; // Tutorial always awards 5 coins

      // XP breakdown for BattleRewardScreen
      const xpBreakdown = [
        { label: 'First Exposure', xp: 50 },
        { label: 'SUDS Check-in', xp: 25 },
        { label: 'Reflection', xp: 25 },
      ];
      if (sudsBonus > 0) xpBreakdown.push({ label: 'SUDS Drop Bonus', xp: sudsBonus });

      // Update hero state
      setHero((h) => {
        const totalXP = (h.totalXP || 0) + xpEarned;
        const playerLevel = getPlayerLevel(totalXP);
        const updates = {
          totalXP,
          playerLevel,
          courageCoins: (h.courageCoins || 0) + coinsEarned,
          streakCount: streakUpdate.streakCount,
          lanterns: streakUpdate.lanterns,
          bestStreak: streakUpdate.bestStreak,
          lastActiveDate: streakUpdate.lastActiveDate,
        };

        // Award lantern loot
        updates.lanterns = (updates.lanterns || 0) + 1;

        // Check achievements for first exposure
        const prevAchievements = h.achievements || [];
        const { unlocked: newAchievements } = checkAchievements(
          {
            defeatedCount: 1,
            victoryCount: engageOutcome === 'full' ? 1 : 0,
            streakCount: streakUpdate.streakCount,
            coins: (h.courageCoins || 0) + coinsEarned,
            maxSudsDrop: sudsDelta > 0 ? sudsDelta : 0,
            lootCount: lootImage || lootText ? 1 : 0,
            repeatCount: 0,
            nightBattles: 0,
            allDiffTiers: 1,
            customBossCount: 0,
            zonesVisited: 1,
            bestRepeatSudsDrop: 0,
            minRepeatSudsAfter: 100,
            repeatVariations: 0,
          },
          prevAchievements,
        );
        if (newAchievements.length > 0) {
          updates.achievements = [...prevAchievements, ...newAchievements];
        }

        return { ...h, ...updates };
      });

      // Save to Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const tutorialRecord = {
          bossId: chosenExposure?.id || 'tutorial',
          bossName: chosenExposure?.text || 'Tutorial Exposure',
          bossDesc: chosenExposure?.where || '',
          outcome: engageOutcome || 'tried',
          date: new Date().toISOString(),
          suds_before: sudsBefore ?? null,
          suds_after: sudsAfter ?? null,
          prep_value: decideWhy || '',
          exposure_when: exposureWhen || '',
          exposure_where: exposureWhere || '',
          exposure_armory: exposureArmory || '',
          loot_text: lootText || '',
          loot_image_url: lootImage || null,
          is_tutorial: true,
          battle_chat_message_count: (details.coachMessages || []).length,
        };

        await saveProgress(user.id, {
          screen: 'exposureSort',
          hero,
          quest,
          tutorial_complete: true,
          tutorial_loot: { image: lootImage, text: lootText },
        });
        await saveBattleRecord(user.id, tutorialRecord);
      }

      // Return celebration payload (caller handles navigation after celebration)
      const bossName = chosenExposure?.text || 'Tutorial Exposure';

      return {
        outcome: engageOutcome === 'full' ? 'victory' : engageOutcome === 'partial' ? 'partial' : 'retreat',
        bossName,
        xpEarned,
        coinsEarned,
        diamondsEarned: 0,
        playerLevel: hero.playerLevel || 1,
        prevLevel: hero.playerLevel || 1,
        newAchievements: [],
        lootDrop: {
          id: 'lantern',
          name: 'Streak Lantern',
          icon: '🏮',
          type: 'lantern',
          value: 1,
          rarity: 'uncommon',
          description: 'Your first lantern — your path stays lit',
        },
        streakCount: streakUpdate.streakCount,
        hasLetter: false,
        sudsDrop: sudsDelta,
        xpBreakdown,
        weeklyChallengeRewards: null,
        evidenceCards: [],
      };
    },
    [hero, quest, setHero],
  );

  return {
    handleCharacterComplete,
    handleIntakeComplete,
    handleBossVictory,
    handleTutorialComplete,
  };
}
