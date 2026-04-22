/**
 * Parse a section from the AI-generated shadow summary text.
 * Matches label followed by content, stopping at the next section header.
 * @param {string} label - Section label (e.g. "WHERE IT APPEARS")
 * @param {string} shadowText - Full shadow summary from AI
 * @returns {string} Parsed section text, or empty string if not found
 */
export function parseShadowSection(label, shadowText) {
  if (!shadowText) return "";
  const regex = new RegExp(
    label + "[:\\s]*(.+?)(?=(?:WHERE IT APPEARS|WHAT IT WHISPERS|HOW IT KEEPS ITS GRIP|The Shadow has been|SHADOW'S TRUE NATURE)(?::|\\b)|$)",
    "is"
  );
  const match = shadowText.match(regex);
  if (!match) return "";
  return match[1].replace(/^[:\s]+/, "").replace(/[\s\n]+$/, "").trim();
}
