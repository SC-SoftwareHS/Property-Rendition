import { test, expect } from '@playwright/test';
import { LandingPage } from '../pages/landing.page';

test.describe('Landing Page', () => {
  test('displays hero section with value proposition', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    await expect(landing.heading).toBeVisible();
    await expect(page.getByRole('banner').getByText('RenditionReady')).toBeVisible();
  });

  test('displays feature cards', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    await expect(landing.featuresSection).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Multi-State PDF Forms' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Batch Generation & Export' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Year-Over-Year Rollover', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Team Collaboration' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Secure & Reliable' })).toBeVisible();
  });

  test('displays pricing section with three tiers', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    await expect(landing.pricingSection).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professional', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Firm', exact: true })).toBeVisible();
  });

  test('has a CTA button for starting a trial', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    // The CTA is a button inside Clerk's <SignInButton> (modal mode)
    const cta = landing.startTrialButton;
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText(/start free trial/i);
  });

  test('has footer links to privacy and terms', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    const privacyLink = page.getByRole('link', { name: 'Privacy Policy' });
    const termsLink = page.getByRole('link', { name: 'Terms of Service' });

    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toBeVisible();
  });
});

test.describe('Public Pages', () => {
  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1, name: /privacy/i })).toBeVisible();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 1, name: /terms/i })).toBeVisible();
  });
});
