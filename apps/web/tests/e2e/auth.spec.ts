import { test, expect } from '@playwright/test';

test.describe('Auth Middleware', () => {
  // Clerk auth.protect() redirects unauthenticated browser requests to /sign-in
  // with a redirect_url query parameter back to the original page.

  test('redirects /dashboard to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Clerk redirects to /sign-in with redirect_url
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');
    expect(page.url()).toContain('redirect_url');
  });

  test('redirects /clients to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/clients');

    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('redirects /settings to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/settings');

    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('allows access to landing page without auth', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('allows access to /privacy without auth', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page).toHaveURL('/privacy');
    await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible();
  });
});
