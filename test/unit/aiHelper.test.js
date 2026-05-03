import { describe, it, expect } from 'vitest';
import { buildHeroContext } from '../../src/utils/aiHelper';

describe('buildHeroContext', () => {
  it('returns empty string for empty hero', () => {
    const result = buildHeroContext({}, {}, '', []);
    expect(result).toBe('');
  });

  it('includes hero name and darerId when present', () => {
    const result = buildHeroContext({ name: 'TestHero', darerId: '123' }, {}, '', []);
    expect(result).toContain('HERO: TestHero, DARER 123');
  });

  it('includes stats when present', () => {
    const result = buildHeroContext({ stats: { courage: 7, resilience: 5, openness: 3 } }, {}, '', []);
    expect(result).toContain('STATS: Courage 7/10, Resilience 5/10, Openness 3/10');
  });

  it('includes SADS score when present', () => {
    const result = buildHeroContext({ sads: 65 }, {}, '', []);
    expect(result).toContain('SADS: 65');
  });

  it('includes values and strengths', () => {
    const result = buildHeroContext({
      coreValues: [{ word: 'Courage' }, { word: 'Kindness' }],
      strengths: ['Resilience', 'Empathy'],
    }, {}, '', []);
    expect(result).toContain('VALUES: Courage, Kindness');
    expect(result).toContain('STRENGTHS: Resilience, Empathy');
  });

  it('includes quest goal', () => {
    const result = buildHeroContext({}, { goal: 'Build meaningful friendships' }, '', []);
    expect(result).toContain('GOAL: Build meaningful friendships');
  });

  it('includes shadow first line only', () => {
    const result = buildHeroContext({}, {}, 'First line\nSecond line\nThird line', []);
    expect(result).toContain('SHADOW: First line');
    expect(result).not.toContain('Second line');
  });

  it('includes boss progress', () => {
    const result = buildHeroContext({}, {
      bosses: [
        { name: 'Boss1', defeated: true },
        { name: 'Boss2', defeated: false },
        { name: 'Boss3', defeated: true },
      ],
    }, '', []);
    expect(result).toContain('PROGRESS: 2/3 bosses defeated');
  });

  it('includes recent battle history (last 2)', () => {
    const result = buildHeroContext({}, {}, '', [
      { bossName: 'Boss1', outcome: 'victory' },
      { bossName: 'Boss2', outcome: 'retreat' },
      { bossName: 'Boss3', outcome: 'victory' },
      { bossName: 'Boss4', outcome: 'partial' },
    ]);
    expect(result).toContain('RECENT: Boss3→victory, Boss4→partial');
    expect(result).not.toContain('Boss1');
  });

  it('includes unlocked armory tools', () => {
    const result = buildHeroContext({
      armory: [
        { name: 'Breathing', unlocked: true, practiceCount: 3 },
        { name: 'Grounding', unlocked: true },
        { name: 'Locked Tool', unlocked: false },
      ],
    }, {}, '', []);
    expect(result).toContain('ARMORY: Breathing (practiced 3x), Grounding');
    expect(result).not.toContain('Locked Tool');
  });

  it('produces a string under 1000 chars for typical input', () => {
    const result = buildHeroContext(
      { name: 'Hero', darerId: '123', stats: { courage: 5, resilience: 5, openness: 5 }, sads: 50,
        coreValues: [{ word: 'Courage' }], strengths: ['Resilience'],
        armory: [{ name: 'Breathing', unlocked: true }] },
      { goal: 'Make friends', bosses: [{ name: 'X', defeated: false }] },
      'The shadow whispers doubts.',
      [{ bossName: 'Y', outcome: 'victory' }],
    );
    expect(result.length).toBeLessThan(1000);
    expect(typeof result).toBe('string');
  });
});
