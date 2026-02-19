import { type Page, type Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly startTrialButton: Locator;
  readonly signInButton: Locator;
  readonly dashboardLink: Locator;
  readonly featuresSection: Locator;
  readonly pricingSection: Locator;
  readonly faqSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.startTrialButton = page.getByRole('button', { name: /start free trial|get started/i }).first();
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.dashboardLink = page.getByRole('link', { name: /dashboard/i });
    this.featuresSection = page.locator('text=Auto Depreciation');
    this.pricingSection = page.locator('text=Starter');
    this.faqSection = page.locator('text=Frequently Asked Questions');
  }

  async goto() {
    await this.page.goto('/');
  }
}
