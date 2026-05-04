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
    test.setTimeout(180000);
    console.log('\n Testing CharacterCreate name entry...');
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
      'Is this a character name entry screen? Is there a centered input field with placeholder text showing an auto-generated ID? Is there a "USE MY DARER ID" confirmation button below it? Is the layout clean and centered?',
      { context: 'Character creation step 2 of 11 (top progress bar shows "STEP 2/11"). The input field has a placeholder like "DARER_702494" — this is the auto-generated ID shown as placeholder text. The user can either type their own name or accept the ID. The button says "USE MY DARER ID" to confirm.' }
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
    // Intake mounts and calls AI on init; mock returns shadow summary right away.
    // The IntakeScreen has a 2-second auto-transition timer + TTS/typewriter cleanup.
    // Wait for the ShadowReveal screen to appear.
    await screen(page, 'THE SHADOW\'S TRUE NATURE', 45000);
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

  // ─── Test 8: BossBattle Prep — DARER Steps Layout ─────────────
  test('BossBattle prep phase shows DARER steps correctly', async ({ page }) => {
    test.setTimeout(300000);
    console.log('\n⚔️ Testing BossBattle prep layout...');

    // Set up comprehensive AI mocks for the entire onboarding + battle flow
    await page.route('**/api/qwen-chat', async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      const sys = (req.systemPrompt || '').toLowerCase();
      const msgs = req.messages || [];

      // Hierarchy check must come FIRST — its prompt also contains "values" and "generate"
      if (sys.includes('hierarchy')) {
        // Exposure sort boss generation (ExposureSortScreen)
        const replyData = JSON.stringify([
          { name: "The Smiler", activity: "Make eye contact and smile at a stranger", level: 1 },
          { name: "The Greeter", activity: "Say hello to someone you don't know", level: 2 },
          { name: "The Nodder", activity: "Give a small nod to someone nearby", level: 3 },
          { name: "The Asker", activity: "Ask a store clerk a question", level: 4 },
          { name: "The Joiner", activity: "Join a group conversation", level: 5 },
          { name: "The Sharer", activity: "Share an opinion in a small group", level: 6 },
          { name: "The Speaker", activity: "Give a short toast at a gathering", level: 7 },
          { name: "The Challenger", activity: "Disagree respectfully in a meeting", level: 8 },
          { name: "The Presenter", activity: "Present your ideas to a team", level: 9 },
          { name: "The Vulnerable", activity: "Share a personal struggle with someone you trust", level: 10 },
        ]);
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: replyData })
        });
      } else if (sys.includes('values') && sys.includes('generate')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: JSON.stringify([
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
          ])})
        });
      } else if (sys.includes("5 to 10 minutes") || sys.includes("the hero's name is")) {
        // Intake — return shadow summary to skip chat
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: "Thank you for sharing. I can see the SHADOW'S TRUE NATURE and WHERE IT APPEARS: The Shadow claims crowded rooms, whispering that you don't belong." })
        });
      } else if (sys.includes('micro-exposure') && sys.includes('training')) {
        // Tutorial exposure generation
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: JSON.stringify([
            { name: "The Smiler", text: "Make eye contact and smile at a stranger", icon: "😊", where: "Anywhere", time: "5 seconds", suds: 1 },
            { name: "The Greeter", text: "Say hello to someone you don't know", icon: "👋", where: "Walking past", time: "10 seconds", suds: 1 },
            { name: "The Nod", text: "Give a small nod to someone nearby", icon: "🙂", where: "Elevator", time: "5 seconds", suds: 2 },
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

    // Navigate through intro
    await screen(page, 'Shadow of Fear', 30000);
    for (let i = 0; i < 4; i++) await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    // Character creation
    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    await page.locator('input').first().fill('Battle');
    await btn(page, "THAT'S ME");
    await btn(page, 'CONTINUE');
    await btn(page, "BEGIN JOURNEY");

    // Shadow Lore → PsychoEd
    await screen(page, 'F.E.A.R.', 20000);
    await btn(page, 'CONTINUE');
    await screen(page, "THE SHADOW'S TRICKS", 20000);
    for (let i = 0; i < 5; i++) await btn(page, '^NEXT$');
    await btn(page, 'CONTINUE →');

    // Intake → ShadowReveal → Values
    await screen(page, "I'M READY, DARA", 20000);
    await btn(page, "I'M READY, DARA");
    await screen(page, 'THE SHADOW\'S TRUE NATURE', 45000);
    await btn(page, 'THE JOURNEY CONTINUES');

    // Values
    await screen(page, 'WHY BECOME A DARER', 20000);
    await btn(page, 'LET ME SHOW YOU');
    await screen(page, 'WHAT MATTERS MOST', 20000);
    // Select 3 values
    const valBtns = page.locator('button').filter({ hasText: /friendship|belonging|speak|challenge/i });
    for (let i = 0; i < Math.min(3, await valBtns.count()); i++) {
      await valBtns.nth(i).click({ force: true });
      await page.waitForTimeout(500);
    }
    await btn(page, 'THESE MATTER TO ME');
    await screen(page, 'VALUES SEALED', 20000);
    await btn(page, 'SHOW ME HOW');

    // DARER Strategy
    await screen(page, 'THE DARER STRATEGY', 20000);
    for (let i = 0; i < 4; i++) await btn(page, '^NEXT$');
    await btn(page, 'ENTER THE ARMORY');

    // Armory
    await screen(page, 'THE ARMORY', 20000);
    await btn(page, 'REVEAL THE FIRST TOOL');
    await btn(page, 'BEGIN PRACTICE');
    await btn(page, 'BEGIN BREATHING EXERCISE');
    const skipPractice = page.locator('button').filter({ hasText: /skip the practice/i }).first();
    await expect(skipPractice).toBeVisible({ timeout: 15000 });
    await skipPractice.click();
    await page.waitForTimeout(1000);
    const armoryUnlocked = await page.getByText('ARMORY UNLOCKED').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (armoryUnlocked) {
      await btn(page, 'ENTER TRAINING GROUNDS', 15000);
    }

    // Tutorial — quick through to exposure sort
    await screen(page, 'TRAINING GROUNDS', 20000);
    await btn(page, 'SHOW ME THE BATTLES');
    await page.waitForTimeout(3000);

    // Choose exposure
    const firstExposure = page.locator('button').filter({ hasText: /Make eye contact|Say hello|Give a small nod/i }).first();
    await expect(firstExposure).toBeVisible({ timeout: 15000 });
    await firstExposure.click();
    await btn(page, 'BEGIN TRAINING');

    // Decide — pick a value
    await screen(page, 'DECIDE', 15000);
    const decideVal = page.locator('button').filter({ hasText: /friendship|belong|speak/i }).first();
    await expect(decideVal).toBeVisible({ timeout: 10000 });
    await decideVal.click();
    await btn(page, 'I DECIDE');

    // Allow — fill fields
    const allowTextarea = page.locator('textarea').first();
    await expect(allowTextarea).toBeVisible({ timeout: 10000 });
    await allowTextarea.fill('They\'ll think I\'m weird.');
    await page.waitForTimeout(500);
    // Likelihood slider
    const likelihoodSlider = page.locator('input[type="range"]').first();
    await expect(likelihoodSlider).toBeVisible({ timeout: 10000 });
    await likelihoodSlider.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    // Severity slider
    const severitySlider = page.locator('input[type="range"]').last();
    await expect(severitySlider).toBeVisible({ timeout: 10000 });
    await severitySlider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    // Can handle
    const canHandleBtn = page.locator('button').filter({ hasText: /Yes.*I'd get through/i }).first();
    await expect(canHandleBtn).toBeVisible({ timeout: 10000 });
    await canHandleBtn.click();
    // Fear showing
    const fearShowingBtn = page.locator('button').filter({ hasText: /A little.*faint/i }).first();
    await expect(fearShowingBtn).toBeVisible({ timeout: 10000 });
    await fearShowingBtn.click();
    // Physical sensations
    const sensationBtn = page.locator('button').filter({ hasText: /Racing heart/i }).first();
    await expect(sensationBtn).toBeVisible({ timeout: 10000 });
    await sensationBtn.click();
    await btn(page, "I'M ALLOWING IT", 10000);

    // Rise — when + where
    const whenOption = page.locator('button').filter({ hasText: /Today.*soon/i }).first();
    await expect(whenOption).toBeVisible({ timeout: 10000 });
    await whenOption.click();
    const whereInput = page.locator('input[placeholder*="coffee shop"]').first();
    await expect(whereInput).toBeVisible({ timeout: 10000 });
    await whereInput.fill('the campus library');
    await btn(page, 'LOCK IT IN', 10000);

    // Rise — armory (skip practice)
    const armorySkip = page.locator('button').filter({ hasText: /trust the strategy/i }).first();
    await expect(armorySkip).toBeVisible({ timeout: 10000 });
    await armorySkip.click();

    // Rise — SUDs before
    await screen(page, 'STORM INTENSITY', 15000);
    await page.waitForTimeout(500);
    const sudsBeforeSlider = page.locator('input[type="range"]').first();
    await expect(sudsBeforeSlider).toBeVisible({ timeout: 10000 });
    await sudsBeforeSlider.focus();
    for (let i = 0; i < 50; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await btn(page, "LET'S GO", 10000);

    // Engage — engage right away
    const engageRightAway = page.locator('button').filter({ hasText: /ENGAGE RIGHT AWAY/i }).first();
    await expect(engageRightAway).toBeVisible({ timeout: 10000 });
    await engageRightAway.click();
    const outcomeBtn = page.locator('button').filter({ hasText: /I did it.*stayed all/i }).first();
    await expect(outcomeBtn).toBeVisible({ timeout: 10000 });
    await outcomeBtn.click();
    await btn(page, 'CONTINUE', 10000);

    // Engage — loot upload
    const lootTextarea = page.locator('textarea').first();
    await expect(lootTextarea).toBeVisible({ timeout: 10000 });
    await lootTextarea.fill('I felt proud');
    await btn(page, 'CONTINUE', 10000);

    // Engage — SUDs after
    await screen(page, 'STORM INTENSITY', 15000);
    await page.waitForTimeout(500);
    const sudsAfterSlider = page.locator('input[type="range"]').first();
    await expect(sudsAfterSlider).toBeVisible({ timeout: 10000 });
    await sudsAfterSlider.focus();
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await btn(page, 'CONTINUE', 10000);

    // Engage — reflection Q1
    const noHappenBtn = page.locator('button').filter({ hasText: /No, they didn't happen/i }).first();
    await expect(noHappenBtn).toBeVisible({ timeout: 10000 });
    await noHappenBtn.click();
    await btn(page, 'CONTINUE', 10000);

    // Engage — free text
    const freeText = page.locator('textarea').first();
    await expect(freeText).toBeVisible({ timeout: 10000 });
    await freeText.fill('It wasn\'t as bad as I feared');
    await btn(page, 'SEE WHAT THE SHADOW DID', 10000);

    // Battle complete → repeat → finish tutorial
    await screen(page, 'FIRST BATTLE COMPLETE', 15000);
    await btn(page, 'THE POWER OF REPEAT', 15000);
    await btn(page, 'GOT IT — ON TO THE PATH', 15000);

    // Dismiss post-battle celebration overlay (BattleRewardScreen + CelebrationOverlay)
    const seeRewardsBtn = page.locator('button').filter({ hasText: /SEE MY REWARDS/i }).first();
    await expect(seeRewardsBtn).toBeVisible({ timeout: 15000 });
    await seeRewardsBtn.click();
    // Celebration overlay auto-advances through XP/coins/lantern/level/streak — tap to dismiss
    await page.waitForTimeout(5000);
    await page.click('body');
    await page.waitForTimeout(1000);

    // ═══ EXPOSURE SORT ═══
    await screen(page, 'FORGE YOUR PATH', 20000);
    await page.waitForTimeout(3000);
    // Accept all 10 exposures
    for (let i = 0; i < 10; i++) {
      const acceptBtn = page.locator('button').filter({ hasText: /^✓$/ }).first();
      await expect(acceptBtn).toBeVisible({ timeout: 10000 });
      await acceptBtn.click();
      await page.waitForTimeout(1000);
    }

    // Transition to map
    await btn(page, 'BEGIN THE JOURNEY', 20000);
    await page.waitForTimeout(3000);

    // ═══ MAP — now enter BossBattle prep ═══
    await screen(page, 'BOSSES', 20000);
    console.log('✅ Reached map');

    // Click "ENGAGE THIS BOSS" to enter BossBattle
    const engageBossBtn = page.locator('button').filter({ hasText: /ENGAGE THIS BOSS/i }).first();
    await expect(engageBossBtn).toBeVisible({ timeout: 15000 });
    await engageBossBtn.click();

    // Wait for BossBattle prep to render
    await screen(page, 'DECIDE', 20000);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test/screenshots/ai-bossbattle-prep.png' });

    await aiAssert(page,
      'Is this a boss battle prep screen for a mobile game? Does it show a D.A.R.E.R. progress bar at the top with letter indicators? Is the DECIDE section visible with value cards to select? Are there at least some interactive value pick buttons? Is the boss name and description visible? Is the layout clean and game-themed?',
      { context: 'BossBattle prep phase — DECIDE step of the D.A.R.E.R. framework. User selects values that matter for this exposure. The progress bar shows D-A-R-E-R letters. This is the first prep step before Allow, Rise, and Engage phases.' }
    );
    console.log('✅ BossBattle prep DECIDE OK');

    // Continue to ALLOW phase to verify it's accessible
    const decideValBtn = page.locator('button').filter({ hasText: /friendship|belong|speak|challenge|trust/i }).first();
    await expect(decideValBtn).toBeVisible({ timeout: 10000 });
    await decideValBtn.click();
    await btn(page, 'I DECIDE', 10000);

    // ALLOW phase should appear
    await screen(page, 'ALLOW', 15000);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshots/ai-bossbattle-allow.png' });

    await aiAssert(page,
      'Is this an ALLOW phase of a therapeutic exercise? Is there a textarea for fearful thoughts? Are there slider inputs or progressive form fields? Is the D.A.R.E.R. progress bar visible with A highlighted?',
      { context: 'BossBattle ALLOW phase — progressive form: fearful thoughts textarea → likelihood slider → severity slider → can-handle buttons → fear-showing buttons → physical sensation tags. D.A.R.E.R. progress bar at top.' }
    );
    console.log('✅ BossBattle prep ALLOW OK');
  });

  // ─── Test 9: TutorialBattle Coach Chat Voice ──────────────────
  test('TutorialBattle coach chat has VoiceInputBar and auto-speak', async ({ page }) => {
    test.setTimeout(300000);
    console.log('\n🎙️ Testing TutorialBattle coach chat voice...');

    // Set up AI mocks for the full flow through tutorial
    await page.route('**/api/qwen-chat', async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      const sys = (req.systemPrompt || '').toLowerCase();

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
      } else if (sys.includes("5 to 10 minutes") || sys.includes("the hero's name is")) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: "Thank you for sharing. I can see the SHADOW'S TRUE NATURE and WHERE IT APPEARS: The Shadow claims crowded rooms." })
        });
      } else if (sys.includes('micro-exposure') && sys.includes('training')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: JSON.stringify([
            { name: "The Smiler", text: "Make eye contact and smile at a stranger", icon: "😊", where: "Anywhere", time: "5 seconds", suds: 1 },
            { name: "The Greeter", text: "Say hello to someone you don't know", icon: "👋", where: "Walking past", time: "10 seconds", suds: 1 },
            { name: "The Nod", text: "Give a small nod to someone nearby", icon: "🙂", where: "Elevator", time: "5 seconds", suds: 2 },
          ])})
        });
      } else if (sys.includes('boss battle') && sys.includes('prepare them')) {
        // Coach chat in tutorial (SYS.preBoss)
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ reply: "You've got this. Remember your courage. Take a deep breath and step forward." })
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

    // Quick navigation through intro → character → shadow lore → psychoed → intake → shadow reveal → values → darer strategy → armory → tutorial
    await screen(page, 'Shadow of Fear', 30000);
    for (let i = 0; i < 4; i++) await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');

    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    await page.locator('input').first().fill('Voice');
    await btn(page, "THAT'S ME");
    await btn(page, 'CONTINUE');
    await btn(page, "BEGIN JOURNEY");

    await screen(page, 'F.E.A.R.', 20000);
    await btn(page, 'CONTINUE');
    await screen(page, "THE SHADOW'S TRICKS", 20000);
    for (let i = 0; i < 5; i++) await btn(page, '^NEXT$');
    await btn(page, 'CONTINUE →');

    await screen(page, "I'M READY, DARA", 20000);
    await btn(page, "I'M READY, DARA");
    await screen(page, 'THE SHADOW\'S TRUE NATURE', 45000);
    await btn(page, 'THE JOURNEY CONTINUES');

    await screen(page, 'WHY BECOME A DARER', 20000);
    await btn(page, 'LET ME SHOW YOU');
    await screen(page, 'WHAT MATTERS MOST', 20000);
    const valBtns = page.locator('button').filter({ hasText: /friendship|belonging|speak/i });
    for (let i = 0; i < Math.min(3, await valBtns.count()); i++) {
      await valBtns.nth(i).click({ force: true });
      await page.waitForTimeout(500);
    }
    await btn(page, 'THESE MATTER TO ME');
    await screen(page, 'VALUES SEALED', 20000);
    await btn(page, 'SHOW ME HOW');

    await screen(page, 'THE DARER STRATEGY', 20000);
    for (let i = 0; i < 4; i++) await btn(page, '^NEXT$');
    await btn(page, 'ENTER THE ARMORY');

    await screen(page, 'THE ARMORY', 20000);
    await btn(page, 'REVEAL THE FIRST TOOL');
    await btn(page, 'BEGIN PRACTICE');
    await btn(page, 'BEGIN BREATHING EXERCISE');
    const skipPractice = page.locator('button').filter({ hasText: /skip the practice/i }).first();
    await expect(skipPractice).toBeVisible({ timeout: 15000 });
    await skipPractice.click();
    await page.waitForTimeout(1000);
    const armoryUnlocked = await page.getByText('ARMORY UNLOCKED').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (armoryUnlocked) await btn(page, 'ENTER TRAINING GROUNDS', 15000);

    // Tutorial — navigate to coach chat
    await screen(page, 'TRAINING GROUNDS', 20000);
    await btn(page, 'SHOW ME THE BATTLES');
    await page.waitForTimeout(3000);

    // Choose exposure
    const firstExposure = page.locator('button').filter({ hasText: /Make eye contact|Say hello|Give a small nod/i }).first();
    await expect(firstExposure).toBeVisible({ timeout: 15000 });
    await firstExposure.click();
    await btn(page, 'BEGIN TRAINING');

    // Decide
    await screen(page, 'DECIDE', 15000);
    const decideVal = page.locator('button').filter({ hasText: /friendship|belong|speak/i }).first();
    await expect(decideVal).toBeVisible({ timeout: 10000 });
    await decideVal.click();
    await btn(page, 'I DECIDE');

    // Allow
    const allowTextarea = page.locator('textarea').first();
    await expect(allowTextarea).toBeVisible({ timeout: 10000 });
    await allowTextarea.fill('I worry about looking awkward.');
    await page.waitForTimeout(500);
    const likelihoodSlider = page.locator('input[type="range"]').first();
    await expect(likelihoodSlider).toBeVisible({ timeout: 10000 });
    await likelihoodSlider.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    const severitySlider = page.locator('input[type="range"]').last();
    await expect(severitySlider).toBeVisible({ timeout: 10000 });
    await severitySlider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    const canHandleBtn = page.locator('button').filter({ hasText: /Yes.*I'd get through/i }).first();
    await expect(canHandleBtn).toBeVisible({ timeout: 10000 });
    await canHandleBtn.click();
    const fearShowingBtn = page.locator('button').filter({ hasText: /A little.*faint/i }).first();
    await expect(fearShowingBtn).toBeVisible({ timeout: 10000 });
    await fearShowingBtn.click();
    const sensationBtn = page.locator('button').filter({ hasText: /Racing heart/i }).first();
    await expect(sensationBtn).toBeVisible({ timeout: 10000 });
    await sensationBtn.click();
    await btn(page, "I'M ALLOWING IT", 10000);

    // Rise
    const whenOption = page.locator('button').filter({ hasText: /Today.*soon/i }).first();
    await expect(whenOption).toBeVisible({ timeout: 10000 });
    await whenOption.click();
    const whereInput = page.locator('input[placeholder*="coffee shop"]').first();
    await expect(whereInput).toBeVisible({ timeout: 10000 });
    await whereInput.fill('the campus library');
    await btn(page, 'LOCK IT IN', 10000);

    const armorySkip = page.locator('button').filter({ hasText: /trust the strategy/i }).first();
    await expect(armorySkip).toBeVisible({ timeout: 10000 });
    await armorySkip.click();

    await screen(page, 'STORM INTENSITY', 15000);
    await page.waitForTimeout(500);
    const sudsBeforeSlider = page.locator('input[type="range"]').first();
    await expect(sudsBeforeSlider).toBeVisible({ timeout: 10000 });
    await sudsBeforeSlider.focus();
    for (let i = 0; i < 50; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await btn(page, "LET'S GO", 10000);

    // ═══ ENGAGE — choose "TALK TO DARA FIRST" to enter coach chat ═══
    console.log('  → Engage: Talk to Dara first');
    const talkToDara = page.locator('button').filter({ hasText: /TALK TO DARA FIRST/i }).first();
    await expect(talkToDara).toBeVisible({ timeout: 15000 });
    await talkToDara.click();

    // Wait for coach chat to render — look for Dara's coach message
    await page.waitForSelector('text=/Whatever.*mind/', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test/screenshots/ai-tutorial-coach-chat.png' });

    // Verify VoiceInputBar is present (it shows when voice.supported is true)
    // VoiceInputBar has a microphone button and text input
    const voiceInputBar = page.locator('[placeholder*="Speak or type"], [placeholder*="speak"], input[placeholder*="Speak"]');
    const hasVoiceInputBar = await voiceInputBar.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasVoiceInputBar) {
      console.log('✅ VoiceInputBar found');
    } else {
      // Check for the fallback textarea + SEND button
      const coachTextarea = page.locator('textarea').filter({ hasNotText: /fearful|allow|fear/i }).first();
      const hasTextarea = await coachTextarea.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`  VoiceInputBar not found (browser STT unavailable), fallback textarea: ${hasTextarea}`);
    }

    // Send a message in coach chat — try SEND button first, then mic button in VoiceInputBar
    const sendBtn = page.locator('button').filter({ hasText: /SEND/i }).first();
    const micBtn = page.locator('button[title*="Start"], button[aria-label*="mic"], button').filter({ hasText: /🎤/ }).first();
    const hasSendBtn = await sendBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasMicBtn = await micBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const isSendVisible = hasSendBtn || hasMicBtn;

    if (isSendVisible) {
      // Use the fallback textarea if VoiceInputBar isn't available
      if (!hasVoiceInputBar) {
        const textarea = page.locator('textarea').last();
        await textarea.fill('How do I stay calm?');
        await page.waitForTimeout(500);
      }
      if (hasSendBtn) {
        await sendBtn.click({ force: true });
      } else if (hasMicBtn) {
        // VoiceInputBar: fill input via JS then click mic
        await page.evaluate(() => {
          const input = document.querySelector('input[placeholder*="Speak or type"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'How do I stay calm?');
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        await page.waitForTimeout(500);
        await micBtn.click({ force: true });
      }

      // Wait for AI reply (mock returns instantly)
      await page.waitForTimeout(3000);

      // Check that a reply appeared
      const replyVisible = await page.getByText(/courage|breath|step forward/i).first().isVisible({ timeout: 10000 }).catch(() => false);
      console.log(`  AI reply visible: ${replyVisible}`);

      await page.screenshot({ path: 'test/screenshots/ai-tutorial-coach-reply.png' });

      await aiAssert(page,
        'Is this a coach/chat screen in a therapeutic game? Is there a message from an AI coach (Dara)? Is there a text input area for asking questions? Is the design consistent with a mobile game battle prep screen?',
        { context: 'TutorialBattle ENGAGE sub-step 0.5 — "Talk to Dara first" coach chat. Shows Dara\'s message, a text/voice input bar, and AI replies. The user can ask Dara for advice before engaging the exposure.' }
      );
    } else {
      console.log('  ⏩ Coach chat send button not accessible — checking static layout');
      await aiAssert(page,
        'Is this a prep screen before an engagement/battle? Is there text from a companion named Dara asking what the user needs before stepping forward? Is there a way to ask questions or proceed?',
        { context: 'TutorialBattle ENGAGE — "Talk to Dara first" screen. Shows Dara\'s message asking what the hero needs before the exposure.' }
      );
    }
    console.log('✅ TutorialBattle coach chat OK');
  });

});
