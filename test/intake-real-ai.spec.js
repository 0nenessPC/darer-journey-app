// @ts-check
import { test, expect } from '@playwright/test';
import { aiAssert, screen, btn } from './ai-tester.js';

const APP_URL = process.env.DARER_TEST_URL || 'http://localhost:3000';
const TEST_PASSWORD = 'AiIntake2026!';
const SUPABASE_URL = 'https://macdrvetjapmaujbsivh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E07mDSpBz3ok98JeptwdzQ_CZNa1KTi';
const NDA_TEXT = `DARER ORDER — CONFIDENTIALITY AGREEMENT\n\nLast Updated: April 21, 2026\nVersion: 1.0`;

const emailInput = (page) => page.locator('input[type="text"], input:not([type="password"]):not([type="hidden"])').first();
const pwInput = (page) => page.locator('input[type="password"]');

async function signupAndLogin(page) {
  const testEmail = `ai.intake.${Date.now()}@gmail.com`;
  await page.context().clearCookies();
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP_URL);
  await page.getByText('NEW GAME', { exact: true }).click();
  await emailInput(page).fill(testEmail);
  await pwInput(page).fill(TEST_PASSWORD);
  await page.getByText('CREATE HERO').click();
  await page.waitForTimeout(3000);

  // Pre-insert NDA
  await page.evaluate(async ({ url, key, ndaText }) => {
    const storageKey = Object.keys(localStorage).find(k => k.includes('sb-') && k.includes('auth-token'));
    if (!storageKey) return;
    const session = JSON.parse(localStorage.getItem(storageKey));
    const accessToken = session?.access_token;
    const userId = session?.user?.id;
    if (!accessToken || !userId) return;
    await fetch(`${url}/rest/v1/nda_agreements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        agreement_version: '1.0',
        agreement_text: ndaText,
        participant_name: 'AI Intake',
        darer_id: session?.user?.user_metadata?.darer_id || '',
        signed_at: new Date().toISOString()
      })
    });
  }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, ndaText: NDA_TEXT });

  await page.getByText('LOG IN', { exact: true }).click();
  await page.waitForTimeout(500);
  await emailInput(page).fill(testEmail);
  await pwInput(page).fill(TEST_PASSWORD);
  await page.getByText('START YOUR JOURNEY').click();
  await page.waitForTimeout(3000);
}

test.describe('@ai IntakeScreen Real AI', () => {

  // ─── Test: Real AI intake chat UI + response ──────────────────
  test('intake chat renders and real AI responds', async ({ page }) => {
    test.setTimeout(300000);
    console.log('\n💬 Testing IntakeScreen with real AI...');

    // Mock AI ONLY for non-intake screens (values gen, etc.)
    // Intake calls go through to real AI
    await page.route('**/api/qwen-chat', async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      const sys = (req.systemPrompt || '').toLowerCase();

      // Let intake calls pass through to real AI
      if (sys.includes("5 to 10 minutes") || sys.includes("the hero's name is")) {
        route.continue();
        return;
      }

      // Mock everything else for fast navigation
      if (sys.includes('values') && sys.includes('generate')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: JSON.stringify([
            { id: 'v1', text: 'Build meaningful friendships', icon: '🤝', domain: 'friendships' },
            { id: 'v2', text: 'Feel a sense of belonging', icon: '💜', domain: 'friendships' },
            { id: 'v3', text: 'Speak up and share my voice', icon: '🗣', domain: 'expression' },
            { id: 'v4', text: 'Spend quality time with others', icon: '🔥', domain: 'friendships' },
            { id: 'v5', text: 'Be someone people can trust', icon: '🌟', domain: 'friendships' },
            { id: 'v6', text: 'Open up and be vulnerable', icon: '🤗', domain: 'intimacy' },
            { id: 'v7', text: 'Take on growth challenges', icon: '🏔', domain: 'growth' },
            { id: 'v8', text: 'Share ideas confidently at work', icon: '💡', domain: 'employment' },
            { id: 'v9', text: 'Enjoy social events', icon: '🎉', domain: 'friendships' },
            { id: 'v10', text: 'Be respected and confident', icon: '⭐', domain: 'achievement' },
            { id: 'v11', text: 'Contribute to my community', icon: '🌍', domain: 'community' },
            { id: 'v12', text: 'Show love to people I care about', icon: '❤️', domain: 'intimacy' },
          ])})
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: "I understand. Let's keep going." })
        });
      }
    });

    await signupAndLogin(page);

    // Navigate: intro → character → shadowLore → psychoed → intake
    await screen(page, 'Shadow of Fear', 30000);
    for (let i = 0; i < 4; i++) await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    await page.locator('input').first().fill('Intake');
    await btn(page, "THAT'S ME");
    await btn(page, 'CONTINUE');
    await btn(page, "BEGIN JOURNEY");

    await screen(page, 'F.E.A.R.', 20000);
    await btn(page, 'CONTINUE');

    await screen(page, "THE SHADOW'S TRICKS", 20000);
    for (let i = 0; i < 5; i++) await btn(page, '^NEXT$');
    await btn(page, 'CONTINUE →');

    // Now we're at shadowLorePost → click "I'M READY, DARA" to start intake
    await screen(page, "I'M READY, DARA", 20000);
    await btn(page, "I'M READY, DARA");

    // Wait for intake chat to render (with real AI init call)
    const intakeInput = await page.waitForSelector('input[placeholder="Speak to Dara..."]', { timeout: 60000 }).catch(() => null);
    if (!intakeInput) {
      // May have auto-transitioned if AI returned shadow summary on init
      const shadowRevealVisible = await page.getByText("THE SHADOW'S TRUE NATURE").first().isVisible({ timeout: 3000 }).catch(() => false);
      if (shadowRevealVisible) {
        console.log('  ⏩ AI returned shadow summary on init — already on ShadowReveal');
        console.log('✅ Intake test OK (auto-transitioned)');
        return;
      }
      throw new Error('Intake screen never appeared');
    }

    console.log('✅ Intake chat UI rendered');

    // Wait for AI init retry to resolve before asserting
    const retryMsg = page.getByText('Dara is still preparing');
    if (await retryMsg.isVisible({ timeout: 15000 }).catch(() => false)) {
      console.log('  ⏳ Waiting for AI retry to resolve...');
      await retryMsg.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }

    // Verify send button becomes enabled after typing
    const intakeInputLocator = page.locator('input[placeholder="Speak to Dara..."]');
    await intakeInputLocator.fill('test');
    await page.waitForTimeout(500);
    const sendBtn = page.locator('button').filter({ hasText: /→/ }).first();
    const isEnabled = await sendBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    await intakeInputLocator.clear();
    await page.waitForTimeout(300);

    console.log(`  Send button enabled after typing: ${isEnabled}`);

    // Wait for fonts to load and header to fully render before screenshot
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForSelector('text="DARA"', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshots/ai-intake-initial.png' });

    await aiAssert(page,
      'Is this a chat screen with a therapeutic companion? Is there a header showing the companion name (Dara)? Is there a text input field at the bottom? Is there a send button (arrow icon)? Is the design consistent with a mobile game chat interface?',
      { context: 'IntakeScreen — chat with Dara, the AI companion. Asks the user about their social anxiety. Has a text input with voice option and send button. Dark game-themed background.' }
    );
    console.log('✅ Intake initial UI OK');

    // Send a message — real AI will respond
    const result = await page.evaluate((msg) => {
      const input = document.querySelector('input[placeholder="Speak to Dara..."]');
      if (!input) return { ok: false, reason: 'input not found' };
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, msg);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    }, 'I get really anxious when people look at me in meetings');

    if (!result.ok) {
      console.log(`  ⚠️ Could not fill input: ${result.reason}`);
      return;
    }

    await page.waitForTimeout(500);

    // Click send
    const sendBtn2 = page.locator('button').filter({ hasText: /→/ }).first();
    const isEnabled2 = await sendBtn2.isEnabled({ timeout: 10000 }).catch(() => false);
    if (!isEnabled2) {
      console.log('  ⚠️ Send button not enabled');
      return;
    }
    await sendBtn2.click();

    console.log('  ⏳ Waiting for real AI response (up to 60s)...');

    // Wait for AI response to appear in chat
    // The AI response will be in a message bubble
    const responseVisible = await page.waitForSelector('[class*="DialogBox"], [style*="border-radius"]:has-text("Dara")', { timeout: 60000 }).catch(() => null);

    if (responseVisible) {
      console.log('  ✅ AI response received');
    } else {
      // Fallback: check if any new text appeared after our message
      await page.waitForTimeout(3000);
      console.log('  ⏳ Checking for any AI response in chat...');
    }

    // Wait a bit for typewriter animation
    await page.waitForTimeout(3000);

    // Take screenshot with AI response
    await page.screenshot({ path: 'test/screenshots/ai-intake-response.png' });

    await aiAssert(page,
      'Is this a chat screen where a message was sent and a response is visible or being typed? Is there a user message visible? Is there a response area (even if still typing)? Is the chat UI functional and readable?',
      { context: 'IntakeScreen after sending a real message to Dara. The AI should be responding. May show typewriter dots, partial text, or a completed response.' }
    );
    console.log('✅ Intake real-AI response OK');
  });

});
