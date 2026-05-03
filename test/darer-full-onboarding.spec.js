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
      // Intake — trigger Shadow Summary based on message content keywords
      // Primary: detect completion signals in the user's last message
      // Fallback: use call counter to prevent infinite loops
      // NOTE: Only count calls that have actual user messages (skip the init call with no users)
      const hasUserMsgs = userMsgs.some(m => m.role === 'user' || m.role === 'user_input');
      if (!hasUserMsgs) {
        // This is the init call — reset the counter so we start fresh
        page.__intakeCall = 0;
      }
      const intakeCall = page.__intakeCall || 0;
      if (hasUserMsgs) {
        page.__intakeCall = intakeCall + 1;
      }
      // Narrow condition: match ONLY the actual Intake screen prompt, not Shadow Lore pt2
      // Intake prompt starts with: "The hero's name is..." (not "You are Dara")
      // Shadow Lore pt2 starts with: "You are Dara — the Soul Companion..."
      const isIntake = sys.includes("the hero's name is") || sys.includes('ready to look into its eyes') || sys.includes('5 to 10 minutes');
      if (isIntake) {
        console.log(`  🎯 Intake matched! hasUserMsgs=${hasUserMsgs}, msgCount=${userMsgs.length}`);
        console.log(`  🔍 FULL sysPrompt: "${(req.systemPrompt || '').substring(0, 500)}"`);
        // Extract the last user message text to check for completion signals
        const lastUserMsg = [...userMsgs].reverse().find(m => m.role === 'user' || m.role === 'user_input');
        const lastUserText = (lastUserMsg?.text || '').toLowerCase();

        // Completion keywords that signal the user is ready for the Shadow Summary
        const completionKeywords = [
          'want to stop', 'want to feel', 'want to change', 'just want to',
          'want to be', 'tired of avoiding', 'ready to', 'enough',
          'feel comfortable', 'stop avoiding',
        ];
        const isComplete = completionKeywords.some(kw => lastUserText.includes(kw));

        // Fallback: if we've exceeded a reasonable number of exchanges, force summary
        const maxExchanges = 8;
        const shouldSummarize = isComplete || intakeCall >= maxExchanges;

        const intakeQuestions = [
          "Hey, I'm Dara — which means courage. Where does the Shadow show up most in your daily life?",
          "I hear you. Speaking up is tough. When the Shadow has you in its territory, where do you feel it in your body?",
          "That tightness is real — your body's alarm system. What do you usually do when those feelings hit? Do you push through, or find a way to escape?",
          "Using your phone as a shield makes sense — it gives you cover. But it also keeps you from connecting. How does the Shadow affect the things you actually want to do?",
          "That's a real cost. Those are the moments that matter. If you could change one thing about how the Shadow controls your choices, what would it look like?",
          "That's the goal right there. I'm starting to see the full picture of how the Shadow operates in your life. Let me piece it all together...",
        ];

        if (shouldSummarize) {
          reply = "THE SHADOW'S TRUE NATURE:\n\nWHERE IT APPEARS: Your Shadow dominates the territory of speaking up — in class, in groups, when meeting new people. It tells you that your words aren't worth hearing, that you'll sound boring or wrong.\n\nWHAT STORMS IT STIRS: Your body reacts before your mind can catch up — tight chest, racing thoughts, the urge to grab your phone and disappear. Your Inner Storm amplifies every imagined judgment into a threat.\n\nHOW IT KEEPS YOU TRAPPED: You use avoidance as armor — staying quiet, staying invisible, staying safe. But safety is the cage. Every time you don't speak up, the Shadow grows stronger. You want connection, but the Shadow won't let you risk it.";
        } else {
          reply = intakeQuestions[Math.min(intakeCall, intakeQuestions.length - 1)];
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
          { name: "The Cashier", activity: "Ask a store clerk a question", level: 2 },
          { name: "The Introducer", activity: "Introduce yourself to someone new", level: 4 },
          { name: "The Presenter", activity: "Share an opinion in a small group", level: 5 },
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

    // ═══ PRE-INSERT NDA AGREEMENT ═══
    // After signup, the user is authenticated. Pre-insert the NDA record via Supabase REST API
    // so checkNdaAgreed() returns true and the user skips the NDA screen entirely.
    // Must do this BEFORE clicking "START YOUR JOURNEY" which triggers handleLogin -> NDA check.
    const SUPABASE_URL = 'https://macdrvetjapmaujbsivh.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_E07mDSpBz3ok98JeptwdzQ_CZNa1KTi';
    const NDA_TEXT = `DARER ORDER — CONFIDENTIALITY AGREEMENT\n\nLast Updated: April 21, 2026\nVersion: 1.0`;
    const ndaResult = await page.evaluate(async ({ url, key, ndaText }) => {
      // Get auth session from localStorage (Supabase stores it there)
      const storageKey = Object.keys(localStorage).find(k => k.includes('sb-') && k.includes('auth-token'));
      if (!storageKey) return { status: 'no_session' };
      const session = JSON.parse(localStorage.getItem(storageKey));
      const accessToken = session?.access_token;
      if (!accessToken) return { status: 'no_token' };
      const userId = session?.user?.id;
      if (!userId) return { status: 'no_user_id' };
      // Insert NDA agreement directly
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
          participant_name: 'Priya',
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
    console.log(`  NDA pre-insert: ${ndaResult.status}${ndaResult.error ? ' — ' + ndaResult.error : ''}`);

    // ═══ LOG IN ═══
    await page.getByText('LOG IN', { exact: true }).click();
    await page.waitForTimeout(1000);
    const le = emailInput(page);
    const ce = await le.inputValue().catch(() => '');
    if (!ce.includes('priya')) await le.fill(TEST_EMAIL);
    await pwInput(page).fill(TEST_PASSWORD);
    await page.getByText('START YOUR JOURNEY').click();
    await page.waitForTimeout(3000);

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

    // 2b. Meet Dara → BEGIN JOURNEY routes directly to shadowLore (no core values in character creation)
    console.log('  → Meet Dara');
    await screen(page, 'SOUL COMPANION OF THE DARER ORDER');
    await btn(page, 'BEGIN JOURNEY');
    console.log('✅ Character creation complete');

    // ═══ 3. SHADOW LORE pt1 (step 0: F.E.A.R. intro → step 1: Dara dialog → psychoed) ═══
    console.log('🌑 3. Shadow Lore...');
    await screen(page, 'F.E.A.R.', 20000);
    await btn(page, 'CONTINUE');  // step 0 → psychoed
    console.log('✅ Shadow Lore complete');

    // ═══ 4. PSYCHOED (6 slides: 0-5) ═══
    console.log('📚 4. PsychoEd...');
    await screen(page, "THE SHADOW'S TRICKS", 20000);
    // Click through PsychoEd slides (5 NEXTs + 1 CONTINUE)
    for (let i = 0; i < 5; i++) { await btn(page, '^NEXT$'); }
    await btn(page, 'CONTINUE →');
    console.log('✅ PsychoEd complete');

    // ═══ 5. SHADOW LORE pt2 ═══
    console.log('🌑 5. Shadow Lore pt2...');
    await screen(page, 'UNDERSTAND YOUR FEAR', 20000);
    await btn(page, "I'M READY, DARA");
    console.log('✅ Shadow Lore pt2 complete');

    // ═══ 6. INTAKE ═══
    console.log('💬 6. Intake...');
    // Reset intake call counter to prevent stale state from previous runs
    page.__intakeCall = 0;

    // Wait for the intake chat UI to render (input field + Dara header)
    const intakeInput = await page.waitForSelector('input[placeholder="Speak to Dara..."]', { timeout: 30000 }).catch(() => null);
    if (!intakeInput) {
      // If we never got the input, the screen might have already auto-transitioned
      // Check if we're already on Shadow Reveal
      const shadowRevealVisible = await page.getByText("THE SHADOW'S TRUE NATURE").first().isVisible({ timeout: 3000 }).catch(() => false);
      if (shadowRevealVisible) {
        console.log('  ⏩ Intake auto-completed already, skipping to Shadow Reveal');
      } else {
        throw new Error('Intake screen never appeared');
      }
    } else {
      console.log('✅ Intake started');

      // Send a message in the intake chat with retries and verification
      async function sendIntakeMessage(text, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Check if input still exists (screen may have auto-transitioned)
            const inputExists = await page.getByPlaceholder('Speak to Dara...').isVisible({ timeout: 1000 }).catch(() => false);
            if (!inputExists) {
              console.log(`  ⏩ sendIntakeMessage skipped — input no longer visible (screen transitioned)`);
              return 'transitioned';
            }

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
      const r4 = await sendIntakeMessage('I just want to feel comfortable being myself around others');
      if (r4 === 'transitioned') {
        console.log('  ⏩ Intake auto-transitioned during messages');
      } else {
        const r5 = await sendIntakeMessage('Yeah, I want to stop avoiding social situations');
        if (r5 === 'transitioned') {
          console.log('  ⏩ Intake auto-transitioned during messages');
        } else {
          await page.waitForTimeout(5000);
        }
      }
      console.log('✅ Intake complete');
    }

    // ═══ 7. SHADOW REVEAL ═══
    console.log('👤 7. Shadow Reveal...');
    await screen(page, "THE SHADOW'S TRUE NATURE", 30000);
    await page.waitForTimeout(3500); // wait for staggered card reveals + Dara dialog
    await btn(page, 'THE JOURNEY CONTINUES');
    console.log('✅ Shadow Reveal complete');

    // ═══ 8. VALUES SCREEN ═══
    console.log('💎 8. Values...');
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
    // Values sealed confirmation screen → leads into DARER Strategy
    await screen(page, 'VALUES SEALED', 20000);
    await btn(page, 'SHOW ME HOW');
    console.log('✅ Values complete');

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

    // A4: DECIDE phase — pick a value reason, click through
    console.log('  → Decide');
    await screen(page, 'DECIDE', 15000);
    // Pick at least one value
    const decideValBtn = page.locator('button').filter({ hasText: /friendship|belong|speak|challenge|respect/i }).first();
    await expect(decideValBtn).toBeVisible({ timeout: 10000 });
    await decideValBtn.click();
    await btn(page, 'I DECIDE');

    // A5: ALLOW phase — 6-field progressive form (fill each to unlock the next)
    console.log('  → Allow: fearful thoughts');
    const allowTextarea = page.locator('textarea').first();
    await expect(allowTextarea).toBeVisible({ timeout: 10000 });
    await allowTextarea.fill('They\'ll think I\'m weird. I\'ll embarrass myself.');

    // Allow likelihood slider (appears after textarea filled)
    console.log('  → Allow: likelihood');
    await page.waitForTimeout(500);
    const likelihoodSlider = page.locator('input[type="range"]').first();
    await expect(likelihoodSlider).toBeVisible({ timeout: 10000 });
    await likelihoodSlider.focus();
    // Use keyboard arrow keys to adjust the slider (triggers real input events)
    // Default is 50, press left 10 times to get to ~40
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    await page.waitForTimeout(800);

    // Allow severity slider (appears after likelihood set)
    console.log('  → Allow: severity');
    await page.waitForTimeout(500);
    const severitySlider = page.locator('input[type="range"]').last();
    await expect(severitySlider).toBeVisible({ timeout: 10000 });
    await severitySlider.focus();
    // Default is 5, move to confirm the value is set (press right once then left once to trigger events)
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(800);

    // Can handle buttons
    console.log('  → Allow: can handle');
    await page.waitForTimeout(500);
    const canHandleBtn = page.locator('button').filter({ hasText: /Yes.*I'd get through it/i }).first();
    await expect(canHandleBtn).toBeVisible({ timeout: 10000 });
    await canHandleBtn.click();

    // Fear showing buttons
    console.log('  → Allow: fear showing');
    const fearShowingBtn = page.locator('button').filter({ hasText: /A little.*faint whisper/i }).first();
    await expect(fearShowingBtn).toBeVisible({ timeout: 10000 });
    await fearShowingBtn.click();

    // Physical sensations (multi-select tags)
    console.log('  → Allow: physical sensations');
    const sensationBtn = page.locator('button').filter({ hasText: /Racing heart/i }).first();
    await expect(sensationBtn).toBeVisible({ timeout: 10000 });
    await sensationBtn.click();

    // Continue button (enabled when all 6 fields complete)
    await btn(page, "I'M ALLOWING IT", 10000);

    // A7: RISE sub-step 0 (WHEN + WHERE combined) — select when, fill where, click LOCK IT IN
    console.log('  → Rise: when + where');
    const whenOption = page.locator('button').filter({ hasText: /Today.*soon/i }).first();
    await expect(whenOption).toBeVisible({ timeout: 10000 });
    await whenOption.click();

    // Fill WHERE input (placeholder changed to "coffee shop" pattern)
    console.log('  → Rise: where');
    const whereInput = page.locator('input[placeholder*="coffee shop"]').first();
    await expect(whereInput).toBeVisible({ timeout: 10000 });
    await whereInput.fill('the campus library');
    await btn(page, 'LOCK IT IN', 10000);

    // A8: RISE sub-step 1 (ARMORY) — select "trust the strategy alone" (skips practice, goes to SUDs)
    console.log('  → Rise: armory');
    const armoryOption = page.locator('button').filter({ hasText: /trust the strategy/i }).first();
    await expect(armoryOption).toBeVisible({ timeout: 10000 });
    await armoryOption.click();

    // A9: RISE sub-step 3 (SUDs Before) — use 0-100 range slider
    console.log('  → Rise: SUDs before');
    await screen(page, 'STORM INTENSITY', 15000);
    await page.waitForTimeout(500);
    const sudsBeforeSlider = page.locator('input[type="range"]').first();
    await expect(sudsBeforeSlider).toBeVisible({ timeout: 10000 });
    // Default is 0, press right 50 times to get to ~50
    await sudsBeforeSlider.focus();
    for (let i = 0; i < 50; i++) { await page.keyboard.press('ArrowRight'); }
    await page.waitForTimeout(500);
    await btn(page, "LET'S GO", 10000);

    // A11: ENGAGE sub-step 0 — choose "ENGAGE RIGHT AWAY" (skip Dara chat)
    console.log('  → Engage: outcome');
    const engageRightAway = page.locator('button').filter({ hasText: /ENGAGE RIGHT AWAY/i }).first();
    await expect(engageRightAway).toBeVisible({ timeout: 10000 });
    await engageRightAway.click();
    // Outcome selection appears
    const outcomeBtn = page.locator('button').filter({ hasText: /I did it.*stayed all the way/i }).first();
    await expect(outcomeBtn).toBeVisible({ timeout: 10000 });
    await outcomeBtn.click();

    // A12: ENGAGE sub-step 1.5 (Loot upload) — proof of completion
    console.log('  → Engage: loot upload');
    // Click CONTINUE to advance from outcome selection to loot upload
    await btn(page, 'CONTINUE', 10000);
    await screen(page, 'Every battle leaves a mark', 15000);
    // Fill the meaningful moment text
    const lootTextarea = page.locator('textarea').first();
    await expect(lootTextarea).toBeVisible({ timeout: 10000 });
    await lootTextarea.fill('I felt proud — the fear was quieter than I expected');
    // Continue to SUDs (no image needed, upload is optional)
    await btn(page, 'CONTINUE', 10000);

    // A13: ENGAGE sub-step 2 (SUDs After) — use 0-100 range slider
    console.log('  → Engage: SUDs after');
    await screen(page, 'STORM INTENSITY', 15000);
    await page.waitForTimeout(500);
    const sudsAfterSlider = page.locator('input[type="range"]').first();
    await expect(sudsAfterSlider).toBeVisible({ timeout: 10000 });
    // Default is 0, press right 30 times to get to ~30
    await sudsAfterSlider.focus();
    for (let i = 0; i < 30; i++) { await page.keyboard.press('ArrowRight'); }
    await page.waitForTimeout(500);
    await page.waitForTimeout(800);
    await btn(page, 'CONTINUE', 10000);

    // A14: ENGAGE sub-step 3 (Reflection Q1) — answer "No, they didn't happen at all" (skips Q2/Q3)
    console.log('  → Engage: reflection');
    const noHappenBtn = page.locator('button').filter({ hasText: /No, they didn't happen at all/i }).first();
    await expect(noHappenBtn).toBeVisible({ timeout: 10000 });
    await noHappenBtn.click();
    await btn(page, 'CONTINUE', 10000);

    // A15: ENGAGE sub-step 4 (Free text) — fill and continue
    console.log('  → Engage: free text');
    const freeText = page.locator('textarea').first();
    await expect(freeText).toBeVisible({ timeout: 10000 });
    await freeText.fill('It wasn\'t as bad as I feared');
    await btn(page, 'SEE WHAT THE SHADOW DID', 10000);

    // A16: ENGAGE sub-step 5 (SUDs comparison + "FIRST BATTLE COMPLETE")
    console.log('  → Engage: battle complete');
    await screen(page, 'FIRST BATTLE COMPLETE', 15000);
    await btn(page, 'THE POWER OF REPEAT', 15000);

    // A17: ENGAGE sub-step 6 (REPEAT preview) — click to finish tutorial
    console.log('  → Debrief: repeat preview');
    await btn(page, 'GOT IT — ON TO THE PATH', 15000);
    console.log('✅ Tutorial complete');

    // ═══ 12. EXPOSURE SORT ═══
    console.log('📋 12. Exposure Sort...');
    await screen(page, 'FORGE YOUR PATH', 20000);
    await page.waitForTimeout(3000);
    // Accept all 3 exposure cards by clicking the checkmark (✓) button
    for (let i = 0; i < 3; i++) {
      const acceptBtn = page.locator('button').filter({ hasText: /^✓$/ }).first();
      await expect(acceptBtn).toBeVisible({ timeout: 10000 });
      await acceptBtn.click();
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
    // After resume, returning users skip NDA (already agreed) — go straight to map
    await screen(page, 'BOSSES', 20000);
    await page.screenshot({ path: 'test/screenshots/resume-state.png', fullPage: true });
    console.log('✅ Resume works!');

    console.log(`\n📊 Done: ${TEST_EMAIL}`);
  });
});
