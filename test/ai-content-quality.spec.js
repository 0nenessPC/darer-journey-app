// @ts-check
import { test, expect } from '@playwright/test';
import { aiAssessText } from './ai-tester.js';

// ─── Sample AI responses (same as mocks in darer-full-onboarding.spec.js) ─────

const SAMPLE_VALUES = [
  { id: 'v1', text: 'Reach out and build new friendships', icon: '🤝', domain: 'friendships' },
  { id: 'v2', text: 'Feel a sense of belonging in a group', icon: '💜', domain: 'friendships' },
  { id: 'v3', text: 'Show the people I love how much they mean to me', icon: '❤️', domain: 'intimacy' },
  { id: 'v4', text: 'Spend quality time with people I care about', icon: '🔥', domain: 'friendships' },
  { id: 'v5', text: 'Be someone others can trust and count on', icon: '🌟', domain: 'friendships' },
  { id: 'v6', text: 'Open up and let people really know me', icon: '🤗', domain: 'intimacy' },
  { id: 'v7', text: 'Speak up and share what I think and feel', icon: '🗣', domain: 'expression' },
  { id: 'v8', text: 'Share my ideas confidently at work or school', icon: '💡', domain: 'employment' },
  { id: 'v9', text: 'Enjoy social events without dreading them', icon: '🎉', domain: 'friendships' },
  { id: 'v10', text: 'Take on challenges that help me grow', icon: '🏔', domain: 'growth' },
  { id: 'v11', text: 'Be respected and confident at work or school', icon: '⭐', domain: 'achievement' },
  { id: 'v12', text: 'Contribute and help people around me', icon: '🌍', domain: 'community' },
];

const SAMPLE_EXPOSURES = [
  { name: 'The Smiler', text: 'Make eye contact and smile at a stranger', icon: '😊', where: 'Anywhere', time: '5 seconds', suds: 1 },
  { name: 'The Greeter', text: 'Say hello to someone you don\'t know', icon: '👋', where: 'Walking past', time: '10 seconds', suds: 1 },
  { name: 'The Nod', text: 'Give a small nod to someone nearby', icon: '🙂', where: 'Elevator', time: '5 seconds', suds: 2 },
];

const SAMPLE_BOSSES = [
  { id: 'b1', name: 'The Cashier', desc: 'Ask a store clerk a question', difficulty: 2, xp: 50 },
  { id: 'b2', name: 'The Introducer', desc: 'Introduce yourself to someone new', difficulty: 4, xp: 100 },
  { id: 'b3', name: 'The Presenter', desc: 'Share an opinion in a small group', difficulty: 5, xp: 150 },
];

const SAMPLE_INTAKE_RESPONSE = "I hear you. Speaking up is tough. When the Shadow has you in its territory, where do you feel it in your body?";

const SAMPLE_SHADOW_SUMMARY = `THE SHADOW'S TRUE NATURE:

WHERE IT APPEARS: Your Shadow dominates the territory of speaking up — in class, in groups, when meeting new people. It tells you that your words aren't worth hearing, that you'll sound boring or wrong.

WHAT STORMS IT STIRS: Your body reacts before your mind can catch up — tight chest, racing thoughts, the urge to grab your phone and disappear. Your Inner Storm amplifies every imagined judgment into a threat.

HOW IT KEEPS YOU TRAPPED: You use avoidance as armor — staying quiet, staying invisible, staying safe. But safety is the cage. Every time you don't speak up, the Shadow grows stronger. You want connection, but the Shadow won't let you risk it.`;

