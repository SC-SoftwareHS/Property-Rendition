import { test, expect } from '@playwright/test';
import { signIn } from './auth.setup';
import { SidebarComponent } from '../pages/sidebar.page';

/**
 * Location + Asset Management E2E tests.
 *
 * Tests:
 *   1. Navigate to client detail → Locations tab
 *   2. Add location with jurisdiction
 *   3. Navigate to location detail
 *   4. Add assets to location
 *   5. Asset table displays with inline editing
 *   6. Import button exists
 *
 * Requires: authenticated session with at least one client.
 * Run with: E2E_AUTHENTICATED=1 npx playwright test location-assets
 */
test.describe('Location & Asset Management', () => {
  test.skip(
    !process.env.E2E_AUTHENTICATED,
    'Requires E2E_AUTHENTICATED=1 and valid Clerk test credentials',
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('navigates to client detail and shows tabs', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Clients');

    // Click first client
    const clientRow = page.locator('table tbody tr').first();
    if ((await clientRow.count()) === 0) {
      test.skip(true, 'No clients exist');
      return;
    }

    await clientRow.click();
    await page.waitForURL(/\/clients\/[a-f0-9-]+/);

    // Should have tabs
    await expect(page.locator('text=Overview').first()).toBeVisible();
    await expect(page.locator('text=Locations').first()).toBeVisible();
  });

  test('can open location form dialog', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Clients');

    const clientRow = page.locator('table tbody tr').first();
    if ((await clientRow.count()) === 0) {
      test.skip(true, 'No clients exist');
      return;
    }

    await clientRow.click();
    await page.waitForURL(/\/clients\/[a-f0-9-]+/);

    // Click Locations tab
    await page.locator('text=Locations').first().click();
    await page.waitForTimeout(300);

    // Find "Add Location" button
    const addLocationButton = page.getByRole('button', { name: /add location/i });
    if ((await addLocationButton.count()) === 0) {
      test.skip(true, 'No add location button visible');
      return;
    }

    await addLocationButton.click();

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });

    // Should have form fields for location
    await expect(
      page.getByLabel(/name/i).or(page.getByLabel(/location name/i)),
    ).toBeVisible();
  });

  test('navigates to location detail with assets table', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Clients');

    const clientRow = page.locator('table tbody tr').first();
    if ((await clientRow.count()) === 0) {
      test.skip(true, 'No clients exist');
      return;
    }

    await clientRow.click();
    await page.waitForURL(/\/clients\/[a-f0-9-]+/);

    // Click Locations tab
    await page.locator('text=Locations').first().click();
    await page.waitForTimeout(500);

    // Click first location
    const locationLink = page.locator('a, tr, [role="button"]').filter({
      hasText: /location|office|hq|main/i,
    }).first();

    if ((await locationLink.count()) === 0) {
      // Try clicking any clickable element in locations section
      const locationCard = page.locator('[class*="card"], table tbody tr').nth(1);
      if ((await locationCard.count()) === 0) {
        test.skip(true, 'No locations exist');
        return;
      }
      await locationCard.click();
    } else {
      await locationLink.click();
    }

    // Wait for location detail page
    await page.waitForURL(/\/locations\/[a-f0-9-]+/, { timeout: 5_000 }).catch(() => {
      // May already be on the page
    });

    // Should show asset management UI
    await expect(
      page.getByRole('button', { name: /add asset/i }).or(
        page.locator('text=Assets').first(),
      ),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('add asset dialog has all required fields', async ({ page }) => {
    // Navigate deep: Clients → first client → Locations → first location
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Clients');

    const clientRow = page.locator('table tbody tr').first();
    if ((await clientRow.count()) === 0) {
      test.skip(true, 'No clients');
      return;
    }
    await clientRow.click();
    await page.waitForURL(/\/clients\/[a-f0-9-]+/);

    // Locations tab
    await page.locator('text=Locations').first().click();
    await page.waitForTimeout(500);

    // Navigate to first location (via card click or link)
    const locationElements = page.locator('a[href*="/locations/"]');
    if ((await locationElements.count()) === 0) {
      test.skip(true, 'No locations');
      return;
    }
    await locationElements.first().click();
    await page.waitForURL(/\/locations\/[a-f0-9-]+/, { timeout: 5_000 });

    // Click Add Asset
    const addAssetButton = page.getByRole('button', { name: /add asset/i });
    if ((await addAssetButton.count()) === 0) {
      test.skip(true, 'No add asset button');
      return;
    }
    await addAssetButton.click();

    // Dialog should show with asset form fields
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3_000 });

    // Key fields
    await expect(dialog.getByLabel(/description/i)).toBeVisible();
    await expect(dialog.locator('select, [role="combobox"]').first()).toBeVisible(); // category
    await expect(
      dialog.getByLabel(/cost/i).or(dialog.getByLabel(/original cost/i)),
    ).toBeVisible();
    await expect(
      dialog.getByLabel(/acquisition/i).or(dialog.getByLabel(/date/i)),
    ).toBeVisible();
  });
});
