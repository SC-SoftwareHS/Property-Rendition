import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FormStrategy } from './form-strategy.interface';
import { TxStandardFormStrategy } from './tx-standard-form.strategy';
import { TxHarrisFormStrategy } from './tx-harris-form.strategy';
import { OkForm901Strategy } from './ok-form-901.strategy';
import { FlDr405Strategy } from './fl-dr405.strategy';

@Injectable()
export class FormStrategyFactory {
  private readonly logger = new Logger(FormStrategyFactory.name);

  getStrategy(
    state: string,
    county: string,
    assessedValue?: number,
  ): FormStrategy {
    this.logger.log(
      `Resolving strategy for state=${state}, county=${county}, assessedValue=${assessedValue ?? 'N/A'}`,
    );

    switch (state) {
      case 'TX':
        return this.getTxStrategy(county);
      case 'OK':
        return this.getOkStrategy(county);
      case 'FL':
        return this.getFlStrategy(county, assessedValue);
      default:
        throw new BadRequestException(
          `Unsupported state "${state}". Currently supported: TX, OK, FL.`,
        );
    }
  }

  private getTxStrategy(county: string): FormStrategy {
    const normalizedCounty = county.trim().toLowerCase();

    let strategy: FormStrategy;
    if (normalizedCounty === 'harris') {
      strategy = new TxHarrisFormStrategy();
    } else {
      // All other TX counties use standard Form 50-144
      strategy = new TxStandardFormStrategy();
    }

    this.logger.log(`Resolved strategy: ${strategy.strategyId} for TX/${county}`);
    return strategy;
  }

  private getOkStrategy(_county: string): FormStrategy {
    // All OK counties use standard Form 901.
    const strategy = new OkForm901Strategy();
    this.logger.log(`Resolved strategy: ${strategy.strategyId}`);
    return strategy;
  }

  private getFlStrategy(_county: string, _assessedValue?: number): FormStrategy {
    // All FL counties use standard DR-405.
    // DR-405EZ is a county-level convenience form with no fillable fields — skipped.
    // Properties under $25K qualify for automatic exemption but still use DR-405 if filing.
    const strategy = new FlDr405Strategy();
    this.logger.log(`Resolved strategy: ${strategy.strategyId}`);
    return strategy;
  }
}
