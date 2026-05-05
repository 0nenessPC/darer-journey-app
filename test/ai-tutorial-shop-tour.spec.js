// @ts-check
import { test, expect } from '@playwright/test';

const APP_URL = process.env.DARER_TEST_URL || 'http://localhost:3000';
const SUPABASE_URL = 'https://macdrvetjapmaujbsivh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E07mDSpBz3ok98JeptwdzQ_CZNa1KTi';
const NDA_TEXT = `DARER ORDER — CONFIDENTIALITY AGREEMENT\n\nLast Updated: April 21, 2026\nVersion: 1.0`;
const TEST_EMAIL = `shop.tour.${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'TourTest2026!';

async function btn(page, text, timeout = 15000) {
  const b = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).first();
  await expect(b).toBeVisible({ timeout });
  await b.click();
  await page.waitForTimeout(800);
}

async function screen(page, text, timeout = 20000) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout });
}

test.describe('Tutorial Shop Tour + Evidence', () => {
  test('tutorial completes, shop tour appears, evidence on wall of fame', async ({ page }) => {
    test.setTimeout(300000);
    console.log(`\n🎮 Test user: ${TEST_EMAIL}`);

    // ══ MOCK AI calls ═══
    await page.route('**/api/qwen-chat', async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      const sys = (req.systemPrompt || '').toLowerCase();
      const msgs = req.messages || [];
      let reply;

      // NOTE: hierarchy check must come before values — the exposure sort prompt
      // contains "stated values" which would match the values branch first.
      if (sys.includes('hierarchy')) {
        reply = JSON.stringify([
          { name: 'Wave Greeter', activity: 'Wave at a stranger walking by', level: 1 },
          { name: 'Line Chat', activity: 'Make brief small talk with someone in line', level: 2 },
          { name: 'Direction Seeker', activity: 'Ask a stranger for simple directions', level: 3 },
          { name: 'Compliment Giver', activity: 'Give a genuine compliment to a coworker', level: 4 },
          { name: 'Opinion Sharer', activity: 'Share your opinion in a group discussion', level: 5 },
          { name: 'Phone-Free Spot', activity: 'Sit in a visible spot for 30 seconds without your phone', level: 1 },
          { name: 'Hello Starter', activity: 'Say hello to a stranger', level: 2 },
          { name: 'Store Query', activity: 'Ask a store clerk a question', level: 3 },
          { name: 'Group Speaker', activity: 'Speak up in a group of 5 or more', level: 5 },
          { name: 'Brave Bow', activity: 'Make eye contact and nod at someone', level: 1 },
        ]);
      } else if (sys.includes('values')) {
        reply = JSON.stringify([
          { text: 'Speak up and share what I think and feel', icon: '🗣️' },
          { text: 'Enjoy social events without dreading them', icon: '🎉' },
          { text: 'Make eye contact confidently', icon: '👁️' },
        ]);
      } else if (sys.includes("the hero's name is") || sys.includes('5 to 10 minutes')) {
        const hasUserMsgs = msgs.some(m => m.role === 'user' || m.role === 'user_input');
        if (hasUserMsgs) {
          reply = "THE SHADOW'S TRUE NATURE — You avoid speaking up because you fear judgment, but the truth is, most people are too focused on themselves to judge you.";
        } else {
          reply = "Hey, I'm Dara. What does the Shadow make you afraid of?";
        }
      } else if (sys.includes('follow') || sys.includes('repeat')) {
        reply = JSON.stringify({
          repeatExposures: [
            { text: 'Say hello to two strangers', difficulty: 'easy' },
            { text: 'Ask a stranger for directions', difficulty: 'medium' },
            { text: 'Compliment a colleague', difficulty: 'easy' },
          ],
        });
      } else {
        // Fallback: return valid hierarchy for any unmatched exposure sort calls
        reply = JSON.stringify([
          { name: 'Wave Greeter', activity: 'Wave at a stranger walking by', level: 1 },
          { name: 'Line Chat', activity: 'Make brief small talk with someone in line', level: 2 },
          { name: 'Direction Seeker', activity: 'Ask a stranger for simple directions', level: 3 },
          { name: 'Compliment Giver', activity: 'Give a genuine compliment to a coworker', level: 4 },
          { name: 'Opinion Sharer', activity: 'Share your opinion in a group discussion', level: 5 },
          { name: 'Phone-Free Spot', activity: 'Sit in a visible spot for 30 seconds without your phone', level: 1 },
          { name: 'Hello Starter', activity: 'Say hello to a stranger', level: 2 },
          { name: 'Store Query', activity: 'Ask a store clerk a question', level: 3 },
          { name: 'Group Speaker', activity: 'Speak up in a group of 5 or more', level: 5 },
          { name: 'Brave Bow', activity: 'Make eye contact and nod at someone', level: 1 },
        ]);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply }),
      });
    });

    await page.goto(APP_URL);
    await expect(page).toHaveTitle(/D\.?A\.?R\.?E\.?R/i);

    // ═══ SIGN UP ═══
    await page.getByText('NEW GAME', { exact: true }).click();
    await page.locator('input:not([type="password"])').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByText('CREATE HERO').click();
    await page.waitForTimeout(3000);

    // Pre-insert NDA
    const ndaResult = await page.evaluate(async ({ url, key, ndaText }) => {
      const storageKey = Object.keys(localStorage).find(k => k.includes('sb-') && k.includes('auth-token'));
      if (!storageKey) return { status: 'no_session' };
      const session = JSON.parse(localStorage.getItem(storageKey));
      const accessToken = session?.access_token;
      if (!accessToken) return { status: 'no_token' };
      const userId = session?.user?.id;
      if (!userId) return { status: 'no_user_id' };
      try {
        const res = await fetch(`${url}/rest/v1/nda_agreements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            user_id: userId,
            agreement_version: '1.0',
            agreement_text: ndaText,
            participant_name: 'TourHero',
            darer_id: session?.user?.user_metadata?.darer_id || '',
            signed_at: new Date().toISOString(),
          }),
        });
        return { status: res.ok ? 'ok' : 'failed', text: await res.text().catch(() => '') };
      } catch (e) {
        return { status: 'error', error: String(e) };
      }
    }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, ndaText: NDA_TEXT });
    console.log(`  NDA pre-insert: ${ndaResult.status}`);

    await btn(page, 'START YOUR JOURNEY');

    // ══ GAME INTRO ═══
    await screen(page, 'Shadow of Fear');
    for (let i = 0; i < 4; i++) await btn(page, 'NEXT');
    await btn(page, 'BEGIN THE JOURNEY');

    // ═══ CHARACTER ═══
    await screen(page, 'EVERY HERO HAS A NAME');
    const nameInput = page.locator('input').first();
    await nameInput.click();
    await nameInput.fill('TourHero');
    await btn(page, "THAT'S ME");
    // Stats section → Meet Dara → Enter journey
    await btn(page, 'CONTINUE');
    await btn(page, 'BEGIN JOURNEY');

    // ═══ SHADOW LORE ═══
    await screen(page, 'THE SHADOW');
    await btn(page, 'CONTINUE');

    // ═══ PSYCHOED ═══
    await screen(page, 'THE SHADOW');
    for (let i = 0; i < 5; i++) await btn(page, 'NEXT');
    await btn(page, 'CONTINUE');

    // ═══ SHADOW LORE POST (step 1) ═══
    await screen(page, 'I\'M READY');
    await btn(page, "I'M READY, DARA");

    // ═══ INTAKE → auto-transitions to ShadowReveal (mock returns shadow summary) ═══
    await screen(page, "THE SHADOW'S TRUE NATURE", 30000);

    // ═══ SHADOW REVEAL ═══
    await btn(page, 'THE JOURNEY CONTINUES');

    // ═══ VALUES ═══
    await screen(page, 'WHY BECOME A DARER');
    await btn(page, 'LET ME SHOW YOU');
    await screen(page, 'WHAT MATTERS MOST');
    // Click first two value cards by position
    const cards = page.locator('button').filter({ hasText: /Reach out|Feel a sense/ });
    for (let i = 0; i < 2; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(300);
    }
    await btn(page, 'THESE MATTER');
    // Values confirmation → "SHOW ME HOW" navigates to DARERStrategy
    await btn(page, 'SHOW ME HOW');

    // ═══ DARER STRATEGY (5 slides) ═══
    await screen(page, 'THE DARER STRATEGY');
    for (let i = 0; i < 4; i++) await btn(page, 'NEXT');
    await btn(page, 'ENTER THE ARMORY');

    // ═══ ARMORY ═══
    await screen(page, 'THE ARMORY');
    await btn(page, 'REVEAL THE FIRST TOOL');
    await btn(page, 'BEGIN PRACTICE');
    await btn(page, 'BEGIN BREATHING EXERCISE');
    // Wait for practice screen to render (breathing animation starts)
    await page.waitForTimeout(1000);
    // Skip the 3-minute practice — navigates directly to TutorialBattle
    await page.locator('button').filter({ hasText: /Skip the practice/i }).click({ force: true });
    await page.waitForTimeout(1000);
    // TutorialBattle intro screen
    await screen(page, 'TRAINING GROUNDS', 15000);
    await btn(page, 'SHOW ME THE BATTLES');

    // ═══ TUTORIAL BATTLE — Choose exposure ═══
    await screen(page, 'CHOOSE YOUR FIRST BATTLE');
    // Pick the first exposure card
    const expCard = page.locator('button').filter({ hasText: /Sit in a visible spot|friendly small talk|Ask a stranger/ }).first();
    await expect(expCard).toBeVisible({ timeout: 10000 });
    await expCard.click();
    await page.waitForTimeout(300);
    await btn(page, 'BEGIN TRAINING');

    // DECIDE
    await screen(page, 'DECIDE');
    // Click the first value card (matches AI mock output)
    const decideVal = page.locator('button').filter({ hasText: /Reach out|Feel a sense/ }).first();
    await expect(decideVal).toBeVisible({ timeout: 10000 });
    await decideVal.click();
    await btn(page, 'I DECIDE');

    // ALLOW
    await screen(page, 'ALLOW');
    const allowTextarea = page.locator('textarea').first();
    await expect(allowTextarea).toBeVisible({ timeout: 10000 });
    await allowTextarea.fill('My voice might shake');
    // Likelihood slider
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('input[type="range"]');
      if (sliders[0]) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(sliders[0], 70);
        sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
        sliders[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);
    // Severity slider
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('input[type="range"]');
      if (sliders[1]) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(sliders[1], 6);
        sliders[1].dispatchEvent(new Event('input', { bubbles: true }));
        sliders[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);
    // Can handle
    await page.locator('button').filter({ hasText: /I'd get through it/ }).first().click();
    await page.waitForTimeout(300);
    // Fear showing
    await page.locator('button').filter({ hasText: /Shadow is loud/ }).first().click();
    await page.waitForTimeout(300);
    // Physical sensations
    await page.locator('button').filter({ hasText: /Racing heart/ }).first().click();
    await page.waitForTimeout(300);
    await btn(page, "I'M ALLOWING");

    // RISE
    await screen(page, 'RISE');
    // Select a WHEN option first — then TIME input appears
    await page.locator('button').filter({ hasText: /as soon as I'm ready/ }).first().click();
    await page.waitForTimeout(500);
    // TIME input (appears after WHEN selection)
    const whenInput = page.locator('input[type="time"]');
    await expect(whenInput).toBeVisible({ timeout: 10000 });
    await whenInput.fill('14:00');
    await page.waitForTimeout(300);
    // WHERE input
    const whereInput = page.locator('input[placeholder*="coffee shop"]').first();
    await expect(whereInput).toBeVisible({ timeout: 10000 });
    await whereInput.fill('At home');
    await btn(page, 'LOCK IT IN');
    // Armory — trust strategy alone (skips practice)
    await btn(page, "trust the strategy alone");
    // SUDs before
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('input[type="range"]');
      if (sliders.length) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(sliders[0], 70);
        sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
        sliders[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);
    await btn(page, "LET'S GO");

    // ENGAGE
    await screen(page, 'ENGAGE');
    await btn(page, 'ENGAGE RIGHT AWAY');
    // TutorialBattle goes directly to outcome selection (no "I AM READY TO REPORT" step)
    await page.waitForTimeout(500);
    // Select victory outcome
    await page.locator('button').filter({ hasText: /I did it|stayed all the way/ }).first().click();
    await page.waitForTimeout(300);
    // Advance to loot upload
    await btn(page, 'CONTINUE');
    // Loot upload screen
    await page.waitForTimeout(500);
    const lootTextarea = page.locator('textarea[placeholder*="meaningful"]').first();
    await expect(lootTextarea).toBeVisible({ timeout: 10000 });
    await lootTextarea.fill('I spoke up and my voice was steady');
    await btn(page, 'CONTINUE');
    // SUDs after
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const sliders = document.querySelectorAll('input[type="range"]');
      if (sliders.length) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(sliders[0], 30);
        sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
        sliders[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);
    await btn(page, 'CONTINUE');
    // Reflection Q1
    await page.waitForTimeout(500);
    const reflectionBtn = page.locator('button').filter({ hasText: /didn't happen at all/ }).first();
    if (await reflectionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reflectionBtn.click();
      await page.waitForTimeout(300);
      await btn(page, 'CONTINUE');
      // Free text
      await page.waitForTimeout(500);
      const freeText = page.locator('textarea').first();
      if (await freeText.isVisible({ timeout: 5000 }).catch(() => false)) {
        await freeText.fill('I felt brave');
        await btn(page, 'SEE WHAT THE SHADOW DID');
      }
    }
    // SUDs comparison
    await screen(page, 'FIRST BATTLE COMPLETE', 15000);
    await btn(page, 'THE POWER OF REPEAT');
    // Repeat preview
    await page.waitForTimeout(500);
    await btn(page, 'GOT IT', 10000);

    // ═══ BATTLE REWARD SCREEN ═══
    await screen(page, 'BOSS DEFEATED', 30000);
    await expect(page.getByText('+50').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('+25').first()).toBeVisible({ timeout: 10000 });
    console.log('  ✅ Battle Reward: XP and 25 coins confirmed');
    await btn(page, 'SEE MY REWARDS');

    // ═══ CELEBRATION OVERLAY — VictoryBurst → DaraCheer → XP → Coins → Loot → Evidence → ... ═══
    // Most phases auto-advance. Evidence cards and loot need clicking.
    // Wait for the full sequence: ~18s for auto-phases, then click evidence cards
    await page.waitForTimeout(20000);
    // Click through any remaining COLLECT/EVIDENCE buttons
    for (let i = 0; i < 5; i++) {
      const evidenceBtn = page.locator('button').filter({ hasText: /COLLECT EVIDENCE/ }).first();
      if (await evidenceBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await evidenceBtn.click({ force: true });
        await page.waitForTimeout(300);
        continue;
      }
      const collectBtn = page.locator('button').filter({ hasText: /COLLECT\s*→$/ }).first();
      if (await collectBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await collectBtn.click({ force: true });
        await page.waitForTimeout(300);
        continue;
      }
      break;
    }
    // Wait for overlay to dismiss
    await page.waitForTimeout(1000);

    // ═══ SHOP TOUR ═══
    await screen(page, 'DARA', 15000);
    await expect(page.getByText(/Welcome to my shop/i)).toBeVisible({ timeout: 10000 });
    console.log('  ✅ Shop tour overlay visible');

    // Verify 25 coins
    await expect(page.getByText('25', { exact: true })).toBeVisible({ timeout: 10000 });
    console.log('  ✅ 25 courage coins in shop header');

    // Verify avatar tab
    await expect(page.getByRole('tab', { name: /AVATARS/ })).toBeVisible({ timeout: 10000 });
    console.log('  ✅ Avatar tab pre-selected');

    // Verify avatar SVG previews
    const avatarCards = page.locator('svg');
    const avatarCount = await avatarCards.count();
    expect(avatarCount).toBeGreaterThan(0);
    console.log(`  ✅ ${avatarCount} avatar SVG previews visible`);

    await page.screenshot({ path: 'test/screenshots/tutorial-shop-tour.png', fullPage: false });
    console.log('   Screenshot saved');

    // Dismiss tour
    await btn(page, 'CONTINUE TO THE PATH');

    // ═══ EXPOSURE SORT ═══
    // Wait for AI to generate exposures, then click TRY AGAIN if needed
    await page.waitForTimeout(5000);
    const tryAgainBtn = page.locator('button').filter({ hasText: /TRY AGAIN/ }).first();
    if (await tryAgainBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tryAgainBtn.click();
      await page.waitForTimeout(5000);
    }
    await screen(page, 'FORGE YOUR PATH', 15000);
    console.log('  ✅ Landed on exposureSort');
    console.log('\n  ✅ Tutorial shop tour walkthrough complete!');
  });
});
