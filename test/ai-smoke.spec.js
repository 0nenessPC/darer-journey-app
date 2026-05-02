// @ts-check
import { test, expect } from '@playwright/test';
import { aiAssert, aiAssess, btn, screen, quickSignup, setupMockAI } from './ai-tester.js';

const APP_URL = process.env.DARER_TEST_URL || 'http://localhost:3000';
const TEST_PASSWORD = 'AiSmoke2026!';

const SUPABASE_URL = 'https://macdrvetjapmaujbsivh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E07mDSpBz3ok98JeptwdzQ_CZNa1KTi';
const NDA_TEXT = `DARER ORDER — CONFIDENTIALITY AGREEMENT\n\nLast Updated: April 21, 2026\nVersion: 1.0`;

const emailInput = (page) => page.locator('input[type="text"], input:not([type="password"]):not([type="hidden"])').first();
const pwInput = (page) => page.locator('input[type="password"]');

// ─── Shared helpers ─────────────────────────────────────────────────

async function loginAsReturning(page, email, password) {
  await page.goto(APP_URL);
  await emailInput(page).fill(email);
  await pwInput(page).fill(password);
  await page.getByText('START YOUR JOURNEY').click();
  await page.waitForTimeout(3000);
}

async function signupAndLogin(page) {
  const testEmail = `ai.smoke.${Date.now()}@gmail.com`;
  // Clear any saved state from previous tests
  await page.context().clearCookies();
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP_URL);
  await page.getByText('NEW GAME', { exact: true }).click();
  await emailInput(page).fill(testEmail);
  await pwInput(page).fill(TEST_PASSWORD);
  await page.getByText('CREATE HERO').click();
  await page.waitForTimeout(3000);

  // Pre-insert NDA agreement via Supabase REST API to skip consent screen
  const ndaResult = await page.evaluate(async ({ url, key, ndaText }) => {
    const storageKey = Object.keys(localStorage).find(k => k.includes('sb-') && k.includes('auth-token'));
    if (!storageKey) return { status: 'no_session' };
    const session = JSON.parse(localStorage.getItem(storageKey));
    const accessToken = session?.access_token;
    if (!accessToken) return { status: 'no_token' };
    const userId = session?.user?.id;
    if (!userId) return { status: 'no_user_id' };
    const ndaRes = await fetch(`${url}/rest/v1/nda_agreements`, {
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
        participant_name: 'AI Smoke',
        darer_id: session?.user?.user_metadata?.darer_id || '',
        signed_at: new Date().toISOString()
      })
    });
    if (!ndaRes.ok) {
      const err = await ndaRes.text();
      return { status: 'nda_failed', error: err.substring(0, 200) };
    }
    return { status: 'ok', userId };
  }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, ndaText: NDA_TEXT });

  await page.getByText('LOG IN', { exact: true }).click();
  await page.waitForTimeout(500);
  await emailInput(page).fill(testEmail);
  await pwInput(page).fill(TEST_PASSWORD);
  await page.getByText('START YOUR JOURNEY').click();
  await page.waitForTimeout(3000);
}

