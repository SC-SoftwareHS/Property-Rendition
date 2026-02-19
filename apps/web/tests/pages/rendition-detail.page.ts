import { type Page, type Locator } from '@playwright/test';

export class RenditionDetailPage {
  readonly page: Page;

  // Summary cards
  readonly originalCostCard: Locator;
  readonly depreciatedValueCard: Locator;
  readonly totalAssetsCard: Locator;

  // Action buttons
  readonly recalculateButton: Locator;
  readonly submitForReviewButton: Locator;
  readonly approveButton: Locator;
  readonly generatePdfButton: Locator;
  readonly downloadPdfButton: Locator;
  readonly downloadScheduleButton: Locator;

  // Category breakdown
  readonly categoryBreakdownTable: Locator;

  // Asset detail
  readonly showAssetsButton: Locator;
  readonly assetDetailTable: Locator;
  readonly overrideCountText: Locator;

  // HB 9
  readonly hb9Card: Locator;
  readonly relatedEntitiesCheckbox: Locator;
  readonly electNotToRenderCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;

    this.originalCostCard = page.locator('text=Original Cost').first();
    this.depreciatedValueCard = page.locator('text=Depreciated Value').first();
    this.totalAssetsCard = page.locator('text=Total Assets').first();

    this.recalculateButton = page.getByRole('button', { name: /recalculate/i });
    this.submitForReviewButton = page.getByRole('button', { name: /submit for review/i });
    this.approveButton = page.getByRole('button', { name: /approve/i });
    this.generatePdfButton = page.getByRole('button', { name: /generate (pdf|certification)/i });
    this.downloadPdfButton = page.getByRole('button', { name: /download pdf/i });
    this.downloadScheduleButton = page.getByRole('button', { name: /download schedule|preview schedule/i });

    this.categoryBreakdownTable = page.locator('text=Category Breakdown').locator('..').locator('table');
    this.showAssetsButton = page.getByRole('button', { name: /show assets/i });
    this.assetDetailTable = page.locator('text=Asset Detail').locator('..').locator('..').locator('table');
    this.overrideCountText = page.locator('text=/FMV override/');

    this.hb9Card = page.locator('text=HB 9 Exemption').locator('..');
    this.relatedEntitiesCheckbox = page.getByLabel(/related business entities/i);
    this.electNotToRenderCheckbox = page.getByLabel(/elect not to render/i);
  }

  async clickOverrideForAsset(description: string) {
    const row = this.page.locator('tr').filter({ hasText: description });
    await row.getByTitle('Override FMV').click();
  }

  async setOverride(value: string, reason: string) {
    await this.page.locator('input[placeholder="FMV"]').fill(value);
    await this.page.locator('input[placeholder="Reason"]').fill(reason);
    await this.page.locator('button').filter({ has: this.page.locator('svg.lucide-check') }).click();
  }

  async removeOverrideForAsset(description: string) {
    const row = this.page.locator('tr').filter({ hasText: description });
    await row.getByTitle('Remove override').click();
  }
}
