// @ts-check
import OpenAI from 'openai';
import { expect } from '@playwright/test';

const API_KEY = process.env.DASHSCOPE_API_KEY;
let openai = null;

if (API_KEY) {
  openai = new OpenAI({
    apiKey: API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  });
}

const AI_MODEL = 'qwen3.5-flash';

// ─── Core ───────────────────────────────────────────────────────────

/**
 * Take a screenshot, send to qwen3.6-plus (DashScope), return structured response.
 * @param {import('@playwright/test').Page} page
 * @param {string} prompt — what to evaluate about the screenshot
 * @param {{ context?: string, timeoutMs?: number }} opts
 * @returns {Promise<{ pass: boolean, reason: string, issues: string[], score?: number }>}
 */
export async function aiAssess(page, prompt, { context = '', timeoutMs = 30000 } = {}) {
  if (!openai) {
    console.log(`  ⚠️  DASHSCOPE_API_KEY not set — skipping AI assessment: "${prompt}"`);
    return { pass: true, reason: 'AI skipped — no API key', issues: [], score: null };
  }

  const screenshot = await page.screenshot({ fullPage: false });
  const base64 = screenshot.toString('base64');

  // Grab visible text for additional context
  const visibleText = await page.evaluate(() => {
    // Get text from visible elements only
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent && parent.offsetParent !== null && node.textContent.trim().length > 0) {
        texts.push(node.textContent.trim());
      }
    }
    return texts.slice(0, 80).join(' ').substring(0, 3000);
  }).catch(() => '');

  const systemPrompt = `You are a QA engineer evaluating a mobile web app screenshot.
Respond ONLY with valid JSON matching this schema:
{
  "pass": boolean,
  "reason": "brief explanation of your verdict",
  "issues": ["list of specific visual or content problems found"],
  "score": number (1-5, where 5 is excellent, 1 is broken)
}

Be strict about visual issues: overlapping elements, truncated text, broken layout, unreadable fonts, missing UI components.
Be strict about content issues: incoherent text, placeholder text left in, wrong language, nonsensical content.`;

  const userContent = [
    {
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${base64}`, detail: 'high' }
    },
    {
      type: 'text',
      text: `Evaluate: ${prompt}${context ? `\n\nContext: ${context}` : ''}\n\nVisible text on page: ${visibleText || '(none detected)'}`
    }
  ];

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content || '{}';
  try {
    return JSON.parse(content);
  } catch {
    return { pass: false, reason: `AI returned invalid JSON: ${content.substring(0, 200)}`, issues: [], score: 1 };
  }
}

/**
 * Like aiAssess but throws a Playwright expect error on failure.
 * Use this when you want the test to fail if AI finds issues.
 */
export async function aiAssert(page, prompt, { context = '', timeoutMs = 30000 } = {}) {
  const result = await aiAssess(page, prompt, { context, timeoutMs });

  // If AI was skipped (no API key), don't fail the test
  if (result.score === null) return;

  expect(result.pass, `AI assertion failed: ${result.reason}`).toBe(true);
}

// ─── Helpers for content-only (no screenshot) ───────────────────────

/**
 * Evaluate text content quality using DashScope qwen3.6-plus (no image needed).
 * @param {string} content — the text to evaluate
 * @param {string} criteria — what to judge it against
 * @returns {Promise<{ pass: boolean, reason: string, score: number, issues: string[] }>}
 */
export async function aiAssessText(content, criteria) {
  if (!openai) {
    console.log(`  ⚠️  DASHSCOPE_API_KEY not set — skipping text assessment`);
    return { pass: true, reason: 'AI skipped — no API key', score: null, issues: [] };
  }

  const systemPrompt = `You are a QA engineer evaluating content from a therapeutic mobile game app called DARER Journey.
The app helps people with social anxiety through ACT (Acceptance and Commitment Therapy) techniques.
Respond ONLY with valid JSON matching this schema:
{
  "pass": boolean,
  "reason": "brief explanation",
  "score": number (1-5, where 5 is excellent, 1 is poor),
  "issues": ["list of content quality problems"]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Evaluate this content against "${criteria}":\n\n${content.substring(0, 4000)}` }
    ],
    temperature: 0,
    max_tokens: 400,
    response_format: { type: 'json_object' }
  });

  const text = response.choices[0].message.content || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return { pass: false, reason: `Invalid AI response: ${text.substring(0, 200)}`, score: 1, issues: [] };
  }
}

// ─── Test helpers (sign up, navigate to screen) ─────────────────────

const emailInput = (page) => page.locator('input[type="text"], input:not([type="password"]):not([type="hidden"])').first();
const pwInput = (page) => page.locator('input[type="password"]');

export async function btn(page, text, timeout = 15000) {
  const b = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).first();
  await expect(b).toBeVisible({ timeout });
  await b.click();
  await page.waitForTimeout(1500);
}

export async function screen(page, text, timeout = 20000) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout });
}

/**
 * Quick signup helper — creates a new account and clicks through to the app.
 * Returns the test email used.
 */
export async function quickSignup(page, { name = 'TestUser' } = {}) {
  const email = `ai.test.${name}.${Date.now()}@gmail.com`;
  const password = 'AiTest2026!';

  await page.getByText('NEW GAME', { exact: true }).click();
  await emailInput(page).fill(email);
  await pwInput(page).fill(password);
  await page.getByText('CREATE HERO').click();
  await page.waitForTimeout(3000);

  return { email, password };
}

/**
 * Navigate from login to a specific screen, using mocked AI for speed.
 * This helper mocks the AI API so tests reach target screens quickly.
 */
export async function navigateToScreen(page, targetScreen) {
  // Set up AI mock before navigation
  await setupMockAI(page, targetScreen);
}

/**
 * Configure Playwright route mock for AI API calls.
 * Mocks /api/qwen-chat to return canned responses that guide the user
 * to the target screen quickly.
 */
export async function setupMockAI(page, targetScreen) {
  await page.route('**/api/qwen-chat', async (route) => {
    const req = JSON.parse(route.request().postData() || '{}');
    const sys = (req.systemPrompt || '').toLowerCase();
    let reply;

    if (targetScreen === 'values' && (sys.includes('values') && sys.includes('generate'))) {
      reply = JSON.stringify([
        { id: 'v1', text: 'Build meaningful friendships', icon: '🤝', domain: 'friendships' },
        { id: 'v2', text: 'Feel a sense of belonging', icon: '💜', domain: 'friendships' },
        { id: 'v3', text: 'Show love to people I care about', icon: '❤️', domain: 'intimacy' },
        { id: 'v4', text: 'Spend quality time with others', icon: '🔥', domain: 'friendships' },
        { id: 'v5', text: 'Be someone people can trust', icon: '🌟', domain: 'friendships' },
        { id: 'v6', text: 'Open up and be vulnerable', icon: '🤗', domain: 'intimacy' },
        { id: 'v7', text: 'Speak up and share my voice', icon: '🗣', domain: 'expression' },
        { id: 'v8', text: 'Share ideas confidently at work', icon: '💡', domain: 'employment' },
        { id: 'v9', text: 'Enjoy social events', icon: '🎉', domain: 'friendships' },
        { id: 'v10', text: 'Take on growth challenges', icon: '🏔', domain: 'growth' },
        { id: 'v11', text: 'Be respected and confident', icon: '⭐', domain: 'achievement' },
        { id: 'v12', text: 'Contribute to my community', icon: '🌍', domain: 'community' },
      ]);
    } else if (targetScreen === 'battle' && (sys.includes('micro-exposure') || sys.includes('training'))) {
      reply = JSON.stringify([
        { name: 'The Smiler', text: 'Make eye contact and smile at a stranger', icon: '😊', where: 'Anywhere', time: '5 seconds', suds: 1 },
        { name: 'The Greeter', text: 'Say hello to someone you don\'t know', icon: '👋', where: 'Walking past', time: '10 seconds', suds: 1 },
        { name: 'The Nod', text: 'Give a small nod to someone nearby', icon: '🙂', where: 'Elevator', time: '5 seconds', suds: 2 },
      ]);
    } else {
      reply = 'I understand. Let\'s keep going.';
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply })
    });
  });
}
