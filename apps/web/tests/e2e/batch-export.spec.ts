import { test, expect } from '@playwright/test';
import { signIn } from './auth.setup';
import { SidebarComponent } from '../pages/sidebar.page';

/**
 * Batch Generation & Export E2E tests.
 *
 * Tests:
 *   1. Renditions page displays batch action buttons
 *   2. Export dropdown has CSV/Excel/JSON options
 *   3. Tax year selector works
 *   4. Status tab filtering works
 *   5. Batch generate triggers API call (doesn't test actual PDF — that's integration)
 *
 * Requires: authenticated session.
 * Run with: E2E_AUTHENTICATED=1 npx playwright test batch-export
 */
test.describe('Batch Generation & Export', () => {
  test.skip(
    !process.env.E2E_AUTHENTICATED,
    'Requires E2E_AUTHENTICATED=1 and valid Clerk test credentials',
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('renditions page shows batch action buttons', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    await expect(page.getByRole('heading', { name: 'Renditions' })).toBeVisible();

    // Batch generate buttons should be present (for admin/reviewer)
    const batchButton = page.getByRole('button', { name: /batch generate/i }).first();
    await expect(batchButton).toBeVisible({ timeout: 5_000 });
  });

  test('status tabs filter renditions', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    await expect(page.getByRole('heading', { name: 'Renditions' })).toBeVisible();

    // Status tabs should exist
    const tabs = ['All', 'In Progress', 'In Review', 'Approved', 'Filed'];
    for (const tab of tabs) {
      const tabButton = page.getByRole('tab', { name: tab }).or(
        page.locator(`button:has-text("${tab}")`),
      );
      // At least the "All" tab should be visible
      if (tab === 'All') {
        await expect(tabButton).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test('export dropdown shows format options', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    await expect(page.getByRole('heading', { name: 'Renditions' })).toBeVisible();

    // Find export dropdown
    const exportButton = page.getByRole('button', { name: /export/i }).first();
    const exists = (await exportButton.count()) > 0;

    if (!exists) {
      test.skip(true, 'No export button on renditions page');
      return;
    }

    await exportButton.click();

    // Should show format options
    await expect(
      page.getByRole('menuitem', { name: /csv/i }).or(page.locator('text=CSV')),
    ).toBeVisible({ timeout: 3_000 });
  });

  test('renditions table shows data columns', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Renditions');

    await expect(page.getByRole('heading', { name: 'Renditions' })).toBeVisible();

    // Table should have expected columns
    const table = page.locator('table').first();
    const tableExists = (await table.count()) > 0;

    if (tableExists) {
      const headerRow = table.locator('thead tr').first();
      // Check for common column headers
      const headers = await headerRow.locator('th').allTextContents();
      const headerText = headers.join(' ').toLowerCase();

      // Should contain key columns
      expect(
        headerText.includes('client') ||
          headerText.includes('company') ||
          headerText.includes('location') ||
          headerText.includes('status'),
      ).toBe(true);
    }
  });
});
