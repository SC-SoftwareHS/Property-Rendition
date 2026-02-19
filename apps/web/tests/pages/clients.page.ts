import { type Page, type Locator } from '@playwright/test';

export class ClientsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addClientButton: Locator;
  readonly searchInput: Locator;
  readonly clientsTable: Locator;
  readonly exportDropdown: Locator;

  // Dialog elements
  readonly dialog: Locator;
  readonly companyNameInput: Locator;
  readonly contactNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly dialogSaveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Clients' });
    this.addClientButton = page.getByRole('button', { name: /add client/i });
    this.searchInput = page.getByPlaceholder(/search clients/i);
    this.clientsTable = page.locator('table');
    this.exportDropdown = page.getByRole('button', { name: /export/i });

    // Dialog
    this.dialog = page.getByRole('dialog');
    this.companyNameInput = page.getByLabel(/company name/i);
    this.contactNameInput = page.getByLabel(/contact name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.phoneInput = page.getByLabel(/phone/i);
    this.dialogSaveButton = this.dialog.getByRole('button', { name: /save|create|add/i });
  }

  async goto() {
    await this.page.goto('/clients');
  }

  async addClient(data: {
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
  }) {
    await this.addClientButton.click();
    await this.dialog.waitFor({ state: 'visible' });
    await this.companyNameInput.fill(data.companyName);
    if (data.contactName) await this.contactNameInput.fill(data.contactName);
    if (data.email) await this.emailInput.fill(data.email);
    if (data.phone) await this.phoneInput.fill(data.phone);
    await this.dialogSaveButton.click();
  }

  getClientRow(companyName: string) {
    return this.clientsTable.locator('tr').filter({ hasText: companyName });
  }
}
