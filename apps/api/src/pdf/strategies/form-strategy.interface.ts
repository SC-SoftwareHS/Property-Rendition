import { CalculationResult } from '../../depreciation/depreciation.service';

export interface OwnerInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  ein?: string;
  accountNumber?: string;
  contactName?: string;
  contactEmail?: string;
  county?: string;
}

export interface FormStrategyResult {
  pdfBytes: Uint8Array;
  formName: string;
}

export interface FormStrategy {
  readonly strategyId: string;
  readonly formName: string;

  fillForm(
    owner: OwnerInfo,
    calculation: CalculationResult,
  ): Promise<FormStrategyResult>;
}
