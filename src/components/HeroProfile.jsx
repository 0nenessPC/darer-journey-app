import React, { useState } from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
import PracticeSession from '../components/PracticeSession';
import { supabase, saveArmoryPractice } from '../utils/supabase';
import BottomNav from './BottomNav';
import {
  ACHIEVEMENTS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getAchievement,
} from '../constants/achievements';
import {
  getToolLevel,
  getToolProgress,
  getSignatureTool,
  getMasteryTools,
} from '../utils/armoryGrowth';
import { summarizeEvidence, getCardTypeConfig } from '../utils/evidenceCards';
export default function HeroProfile({
  hero,
  setHero,
  quest,
  battleHistory = [],
  onBack,
  setScreen,
}) {
  const defeated = quest.bosses.filter((b) => b.defeated).length;
  const [activeTab, setActiveTab] = useState('hero');
  const [practiceMode, setPracticeMode] = useState(null);
  const [expandedBossId, setExpandedBossId] = useState(null);
  const [newAchievement, setNewAchievement] = useState(null);

  const incrementPractice = (toolId) => {
    setHero((h) => {
      let unlockedItem = null;
      const updatedArmory = (h.armory || []).map((item) => {
        if (item.id !== toolId) return item;
        const newCount = (item.practiceCount || 0) + 1;
        const newItem = { ...item, practiceCount: newCount };
        const nextIdx = (h.armory || []).findIndex((a) => a.id === toolId) + 1;
        const nextItem = (h.armory || [])[nextIdx];
        if (nextItem && !nextItem.unlocked && nextItem.unlockCondition) {
          const cond = nextItem.unlockCondition;
          if (cond.requiresToolId === toolId && newCount >= cond.practiceCount) {
            unlockedItem = nextItem;
            return { ...newItem, unlocked: true, practiceCount: nextItem.practiceCount };
          }
        }
        return newItem;
      });
      if (unlockedItem) setPracticeMode({ toolId, justUnlocked: unlockedItem });
      else setPracticeMode(null);
      return { ...h, armory: updatedArmory };
    });
  };

  const handleComplete = async (toolId) => {
    incrementPractice(toolId);
  };

  const armory = hero.armory || [];

  // Practice session running
  if (practiceMode && !practiceMode.justUnlocked) {
    const tool = armory.find((a) => a.id === practiceMode.toolId);
    return (
      <PracticeSession
        tool={tool}
        onComplete={async (practiceData) => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user && practiceData?.toolId) await saveArmoryPractice(user.id, practiceData);
          handleComplete(practiceData.toolId);
          setPracticeMode(null);
          setPracticeMode(null);
        }}
        onQuit={async (practiceData) => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user && practiceData?.toolId) await saveArmoryPractice(user.id, practiceData);
          setPracticeMode(null);
          setPracticeMode(null);
        }}
      />
    );
  }

  // Just unlocked notification
  if (practiceMode && practiceMode.justUnlocked) {
    const unlocked = practiceMode.justUnlocked;
    return (
      <div style={{ minHeight: '100vh', background: C.mapBg, padding: '20px 20px 100px' }}>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: 56,
              marginBottom: 16,
              animation: 'fearPulseScale 1.5s ease-in-out infinite',
            }}
          >
            {unlocked.icon}
          </div>
          <PixelText size={12} color={C.goldMd} style={{ display: 'block', marginBottom: 8 }}>
            NEW ARMORY ITEM UNLOCKED!
          </PixelText>
          <div
            style={{
              padding: C.padLg,
              background: C.cardBg,
              border: `3px solid ${C.goldMd}`,
              borderRadius: 6,
              marginBottom: 24,
            }}
          >
            <PixelText size={10} color={C.cream}>
              {unlocked.name}
            </PixelText>
            <div style={{ marginTop: 4 }}>
              <PixelText size={7} color={C.grayLt}>
                {unlocked.description}
              </PixelText>
            </div>
          </div>
          <PixelBtn
            onClick={() => {
              setPracticeMode(null);
              setPracticeMode(null);
            }}
            color={C.gold}
            textColor={C.charcoal}
            style={{ width: '100%' }}
          >
            CONTINUE
          </PixelBtn>
        </div>
        <style>{`@keyframes fearPulseScale { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '16px 16px 100px' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}
      >
        <PixelText size={8} color={C.grayLt}>
          ← BACK TO MAP
        </PixelText>
      </button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            margin: '0 auto 12px',
            borderRadius: 6,
            background: C.plum,
            border: `4px solid ${C.mutedBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PixelText size={32} color={C.goldMd}>
            ⚔
          </PixelText>
        </div>
        <PixelText size={14} color={C.cream}>
          {hero.name}
        </PixelText>
        <div style={{ marginTop: 4 }}>
          <PixelText size={8} color={C.goldMd}>
            {defeated}/{quest.bosses.length} BOSSES DEFEATED
          </PixelText>
        </div>
      </div>

      {/* Tab toggle: Hero / Log / Armory / Courage */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }} role="tablist">
        {[
          { key: 'hero', label: 'HERO' },
          { key: 'log', label: 'BATTLE LOG' },
          { key: 'evidence', label: '🛡️ EVIDENCE' },
          { key: 'armory', label: '⚗ ARMORY' },
          { key: 'courage', label: '🔥 COURAGE' },
          { key: 'achievements', label: '🏅 BADGES' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            style={{
              flex: 1,
              padding: '8px 0',
              border: `2px solid ${activeTab === tab.key ? C.goldMd : C.mutedBorder}`,
              borderRadius: 4,
              background: activeTab === tab.key ? C.goldMd + '20' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <PixelText size={7} color={activeTab === tab.key ? C.goldMd : C.grayLt}>
              {tab.label}
            </PixelText>
          </button>
        ))}
      </div>

      {activeTab === 'hero' && (
        <>
          {/* Sealed Values — Why I Fight */}
          {hero.values && hero.values.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <PixelText size={9} color={C.goalGold} style={{ display: 'block', marginBottom: 10 }}>
                WHY I FIGHT
              </PixelText>
              <div
                style={{
                  padding: 14,
                  background: C.goalGold + '08',
                  border: `2px solid ${C.goalGold}40`,
                  borderRadius: 6,
                }}
              >
                {hero.values.map((v) => (
                  <div
                    key={v.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}
                  >
                    <span style={{ fontSize: 14 }}>{v.icon}</span>
                    <PixelText size={7} color={C.goalGold}>
                      {v.text}
                    </PixelText>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <PixelText size={9} color={C.goldMd} style={{ display: 'block', marginBottom: 10 }}>
              JOURNEY GOAL
            </PixelText>
            <div
              style={{
                padding: 14,
                background: C.goalGold + '15',
                border: `2px solid ${C.goalGold}`,
                borderRadius: 4,
                textAlign: 'center',
              }}
            >
              <PixelText size={9} color={C.goalGold}>
                🏰 {quest.goal}
              </PixelText>
            </div>
          </div>

          {/* Completed Exposures */}
          {(() => {
            const completed = quest.bosses.filter((b) => b.defeated);
            if (completed.length === 0) return null;
            return (
              <div style={{ marginBottom: 20 }}>
                <PixelText
                  size={9}
                  color={C.hpGreen}
                  style={{ display: 'block', marginBottom: 10 }}
                >
                  COMPLETED EXPOSURES
                </PixelText>
                {completed.map((boss, idx) => (
                  <div key={boss.id} style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => setExpandedBossId(expandedBossId === boss.id ? null : boss.id)}
                      style={{
                        width: '100%',
                        padding: 10,
                        background: C.cardBg,
                        border: `2px solid ${expandedBossId === boss.id ? C.hpGreen : C.hpGreen + '40'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <PixelText size={8} color={C.hpGreen}>
                          ✓ {boss.name}
                        </PixelText>
                        <div>
                          <PixelText size={6} color={C.grayLt}>
                            {boss.desc}
                          </PixelText>
                        </div>
                      </div>
                      <PixelText size={10} color={C.grayLt}>
                        {expandedBossId === boss.id ? '▲' : '▼'}
                      </PixelText>
                    </button>

                    {expandedBossId === boss.id &&
                      (() => {
                        const battle = battleHistory?.find((b) => b.bossId === boss.id) || {};
                        return (
                          <div
                            style={{
                              marginTop: 4,
                              padding: 10,
                              background: C.cardBg,
                              border: `1px solid ${C.hpGreen}30`,
                              borderRadius: 4,
                            }}
                          >
                            <div style={{ textAlign: 'center', marginBottom: 6 }}>
                              <PixelText
                                size={9}
                                color={
                                  battle.outcome === 'victory'
                                    ? C.hpGreen
                                    : battle.outcome === 'partial'
                                      ? C.amber
                                      : C.bossRed
                                }
                              >
                                {battle.outcome === 'victory'
                                  ? 'VICTORY'
                                  : battle.outcome === 'partial'
                                    ? 'PARTIAL'
                                    : 'DEFEATED'}
                              </PixelText>
                            </div>
                            {battle.suds && battle.suds.before !== undefined && (
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-around',
                                  marginBottom: 6,
                                  padding: 6,
                                  background: C.warmDark,
                                  borderRadius: 4,
                                }}
                              >
                                <div style={{ textAlign: 'center' }}>
                                  <PixelText size={9} color={C.bossRed}>
                                    {battle.suds.before}
                                  </PixelText>
                                  <div>
                                    <PixelText size={6} color={C.grayLt}>
                                      BEFORE
                                    </PixelText>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <PixelText size={9} color={C.amber}>
                                    {battle.suds.during ?? battle.suds.peak}
                                  </PixelText>
                                  <div>
                                    <PixelText size={6} color={C.grayLt}>
                                      PEAK
                                    </PixelText>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <PixelText size={9} color={C.hpGreen}>
                                    {battle.suds.after}
                                  </PixelText>
                                  <div>
                                    <PixelText size={6} color={C.grayLt}>
                                      AFTER
                                    </PixelText>
                                  </div>
                                </div>
                              </div>
                            )}
                            {battle.date && (
                              <div style={{ marginBottom: 4 }}>
                                <PixelText size={6} color={C.grayLt}>
                                  Completed:{' '}
                                  {new Date(battle.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </PixelText>
                              </div>
                            )}
                            {battle.prepAnswers?.value && (
                              <div style={{ marginBottom: 4 }}>
                                <PixelText size={6} color={C.goldMd}>
                                  Value:
                                </PixelText>
                                <PixelText size={6} color={C.cream}>
                                  {' '}
                                  {battle.prepAnswers.value}
                                </PixelText>
                              </div>
                            )}
                            {battle.exposureArmory && (
                              <div style={{ marginBottom: 4 }}>
                                <PixelText size={6} color={C.goldMd}>
                                  Tool:
                                </PixelText>
                                <PixelText size={6} color={C.cream}>
                                  {' '}
                                  {battle.exposureArmory}
                                </PixelText>
                              </div>
                            )}
                            {battle.exposureWhen && (
                              <div style={{ marginBottom: 4 }}>
                                <PixelText size={6} color={C.goldMd}>
                                  When:
                                </PixelText>
                                <PixelText size={6} color={C.cream}>
                                  {' '}
                                  {battle.exposureWhen}
                                </PixelText>
                              </div>
                            )}
                            {battle.exposureWhere && (
                              <div style={{ marginBottom: 4 }}>
                                <PixelText size={6} color={C.goldMd}>
                                  Where:
                                </PixelText>
                                <PixelText size={6} color={C.cream}>
                                  {' '}
                                  {battle.exposureWhere}
                                </PixelText>
                              </div>
                            )}
                            {battle.exposureScheduledTime && (
                              <div style={{ marginBottom: 4 }}>
                                <PixelText size={6} color={C.goldMd}>
                                  Scheduled:
                                </PixelText>
                                <PixelText size={6} color={C.cream}>
                                  {' '}
                                  {new Date(battle.exposureScheduledTime).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </PixelText>
                              </div>
                            )}
                            {battle.battleMessages?.length > 0 && (
                              <details style={{ marginTop: 6 }}>
                                <summary style={{ cursor: 'pointer', marginBottom: 4 }}>
                                  <PixelText size={6} color={C.teal}>
                                    Battle conversation ({battle.battleMessages.length} messages)
                                  </PixelText>
                                </summary>
                                <div
                                  style={{
                                    maxHeight: 150,
                                    overflowY: 'auto',
                                    padding: 6,
                                    background: C.deepDark,
                                    borderRadius: 4,
                                    marginTop: 4,
                                  }}
                                >
                                  {battle.battleMessages.map((m, mi) => (
                                    <div key={mi} style={{ marginBottom: 3 }}>
                                      <PixelText
                                        size={6}
                                        color={m.role === 'assistant' ? C.rose : C.cream}
                                      >
                                        {m.role === 'assistant' ? 'Dara: ' : 'You: '}
                                        {m.text}
                                      </PixelText>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                            {battle.victoryMessages?.length > 0 && (
                              <details style={{ marginTop: 6 }}>
                                <summary style={{ cursor: 'pointer', marginBottom: 4 }}>
                                  <PixelText size={6} color={C.teal}>
                                    Victory reflection ({battle.victoryMessages.length} messages)
                                  </PixelText>
                                </summary>
                                <div
                                  style={{
                                    maxHeight: 150,
                                    overflowY: 'auto',
                                    padding: 6,
                                    background: C.deepDark,
                                    borderRadius: 4,
                                    marginTop: 4,
                                  }}
                                >
                                  {battle.victoryMessages.map((m, mi) => (
                                    <div key={mi} style={{ marginBottom: 3 }}>
                                      <PixelText
                                        size={6}
                                        color={m.role === 'assistant' ? C.rose : C.cream}
                                      >
                                        {m.role === 'assistant' ? 'Dara: ' : 'You: '}
                                        {m.text}
                                      </PixelText>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {activeTab === 'log' && (
        <>
          {quest.bosses.filter((b) => b.defeated).length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
              <PixelText size={9} color={C.grayLt}>
                No battles won yet.
              </PixelText>
              <div style={{ marginTop: 8 }}>
                <PixelText size={7} color={C.grayLt}>
                  Your journey awaits!
                </PixelText>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <PixelText size={8} color={C.grayLt}>
                  {battleHistory.length} battle{battleHistory.length !== 1 ? 's' : ''} recorded
                </PixelText>
                <button
                  onClick={() => setScreen('ladder')}
                  style={{
                    background: `${C.goalGold}20`,
                    border: `2px solid ${C.goalGold}60`,
                    borderRadius: 4,
                    padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <PixelText size={7} color={C.goalGold}>
                    📸 WALL OF FAME
                  </PixelText>
                </button>
              </div>
              {battleHistory
                .slice()
                .reverse()
                .map((battle, idx) => {
                  const boss = quest.bosses.find((b) => b.id === battle.bossId);
                  if (!boss) return null;
                  return (
                    <div key={battle.bossId || idx} style={{ marginBottom: 8 }}>
                      <button
                        onClick={() =>
                          setExpandedBossId(expandedBossId === battle.bossId ? null : battle.bossId)
                        }
                        style={{
                          width: '100%',
                          padding: 10,
                          background: C.cardBg,
                          border: `2px solid ${expandedBossId === battle.bossId ? C.hpGreen : C.hpGreen + '40'}`,
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <PixelText size={8} color={C.hpGreen}>
                            ✓ {boss.name}
                          </PixelText>
                          <div>
                            <PixelText size={6} color={C.grayLt}>
                              {boss.desc}
                            </PixelText>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <PixelText size={7} color={C.goldMd}>
                            +{battle.xpEarned ?? 100} XP
                          </PixelText>
                          <PixelText size={8} color={C.grayLt}>
                            {expandedBossId === battle.bossId ? '▲' : '▼'}
                          </PixelText>
                        </div>
                      </button>
                      {expandedBossId === battle.bossId && (
                        <div
                          style={{
                            marginTop: 4,
                            padding: 10,
                            background: C.cardBg,
                            border: `1px solid ${C.hpGreen}30`,
                            borderRadius: 4,
                          }}
                        >
                          <div style={{ textAlign: 'center', marginBottom: 6 }}>
                            <PixelText
                              size={9}
                              color={
                                battle.outcome === 'victory'
                                  ? C.hpGreen
                                  : battle.outcome === 'partial'
                                    ? C.amber
                                    : C.bossRed
                              }
                            >
                              {battle.outcome === 'victory'
                                ? 'VICTORY'
                                : battle.outcome === 'partial'
                                  ? 'PARTIAL'
                                  : 'DEFEATED'}
                            </PixelText>
                          </div>
                          {battle.suds && battle.suds.before !== undefined && (
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-around',
                                marginBottom: 6,
                                padding: 6,
                                background: C.warmDark,
                                borderRadius: 4,
                              }}
                            >
                              <div style={{ textAlign: 'center' }}>
                                <PixelText size={9} color={C.bossRed}>
                                  {battle.suds.before}
                                </PixelText>
                                <div>
                                  <PixelText size={6} color={C.grayLt}>
                                    BEFORE
                                  </PixelText>
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <PixelText size={9} color={C.amber}>
                                  {battle.suds.during ?? battle.suds.peak}
                                </PixelText>
                                <div>
                                  <PixelText size={6} color={C.grayLt}>
                                    PEAK
                                  </PixelText>
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <PixelText size={9} color={C.hpGreen}>
                                  {battle.suds.after}
                                </PixelText>
                                <div>
                                  <PixelText size={6} color={C.grayLt}>
                                    AFTER
                                  </PixelText>
                                </div>
                              </div>
                            </div>
                          )}
                          {battle.date && (
                            <div style={{ marginBottom: 4 }}>
                              <PixelText size={6} color={C.grayLt}>
                                Completed:{' '}
                                {new Date(battle.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </PixelText>
                            </div>
                          )}
                          {battle.prepAnswers?.value && (
                            <div style={{ marginBottom: 4 }}>
                              <PixelText size={6} color={C.goldMd}>
                                Value:
                              </PixelText>
                              <PixelText size={6} color={C.cream}>
                                {' '}
                                {battle.prepAnswers.value}
                              </PixelText>
                            </div>
                          )}
                          {battle.exposureArmory && (
                            <div style={{ marginBottom: 4 }}>
                              <PixelText size={6} color={C.goldMd}>
                                Tool:
                              </PixelText>
                              <PixelText size={6} color={C.cream}>
                                {' '}
                                {battle.exposureArmory}
                              </PixelText>
                            </div>
                          )}
                          {battle.exposureWhen && (
                            <div style={{ marginBottom: 4 }}>
                              <PixelText size={6} color={C.goldMd}>
                                When:
                              </PixelText>
                              <PixelText size={6} color={C.cream}>
                                {' '}
                                {battle.exposureWhen}
                              </PixelText>
                            </div>
                          )}
                          {battle.exposureWhere && (
                            <div style={{ marginBottom: 4 }}>
                              <PixelText size={6} color={C.goldMd}>
                                Where:
                              </PixelText>
                              <PixelText size={6} color={C.cream}>
                                {' '}
                                {battle.exposureWhere}
                              </PixelText>
                            </div>
                          )}
                          {battle.exposureScheduledTime && (
                            <div style={{ marginBottom: 4 }}>
                              <PixelText size={6} color={C.goldMd}>
                                Scheduled:
                              </PixelText>
                              <PixelText size={6} color={C.cream}>
                                {' '}
                                {new Date(battle.exposureScheduledTime).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </PixelText>
                            </div>
                          )}
                          {battle.battleMessages?.length > 0 && (
                            <details style={{ marginTop: 6 }}>
                              <summary style={{ cursor: 'pointer', marginBottom: 4 }}>
                                <PixelText size={6} color={C.teal}>
                                  Battle chat ({battle.battleMessages.length} messages)
                                </PixelText>
                              </summary>
                              <div
                                style={{
                                  maxHeight: 150,
                                  overflowY: 'auto',
                                  padding: 6,
                                  background: C.deepDark,
                                  borderRadius: 4,
                                  marginTop: 4,
                                }}
                              >
                                {battle.battleMessages.map((m, mi) => (
                                  <div key={mi} style={{ marginBottom: 3 }}>
                                    <PixelText
                                      size={6}
                                      color={m.role === 'assistant' ? C.rose : C.cream}
                                    >
                                      {m.role === 'assistant' ? 'Dara: ' : 'You: '}
                                      {m.text}
                                    </PixelText>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                          {battle.victoryMessages?.length > 0 && (
                            <details style={{ marginTop: 6 }}>
                              <summary style={{ cursor: 'pointer', marginBottom: 4 }}>
                                <PixelText size={6} color={C.teal}>
                                  Victory reflection ({battle.victoryMessages.length} messages)
                                </PixelText>
                              </summary>
                              <div
                                style={{
                                  maxHeight: 150,
                                  overflowY: 'auto',
                                  padding: 6,
                                  background: C.deepDark,
                                  borderRadius: 4,
                                  marginTop: 4,
                                }}
                              >
                                {battle.victoryMessages.map((m, mi) => (
                                  <div key={mi} style={{ marginBottom: 3 }}>
                                    <PixelText
                                      size={6}
                                      color={m.role === 'assistant' ? C.rose : C.cream}
                                    >
                                      {m.role === 'assistant' ? 'Dara: ' : 'You: '}
                                      {m.text}
                                    </PixelText>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </>
          )}
        </>
      )}

      {activeTab === 'armory' && (
        /* === ARMORY VIEW === */
        <>
          {/* Signature tool + mastery */}
          {(() => {
            const sig = getSignatureTool(armory);
            const masteryTools = getMasteryTools(armory);
            if (!sig) return null;
            return (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    padding: C.padMd,
                    background: C.cardBg,
                    border: `2px solid ${C.goalGold}40`,
                    borderRadius: 6,
                    textAlign: 'center',
                  }}
                >
                  <PixelText
                    size={7}
                    color={C.goalGold}
                    style={{ display: 'block', marginBottom: 4 }}
                  >
                    ⚔️ SIGNATURE TOOL
                  </PixelText>
                  <div style={{ fontSize: 28 }}>{sig.icon}</div>
                  <PixelText size={8} color={C.cream} style={{ display: 'block' }}>
                    {sig.name}
                  </PixelText>
                  <PixelText size={6} color={C.grayLt}>
                    Practiced {sig.practiceCount || 0}x ·{' '}
                    {getToolLevel(sig.practiceCount || 0).name}
                  </PixelText>
                </div>
                {masteryTools.length > 0 && (
                  <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <PixelText size={7} color={C.hpGreen}>
                      {masteryTools.map((t) => `${t.icon} ${t.name} ⭐⭐⭐`).join(' · ')}
                    </PixelText>
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ padding: C.padMd, textAlign: 'center' }}>
            <PixelText size={8} color={C.grayLt} style={{ display: 'block', marginBottom: 16 }}>
              Practice to level up tools
            </PixelText>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {armory.map((item, i) => {
              const isLocked = !item.unlocked;
              const cond = item.unlockCondition;
              const prevItem = armory.find((a) => a.id === cond?.requiresToolId);
              const progressNeeded = cond?.practiceCount || 2;
              const currentProgress = prevItem ? prevItem.practiceCount || 0 : 0;
              const progressPct = Math.min(1, currentProgress / progressNeeded);
              const toolLevel = !isLocked ? getToolLevel(item.practiceCount || 0) : null;
              const toolProg = !isLocked ? getToolProgress(item.practiceCount || 0) : null;

              return (
                <div
                  key={item.id}
                  style={{
                    padding: C.padLg,
                    borderRadius: 6,
                    background: isLocked ? C.lockedBg : C.cardBg,
                    border: `3px solid ${isLocked ? C.grayBorder : C.plum + '80'}`,
                    opacity: isLocked ? 0.55 : 1,
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        background: isLocked ? C.grayBg : C.plum + '20',
                        border: `2px solid ${isLocked ? C.grayBorderMid : C.plum + '60'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{item.icon}</span>
                      {!isLocked && toolLevel && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            background: C.cardBg,
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${C.goldMd}60`,
                          }}
                        >
                          <PixelText size={6} color={C.goldMd}>
                            {toolLevel.level}
                          </PixelText>
                        </div>
                      )}
                      {isLocked && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: C.grayBorder,
                            border: `2px solid ${C.grayBorderLt}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontSize: 9 }}>🔒</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PixelText size={9} color={isLocked ? C.grayLt : C.cream}>
                          {item.name}
                        </PixelText>
                        {!isLocked && toolLevel && (
                          <PixelText size={6} color={C.goldMd}>
                            {toolLevel.icon} {toolLevel.name}
                          </PixelText>
                        )}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        <PixelText size={6} color={C.grayLt}>
                          {item.description}
                        </PixelText>
                      </div>
                    </div>
                  </div>

                  {isLocked && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <PixelText size={6} color={C.amber}>
                          Practice {prevItem?.name || ''} to unlock
                        </PixelText>
                        <PixelText size={6} color={C.grayLt}>
                          {currentProgress}/{progressNeeded}
                        </PixelText>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: C.grayBg,
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${progressPct * 100}%`,
                            background: progressPct >= 1 ? C.hpGreen : C.amber,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {!isLocked && toolProg && toolProg.next && (
                    <div style={{ marginTop: 8, marginBottom: 6 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <PixelText size={6} color={C.teal}>
                          {item.practiceCount || 0}/{toolProg.next.practiceNeeded} to{' '}
                          {toolProg.next.name}
                        </PixelText>
                        <PixelText size={6} color={C.grayLt}>
                          {Math.round(toolProg.progress)}%
                        </PixelText>
                      </div>
                      <div
                        style={{
                          height: 4,
                          background: C.grayBg,
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${toolProg.progress}%`,
                            background: C.goldMd,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {!isLocked && (
                    <button
                      onClick={() => setPracticeMode({ toolId: item.id })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 4,
                        background: C.plum + '30',
                        border: `2px solid ${C.plum + '80'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <PixelText size={8} color={C.plumMd}>
                        PRACTICE →
                      </PixelText>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'courage' && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <PixelText size={10} color={C.goalGold} style={{ display: 'block', marginBottom: 8 }}>
            COURAGE PATH
          </PixelText>
          <PixelText
            size={8}
            color={C.grayLt}
            style={{ display: 'block', lineHeight: 1.8, marginBottom: 16 }}
          >
            See your SUDS trends, personal{'\n'}bests, repeat mastery, and{'\n'}your growing courage
            level.
          </PixelText>
          <PixelBtn
            onClick={() => setScreen('couragePath')}
            color={C.gold}
            textColor={C.charcoal}
            style={{ width: '100%' }}
          >
            VIEW MY PROGRESS →
          </PixelBtn>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `2px solid ${C.mutedBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>⚪</span>
                <PixelText size={9} color={C.cream}>
                  {hero.platinum || 0} PT
                </PixelText>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>💎</span>
                <PixelText size={9} color="#60A5FA">
                  {hero.diamonds || 0} DM
                </PixelText>
              </div>
            </div>
            <PixelBtn
              onClick={() => setScreen('shop')}
              color={C.plum}
              textColor={C.cream}
              style={{ width: '100%' }}
            >
              VISIT DARA'S SHOP →
            </PixelBtn>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `2px solid ${C.mutedBorder}` }}>
            <PixelText size={9} color={C.goalGold} style={{ display: 'block', marginBottom: 12 }}>
              📚 SHADOW LORE
            </PixelText>
            <PixelText
              size={7}
              color={C.grayLt}
              style={{ display: 'block', lineHeight: 1.8, marginBottom: 12 }}
            >
              Unlock stories about the Shadow's{'\n'}origin, Dara's journey, and the{'\n'}secrets of
              courage.
            </PixelText>
            <PixelBtn
              onClick={() => setScreen('lorePath')}
              color={C.gold}
              textColor={C.charcoal}
              style={{ width: '100%' }}
            >
              READ LORE →
            </PixelBtn>
          </div>

          {hero.pendingLetter && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `2px solid ${C.goalGold}40` }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>✉️</span>
                <PixelText size={8} color={C.goalGold}>
                  NEW LETTER FROM DARA
                </PixelText>
              </div>
              <PixelBtn
                onClick={() => setScreen('daraLetter')}
                color={C.plum}
                textColor={C.cream}
                style={{ width: '100%' }}
              >
                READ LETTER →
              </PixelBtn>
            </div>
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <PixelText size={10} color={C.hpGreen}>
              🛡️ EVIDENCE CARDS
            </PixelText>
            <div style={{ marginTop: 4 }}>
              <PixelText size={8} color={C.grayLt}>
                {(hero.evidenceCards || []).length} pieces of proof collected
              </PixelText>
            </div>
          </div>

          {/* Summary by type */}
          {(hero.evidenceCards || []).length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {Object.entries(summarizeEvidence(hero.evidenceCards || [])).map(([type, count]) => {
                const cfg = getCardTypeConfig(type);
                return (
                  <div
                    key={type}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 4,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                    <PixelText size={7} color={cfg.color}>
                      {cfg.label}: {count}
                    </PixelText>
                  </div>
                );
              })}
            </div>
          )}

          {/* Evidence cards gallery */}
          {(hero.evidenceCards || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
              <PixelText size={8} color={C.grayLt} style={{ display: 'block', lineHeight: 1.8 }}>
                Evidence cards appear after you{'\n'}complete battles.{'\n'}
                {'\n'}
                Each battle generates proof that{'\n'}the Shadow's predictions were wrong —{'\n'}
                your own personal data that{'\n'}courage works.
              </PixelText>
            </div>
          ) : (
            <div>
              {[...(hero.evidenceCards || [])].reverse().map((card) => {
                const cfg = getCardTypeConfig(card.type);
                const lines = card.text.split('\n');
                return (
                  <div
                    key={card.id}
                    style={{
                      padding: '12px 14px',
                      marginBottom: 8,
                      borderRadius: 6,
                      border: `2px solid ${cfg.border}`,
                      background: cfg.bg,
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                      <PixelText size={7} color={cfg.color}>
                        {cfg.label}
                      </PixelText>
                      <div style={{ flex: 1 }} />
                      <PixelText size={6} color={C.subtleText}>
                        {new Date(card.date).toLocaleDateString()}
                      </PixelText>
                    </div>
                    <PixelText
                      size={6}
                      color={C.cream}
                      style={{ display: 'block', marginBottom: 4 }}
                    >
                      {card.bossName}
                    </PixelText>
                    {lines.map((line, i) => (
                      <PixelText
                        key={i}
                        size={6}
                        color={line.startsWith('Evidence') ? cfg.color : C.grayLt}
                        style={{
                          display: 'block',
                          lineHeight: 1.7,
                          fontStyle: line.startsWith('Evidence') ? 'italic' : 'normal',
                        }}
                      >
                        {line}
                      </PixelText>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <PixelText size={10} color={C.goalGold}>
              🏅 ACHIEVEMENTS
            </PixelText>
            <div style={{ marginTop: 4 }}>
              <PixelText size={8} color={C.grayLt}>
                {(hero.achievements || []).length}/{ACHIEVEMENTS.length} unlocked
              </PixelText>
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 6,
              background: C.grayBg,
              borderRadius: 3,
              marginBottom: 20,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((hero.achievements || []).length / ACHIEVEMENTS.length) * 100}%`,
                background: C.goalGold,
                transition: 'width 0.3s',
              }}
            />
          </div>

          {CATEGORY_ORDER.map((cat) => {
            const catAchievements = ACHIEVEMENTS.filter((a) => a.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <PixelText size={8} color={C.teal} style={{ display: 'block', marginBottom: 8 }}>
                  {CATEGORY_LABELS[cat]}
                </PixelText>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {catAchievements.map((ach) => {
                    const isUnlocked = (hero.achievements || []).includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        style={{
                          padding: C.padMd,
                          background: isUnlocked ? C.cardBg : C.deepDark,
                          border: `2px solid ${isUnlocked ? C.goalGold + '60' : C.mutedBorder + '40'}`,
                          borderRadius: 6,
                          opacity: isUnlocked ? 1 : 0.5,
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 28,
                            marginBottom: 4,
                            filter: isUnlocked ? 'none' : 'grayscale(1) opacity(0.3)',
                          }}
                        >
                          {ach.icon}
                        </div>
                        <PixelText
                          size={7}
                          color={isUnlocked ? C.goalGold : C.grayLt}
                          style={{ display: 'block' }}
                        >
                          {ach.name}
                        </PixelText>
                        <PixelText
                          size={6}
                          color={C.grayLt}
                          style={{ display: 'block', marginTop: 2, lineHeight: 1.6 }}
                        >
                          {ach.desc}
                        </PixelText>
                        {isUnlocked && (
                          <div style={{ marginTop: 4 }}>
                            <PixelText size={6} color={C.hpGreen}>
                              UNLOCKED
                            </PixelText>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav active="hero" onNav={setScreen} />
    </div>
  );
}
