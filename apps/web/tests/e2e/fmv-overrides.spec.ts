import { test, expect } from '@playwright/test';
import { signIn } from './auth.setup';
import { RenditionDetailPage } from '../pages/rendition-detail.page';
import { SidebarComponent } from '../pages/sidebar.page';

/**
 * FMV Override E2E tests.
 *
 * Tests the inline FMV override flow:
 *   1. Open rendition detail
 *   2. Expand asset detail table
 *   3. Click override pencil icon on an asset
 *   4. Enter override value + reason
 *   5. Save override
 *   6. Verify override badge appears
 *   7. Remove override
 *
 * Requires: authenticated session, existing renditions with calculated totals.
 * Run with: E2E_AUTHENTICATED=1 npx playwright test fmv-overrides
 */
test.describe('FMV Override Flow', () => {
  test.skip(
    !process.env.E2E_AUTHENTICATED,
    'Requires E2E_AUTHENTICATED=1 and valid Clerk test credentials',
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('asset detail table can be expanded', async ({ page }) => {
    // Navigate to a rendition with calculated data
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    // Find a rendition that's not filed (so overrides can be edited)
    const renditionRow = page.locator('table tbody tr').filter({
      hasNot: page.locator('text=Filed'),
    }).first();

    const exists = (await renditionRow.count()) > 0;
    if (!exists) {
      test.skip(true, 'No editable renditions — skipping FMV override test');
      return;
    }

    await renditionRow.click();
    await page.waitForURL(/\/renditions\/[a-f0-9-]+/);

    const detail = new RenditionDetailPage(page);

    // Wait for the page to load fully
    await expect(page.locator('text=Asset Detail')).toBeVisible({ timeout: 10_000 });

    // Click "Show Assets"
    await detail.showAssetsButton.click();

    // Asset table should now be visible
    await expect(detail.assetDetailTable).toBeVisible({ timeout: 5_000 });

    // Should have columns: Description, Category, Year, Cost, % Good, FMV, Override
    const headers = detail.assetDetailTable.locator('th');
    await expect(headers.filter({ hasText: 'Description' })).toBeVisible();
    await expect(headers.filter({ hasText: 'FMV' })).toBeVisible();
    await expect(headers.filter({ hasText: 'Override' })).toBeVisible();
  });

  test('can set FMV override on an asset', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    // Find a non-filed rendition
    const renditionRow = page.locator('table tbody tr').filter({
      hasNot: page.locator('text=Filed'),
    }).first();

    const exists = (await renditionRow.count()) > 0;
    if (!exists) {
      test.skip(true, 'No editable renditions');
      return;
    }

    await renditionRow.click();
    await page.waitForURL(/\/renditions\/[a-f0-9-]+/);

    // Expand assets
    await page.getByRole('button', { name: /show assets/i }).click();
    await page.waitForTimeout(500);

    // Find the first override pencil button in the asset table
    const firstOverrideButton = page.getByTitle('Override FMV').first();
    const overrideExists = (await firstOverrideButton.count()) > 0;

    if (!overrideExists) {
      test.skip(true, 'No assets with override buttons');
      return;
    }

    await firstOverrideButton.click();

    // Should show inline edit fields
    const fmvInput = page.locator('input[placeholder="FMV"]');
    const reasonInput = page.locator('input[placeholder="Reason"]');

    await expect(fmvInput).toBeVisible();
    await expect(reasonInput).toBeVisible();

    // Fill override
    await fmvInput.fill('5000');
    await reasonInput.fill('E2E test override');

    // Click the check button to save
    await page.locator('button').filter({
      has: page.locator('svg.lucide-check'),
    }).click();

    // Should show success toast
    await expect(page.locator('text=FMV override saved')).toBeVisible({ timeout: 5_000 });

    // Should show "Override" badge on the row
    await expect(page.locator('text=Override').first()).toBeVisible();
  });

  test('validates override requires reason', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    const renditionRow = page.locator('table tbody tr').filter({
      hasNot: page.locator('text=Filed'),
    }).first();

    const exists = (await renditionRow.count()) > 0;
    if (!exists) {
      test.skip(true, 'No editable renditions');
      return;
    }

    await renditionRow.click();
    await page.waitForURL(/\/renditions\/[a-f0-9-]+/);

    await page.getByRole('button', { name: /show assets/i }).click();
    await page.waitForTimeout(500);

    const firstOverrideButton = page.getByTitle('Override FMV').first();
    if ((await firstOverrideButton.count()) === 0) {
      test.skip(true, 'No assets');
      return;
    }

    await firstOverrideButton.click();

    // Fill value but NOT reason
    const fmvInput = page.locator('input[placeholder="FMV"]');
    await fmvInput.fill('5000');

    // Try to save without reason
    await page.locator('button').filter({
      has: page.locator('svg.lucide-check'),
    }).click();

    // Should show error toast
    await expect(page.locator('text=Please provide a reason')).toBeVisible({ timeout: 3_000 });
  });

  test('can cancel override edit', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    const renditionRow = page.locator('table tbody tr').filter({
      hasNot: page.locator('text=Filed'),
    }).first();

    if ((await renditionRow.count()) === 0) {
      test.skip(true, 'No editable renditions');
      return;
    }

    await renditionRow.click();
    await page.waitForURL(/\/renditions\/[a-f0-9-]+/);

    await page.getByRole('button', { name: /show assets/i }).click();
    await page.waitForTimeout(500);

    const firstOverrideButton = page.getByTitle('Override FMV').first();
    if ((await firstOverrideButton.count()) === 0) {
      test.skip(true, 'No assets');
      return;
    }

    await firstOverrideButton.click();

    // Should show edit fields
    await expect(page.locator('input[placeholder="FMV"]')).toBeVisible();

    // Click cancel (X button)
    await page.locator('button').filter({
      has: page.locator('svg.lucide-x'),
    }).first().click();

    // Edit fields should be hidden
    await expect(page.locator('input[placeholder="FMV"]')).toBeHidden();
  });
});