test.describe('@ai Smoke Tests', () => {

  // ─── Test 1: Login Screen ─────────────────────────────────────
  test('login screen renders cleanly', async ({ page }) => {
    console.log('\n📱 Testing login screen...');
    await page.goto(APP_URL);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test/screenshots/ai-login.png' });

    await aiAssert(page,
      'Is this a login/signup screen for a mobile game app? Is the UI rendered cleanly without layout bugs? Are email and password inputs visible? Are there "LOG IN" and "NEW GAME" tabs or toggle?',
      { context: 'This is the entry screen for DARER Journey — a therapeutic mobile game for social anxiety.' }
    );
    console.log('✅ Login screen OK');
  });

  // ─── Test 2: GameIntro ────────────────────────────────────────
  test('GameIntro renders hero text', async ({ page }) => {
    console.log('\n📖 Testing GameIntro screen...');
    await signupAndLogin(page);

    await screen(page, 'Shadow of Fear', 30000);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test/screenshots/ai-intro.png' });

    await aiAssert(page,
      'Is this a story/intro screen for a game? Is there readable hero text? Is there a dot/page indicator showing this is a multi-slide carousel? Is the overall design thematic and readable? Note: "STEP 1/11" is the overall onboarding progress (11 total screens), while the 5 dots represent slides within this GameIntro screen — these are not inconsistent.',
      { context: 'GameIntro screen — first screen after login. Shows 5 slides of story text about "The Shadow of Fear." The step counter (1/11) tracks overall onboarding progress across all screens; the 5 dots track slides within this carousel. Background is dark with thematic text.' }
    );
    console.log('✅ GameIntro OK');
  });

  // ─── Test 3: CharacterCreate — Name Entry ─────────────────────
  test('CharacterCreate name entry is usable', async ({ page }) => {
    console.log('\n🎭 Testing CharacterCreate name entry...');
    await signupAndLogin(page);

    // Navigate through intro
    await screen(page, 'Shadow of Fear', 30000);
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshots/ai-character-name.png' });

    await aiAssert(page,
      'Is there a text input field for entering a character name? Is there a "THAT\'S ME" or confirmation button below it? Is the screen layout clean and usable?',
      { context: 'Character creation step 1 — the user should type their hero name here. The input should be clearly labeled and the button should be visible.' }
    );
    console.log('✅ CharacterCreate name entry OK');
  });

  // ─── Test 4: CharacterCreate — Meet Dara ──────────────────────
  test('Meet Dara screen shows companion intro', async ({ page }) => {
    console.log('\n🤝 Testing Meet Dara screen...');
    await signupAndLogin(page);

    // Navigate to Meet Dara
    await screen(page, 'Shadow of Fear', 30000);
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    const nf = page.locator('input').first();
    await expect(nf).toBeVisible({ timeout: 5000 });
    await nf.fill('TestHero');
    await btn(page, "THAT'S ME");
    await btn(page, 'CONTINUE');

    await screen(page, 'SOUL COMPANION OF THE DARER ORDER', 20000);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test/screenshots/ai-meet-dara.png' });

    await aiAssert(page,
      'Does this screen introduce a character named Dara? Is there readable introductory text about Dara as a companion/soul guide? Is the design thematic to a therapeutic game? Note: "TestHero" is the hero name entered during test signup — do not flag it as placeholder.',
      { context: 'Meet Dara step — Dara is the AI companion/soul guide. The screen shows Dara\'s intro message. The hero name "TestHero" is test data, not a placeholder.' }
    );
    console.log('✅ Meet Dara OK');
  });

  // ─── Test 5: Values Screen — Cards Step ───────────────────────
  test('Values card selection screen is usable', async ({ page }) => {
    test.setTimeout(180000);
    console.log('\n Testing Values card selection...');

    // Mock AI for intake chat responses and values generation
    await page.route('**/api/qwen-chat', async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      const sys = (req.systemPrompt || '').toLowerCase();
      const msgs = req.messages || [];
      const hasUserMsgs = msgs.some(m => m.role === 'user' || m.role === 'user_input');
      let reply;

      if (sys.includes('values') && sys.includes('generate')) {
        reply = JSON.stringify([
          { id: 'v1', text: 'Build meaningful friendships', icon: '🤝', domain: 'friendships' },
          { id: 'v2', text: 'Feel a sense of belonging', icon: '💜', domain: 'friendships' },
          { id: 'v3', text: 'Show love to people I care about', icon: '❤️', domain: 'intimacy' },
          { id: 'v4', text: 'Spend quality time with others', icon: '🔥', domain: 'friendships' },
          { id: 'v5', text: 'Be someone people can trust', icon: '', domain: 'friendships' },
          { id: 'v6', text: 'Open up and be vulnerable', icon: '🤗', domain: 'intimacy' },
          { id: 'v7', text: 'Speak up and share my voice', icon: '🗣', domain: 'expression' },
          { id: 'v8', text: 'Share ideas confidently at work', icon: '', domain: 'employment' },
          { id: 'v9', text: 'Enjoy social events', icon: '🎉', domain: 'friendships' },
          { id: 'v10', text: 'Take on growth challenges', icon: '', domain: 'growth' },
          { id: 'v11', text: 'Be respected and confident', icon: '⭐', domain: 'achievement' },
          { id: 'v12', text: 'Contribute to my community', icon: '🌍', domain: 'community' },
        ]);
      } else if (sys.includes("5 to 10 minutes") || sys.includes("the hero's name is")) {
        // Intake screen — return shadow summary on every call to skip straight to reveal
        reply = 'Thank you for sharing. Based on what you\'ve told me, I can see the SHADOW\'S TRUE NATURE and WHERE IT APPEARS: The Shadow claims crowded rooms and first encounters, whispering that you don\'t belong. Your Escape is looking away and staying silent. But you\'re here now — and that means you\'re ready to face it.';
      } else {
        reply = 'I understand. Let\'s keep going.';
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply })
      });
    });

    await signupAndLogin(page);

    // Navigate: intro → character → shadowLore → psychoed → shadowLorePost → intake → shadowReveal → values
    await screen(page, 'Shadow of Fear', 30000);
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    // Character creation
    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    await page.locator('input').first().fill('Val');
    await btn(page, "THAT'S ME");
    await btn(page, 'CONTINUE');
    await btn(page, "BEGIN JOURNEY");

    // After character complete, app routes to shadowLore
    await screen(page, 'F.E.A.R.', 20000);
    // Step 0 CONTINUE → psychoed screen
    await btn(page, 'CONTINUE');

    // PsychoEd — 6 slides (0-5), need 5 NEXT clicks + 1 CONTINUE to exit
    await screen(page, "THE SHADOW'S TRICKS", 20000);
    await btn(page, 'NEXT');
    await btn(page, 'NEXT');
    await btn(page, 'NEXT');
    await btn(page, 'NEXT');
    await btn(page, 'NEXT');
    await btn(page, 'CONTINUE');

    // shadowLorePost → intake (click "I'M READY, DARA" to start intake chat)
    // Mock returns shadow summary immediately → auto-transitions to ShadowReveal
    await screen(page, "I'M READY, DARA", 20000);
    await btn(page, "I'M READY, DARA");
    // Intake auto-transitions to ShadowReveal (mock returns shadow summary on init)
    await screen(page, 'THE SHADOW\'S TRUE NATURE', 30000);
    await btn(page, 'THE JOURNEY CONTINUES');

    // Values screen — starts at intro, then cards
    await screen(page, 'WHY BECOME A DARER', 20000);
    await btn(page, 'LET ME SHOW YOU');
    await screen(page, 'WHAT MATTERS MOST', 20000);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test/screenshots/ai-values-cards.png' });

    await aiAssert(page,
      'Is this a value selection screen with a grid of clickable cards? Each card should have an icon and text label. Is there a header "WHAT MATTERS MOST"? Is there a subtitle about choosing values? Are cards visually distinct and tappable?',
      { context: 'Values screen — user selects 2-5 values that matter most. Cards should be tappable with clear labels. Header "WHAT MATTERS MOST". The "THESE MATTER TO ME" button is intentionally hidden until 2+ values are selected.' }
    );
    console.log('✅ Values card selection OK');
  });

  // ─── Test 6: Shadow Lore ──────────────────────────────────────
  test('Shadow Lore screen renders thematically', async ({ page }) => {
    console.log('\n🌑 Testing Shadow Lore screen...');

    // Fast-forward: mock AI, navigate through intro + character + values
    await setupMockAI(page, 'values');

    await signupAndLogin(page);
    await screen(page, 'Shadow of Fear', 30000);
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    await page.locator('input').first().fill('Shadow');
    await btn(page, "THAT'S ME");
    await btn(page, 'CONTINUE');
    await btn(page, "BEGIN JOURNEY");

    // After character complete, app routes directly to shadowLore
    await screen(page, 'F.E.A.R.', 20000);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshots/ai-shadow-lore.png' });

    await aiAssert(page,
      'Is this a dramatic/thematic story screen about fear? Is there a "F.E.A.R." acronym or heading? Is there a "CONTINUE" button? Does the dark theme fit a "shadow" concept?',
      { context: 'Shadow Lore screen — first encounter with the Shadow concept. F.E.A.R. acronym is explained. Dark, dramatic theme.' }
    );
    console.log('✅ Shadow Lore OK');
  });

  // ─── Test 7: PsychoEd Screen ──────────────────────────────────
  test('PsychoEd educational slides are readable', async ({ page }) => {
    console.log('\n📚 Testing PsychoEd screen...');

    // Navigate to Shadow Lore first, then click through to PsychoEd
    await setupMockAI(page, 'values');

    await signupAndLogin(page);
    await screen(page, 'Shadow of Fear', 30000);
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    await page.locator('input').first().fill('Psycho');
    await btn(page, "THAT'S ME");
    await btn(page, 'CONTINUE');
    await btn(page, "BEGIN JOURNEY");

    // After character complete, app routes directly to shadowLore → PsychoEd
    await screen(page, 'F.E.A.R.', 20000);
    await btn(page, 'CONTINUE');

    // PsychoEd
    await screen(page, "THE SHADOW'S TRICKS", 20000);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshots/ai-psychoed.png' });

    await aiAssert(page,
      'Is this an educational slide about psychological concepts? Is there readable text explaining "The Shadow\'s Tricks" or similar therapeutic concepts? Is there a "NEXT" or "CONTINUE" button? Is the content structured as a slide/carousel?',
      { context: 'PsychoEd screen — educational slides about the Shadow\'s tricks (ACT therapy concepts). Shows as a slide carousel with NEXT/BACK buttons.' }
    );
    console.log('✅ PsychoEd OK');
  });

});
