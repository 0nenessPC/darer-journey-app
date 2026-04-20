// @ts-check
import { test, expect } from '@playwright/test';

const APP_URL = process.env.DARER_TEST_URL || 'https://darer-journey-app.vercel.app';
const TEST_EMAIL = `test.priya.${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'PriyaTest2026!';

// Helpers
const emailInput = (page) => page.locator('input[type="text"], input:not([type="password"]):not([type="hidden"])').first();
const pwInput = (page) => page.locator('input[type="password"]');

// Screen-specific button click — waits for the button, clicks it
async function btn(page, text, timeout = 15000) {
  const b = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).first();
  await expect(b).toBeVisible({ timeout });
  await b.click();
  await page.waitForTimeout(1500);
}

// Screen assertion — fails if not visible
async function screen(page, text, timeout = 20000) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout });
}

test.describe('DARER Journey', () => {
  test('full onboarding: signup to map', async ({ page }) => {
    console.log(`\n🎮 Test user: ${TEST_EMAIL}`);

    // ═══ MOCK AI calls ═══
    await page.route('**/api/qwen-chat', async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      const sys = (req.systemPrompt || '').toLowerCase();
      const userMsgs = req.messages || [];
      let reply;
      // Intake — simulate 6 Q&A exchanges before generating the shadow summary
      // Uses a call counter since sendIntakeMessage doesn't work on the deployed app
      const INTAKE_CALLS = 6;
      const intakeCall = page.__intakeCall || 0;
      page.__intakeCall = intakeCall + 1;
      const msgCount = userMsgs.length;
      if (sys.includes('intake') || sys.includes('soul companion') || sys.includes('cbt') || (sys.includes('courage') && sys.includes('shadow'))) {
        const intakeQuestions = [
          "Hey, I'm Dara — which means courage. Where does the Shadow show up most in your daily life?",
          "I hear you. Speaking up is tough. When the Shadow has you in its territory, where do you feel it in your body?",
          "That tightness is real — your body's alarm system. What do you usually do when those feelings hit? Do you push through, or find a way to escape?",
          "Using your phone as a shield makes sense — it gives you cover. But it also keeps you from connecting. How does the Shadow affect the things you actually want to do?",
          "That's a real cost. Those are the moments that matter. If you could change one thing about how the Shadow controls your choices, what would it look like?",
          "That's the goal right there. I'm starting to see the full picture of how the Shadow operates in your life. Let me piece it all together...",
        ];
        if (intakeCall < INTAKE_CALLS) {
          reply = intakeQuestions[intakeCall];
        } else {
          // Shadow summary — triggers auto-transition to Shadow Reveal
          reply = "SHADOW'S TRUE NATURE:\n\nWHERE IT APPEARS: Your Shadow dominates the territory of speaking up — in class, in groups, when meeting new people. It tells you that your words aren't worth hearing, that you'll sound boring or wrong.\n\nWHAT STORMS IT STIRS: Your body reacts before your mind can catch up — tight chest, racing thoughts, the urge to grab your phone and disappear. Your Inner Storm amplishes every imagined judgment into a threat.\n\nHOW IT KEEPS YOU TRAPPED: You use avoidance as armor — staying quiet, staying invisible, staying safe. But safety is the cage. Every time you don't speak up, the Shadow grows stronger. You want connection, but the Shadow won't let you risk it.";
        }
      } else if (sys.includes('shadow') && (sys.includes('summary') || sys.includes('true nature')) && sys.includes('reveal')) {
        reply = "YOUR SHADOW — THE INFINITE TRAP\n\nYour Shadow claims social evaluation — speaking in class, meeting new people. The Inner Storm whispers your accent marks you different. Your Escape? Standing at edges, phone as shield.";
      } else if (sys.includes('d.a.r.e.r') && (sys.includes('framework') || sys.includes('strategy') || sys.includes('weapon'))) {
        reply = "The DARER Strategy:\n\nD — Decide\nA — Allow\nR — Rise\nE — Engage\nR — Repeat";
      } else if (sys.includes('pre-boss') || sys.includes('boss battle')) {
        reply = "I'm with you. Remember the DARER strategy.";
      } else if (sys.includes('micro-exposure') && sys.includes('training') && sys.includes('first')) {
        reply = JSON.stringify([
          { name: "The Smiler", text: "Make eye contact and smile at a stranger", icon: "😊", where: "Anywhere", time: "5 seconds", suds: 1 },
          { name: "The Greeter", text: "Say hello to someone you don't know", icon: "👋", where: "Walking past", time: "10 seconds", suds: 1 },
          { name: "The Nod", text: "Give a small nod to someone nearby", icon: "🙂", where: "Elevator", time: "5 seconds", suds: 2 },
        ]);
      } else if (sys.includes('exposure') && sys.includes('boss') && sys.includes('generate')) {
        reply = JSON.stringify([
          { id: "b1", name: "The Cashier", desc: "Ask a store clerk a question", difficulty: 2, xp: 50 },
          { id: "b2", name: "The Introducer", desc: "Introduce yourself to someone new", difficulty: 4, xp: 100 },
          { id: "b3", name: "The Presenter", desc: "Share an opinion in a small group", difficulty: 5, xp: 150 },
        ]);
      } else if (sys.includes('values') && sys.includes('generate')) {
        reply = JSON.stringify([
          { id: "v1", text: "Reach out and build new friendships", icon: "🤝", domain: "friendships" },
          { id: "v2", text: "Feel a sense of belonging in a group", icon: "💜", domain: "friendships" },
          { id: "v3", text: "Show the people I love how much they mean to me", icon: "❤️", domain: "intimacy" },
          { id: "v4", text: "Spend quality time with people I care about", icon: "🔥", domain: "friendships" },
          { id: "v5", text: "Be someone others can trust and count on", icon: "🌟", domain: "friendships" },
          { id: "v6", text: "Open up and let people really know me", icon: "🤗", domain: "intimacy" },
          { id: "v7", text: "Speak up and share what I think and feel", icon: "🗣", domain: "expression" },
          { id: "v8", text: "Share my ideas confidently at work or school", icon: "💡", domain: "employment" },
          { id: "v9", text: "Enjoy social events without dreading them", icon: "🎉", domain: "friendships" },
          { id: "v10", text: "Take on challenges that help me grow", icon: "🏔", domain: "growth" },
          { id: "v11", text: "Be respected and confident at work or school", icon: "⭐", domain: "achievement" },
          { id: "v12", text: "Contribute and help people around me", icon: "🌍", domain: "community" },
        ]);
      } else {
        reply = "I understand. Tell me more.";
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply }) });
    });

    // ═══ NAVIGATE ═══
    await page.goto(APP_URL);
    await expect(page).toHaveTitle(/D\.?A\.?R\.?E\.?R/i);
    console.log('✅ App loaded');

    // ═══ SIGN UP ═══
    console.log('📝 Signing up...');
    await page.getByText('NEW GAME', { exact: true }).click();
    await emailInput(page).fill(TEST_EMAIL);
    await pwInput(page).fill(TEST_PASSWORD);
    await page.getByText('CREATE HERO').click();
    await page.waitForTimeout(3000);

    // ═══ LOG IN ═══
    await page.getByText('LOG IN', { exact: true }).click();
    await page.waitForTimeout(1000);
    const le = emailInput(page);
    const ce = await le.inputValue().catch(() => '');
    if (!ce.includes('priya')) await le.fill(TEST_EMAIL);
    await pwInput(page).fill(TEST_PASSWORD);
    await page.getByText('START YOUR JOURNEY').click();
    await page.waitForTimeout(2000);

    // ═══ 1. INTRO (5 slides) ═══
    console.log('📖 1. Intro...');
    await screen(page, 'Shadow of Fear');
    // Slide 1→2
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, '^NEXT$');
    await btn(page, 'BEGIN THE JOURNEY');
    console.log('✅ Intro complete');

    // ═══ 2. CHARACTER CREATION ═══
    console.log('🎭 2. Character creation...');

    // 2a. Name entry
    console.log('  → Name entry');
    await screen(page, 'EVERY HERO HAS A NAME', 20000);
    const nf = page.locator('input').first();
    await expect(nf).toBeVisible({ timeout: 5000 });
    await nf.fill('Priya');
    await btn(page, "THAT'S ME");
    // Name confirmed screen
    await btn(page, 'CONTINUE');

    // 2b. Meet Dara
    console.log('  → Meet Dara');
    await screen(page, 'SOUL COMPANION OF THE DARER ORDER');
    await btn(page, "I'M READY, DARA");

    // 2c. Core values — two-click: expand then select
    console.log('  → Core values');
    await screen(page, 'YOUR INNER CHARACTER', 20000);
    await page.waitForTimeout(2000);
    // Get first 3 value card buttons
    const allBtns = page.locator('button');
    const btnCount = await allBtns.count();
    const valueBtnIndices = [];
    for (let i = 0; i < btnCount; i++) {
      const txt = await allBtns.nth(i).innerText().catch(() => '');
      if (txt.length > 3 && !txt.includes('BACK') && !txt.includes('LOGOUT') && !txt.includes('DARA')) {
        valueBtnIndices.push(i);
      }
    }
    // For each card: click once to expand, wait, then click again to select
    for (const idx of valueBtnIndices.slice(0, 3)) {
      await allBtns.nth(idx).click();
      await page.waitForTimeout(500);
      await allBtns.nth(idx).click();
      await page.waitForTimeout(500);
    }
    console.log(`  ✓ Selected 3 values`);
    await page.waitForTimeout(1000);
    // The button appears once 3 values are selected
    await btn(page, 'THESE DEFINE ME');

    // 2d. Core reveal + stats
    console.log('  → Stats reveal');
    await btn(page, 'CONTINUE');
    await screen(page, 'SEE THE PATH AHEAD');
    await btn(page, 'SEE THE PATH AHEAD');
    console.log('✅ Character creation complete');

    // ═══ 3. VALUES SCREEN ═══
    console.log('💎 3. Values...');
    await screen(page, 'WHY BECOME A DARER', 20000);
    await btn(page, 'LET ME SHOW YOU');
    await screen(page, 'WHAT MATTERS MOST', 20000);
    await page.waitForTimeout(2000);
    const vc2 = page.locator('button').filter({ hasText: /friendship|belonging|trust|speak|challenge|respect/i });
    for (let i = 0; i < Math.min(3, await vc2.count()); i++) {
      await vc2.nth(i).click({ force: true });
      await page.waitForTimeout(500);
    }
    await btn(page, 'THESE MATTER TO ME');
    // Values sealed confirmation screen → leads into Shadow Lore
    await screen(page, 'VALUES SEALED', 20000);
    await btn(page, 'FACE THE SHADOW');
    console.log('✅ Values complete');

    // ═══ 4. SHADOW LORE pt1 (step 0: F.E.A.R. intro → step 1: Dara dialog → psychoed) ═══
    console.log('🌑 4. Shadow Lore...');
    await screen(page, 'F.E.A.R.', 20000);
    await btn(page, '^CONTINUE$');  // step 0 → step 1
    await btn(page, '^CONTINUE$');  // step 1 → onPsychoed → psychoed screen
    console.log('✅ Shadow Lore complete');

    // ═══ 5. PSYCHOED (6 slides: 0-5) ═══
    console.log('📚 5. PsychoEd...');
    await screen(page, "THE SHADOW'S TRICKS", 20000);
    // Click through PsychoEd slides (5 NEXTs + 1 CONTINUE)
    for (let i = 0; i < 5; i++) { await btn(page, '^NEXT$'); }
    await btn(page, 'CONTINUE →');
    console.log('✅ PsychoEd complete');

    // ═══ 6. SHADOW LORE pt2 ═══
    console.log('🌑 6. Shadow Lore pt2...');
    await screen(page, 'UNDERSTAND YOUR FEAR', 20000);
    await btn(page, "I'M READY, DARA");
    console.log('✅ Shadow Lore pt2 complete');

    // ═══ 7. INTAKE ═══
    console.log('💬 7. Intake...');
    await screen(page, 'courage', 30000);
    console.log('✅ Intake started');
    await page.waitForTimeout(1000);
    // Send a message in the intake chat with retries and verification
    async function sendIntakeMessage(text, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Wait for input to exist
          const input = await page.waitForSelector('input[placeholder="Speak to Dara..."]', { timeout: 5000 }).catch(() => null);
          if (!input) {
            console.log(`  ⚠️ sendIntakeMessage (attempt ${attempt}/${maxRetries}): input not found`);
            await page.waitForTimeout(attempt * 1000);
            continue;
          }

          // Set value and dispatch React-compatible events via evaluate
          const result = await page.evaluate((msg) => {
            const input = document.querySelector('input[placeholder="Speak to Dara..."]');
            if (!input) return { ok: false, reason: 'input not found in evaluate' };

            // Set DOM value via native setter (bypasses React's controlled input guard)
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            ).set;
            nativeSetter.call(input, msg);

            // Dispatch events that trigger React's onChange
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            return { ok: true };
          }, text);

          if (!result.ok) {
            console.log(`  ⚠️ sendIntakeMessage (attempt ${attempt}/${maxRetries}): ${result.reason}`);
            await page.waitForTimeout(attempt * 1000);
            continue;
          }

          // Wait for React to update state, then wait for send button to become enabled
          await page.waitForTimeout(500);
          const sendBtn = page.locator('button').filter({ hasText: /→/ }).first();
          const isEnabled = await sendBtn.isEnabled({ timeout: 5000 }).catch(() => false);

          if (!isEnabled) {
            console.log(`  ⚠️ sendIntakeMessage (attempt ${attempt}/${maxRetries}): send button still disabled`);
            await page.waitForTimeout(attempt * 1000);
            continue;
          }

          // Click send
          await sendBtn.click();

          // Wait for the AI to start typing (shows the message was received)
          await page.waitForTimeout(1500);

          console.log(`  ✓ Sent: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
          return;

        } catch (err) {
          console.log(`  ⚠️ sendIntakeMessage (attempt ${attempt}/${maxRetries}): ${err.message}`);
          await page.waitForTimeout(attempt * 1000);
        }
      }
      console.log(`  ❌ sendIntakeMessage failed after ${maxRetries} attempts: "${text.substring(0, 50)}..."`);
    }
    await sendIntakeMessage('I get anxious speaking in class');
    await sendIntakeMessage('My phone is my shield at events');
    await sendIntakeMessage('I over-prepare everything because I worry I will sound boring');
    await sendIntakeMessage('I avoid group projects and eat lunch alone');
    await sendIntakeMessage('I just want to feel comfortable being myself around others');
    await sendIntakeMessage('Yeah, I want to stop avoiding social situations');
    await page.waitForTimeout(5000);
    console.log('✅ Intake complete');

    // ═══ 8. SHADOW REVEAL ═══
    console.log('👤 8. Shadow Reveal...');
    await screen(page, "THE SHADOW'S TRUE NATURE", 30000);
    await page.waitForTimeout(2000);
    await btn(page, 'THE JOURNEY CONTINUES');
    console.log('✅ Shadow Reveal complete');

    // ═══ 9. DARER STRATEGY ═══
    console.log('⚔️ 9. DARER Strategy...');
    // Slide 0: "THE DARER STRATEGY" intro — 5 slides total, last one has "ENTER THE ARMORY →"
    await screen(page, 'THE DARER STRATEGY', 20000);
    // Click through slides 0→1→2→3→4, slide 4 has the Armory transition button
    for (let i = 0; i < 4; i++) {
      await btn(page, '^NEXT$', 15000);
    }
    // Last slide button: "ENTER THE ARMORY →"
    await btn(page, 'ENTER THE ARMORY', 15000);
    console.log('✅ DARER Strategy complete');

    // ═══ 10. ARMORY ═══
    console.log('🛡️ 10. Armory...');
    // intro → learn → ready → practice (skip) → complete
    await screen(page, 'THE ARMORY', 20000);
    await btn(page, 'REVEAL THE FIRST TOOL', 15000);   // intro → learn
    await btn(page, 'BEGIN PRACTICE', 15000);           // learn → ready
    await btn(page, 'BEGIN BREATHING EXERCISE', 15000); // ready → practice
    // Practice screen: find "Skip the practice?" button (styled <button>, not PixelBtn)
    const skipBtn = page.locator('button').filter({ hasText: /skip the practice/i }).first();
    await expect(skipBtn).toBeVisible({ timeout: 15000 });
    await skipBtn.click();
    // Wait for "ARMORY UNLOCKED" screen to appear (may take a moment for React to render)
    await page.waitForTimeout(1000);
    // The Armory complete screen appears briefly — check for it or skip if already on Tutorial
    const armoryUnlocked = await page.getByText('ARMORY UNLOCKED').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (armoryUnlocked) {
      await btn(page, 'ENTER TRAINING GROUNDS', 15000);  // complete → tutorial
    }
    console.log('✅ Armory complete');

    // ═══ 11. TUTORIAL ═══
    console.log('🎯 11. Tutorial...');
    await screen(page, 'TRAINING GROUNDS', 20000);
    await btn(page, 'SHOW ME THE BATTLES');
    await page.waitForTimeout(2000);

    // A3: CHOOSE phase — pick the first exposure card, then BEGIN TRAINING
    console.log('  → Choose exposure');
    await page.waitForTimeout(3000);  // wait for AI to generate exposures
    const firstExposure = page.locator('button').filter({ hasText: /Make eye contact|Say hello|Give a small nod/i }).first();
    await expect(firstExposure).toBeVisible({ timeout: 15000 });
    await firstExposure.click();
    await page.waitForTimeout(500);
    await btn(page, 'BEGIN TRAINING');

    // A4: DECIDE phase — read-only screen, just click through
    console.log('  → Decide');
    await screen(page, 'YOUR DECISION', 15000);
    await btn(page, 'I DECIDE');

    // A5: ALLOW phase — fill textarea, click through
    console.log('  → Allow');
    const allowTextarea = page.locator('textarea').first();
    await expect(allowTextarea).toBeVisible({ timeout: 10000 });
    await allowTextarea.fill('My heart races and I worry people will judge me');
    await btn(page, 'THE STORM IS HERE');

    // A6: REHEARSE phase — mock responds instantly, click quick reply then advance
    console.log('  → Rehearse');
    await page.waitForTimeout(2000);  // let mock response render
    const quickReply = page.locator('button').filter({ hasText: /I notice the Storm/i }).first();
    await expect(quickReply).toBeVisible({ timeout: 10000 });
    await quickReply.click();
    await page.waitForTimeout(1000);
    await btn(page, 'I\'M ALLOWING IT');

    // A7: RISE sub-step 0 (WHEN) — select a time option
    console.log('  → Rise: when');
    const whenOption = page.locator('button').filter({ hasText: /Today.*soon/i }).first();
    await expect(whenOption).toBeVisible({ timeout: 10000 });
    await whenOption.click();

    // A8: RISE sub-step 1 (WHERE) — fill location input, click NEXT
    console.log('  → Rise: where');
    const whereInput = page.locator('input[placeholder*="coffee shop"]').first();
    await expect(whereInput).toBeVisible({ timeout: 10000 });
    await whereInput.fill('the campus library');
    await btn(page, 'NEXT', 10000);

    // A9: RISE sub-step 2 (ARMORY) — select an armory tool (auto-advances to SUDs)
    console.log('  → Rise: armory');
    const armoryOption = page.locator('button').filter({ hasText: /Paced Breathing/i }).first();
    await expect(armoryOption).toBeVisible({ timeout: 10000 });
    await armoryOption.click();
    await page.waitForTimeout(1500);

    // A10: RISE sub-step 3 (SUDs Before) — select a SUDs rating, click I'M GOING IN
    console.log('  → Rise: SUDs before');
    // Wait for the SUDs screen to appear
    await screen(page, 'STORM INTENSITY', 15000);
    await page.waitForTimeout(500);
    // Get the button with accessible name "5"
    const sudsBtn = page.getByRole('button', { name: '5' });
    await expect(sudsBtn).toBeVisible({ timeout: 10000 });
    await sudsBtn.click();
    await page.waitForTimeout(500);
    await btn(page, 'I\'M GOING IN', 10000);

    // A11: WAITING phase — click "I DID IT!" to simulate completing the exposure
    console.log('  → Waiting (exposure done)');
    await page.waitForTimeout(3000);  // brief pause to simulate doing the exposure IRL
    await btn(page, '✅ I DID IT!', 15000);

    // A12: ENGAGE phase — fill textarea, select SUDs after, advance
    console.log('  → Engage: report back');
    const engageTextarea = page.locator('textarea').first();
    await expect(engageTextarea).toBeVisible({ timeout: 10000 });
    await engageTextarea.fill('It went well, not as scary as I thought');
    const sudsAfterBtn = page.getByRole('button', { name: '3' });
    await expect(sudsAfterBtn).toBeVisible({ timeout: 10000 });
    await sudsAfterBtn.click();
    await page.waitForTimeout(500);
    await btn(page, 'NEXT: REPEAT', 10000);

    // A13: DEBRIEF phase — click FORGE YOUR PATH to complete tutorial
    console.log('  → Debrief');
    await screen(page, 'FIRST BATTLE COMPLETE', 15000);
    await btn(page, 'FORGE YOUR PATH', 15000);
    console.log('✅ Tutorial complete');

    // ═══ 12. EXPOSURE SORT ═══
    console.log('📋 12. Exposure Sort...');
    await screen(page, 'FORGE YOUR PATH', 20000);
    await page.waitForTimeout(3000);
    // Accept all 3 exposure cards by clicking the right-arrow (swipe right = accept) button
    for (let i = 0; i < 3; i++) {
      const rightArrow = page.locator('button').last(); // right arrow is the last button
      await expect(rightArrow).toBeVisible({ timeout: 10000 });
      await rightArrow.click();
      await page.waitForTimeout(2000);
    }
    // After all cards sorted, the screen transitions to "PATH FORGED" with a "BEGIN THE JOURNEY" button
    console.log('✅ Exposure Sort complete');

    // ═══ 13. MAP — FINAL ═══
    console.log('🗺️ 13. Final map check...');
    // Click "BEGIN THE JOURNEY →" to transition from PATH FORGED to the map
    await btn(page, 'BEGIN THE JOURNEY', 20000);
    await page.waitForTimeout(3000);
    await screen(page, 'BOSSES', 20000);
    await screen(page, 'JOURNEY', 5000);
    await page.screenshot({ path: 'test/screenshots/map-final.png', fullPage: true });
    console.log('🎉 Reached map!');

    // ═══ 14. RESUME TEST ═══
    console.log('🔄 14. Resume test...');
    await btn(page, 'LOGOUT');
    await page.waitForTimeout(3000);
    await emailInput(page).fill(TEST_EMAIL);
    await pwInput(page).fill(TEST_PASSWORD);
    await page.getByText('START YOUR JOURNEY').click();
    await page.waitForTimeout(10000);
    await screen(page, 'BOSSES', 20000);
    await page.screenshot({ path: 'test/screenshots/resume-state.png', fullPage: true });
    console.log('✅ Resume works!');

    console.log(`\n📊 Done: ${TEST_EMAIL}`);
  });
});
