/** Streak tracking with forgiveness — protects streak with freeze tokens */

const MS_PER_DAY = 86400000;

export function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Called when the user opens the app. Updates streak based on time since last activity.
 * - Same day: no change
 * - 1 day gap (yesterday): no change (streak still alive, just needs activity to continue)
 * - 2+ day gap: use a freeze token if available, otherwise reset to 0
 * Returns the updated streak state { streakCount, streakFreezes, wasReset }
 */
export function updateStreakOnOpen({ streakCount = 0, lastActiveDate, streakFreezes = 0 }) {
  const today = getTodayStr();
  if (lastActiveDate === today) {
    return { streakCount, streakFreezes, wasReset: false, isToday: true };
  }

  if (!lastActiveDate) {
    return { streakCount: 0, streakFreezes, wasReset: false, isToday: false };
  }

  const lastDate = new Date(lastActiveDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const gapDays = Math.round((todayDate - lastDate) / MS_PER_DAY);

  if (gapDays === 1) {
    // Yesterday — streak still alive, needs activity to continue
    return { streakCount, streakFreezes, wasReset: false, isToday: false };
  }

  if (gapDays >= 2) {
    if (streakFreezes > 0 && streakCount > 0) {
      // Use a freeze token to protect the streak
      return {
        streakCount,
        streakFreezes: streakFreezes - 1,
        wasReset: false,
        usedFreeze: true,
        isToday: false,
      };
    }
    // No freeze available — reset streak
    return { streakCount: 0, streakFreezes, wasReset: true, isToday: false };
  }

  return { streakCount, streakFreezes, wasReset: false, isToday: false };
}

/**
 * Called when the user completes meaningful activity (battle, practice, etc.).
 * Increments streak and awards freeze token every 7 days.
 */
export function recordActivity({ streakCount = 0, streakFreezes = 0 }) {
  const today = getTodayStr();
  const newCount = streakCount + 1;
  const newFreezes = streakFreezes + (newCount >= 7 && newCount % 7 === 0 ? 1 : 0);
  return { streakCount: newCount, streakFreezes: newFreezes, lastActiveDate: today };
}

/**
 * Friendly return message based on absence length.
 */
export function getReturnMessage({ wasReset, daysAway, streakCount }) {
  if (daysAway === 0) return null; // same day
  if (daysAway === 1) return `Welcome back. Ready for another step?`;
  if (daysAway <= 3) return `Good to see you again, {name}. Your path is waiting.`;
  if (wasReset) return `It's been ${daysAway} days. No guilt, no rush — your journey is still here.`;
  return `I kept your streak warm, {name}. ${streakCount} days strong — welcome back.`;
}
