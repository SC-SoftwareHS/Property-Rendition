import { test, expect } from '@playwright/test';
import { signIn } from './auth.setup';
import { RenditionDetailPage } from '../pages/rendition-detail.page';
import { SidebarComponent } from '../pages/sidebar.page';

/**
 * Rendition Workflow — the full lifecycle:
 *   not_started → in_progress → review → approved → filed (via PDF generation)
 *
 * Requires authenticated session with existing client + location + assets.
 * Run with: E2E_AUTHENTICATED=1 npx playwright test rendition-workflow
 */
test.describe('Rendition Workflow', () => {
  test.skip(
    !process.env.E2E_AUTHENTICATED,
    'Requires E2E_AUTHENTICATED=1 and valid Clerk test credentials',
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('displays dashboard with rendition status breakdown', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Check for status section
    const statusLabels = ['Not Started', 'In Progress', 'In Review', 'Approved', 'Filed'];
    for (const label of statusLabels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test('navigates to renditions list page', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    await expect(page.getByRole('heading', { name: 'Renditions' })).toBeVisible();

    // Should have batch action buttons (admin/reviewer)
    await expect(
      page.getByRole('button', { name: /batch generate/i }).first(),
    ).toBeVisible();
  });

  test('rendition detail page shows calculation summary', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    // Click first rendition in the table
    const renditionRow = page.locator('table tbody tr').first();
    const exists = (await renditionRow.count()) > 0;

    if (!exists) {
      test.skip(true, 'No renditions exist — skipping detail test');
      return;
    }

    await renditionRow.click();

    // Should navigate to a client/location/rendition detail URL
    await page.waitForURL(/\/renditions\/[a-f0-9-]+/);

    const detail = new RenditionDetailPage(page);

    // Check summary cards
    await expect(detail.originalCostCard).toBeVisible({ timeout: 10_000 });
    await expect(detail.depreciatedValueCard).toBeVisible();
    await expect(detail.totalAssetsCard).toBeVisible();

    // Check category breakdown table
    await expect(page.locator('text=Category Breakdown')).toBeVisible();
  });

  test('recalculate button triggers depreciation recalculation', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    // Find a non-filed rendition
    const renditionRow = page.locator('table tbody tr').filter({
      hasNot: page.locator('text=Filed'),
    }).first();

    const exists = (await renditionRow.count()) > 0;
    if (!exists) {
      test.skip(true, 'No non-filed renditions — skipping recalculate test');
      return;
    }

    await renditionRow.click();
    await page.waitForURL(/\/renditions\/[a-f0-9-]+/);

    const detail = new RenditionDetailPage(page);
    await expect(detail.recalculateButton).toBeVisible();

    await detail.recalculateButton.click();

    // Should show success toast
    await expect(page.locator('text=recalculated')).toBeVisible({ timeout: 10_000 });
  });

  test('status workflow: submit for review', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    // Find an in-progress rendition
    const inProgressRow = page.locator('table tbody tr').filter({
      hasText: /in progress/i,
    }).first();

    const exists = (await inProgressRow.count()) > 0;
    if (!exists) {
      test.skip(true, 'No in-progress renditions — skipping status test');
      return;
    }

    await inProgressRow.click();
    await page.waitForURL(/\/renditions\/[a-f0-9-]+/);

    const detail = new RenditionDetailPage(page);
    await expect(detail.submitForReviewButton).toBeVisible();

    await detail.submitForReviewButton.click();

    // Should show success toast
    await expect(page.locator('text=Status updated')).toBeVisible({ timeout: 10_000 });
  });
});
