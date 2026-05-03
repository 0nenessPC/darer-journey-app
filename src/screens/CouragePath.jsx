import React from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
import BottomNav from '../components/BottomNav';
import { getWeeklyChallenges, checkWeeklyChallenges } from '../constants/weeklyChallenges';

/** Compute derived stats from battleHistory */
function useCourageStats(battleHistory, quest, hero) {
  const battles = battleHistory || [];
  const totalBattles = battles.length;
  const victories = battles.filter((b) => b.outcome === 'victory').length;
  const partials = battles.filter((b) => b.outcome === 'partial').length;
  const retreats = battles.filter((b) => b.outcome === 'retreat').length;

  // SUDS data points (battles with before+after)
  const sudsPoints = battles
    .filter((b) => b.suds && b.suds.before !== undefined && b.suds.after !== undefined)
    .map((b) => ({
      date: b.date,
      before: b.suds.before,
      after: b.suds.after,
      drop: b.suds.before - b.suds.after,
      bossName: b.bossName,
      outcome: b.outcome,
    }));

  // Averages
  const avgBefore =
    sudsPoints.length > 0
      ? Math.round(sudsPoints.reduce((s, p) => s + p.before, 0) / sudsPoints.length)
      : null;
  const avgAfter =
    sudsPoints.length > 0
      ? Math.round(sudsPoints.reduce((s, p) => s + p.after, 0) / sudsPoints.length)
      : null;
  const avgDrop =
    sudsPoints.length > 0
      ? Math.round(sudsPoints.reduce((s, p) => s + p.drop, 0) / sudsPoints.length)
      : null;

  // Personal bests
  const biggestDrop =
    sudsPoints.length > 0
      ? sudsPoints.reduce((best, p) => (p.drop > best.drop ? p : best), sudsPoints[0])
      : null;
  const highestSUDS =
    sudsPoints.length > 0
      ? sudsPoints.reduce((max, p) => (p.before > max.before ? p : max), sudsPoints[0])
      : null;
  const lowestAfter =
    sudsPoints.length > 0
      ? sudsPoints.reduce((min, p) => (p.after < min.after ? p : min), sudsPoints[0])
      : null;

  // Repeat exposures (same boss name appears multiple times)
  const bossCounts = {};
  battles.forEach((b) => {
    const name = b.bossName || 'Unknown';
    bossCounts[name] = (bossCounts[name] || 0) + 1;
  });
  const repeatedBosses = Object.entries(bossCounts)
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }));
  const totalRepeats = repeatedBosses.reduce((s, r) => s + (r.count - 1), 0);

  // Most repeated boss
  const mostRepeated =
    repeatedBosses.length > 0
      ? repeatedBosses.reduce((max, r) => (r.count > max.count ? r : max), repeatedBosses[0])
      : null;

  // Courage level: derived from cumulative XP (level-weighted)
  const defeatedCount = (quest.bosses || []).filter((b) => b.defeated).length;
  const totalXP =
    hero.totalXP ||
    battles.reduce((xp, b) => {
      const boss = quest.bosses?.find((qb) => qb.id === b.bossId);
      const level = boss?.level || boss?.difficulty || 1;
      const baseXP = Math.round(level * 50);
      const dropBonus =
        b.suds && b.suds.before !== undefined && b.suds.after !== undefined
          ? Math.floor((b.suds.before - b.suds.after) / 10) * 10
          : 0;
      const repeatMultiplier = bossCounts[b.bossName || ''] > 1 ? 1.5 : 1;
      return xp + Math.round((baseXP + dropBonus) * repeatMultiplier);
    }, 0);
  const courageLevel = hero.playerLevel || Math.floor(totalXP / 300) + 1;
  const xpInCurrentLevel = totalXP % 300;

  // Streak: count consecutive days with battles ending today or yesterday
  const battleDates = [...new Set(battles.map((b) => b.date.slice(0, 10)))].sort().reverse();
  let streak = 0;
  if (battleDates.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (battleDates[0] === today || battleDates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < battleDates.length; i++) {
        const prev = new Date(battleDates[i - 1] + 'T00:00:00');
        const curr = new Date(battleDates[i] + 'T00:00:00');
        const diff = Math.round((prev - curr) / 86400000);
        if (diff === 1) streak++;
        else break;
      }
    }
  }

  return {
    totalBattles,
    victories,
    partials,
    retreats,
    sudsPoints,
    avgBefore,
    avgAfter,
    avgDrop,
    biggestDrop,
    highestSUDS,
    lowestAfter,
    repeatedBosses,
    totalRepeats,
    mostRepeated,
    courageLevel,
    totalXP,
    xpInCurrentLevel,
    defeatedCount,
    streak,
    battleDates,
  };
}

