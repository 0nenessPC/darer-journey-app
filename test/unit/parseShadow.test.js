import { describe, it, expect } from 'vitest';
import { parseShadowSection } from '../../src/utils/parseShadow';

describe('parseShadowSection', () => {
  const SAMPLE = `The Shadow's True Nature:
The shadow claims crowded rooms and first encounters, whispering that you don't belong.

WHERE IT APPEARS:
Crowded social gatherings, workplace meetings where you're asked to speak up,
first encounters with new people, eating in public.

WHAT IT WHISPERS:
"You don't belong here." "They can see you're awkward." "If they knew the real you, they'd leave."

HOW IT KEEPS ITS GRIP:
By making avoidance feel safer than facing the fear. Every time you look away,
stay quiet, or leave early — the shadow grows stronger.`;

  it('extracts a section between its label and the next section header', () => {
    const result = parseShadowSection('WHERE IT APPEARS', SAMPLE);
    expect(result).toContain('Crowded social gatherings');
    expect(result).toContain('eating in public');
  });

  it('returns the correct content for WHAT IT WHISPERS', () => {
    const result = parseShadowSection('WHAT IT WHISPERS', SAMPLE);
    expect(result).toContain("You don't belong here");
  });

  it('returns empty string for non-existent section', () => {
    const result = parseShadowSection('NONEXISTENT', SAMPLE);
    expect(result).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(parseShadowSection('WHERE IT APPEARS', '')).toBe('');
    expect(parseShadowSection('WHERE IT APPEARS', null)).toBe('');
    expect(parseShadowSection('WHERE IT APPEARS', undefined)).toBe('');
  });

  it('extracts content up to "The Shadow has been" terminator', () => {
    const text = `WHERE IT APPEARS:
At parties and meetings.
The Shadow has been revealed.`;
    const result = parseShadowSection('WHERE IT APPEARS', text);
    expect(result).toBe('At parties and meetings.');
  });
});
