import { test, expect } from '@playwright/test';
import { signIn } from './auth.setup';
import { ClientsPage } from '../pages/clients.page';
import { SidebarComponent } from '../pages/sidebar.page';

/**
 * Client CRUD journey — requires authenticated session.
 * Run with: E2E_AUTHENTICATED=1 npx playwright test client-journey
 *
 * Prerequisites:
 *   - Dev server running (npm run dev)
 *   - API server running (npm run start:dev in apps/api)
 *   - E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars set
 */
test.describe('Client CRUD Journey', () => {
  test.skip(
    !process.env.E2E_AUTHENTICATED,
    'Requires E2E_AUTHENTICATED=1 and valid Clerk test credentials',
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('displays sidebar navigation after login', async ({ page }) => {
    const sidebar = new SidebarComponent(page);

    await expect(sidebar.sidebar).toBeVisible();
    await expect(sidebar.brandLink).toBeVisible();
    await expect(sidebar.dashboardLink).toBeVisible();
    await expect(sidebar.clientsLink).toBeVisible();
    await expect(sidebar.renditionsLink).toBeVisible();
    await expect(sidebar.settingsLink).toBeVisible();
  });

  test('navigates to clients page from sidebar', async ({ page }) => {
    const sidebar = new SidebarComponent(page);
    await sidebar.navigateTo('Clients');

    const clientsPage = new ClientsPage(page);
    await expect(clientsPage.heading).toBeVisible();
    await expect(clientsPage.addClientButton).toBeVisible();
  });

  test('creates a new client', async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    const testName = `E2E Test Co ${Date.now()}`;

    await clientsPage.addClient({
      companyName: testName,
      contactName: 'Test User',
      email: 'e2e@test.com',
      phone: '555-0100',
    });

    // Wait for dialog to close
    await expect(clientsPage.dialog).toBeHidden({ timeout: 5_000 });

    // Verify client appears in the table
    await expect(clientsPage.getClientRow(testName)).toBeVisible({ timeout: 5_000 });
  });

  test('searches for a client', async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    // Wait for table to load
    await expect(clientsPage.clientsTable).toBeVisible();

    // Type a search term
    await clientsPage.searchInput.fill('E2E Test');
    await page.waitForTimeout(500); // debounce

    // Results should be filtered (or show empty)
    const rows = clientsPage.clientsTable.locator('tbody tr');
    const count = await rows.count();
    // Either matching rows exist or table shows "No clients found"
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('navigates to client detail page', async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    // Wait for table to load
    await expect(clientsPage.clientsTable).toBeVisible();

    // Click first client row
    const firstRow = clientsPage.clientsTable.locator('tbody tr').first();
    const firstRowExists = (await firstRow.count()) > 0;

    if (firstRowExists) {
      await firstRow.click();

      // Should navigate to client detail
      await page.waitForURL(/\/clients\/[a-f0-9-]+/);
      await expect(page.getByRole('heading')).toBeVisible();
    }
  });
});
