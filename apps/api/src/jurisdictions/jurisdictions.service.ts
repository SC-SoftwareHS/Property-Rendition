import { Injectable } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { jurisdictions } from '../database/schema';

@Injectable()
export class JurisdictionsService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async findByState(state: string) {
    return this.db
      .select()
      .from(jurisdictions)
      .where(eq(jurisdictions.state, state.toUpperCase()))
      .orderBy(asc(jurisdictions.county));
  }

  async findCountiesByState(state: string) {
    return this.db
      .select({
        county: jurisdictions.county,
        appraisalDistrictName: jurisdictions.appraisalDistrictName,
      })
      .from(jurisdictions)
      .where(eq(jurisdictions.state, state.toUpperCase()))
      .orderBy(asc(jurisdictions.county));
  }

  async resolveJurisdiction(state: string, county: string) {
    const result = await this.db
      .select()
      .from(jurisdictions)
      .where(
        and(
          eq(jurisdictions.state, state.toUpperCase()),
          eq(jurisdictions.county, county),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }
}