test.describe('@ai Content Quality', () => {

  // ─── Test 1: Values Quality ─────────────────────────────────────
  test('AI-generated values are relevant and distinct', async () => {
    console.log('\n💎 Evaluating values quality...');

    const content = SAMPLE_VALUES.map(v => `- [${v.domain}] ${v.text} ${v.icon}`).join('\n');
    const result = await aiAssessText(content,
      'Are these 12 values: (1) relevant to someone with social anxiety, (2) distinct from each other (no duplicates or near-duplicates), (3) written in first person as personal commitments, (4) categorized into meaningful ACT domains?'
    );

    console.log(`  Score: ${result.score}/5 — ${result.reason}`);
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.join('; ')}`);
    }
    if (result.score === null) return; // AI skipped — no API key
    expect(result.score).toBeGreaterThan(1);
  });

  // ─── Test 2: Exposure Quality ───────────────────────────────────
  test('AI-generated exposures are appropriate for social anxiety', async () => {
    console.log('\n🎯 Evaluating exposure quality...');

    const content = SAMPLE_EXPOSURES.map(e =>
      `- ${e.name}: "${e.text}" (SUDS: ${e.suds}/10, Location: ${e.where}, Duration: ${e.time}) ${e.icon}`
    ).join('\n');

    const result = await aiAssessText(content,
      'Are these micro-exposures: (1) appropriate for someone with social anxiety, (2) genuinely small/achievable steps (SUDS 1-3 range), (3) diverse in context/location, (4) therapeutically sound (not too easy, not too hard for beginners)?'
    );

    console.log(`  Score: ${result.score}/5 — ${result.reason}`);
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.join('; ')}`);
    }
    if (result.score === null) return; // AI skipped — no API key
    expect(result.score).toBeGreaterThan(1);
  });

  // ─── Test 3: Boss Quality ──────────────────────────────────────
  test('AI-generated bosses are thematically consistent', async () => {
    console.log('\n👾 Evaluating boss quality...');

    const content = SAMPLE_BOSSES.map(b =>
      `- ${b.name}: "${b.desc}" (Difficulty: ${b.difficulty}/10, XP: ${b.xp})`
    ).join('\n');

    const result = await aiAssessText(content,
      'Are these boss challenges: (1) themed around social anxiety situations, (2) progressively harder (difficulty 2 → 4 → 5 makes sense), (3) practical real-world social challenges, (4) engaging names that fit a "battle" metaphor?'
    );

    console.log(`  Score: ${result.score}/5 — ${result.reason}`);
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.join('; ')}`);
    }
    if (result.score === null) return; // AI skipped — no API key
    expect(result.score).toBeGreaterThan(1);
  });

  // ─── Test 4: Intake Response Quality ────────────────────────────
  test('AI intake responses are empathetic and contextual', async () => {
    console.log('\n💬 Evaluating intake response quality...');

    const result = await aiAssessText(SAMPLE_INTAKE_RESPONSE,
      'Is this response: (1) empathetic and validating (acknowledges the user\'s struggle), (2) asks a follow-up question that probes deeper into the somatic/emotional experience, (3) appropriate for a therapeutic companion named Dara helping someone with social anxiety, (4) not clinical or robotic in tone?'
    );

    console.log(`  Score: ${result.score}/5 — ${result.reason}`);
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.join('; ')}`);
    }
    if (result.score === null) return; // AI skipped — no API key
    expect(result.score).toBeGreaterThan(1);
  });

  // ─── Test 5: Shadow Summary Quality ─────────────────────────────
  test('AI shadow summary is personalized and therapeutic', async () => {
    console.log('\n🌑 Evaluating shadow summary quality...');

    const result = await aiAssessText(SAMPLE_SHADOW_SUMMARY,
      'Is this shadow summary: (1) personalized (uses "your" language, not generic), (2) structured in the three DARER categories (WHERE IT APPEARS, WHAT STORMS IT STIRS, HOW IT KEEPS YOU TRAPPED), (3) therapeutically appropriate for ACT (Acceptance and Commitment Therapy) framework, (4) validates the user\'s experience while also naming the pattern clearly, (5) written in an empowering but honest tone?'
    );

    console.log(`  Score: ${result.score}/5 — ${result.reason}`);
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.join('; ')}`);
    }
    if (result.score === null) return; // AI skipped — no API key
    expect(result.score).toBeGreaterThan(1);
  });

});
