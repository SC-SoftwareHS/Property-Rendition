/**
 * Auth setup for E2E tests.
 *
 * For authenticated E2E tests, Clerk provides a testing framework:
 * https://clerk.com/docs/testing/overview
 *
 * Options for E2E auth:
 * 1. Clerk Testing Tokens (recommended for CI) — set CLERK_TESTING_TOKEN env
 * 2. Cookie/session injection — save auth state to storageState file
 * 3. Manual login via Playwright — fill sign-in form
 *
 * This file provides a manual login helper for local development.
 * In CI, prefer Clerk Testing Tokens.
 */

import { type Page } from '@playwright/test';

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL ?? 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD ?? 'testpassword123',
};

/**
 * Sign in via Clerk's hosted UI.
 * This is a helper for local dev — in CI, use Clerk Testing Tokens instead.
 */
export async function signIn(page: Page) {
  await page.goto('/sign-in');

  // Wait for Clerk sign-in form to load
  await page.waitForSelector('input[name="identifier"], input[type="email"]', {
    timeout: 15_000,
  });

  // Fill email
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.fill(TEST_USER.email);

  // Click continue/next
  const continueButton = page
    .getByRole('button', { name: /continue|sign in|next/i })
    .first();
  await continueButton.click();

  // Wait for password field
  await page.waitForSelector('input[type="password"]', { timeout: 10_000 });
  await page.locator('input[type="password"]').fill(TEST_USER.password);

  // Click sign in
  const signInButton = page.getByRole('button', { name: /sign in|continue/i }).first();
  await signInButton.click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
}

/**
 * Check if the current session is authenticated by looking for sidebar presence.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.locator('aside').waitFor({ state: 'visible', timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}
