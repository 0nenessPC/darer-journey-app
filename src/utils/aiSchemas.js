import { z } from 'zod';

/** Single value card from AI values generation */
export const ValueSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  icon: z.string().optional(),
  domain: z.string().optional(),
});

/** Single exposure object (used by sort, tutorial, follow-up) */
export const ExposureSchema = z.object({
  text: z.string().min(1),
  icon: z.string().optional(),
  tag: z.string().optional(),
  bossType: z.string().optional(),
  difficulty: z.number().optional(),
});

/** Boss config object from AskDara chat */
export const BossConfigSchema = z.object({
  name: z.string().min(1),
  desc: z.string().min(1),
  difficulty: z.number().optional(),
});

/** Intake AI response — free text, not JSON. Just needs to be non-empty. */
export const IntakeResponseSchema = z.string().min(10);

/** Parse and validate AI JSON response against a Zod schema.
 *  Handles markdown code fences, bare JSON, and array/object extraction. */
export function validateAIResponse(raw, schema) {
  if (!raw || typeof raw !== 'string') return null;

  // Strip markdown code fences
  const stripped = raw
    .replace(/```(?:json)?\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try raw parse first
  let parsed = null;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    // Try to extract JSON array or object
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    if (arrMatch) {
      try {
        parsed = JSON.parse(arrMatch[0]);
      } catch {
        /* skip */
      }
    } else if (objMatch) {
      try {
        parsed = JSON.parse(objMatch[0]);
      } catch {
        /* skip */
      }
    }
  }

  if (parsed === null) return null;
  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}
