import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly clientsCard: Locator;
  readonly locationsCard: Locator;
  readonly assetsCard: Locator;
  readonly renditionsCard: Locator;
  readonly taxYearDisplay: Locator;
  readonly prevYearButton: Locator;
  readonly nextYearButton: Locator;
  readonly manageClientsLink: Locator;
  readonly viewRenditionsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.clientsCard = page.locator('text=Clients').first();
    this.locationsCard = page.locator('text=Locations').first();
    this.assetsCard = page.locator('text=Assets').first();
    this.renditionsCard = page.locator('text=Renditions').first();
    this.taxYearDisplay = page.locator('span.text-sm.font-medium');
    this.prevYearButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') });
    this.nextYearButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') });
    this.manageClientsLink = page.getByRole('link', { name: /manage clients/i });
    this.viewRenditionsLink = page.getByRole('link', { name: /view renditions/i });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }
}
