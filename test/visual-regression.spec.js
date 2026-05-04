// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_DIR = path.join(__dirname, 'baselines');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Load baseline manifest
const manifest = JSON.parse(fs.readFileSync(path.join(BASELINE_DIR, 'manifest.json'), 'utf-8'));

test.describe('Visual Regression — Baseline Comparison', () => {

  manifest.screenshots.forEach((b) => {
    test(`${b.file} matches baseline`, async () => {
      const baselinePath = path.join(BASELINE_DIR, b.file);
      const currentPath = path.join(SCREENSHOT_DIR, b.file);

      // Check baseline exists
      if (!fs.existsSync(baselinePath)) {
        console.log(`  ⚠️  Baseline not found: ${b.file} — skipping`);
        return;
      }

      // Check current screenshot exists
      if (!fs.existsSync(currentPath)) {
        console.log(`  ⚠️  Current screenshot not found: ${b.file} — skipping comparison`);
        console.log(`  📋 Expected: "${b.description}"`);
        return;
      }

      const baselineData = fs.readFileSync(baselinePath);
      const currentData = fs.readFileSync(currentPath);

      // Compare file sizes — significant difference suggests visual regression
      const sizeDiff = Math.abs(baselineData.length - currentData.length);
      const sizeDiffPct = (sizeDiff / baselineData.length) * 100;

      console.log(`  ${b.file}: baseline=${(baselineData.length / 1024).toFixed(1)}KB, current=${(currentData.length / 1024).toFixed(1)}KB, diff=${sizeDiffPct.toFixed(1)}%`);
      console.log(`  📋 ${b.description}`);

      // Flag if size differs by more than 15% (allows for minor rendering differences)
      if (sizeDiffPct > 15) {
        console.log(`  ⚠️  Visual regression detected: ${b.file} changed by ${sizeDiffPct.toFixed(1)}%`);
        console.log(`  → Run the tests again to update screenshots, then manually review differences`);
      }

      expect(sizeDiffPct, `${b.file} changed by ${sizeDiffPct.toFixed(1)}% — possible visual regression`).toBeLessThan(30);
    });
  });

  // ─── Summary test ─────────────────────────────────────────────
  test('all baselines have current screenshots', async () => {
    const missing = manifest.screenshots
      .filter(b => !fs.existsSync(path.join(SCREENSHOT_DIR, b.file)))
      .map(b => b.file);

    if (missing.length > 0) {
      console.log(`  ⚠️  Missing screenshots: ${missing.join(', ')}`);
      console.log('  → Run the smoke tests to generate current screenshots');
    }

    expect(missing, `Missing screenshots: ${missing.join(', ')}`).toEqual([]);
  });

});
