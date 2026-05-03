import React, { useState } from 'react';
import { C } from '../constants/gameData';
import { PixelText, PixelBtn } from './shared';
import BottomNav from './BottomNav';

const OUTCOME_COLORS = {
  victory: C.hpGreen,
  partial: C.amber,
  retreat: C.fearRed,
};

const OUTCOME_LABELS = {
  victory: 'VICTORY',
  partial: 'PARTIAL COURAGE',
  retreat: 'RETREAT',
};

/**
 * WallOfFame — gallery of emotional proof: loot photos, self-written words,
 * and evidence cards collected from battles. Replaces the mock leaderboard.
 */
export default function WallOfFame({ hero, quest, battleHistory = [], setScreen, onBack }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedCard, setExpandedCard] = useState(null);

  const totalXp = hero.totalXP || 0;
  const defeatedCount = (quest.bosses || []).filter((b) => b.defeated).length;

  // Collect all loot entries from battle history
  const lootEntries = (battleHistory || [])
    .filter((b) => b.lootImage || b.lootText)
    .map((b, i) => ({
      id: `loot_${i}`,
      battleIndex: i,
      bossName: b.bossName || 'Unknown Boss',
      bossDesc: b.bossDesc || '',
      date: b.date,
      outcome: b.outcome,
      lootImage: b.lootImage,
      lootText: b.lootText,
      sudsBefore: b.suds?.before,
      sudsAfter: b.suds?.after,
      sudsDrop: (b.suds?.before || 0) - (b.suds?.after || 0),
    }))
    .reverse();

  // Collect evidence cards from hero state
  const evidenceEntries = (hero.evidenceCards || [])
    .map((card, i) => ({ ...card, id: card.id || `evidence_${i}` }))
    .reverse();

  // Combine and filter
  const allItems = [
    ...lootEntries.map((item) => ({ ...item, type: 'loot' })),
    ...evidenceEntries.map((item) => ({ ...item, type: 'evidence' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered =
    activeFilter === 'all'
      ? allItems
      : allItems.filter((item) => item.type === activeFilter);

  const lootCount = lootEntries.length;
  const evidenceCount = evidenceEntries.length;

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '0 0 100px' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `2px solid ${C.mutedBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
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
          🏆 WALL OF FAME
        </PixelText>
      </div>

      {/* Stats bar */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-around',
          borderBottom: `2px solid ${C.mutedBorder}`,
          background: C.cardBg,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <PixelText size={16} color={C.goalGold} style={{ display: 'block' }}>
            {totalXp}
          </PixelText>
          <PixelText size={6} color={C.subtleText}>
            XP
          </PixelText>
        </div>
        <div style={{ textAlign: 'center' }}>
          <PixelText size={16} color={C.hpGreen} style={{ display: 'block' }}>
            {defeatedCount}
          </PixelText>
          <PixelText size={6} color={C.subtleText}>
            BOSSES
          </PixelText>
        </div>
        <div style={{ textAlign: 'center' }}>
          <PixelText size={16} color={C.goldMd} style={{ display: 'block' }}>
            {lootCount}
          </PixelText>
          <PixelText size={6} color={C.subtleText}>
            MOMENTS
          </PixelText>
        </div>
        <div style={{ textAlign: 'center' }}>
          <PixelText size={16} color={C.teal} style={{ display: 'block' }}>
            {evidenceCount}
          </PixelText>
          <PixelText size={6} color={C.subtleText}>
            PROOF
          </PixelText>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6 }}>
        {[
          { key: 'all', label: `ALL (${allItems.length})` },
          { key: 'loot', label: `📸 MOMENTS (${lootCount})` },
          { key: 'evidence', label: `🛡️ PROOF (${evidenceCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 4,
              border: `2px solid ${activeFilter === tab.key ? C.goalGold : C.mutedBorder}`,
              background: activeFilter === tab.key ? C.goalGold + '15' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <PixelText size={6} color={activeFilter === tab.key ? C.goalGold : C.subtleText}>
              {tab.label}
            </PixelText>
          </button>
        ))}
      </div>

      {/* Gallery */}
      <div style={{ padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <PixelText size={8} color={C.grayLt} style={{ display: 'block', lineHeight: 1.8 }}>
              Your Wall of Fame is empty —{'\n'}but it won't stay that way.{'\n'}
              {'\n'}
              Every exposure you complete adds{'\n'}a new piece of proof that{'\n'}
              courage is a practice, not a trait.{'\n'}
              {'\n'}
              Head back to the map and{'\n'}start filling your wall.
            </PixelText>
          </div>
        ) : (
          filtered.map((item) => {
            if (item.type === 'loot') {
              return (
                <LootCard
                  key={item.id}
                  entry={item}
                  isExpanded={expandedCard === item.id}
                  onToggle={() =>
                    setExpandedCard(expandedCard === item.id ? null : item.id)
                  }
                />
              );
            }
            return (
              <EvidenceCard
                key={item.id}
                card={item}
                isExpanded={expandedCard === item.id}
                onToggle={() =>
                  setExpandedCard(expandedCard === item.id ? null : item.id)
                }
              />
            );
          })
        )}
      </div>

      <BottomNav active="ladder" onNav={setScreen} />
    </div>
  );
}

function LootCard({ entry, isExpanded, onToggle }) {
  const outcomeColor = OUTCOME_COLORS[entry.outcome] || C.grayLt;
  const outcomeLabel = OUTCOME_LABELS[entry.outcome] || entry.outcome;

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 6,
        border: `2px solid ${outcomeColor}40`,
        background: C.cardBg,
        overflow: 'hidden',
      }}
    >
      {/* Image */}
      {entry.lootImage && (
        <div style={{ position: 'relative' }}>
          <img
            src={entry.lootImage}
            alt={entry.lootText || 'Moment captured'}
            style={{
              width: '100%',
              maxHeight: 200,
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(0,0,0,0.7)',
            }}
          >
            <PixelText size={6} color={outcomeColor}>
              {outcomeLabel}
            </PixelText>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: `1px solid ${C.mutedBorder}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{entry.lootImage ? '📸' : '✏️'}</span>
          <PixelText size={7} color={C.cream}>
            {entry.bossName}
          </PixelText>
          <div style={{ flex: 1 }} />
          <PixelText size={6} color={C.subtleText}>
            {new Date(entry.date).toLocaleDateString()}
          </PixelText>
        </div>
        {entry.sudsDrop > 0 && (
          <PixelText size={6} color={C.hpGreen} style={{ display: 'block', marginTop: 4 }}>
            Storm dropped {entry.sudsDrop} points
          </PixelText>
        )}
      </div>

      {/* Loot text */}
      {entry.lootText && (
        <div
          style={{
            padding: '12px',
            cursor: 'pointer',
          }}
          onClick={onToggle}
        >
          <PixelText
            size={7}
            color={C.grayLt}
            style={{
              display: 'block',
              lineHeight: 1.7,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {entry.lootText}
          </PixelText>
          {entry.lootText.length > 100 && (
            <PixelText size={6} color={C.goldMd} style={{ display: 'block', marginTop: 4 }}>
              {isExpanded ? 'SHOW LESS' : 'READ MORE →'}
            </PixelText>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceCard({ card, isExpanded, onToggle }) {
  const typeColors = {
    suds_drop: { color: C.hpGreen, bg: C.hpGreen + '10', border: C.hpGreen + '30' },
    prediction_disconfirmed: { color: C.goldMd, bg: C.goldMd + '10', border: C.goldMd + '30' },
    stayed_with_storm: { color: C.amber, bg: C.amber + '10', border: C.amber + '30' },
    partial_courage: { color: C.plumMd, bg: C.plumMd + '10', border: C.plumMd + '30' },
    returned: { color: C.teal, bg: C.teal + '10', border: C.teal + '30' },
  };
  const tc = typeColors[card.type] || typeColors.suds_drop;

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 6,
        border: `2px solid ${tc.border}`,
        background: tc.bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: `1px solid ${tc.border}`,
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{card.icon}</span>
          <PixelText size={7} color={tc.color}>
            {card.label}
          </PixelText>
          <div style={{ flex: 1 }} />
          <PixelText size={6} color={C.subtleText}>
            {new Date(card.date).toLocaleDateString()}
          </PixelText>
        </div>
        <PixelText size={6} color={C.cream} style={{ display: 'block', marginTop: 4 }}>
          {card.bossName}
        </PixelText>
      </div>

      {isExpanded && (
        <div style={{ padding: '12px' }}>
          {card.text.split('\n').map((line, i) => (
            <PixelText
              key={i}
              size={6}
              color={line.startsWith('Evidence') ? tc.color : C.grayLt}
              style={{
                display: 'block',
                lineHeight: 1.7,
                fontStyle: line.startsWith('Evidence') ? 'italic' : 'normal',
                marginBottom: 2,
              }}
            >
              {line}
            </PixelText>
          ))}
        </div>
      )}
    </div>
  );
}
