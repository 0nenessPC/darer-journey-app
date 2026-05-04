import { C } from '../constants/gameData';

/**
 * Evidence Card types — each represents a distinct CBT learning moment
 * derived from SUDS comparison and battle outcome data.
 */
const CARD_TYPES = {
  SUDS_DROP: {
    id: 'suds_drop',
    label: 'SUDS DROP',
    icon: '📉',
    color: C.hpGreen,
    bg: C.hpGreen + '15',
    border: C.hpGreen + '40',
    template: (d) =>
      `Predicted storm: ${d.before}\nPeak storm: ${d.peak}\nAfter storm: ${d.after}\n\nEvidence: "The Storm dropped ${d.drop} points. My nervous system learned it was safe."`,
  },
  PREDICTION_DISCONFIRMED: {
    id: 'prediction_disconfirmed',
    label: 'PREDICTION DISCONFIRMED',
    icon: '🔍',
    color: C.goldMd,
    bg: C.goldMd + '15',
    border: C.goldMd + '40',
    template: (d) =>
      `I feared: ${d.feared}\nWhat happened: ${d.actual}\n\nEvidence: "The Shadow predicted danger. Reality proved otherwise."`,
  },
  STAYED_WITH_STORM: {
    id: 'stayed_with_storm',
    label: 'STAYED WITH THE STORM',
    icon: '⛈️',
    color: C.amber,
    bg: C.amber + '15',
    border: C.amber + '40',
    template: (d) =>
      `Peak storm: ${d.peak}\nI stayed anyway.\n\nEvidence: "I didn't run. I sat with the discomfort and it didn't destroy me."`,
  },
  PARTIAL_COURAGE: {
    id: 'partial_courage',
    label: 'PARTIAL COURAGE',
    icon: '💪',
    color: C.plumMd,
    bg: C.plumMd + '15',
    border: C.plumMd + '40',
    template: (_) =>
      `I started even though it was hard.\n\nEvidence: "Partial action is still action. I showed up."`,
  },
  RETURNED: {
    id: 'returned',
    label: 'RETURNED',
    icon: '🔁',
    color: C.teal,
    bg: C.teal + '15',
    border: C.teal + '40',
    template: (d) =>
      `Repetition #${d.repeatNum}\nBest SUDS drop this round: ${d.drop}\n\nEvidence: "Each visit makes the Shadow weaker. I'm building mastery."`,
  },
};

/**
 * Determine which evidence card types apply to this battle.
 * A single battle can produce multiple cards.
 */
export function generateEvidenceCards(battle) {
  const cards = [];
  const {
    bossName,
    bossDesc,
    outcome,
    date,
    suds,
    fearedHappened,
    fearedSeverity: _,
    madeItThrough,
    repeatChoice: __,
    masteryLevel,
    battleId,
  } = battle;

  const before = suds?.before ?? 0;
  const peak = suds?.during ?? before;
  const after = suds?.after ?? 0;
  const drop = before - after;
  const isRepeat = battle.bossId?.startsWith('repeat_');

  // --- RETURNED: repeated a completed exposure ---
  if (isRepeat || (masteryLevel && masteryLevel !== 'uncharted')) {
    const repeatNum = battle.bossCompletions || 1;
    cards.push({
      id: `evidence_${battleId || Date.now()}_returned`,
      type: CARD_TYPES.RETURNED.id,
      bossName,
      bossDesc,
      date,
      repeatNum,
      drop,
      label: CARD_TYPES.RETURNED.label,
      icon: CARD_TYPES.RETURNED.icon,
      color: CARD_TYPES.RETURNED.color,
      bg: CARD_TYPES.RETURNED.bg,
      border: CARD_TYPES.RETURNED.border,
      text: CARD_TYPES.RETURNED.template({ repeatNum, drop }),
    });
  }

  // --- SUDS DROP: after lower than before ---
  if (drop > 0 && outcome !== 'retreat') {
    cards.push({
      id: `evidence_${battleId || Date.now()}_suds_drop`,
      type: CARD_TYPES.SUDS_DROP.id,
      bossName,
      bossDesc,
      date,
      before,
      peak,
      after,
      drop,
      label: CARD_TYPES.SUDS_DROP.label,
      icon: CARD_TYPES.SUDS_DROP.icon,
      color: CARD_TYPES.SUDS_DROP.color,
      bg: CARD_TYPES.SUDS_DROP.bg,
      border: CARD_TYPES.SUDS_DROP.border,
      text: CARD_TYPES.SUDS_DROP.template({ before, peak, after, drop }),
    });
  }

  // --- PREDICTION DISCONFIRMED: feared outcome did not happen ---
  if (fearedHappened && fearedHappened.toLowerCase().includes('no') && outcome !== 'retreat') {
    cards.push({
      id: `evidence_${battleId || Date.now()}_disconfirmed`,
      type: CARD_TYPES.PREDICTION_DISCONFIRMED.id,
      bossName,
      bossDesc,
      date,
      feared: fearedHappened,
      actual: madeItThrough || 'Nothing bad happened',
      label: CARD_TYPES.PREDICTION_DISCONFIRMED.label,
      icon: CARD_TYPES.PREDICTION_DISCONFIRMED.icon,
      color: CARD_TYPES.PREDICTION_DISCONFIRMED.color,
      bg: CARD_TYPES.PREDICTION_DISCONFIRMED.bg,
      border: CARD_TYPES.PREDICTION_DISCONFIRMED.border,
      text: CARD_TYPES.PREDICTION_DISCONFIRMED.template({
        feared: fearedHappened,
        actual: madeItThrough,
      }),
    });
  }

  // --- STAYED WITH STORM: completed even when SUDS stayed high ---
  if (peak >= 60 && outcome === 'victory' && drop < 20) {
    cards.push({
      id: `evidence_${battleId || Date.now()}_stayed`,
      type: CARD_TYPES.STAYED_WITH_STORM.id,
      bossName,
      bossDesc,
      date,
      peak,
      after,
      label: CARD_TYPES.STAYED_WITH_STORM.label,
      icon: CARD_TYPES.STAYED_WITH_STORM.icon,
      color: CARD_TYPES.STAYED_WITH_STORM.color,
      bg: CARD_TYPES.STAYED_WITH_STORM.bg,
      border: CARD_TYPES.STAYED_WITH_STORM.border,
      text: CARD_TYPES.STAYED_WITH_STORM.template({ peak, after }),
    });
  }

  // --- PARTIAL COURAGE: entered but did not finish ---
  if (outcome === 'partial') {
    cards.push({
      id: `evidence_${battleId || Date.now()}_partial`,
      type: CARD_TYPES.PARTIAL_COURAGE.id,
      bossName,
      bossDesc,
      date,
      label: CARD_TYPES.PARTIAL_COURAGE.label,
      icon: CARD_TYPES.PARTIAL_COURAGE.icon,
      color: CARD_TYPES.PARTIAL_COURAGE.color,
      bg: CARD_TYPES.PARTIAL_COURAGE.bg,
      border: CARD_TYPES.PARTIAL_COURAGE.border,
      text: CARD_TYPES.PARTIAL_COURAGE.template({}),
    });
  }

  return cards;
}

/**
 * Get display config for a card type.
 */
export function getCardTypeConfig(typeId) {
  return Object.values(CARD_TYPES).find((t) => t.id === typeId) || CARD_TYPES.SUDS_DROP;
}

/**
 * Get count of evidence cards by type.
 */
export function summarizeEvidence(cards) {
  const summary = {};
  for (const card of cards) {
    summary[card.type] = (summary[card.type] || 0) + 1;
  }
  return summary;
}