/** SVG SUDS trend line chart */
function SudsChart({ sudsPoints, width = 340, height = 140 }) {
  if (sudsPoints.length < 2) return null;

  const padL = 30,
    padR = 10,
    padT = 15,
    padB = 25;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const points = sudsPoints.map((p, i) => ({
    x: padL + (i / (sudsPoints.length - 1)) * chartW,
    beforeY: padT + chartH - (p.before / 100) * chartH,
    afterY: padT + chartH - (p.after / 100) * chartH,
    drop: p.drop,
  }));

  const beforeLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.beforeY}`).join(' ');
  const afterLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.afterY}`).join(' ');

  // Drop zone fill (area between before and after lines)
  const dropFill =
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.beforeY}`).join(' ') +
    ' ' +
    [...points]
      .reverse()
      .map((p) => `L${p.x},${p.afterY}`)
      .join(' ') +
    ' Z';

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {yLabels.map((v) => {
        const y = padT + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke={C.mutedBorder}
              strokeWidth="0.5"
              strokeDasharray="2,3"
            />
            <text
              x={padL - 4}
              y={y + 3}
              textAnchor="end"
              fill={C.grayLt}
              fontSize="7"
              fontFamily={PIXEL_FONT}
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Drop zone fill */}
      <path d={dropFill} fill={C.hpGreen} opacity="0.12" />

      {/* Before line (red) */}
      <path d={beforeLine} fill="none" stroke={C.bossRed} strokeWidth="2" strokeLinejoin="round" />

      {/* After line (green) */}
      <path d={afterLine} fill="none" stroke={C.hpGreen} strokeWidth="2" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.beforeY} r="3" fill={C.bossRed} />
          <circle cx={p.x} cy={p.afterY} r="3" fill={C.hpGreen} />
        </g>
      ))}

      {/* X-axis: battle count */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 2}
          textAnchor="middle"
          fill={C.grayLt}
          fontSize="6"
          fontFamily={PIXEL_FONT}
        >
          #{i + 1}
        </text>
      ))}

      {/* Legend */}
      <circle cx={padL + 4} cy={padT - 6} r="3" fill={C.bossRed} />
      <text x={padL + 10} y={padT - 3} fill={C.bossRed} fontSize="6" fontFamily={PIXEL_FONT}>
        BEFORE
      </text>
      <circle cx={padL + 54} cy={padT - 6} r="3" fill={C.hpGreen} />
      <text x={padL + 60} y={padT - 3} fill={C.hpGreen} fontSize="6" fontFamily={PIXEL_FONT}>
        AFTER
      </text>
    </svg>
  );
}

/** Stat card with icon + label + value */
function StatCard({ icon, label, value, subtext, color }) {
  return (
    <div
      style={{
        padding: C.padLg,
        background: C.cardBg,
        border: `2px solid ${color}40`,
        borderRadius: 6,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <PixelText size={12} color={color} style={{ display: 'block' }}>
        {value}
      </PixelText>
      <PixelText size={6} color={C.grayLt} style={{ display: 'block', marginTop: 2 }}>
        {label}
      </PixelText>
      {subtext && (
        <PixelText size={6} color={color} style={{ display: 'block', marginTop: 4, opacity: 0.7 }}>
          {subtext}
        </PixelText>
      )}
    </div>
  );
}

/** Personal best card */
function PersonalBest({ icon, label, value, color }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: color + '08',
        border: `1px solid ${color}30`,
        borderRadius: 4,
        marginBottom: 6,
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <PixelText size={8} color={color} style={{ display: 'block' }}>
          {value}
        </PixelText>
        <PixelText size={6} color={C.grayLt}>
          {label}
        </PixelText>
      </div>
    </div>
  );
}

export default function CouragePath({ hero, quest, battleHistory, onBack, setScreen }) {
  const collectibles = hero.collectibles || [];
  const stats = useCourageStats(battleHistory, quest, hero);

  const hasData = stats.totalBattles > 0;

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '16px 16px 100px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 0',
          borderBottom: `2px solid ${C.mutedBorder}`,
          marginBottom: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <PixelText size={9} color={C.subtleText}>
            ←
          </PixelText>
        </button>
        <PixelText size={10} color={C.goalGold}>
          🏮 COURAGE PATH
        </PixelText>
      </div>

      {/* Courage Level Banner */}
      <div
        style={{
          padding: C.padLg,
          background: C.goalGold + '10',
          border: `2px solid ${C.goalGold}40`,
          borderRadius: 6,
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        <PixelText size={8} color={C.subtleText} style={{ display: 'block', marginBottom: 4 }}>
          COURAGE LEVEL
        </PixelText>
        <PixelText size={20} color={C.goalGold} style={{ display: 'block' }}>
          {stats.courageLevel}
        </PixelText>
        <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginTop: 2 }}>
          {stats.totalXP} total XP · {stats.xpInCurrentLevel}/300 to next level
        </PixelText>
        {/* XP progress bar */}
        <div
          style={{
            height: 6,
            background: C.cardBg,
            borderRadius: 3,
            marginTop: 8,
            border: `1px solid ${C.goalGold}20`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(stats.xpInCurrentLevel / 300) * 100}%`,
              background: C.goalGold,
              borderRadius: 3,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Weekly Challenges */}
      {(() => {
        const challenges = getWeeklyChallenges(hero.weeklySeed);
        const weekStats = {
          weeklyBattles: battleHistory.filter((b) => {
            const battleDate = new Date(b.date);
            const weekAgo = new Date(Date.now() - 7 * 86400000);
            return battleDate >= weekAgo;
          }).length,
          maxBossLevel: Math.max(
            ...battleHistory
              .filter((b) => {
                const battleDate = new Date(b.date);
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return battleDate >= weekAgo;
              })
              .map((b) => {
                const boss = quest.bosses?.find((qb) => qb.id === b.bossId);
                return boss?.level || boss?.difficulty || 1;
              })
              .concat([0]),
          ),
          activeDays: new Set(
            battleHistory
              .filter((b) => {
                const battleDate = new Date(b.date);
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return battleDate >= weekAgo;
              })
              .map((b) => b.date.slice(0, 10)),
          ).size,
          bestSudsDrop: Math.max(
            ...battleHistory
              .filter((b) => {
                const battleDate = new Date(b.date);
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return battleDate >= weekAgo;
              })
              .map((b) => (b.suds?.before || 0) - (b.suds?.after || 0))
              .concat([0]),
          ),
          uniqueBossTypes: new Set(
            battleHistory
              .filter((b) => {
                const battleDate = new Date(b.date);
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return battleDate >= weekAgo;
              })
              .map((b) => b.bossName),
          ).size,
          repeats: battleHistory.filter((b) => {
            const battleDate = new Date(b.date);
            const weekAgo = new Date(Date.now() - 7 * 86400000);
            return battleDate >= weekAgo && b.bossId?.startsWith('repeat_');
          }).length,
          lootSaved: battleHistory.filter((b) => {
            const battleDate = new Date(b.date);
            const weekAgo = new Date(Date.now() - 7 * 86400000);
            return battleDate >= weekAgo && (b.lootImage || b.lootText);
          }).length,
          minSudsAfter: Math.min(
            ...battleHistory
              .filter((b) => {
                const battleDate = new Date(b.date);
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return battleDate >= weekAgo && b.suds?.after !== undefined;
              })
              .map((b) => b.suds.after)
              .concat([100]),
          ),
          toolsUsed: new Set(
            battleHistory
              .filter((b) => {
                const battleDate = new Date(b.date);
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return battleDate >= weekAgo && b.exposureArmory;
              })
              .map((b) => b.exposureArmory),
          ).size,
        };
        const weeklyResults = checkWeeklyChallenges(challenges, weekStats);
        const completedCount = weeklyResults.filter((c) => c.completed).length;

        return (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <PixelText size={9} color={C.goalGold}>
                ⚡ WEEKLY CHALLENGES
              </PixelText>
              <PixelText size={7} color={completedCount > 0 ? C.hpGreen : C.grayLt}>
                {completedCount}/{challenges.length}
              </PixelText>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weeklyResults.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    padding: C.padMd,
                    background: ch.completed ? C.hpGreen + '10' : C.cardBg,
                    border: `2px solid ${ch.completed ? C.hpGreen + '60' : C.mutedBorder}`,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: ch.completed ? 1 : 0.7,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{ch.icon}</span>
                  <div style={{ flex: 1 }}>
                    <PixelText
                      size={7}
                      color={ch.completed ? C.hpGreen : C.cream}
                      style={{ display: 'block' }}
                    >
                      {ch.name}
                    </PixelText>
                    <PixelText size={6} color={C.grayLt}>
                      {ch.desc}
                    </PixelText>
                  </div>
                  {ch.completed ? (
                    <PixelText size={8} color={C.hpGreen}>
                      ✓
                    </PixelText>
                  ) : (
                    <PixelText size={6} color={C.goldMd}>
                      +{ch.reward.coins}🪙
                    </PixelText>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {!hasData ? (
        /* Empty state */
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚔️</div>
          <PixelText size={10} color={C.goldMd} style={{ display: 'block', marginBottom: 8 }}>
            YOUR PATH AWAITS
          </PixelText>
          <PixelText size={8} color={C.grayLt} style={{ display: 'block', lineHeight: 1.8 }}>
            Complete your first exposure battle{'\n'}and your courage journey will{'\n'}appear here.
            Every step counts.
          </PixelText>
        </div>
      ) : (
        <>
          {/* SUDS Trend Chart */}
          <div style={{ marginBottom: 16 }}>
            <PixelText size={9} color={C.goldMd} style={{ display: 'block', marginBottom: 8 }}>
              STORM DROP OVER TIME
            </PixelText>
            <div
              style={{
                padding: C.padLg,
                background: C.cardBg,
                border: `2px solid ${C.mutedBorder}`,
                borderRadius: 6,
              }}
            >
              {stats.sudsPoints.length >= 2 ? (
                <SudsChart sudsPoints={stats.sudsPoints} />
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <PixelText size={7} color={C.grayLt}>
                    Need at least 2 battles to show trends
                  </PixelText>
                </div>
              )}
              {stats.avgBefore !== null && stats.avgAfter !== null && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 16,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${C.mutedBorder}`,
                  }}
                >
                  <PixelText size={7} color={C.bossRed}>
                    Avg before: {stats.avgBefore}
                  </PixelText>
                  <PixelText size={7} color={C.hpGreen}>
                    Avg after: {stats.avgAfter}
                  </PixelText>
                  {stats.avgDrop !== null && (
                    <PixelText size={7} color={C.hpGreen}>
                      Avg drop: {stats.avgDrop}
                    </PixelText>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <PixelText size={9} color={C.goldMd} style={{ display: 'block', marginBottom: 8 }}>
            BATTLE RECORD
          </PixelText>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <StatCard icon="⚔️" label="Total battles" value={stats.totalBattles} color={C.cream} />
            <StatCard icon="🏆" label="Victories" value={stats.victories} color={C.hpGreen} />
            <StatCard
              icon="🔄"
              label="Repeats"
              value={stats.totalRepeats}
              color={C.teal}
              subtext={
                stats.mostRepeated
                  ? `"${stats.mostRepeated.name}" ${stats.mostRepeated.count}x`
                  : ''
              }
            />
            <StatCard
              icon="🏮"
              label="Day streak"
              value={stats.streak}
              color={C.goldMd}
              subtext={
                hero.bestStreak > 0
                  ? `Best: ${hero.bestStreak} days`
                  : stats.streak > 0
                    ? 'Keep it going!'
                    : 'Practice today!'
              }
            />
          </div>

          {/* Outcome breakdown bar */}
          <div style={{ marginBottom: 16 }}>
            <PixelText size={7} color={C.grayLt} style={{ display: 'block', marginBottom: 4 }}>
              Outcome breakdown
            </PixelText>
            <div
              style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}
            >
              {stats.totalBattles > 0 && (
                <>
                  <div
                    style={{
                      width: `${(stats.victories / stats.totalBattles) * 100}%`,
                      background: C.hpGreen,
                      borderRadius: 2,
                    }}
                  />
                  <div
                    style={{
                      width: `${(stats.partials / stats.totalBattles) * 100}%`,
                      background: C.amber,
                      borderRadius: 2,
                    }}
                  />
                  <div
                    style={{
                      width: `${(stats.retreats / stats.totalBattles) * 100}%`,
                      background: C.bossRed,
                      borderRadius: 2,
                    }}
                  />
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <PixelText size={6} color={C.hpGreen}>
                Victory: {stats.victories}
              </PixelText>
              <PixelText size={6} color={C.amber}>
                Partial: {stats.partials}
              </PixelText>
              <PixelText size={6} color={C.bossRed}>
                Retreat: {stats.retreats}
              </PixelText>
            </div>
          </div>

          {/* Personal Bests */}
          {(stats.biggestDrop || stats.highestSUDS || stats.lowestAfter) && (
            <div style={{ marginBottom: 16 }}>
              <PixelText size={9} color={C.goalGold} style={{ display: 'block', marginBottom: 8 }}>
                PERSONAL BESTS
              </PixelText>
              <div
                style={{
                  padding: C.padLg,
                  background: C.cardBg,
                  border: `2px solid ${C.goalGold}20`,
                  borderRadius: 6,
                }}
              >
                {stats.highestSUDS && (
                  <PersonalBest
                    icon="🔥"
                    label={`Faced "${stats.highestSUDS.bossName}" head-on`}
                    value={`Started at SUDS ${stats.highestSUDS.before}`}
                    color={C.bossRed}
                  />
                )}
                {stats.biggestDrop && (
                  <PersonalBest
                    icon="⚡"
                    label={`Biggest Storm drop on "${stats.biggestDrop.bossName}"`}
                    value={`SUDS ${stats.biggestDrop.before} → ${stats.biggestDrop.after} (${stats.biggestDrop.drop} drop)`}
                    color={C.hpGreen}
                  />
                )}
                {stats.lowestAfter && (
                  <PersonalBest
                    icon="🌟"
                    label={`Lowest anxiety after "${stats.lowestAfter.bossName}"`}
                    value={`Ended at SUDS ${stats.lowestAfter.after}`}
                    color={C.goldMd}
                  />
                )}
              </div>
            </div>
          )}

          {/* Repeat mastery section */}
          {stats.repeatedBosses.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <PixelText size={9} color={C.teal} style={{ display: 'block', marginBottom: 8 }}>
                REPEAT MASTERY
              </PixelText>
              {stats.repeatedBosses.map((r) => {
                // Find SUDS progression for this boss
                const bossBattles = stats.sudsPoints
                  .filter((p) => p.bossName === r.name)
                  .sort((a, b) => new Date(a.date) - new Date(b.date));
                const firstBefore = bossBattles[0]?.before;
                const lastAfter = bossBattles[bossBattles.length - 1]?.after;

                return (
                  <div
                    key={r.name}
                    style={{
                      padding: C.padMd,
                      background: C.cardBg,
                      border: `2px solid ${C.teal}30`,
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <PixelText size={8} color={C.teal}>
                        {r.name}
                      </PixelText>
                      <PixelText size={7} color={C.goldMd}>
                        {r.count} attempt{r.count > 1 ? 's' : ''}
                      </PixelText>
                    </div>
                    {firstBefore !== undefined && lastAfter !== undefined && (
                      <PixelText
                        size={6}
                        color={C.hpGreen}
                        style={{ display: 'block', marginTop: 4 }}
                      >
                        First SUDS before: {firstBefore} → Latest SUDS after: {lastAfter}
                      </PixelText>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dara's observation */}
          {stats.avgDrop !== null && stats.avgDrop > 15 && (
            <div
              style={{
                padding: C.padLg,
                background: C.plum + '08',
                border: `2px solid ${C.plum}30`,
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <PixelText size={7} color={C.plumMd} style={{ display: 'block', marginBottom: 4 }}>
                DARA'S OBSERVATION
              </PixelText>
              <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
                Your anxiety drops an average of{'\n'}
                {stats.avgDrop} points per battle. That's{'\n'}
                not luck — that's your nervous{'\n'}
                system learning. The Shadow is{'\n'}
                losing ground, {hero.name}.
              </PixelText>
            </div>
          )}

          {/* Collectibles / Loot Drops */}
          {collectibles.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <PixelText size={9} color={C.goalGold} style={{ display: 'block', marginBottom: 8 }}>
                SHADOW CRYSTALS
              </PixelText>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  padding: C.padLg,
                  background: C.cardBg,
                  border: `2px solid ${C.goalGold}20`,
                  borderRadius: 6,
                }}
              >
                {collectibles.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 6,
                      background: C.plum + '15',
                      border: `2px solid ${C.goalGold}40`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>💎</span>
                    <PixelText size={5} color={C.goldMd}>
                      #{i + 1}
                    </PixelText>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <BottomNav active="hero" onNav={setScreen} />
    </div>
  );
}
