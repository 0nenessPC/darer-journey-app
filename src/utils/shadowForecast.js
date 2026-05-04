/** Weekly Shadow Forecast — personalized recap + re-engagement */

const FORECAST_MESSAGES = {
  // Active users (battled this week)
  active: [
    (ctx) =>
      `This week you faced ${ctx.weeklyBattles} shadow${ctx.weeklyBattles > 1 ? 's' : ''} and ${ctx.weeklyVictories} of them fell. The Shadow's getting weaker. Keep going.`,
    (ctx) =>
      `${ctx.weeklyBattles} battle${ctx.weeklyBattles > 1 ? 's' : ''} this week. Your best SUDS drop was ${ctx.bestSudsDrop} points. The Shadow lied about what you could handle — again.`,
    (ctx) =>
      `You've been brave this week, ${ctx.heroName}. ${ctx.weeklyBattles} exposures, ${ctx.weeklyVictories} victories. The path is clearing.`,
  ],

  // Inactive users (3-6 days)
  drifting: [
    (ctx) =>
      `It's been ${ctx.daysSinceLastBattle} days since your last battle. The Shadow doesn't rest when you do. I'm here when you're ready.`,
    (ctx) =>
      `Hey ${ctx.heroName}. The path's been quiet lately. That's okay. But the Shadow doesn't get weaker on its own. Want to face one today?`,
    (ctx) =>
      `${ctx.daysSinceLastBattle} days. You've faced harder things than coming back. I'll be here when you return.`,
  ],

  // Very inactive users (7+ days)
  absent: [
    (ctx) =>
      `I know coming back is the hardest part. It's been ${ctx.daysSinceLastBattle} days, and the Shadow probably told you it's too late to restart. It's wrong. Every path starts with one step — even this one.`,
    (ctx) =>
      `${ctx.heroName}, I remember when you defeated ${ctx.lastBossName}. That took real courage. Whatever made you step away doesn't matter now. What matters is that the path is still here. I'm still here.`,
    (ctx) =>
      `The Shadow thinks you've given up. Want to prove it wrong? Just one exposure. That's all I'm asking.`,
  ],
};

/** Generate a weekly shadow forecast message */
export function generateShadowForecast(hero, battleHistory) {
  const today = new Date();
  const lastBattle = battleHistory[battleHistory.length - 1];
  const daysSinceLastBattle = lastBattle
    ? Math.floor((today - new Date(lastBattle.date)) / 86400000)
    : 999;

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const weeklyBattles = battleHistory.filter((b) => new Date(b.date) >= weekAgo).length;
  const weeklyVictories = battleHistory.filter(
    (b) => new Date(b.date) >= weekAgo && b.outcome === 'victory',
  ).length;
  const bestSudsDrop = Math.max(
    ...battleHistory
      .filter((b) => new Date(b.date) >= weekAgo)
      .map((b) => (b.suds?.before || 0) - (b.suds?.after || 0))
      .concat([0]),
  );

  let category, messages;
  if (daysSinceLastBattle <= 2 && weeklyBattles > 0) {
    category = 'active';
    messages = FORECAST_MESSAGES.active;
  } else if (daysSinceLastBattle <= 6) {
    category = 'drifting';
    messages = FORECAST_MESSAGES.drifting;
  } else {
    category = 'absent';
    messages = FORECAST_MESSAGES.absent;
  }

  const ctx = {
    heroName: hero.name,
    daysSinceLastBattle,
    weeklyBattles,
    weeklyVictories,
    bestSudsDrop,
    lastBossName: lastBattle?.bossName || 'your last Shadow',
  };

  // Deterministic pick based on date so message doesn't change on refresh
  const seed = today.toDateString().length + ctx.weeklyBattles;
  const msg = messages[seed % messages.length](ctx);

  return { category, message: msg, daysSinceLastBattle };
}

/** Generate a Whisper From Dara TTS re-engagement message (shorter, voice-optimized) */
export function generateWhisperFromDara(hero, battleHistory) {
  const today = new Date();
  const lastBattle = battleHistory[battleHistory.length - 1];
  const daysSince = lastBattle ? Math.floor((today - new Date(lastBattle.date)) / 86400000) : 999;

  if (daysSince < 3) return null; // Only trigger after 3+ days

  const whispers = [
    `Hey ${hero.name}. It's been ${daysSince} days. The Shadow's been quiet. Too quiet. Want to see what's on the other side of that?`,
    `${hero.name}, I've been waiting. The path is still here. Your courage is still here. Just... a little rusty, that's all. One exposure?`,
    `The last thing you fought was ${lastBattle?.bossName || 'your last Shadow'}. You beat it. Whatever you're avoiding now — it's not as strong as you think.`,
    `I know coming back is hard. But staying away is harder. Trust me on that. Ready to face something today?`,
  ];

  const seed = today.toDateString().length + (hero.playerLevel || 1);
  return whispers[seed % whispers.length];
}
