import { type Page, type Locator } from '@playwright/test';

export class SidebarComponent {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly brandLink: Locator;
  readonly firmName: Locator;
  readonly dashboardLink: Locator;
  readonly clientsLink: Locator;
  readonly renditionsLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('aside');
    this.brandLink = page.getByRole('link', { name: 'RenditionReady' });
    this.firmName = this.sidebar.locator('.text-sm.font-medium.truncate');
    this.dashboardLink = this.sidebar.getByRole('link', { name: 'Dashboard' });
    this.clientsLink = this.sidebar.getByRole('link', { name: 'Clients' });
    this.renditionsLink = this.sidebar.getByRole('link', { name: 'Renditions' });
    this.settingsLink = this.sidebar.getByRole('link', { name: 'Settings' });
  }

  async navigateTo(section: 'Dashboard' | 'Clients' | 'Renditions' | 'Settings') {
    const link = this.sidebar.getByRole('link', { name: section });
    await link.click();
  }
}
