/** Streak tracking with forgiving Lanterns — consistency without shame */

const MS_PER_DAY = 86400000;

export function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Called when the user opens the app. Updates streak based on time since last activity.
 * - Same day: no change
 * - 1 day gap (yesterday): no change (streak still alive, just needs activity to continue)
 * - 2+ day gap: use a lantern if available, otherwise reset to 0
 * Returns the updated streak state { streakCount, lanterns, wasReset }
 */
export function updateStreakOnOpen({ streakCount = 0, lastActiveDate, lanterns = 0 }) {
  const today = getTodayStr();
  if (lastActiveDate === today) {
    return { streakCount, lanterns, wasReset: false, isToday: true };
  }

  if (!lastActiveDate) {
    return { streakCount: 0, lanterns, wasReset: false, isToday: false };
  }

  const lastDate = new Date(lastActiveDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const gapDays = Math.round((todayDate - lastDate) / MS_PER_DAY);

  if (gapDays === 1) {
    // Yesterday — streak still alive, needs activity to continue
    return { streakCount, lanterns, wasReset: false, isToday: false };
  }

  if (gapDays >= 2) {
    if (lanterns > 0 && streakCount > 0) {
      // Use a lantern to protect the streak
      return {
        streakCount,
        lanterns: lanterns - 1,
        wasReset: false,
        usedLantern: true,
        isToday: false,
      };
    }
    // No lantern available — reset streak (gently)
    return { streakCount: 0, lanterns, wasReset: true, isToday: false };
  }

  return { streakCount, lanterns, wasReset: false, isToday: false };
}

/**
 * Called when the user completes meaningful activity (battle, practice, etc.).
 * Awards 1 lantern per activity, +1 bonus for repeat exposures.
 * Tracks best streak alongside current streak.
 */
export function recordActivity({
  streakCount = 0,
  lanterns = 0,
  bestStreak = 0,
  isRepeat = false,
}) {
  const today = getTodayStr();
  const newCount = streakCount + 1;
  // Award 1 lantern per exposure, +1 extra for repeats
  const lanternAward = isRepeat ? 2 : 1;
  const newLanterns = lanterns + lanternAward;
  const newBest = Math.max(bestStreak, newCount);
  return {
    streakCount: newCount,
    lanterns: newLanterns,
    lastActiveDate: today,
    bestStreak: newBest,
    lanternAward,
  };
}

/**
 * Friendly return message based on absence length.
 */
export function getReturnMessage({ wasReset, daysAway, streakCount }) {
  if (daysAway === 0) return null; // same day
  if (daysAway === 1) return `Welcome back. Ready for another step?`;
  if (daysAway <= 3) return `Good to see you again, {name}. Your path is waiting.`;
  if (wasReset)
    return `It's been ${daysAway} days. No guilt, no rush — your journey is still here.`;
  return `I kept your path lit, {name}. ${streakCount} days strong — welcome back.`;
}
