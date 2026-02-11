import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../schema';
import { jurisdictions } from '../schema';
import { txJurisdictions } from './data/tx-jurisdictions';
import { okJurisdictions } from './data/ok-jurisdictions';
import { flJurisdictions } from './data/fl-jurisdictions';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  const allJurisdictions = [
    ...txJurisdictions,
    ...okJurisdictions,
    ...flJurisdictions,
  ];

  console.log(`Seeding ${allJurisdictions.length} jurisdictions...`);

  let inserted = 0;

  // Process in batches of 50 to avoid query size limits
  const batchSize = 50;
  for (let i = 0; i < allJurisdictions.length; i += batchSize) {
    const batch = allJurisdictions.slice(i, i + batchSize);

    const result = await db
      .insert(jurisdictions)
      .values(
        batch.map((j) => ({
          state: j.state,
          county: j.county,
          appraisalDistrictName: j.appraisalDistrictName,
          filingDeadline: j.filingDeadline,
          extensionDeadline: j.extensionDeadline,
        })),
      )
      .onConflictDoUpdate({
        target: [jurisdictions.state, jurisdictions.county],
        set: {
          appraisalDistrictName: sql`excluded.appraisal_district_name`,
          filingDeadline: sql`excluded.filing_deadline`,
          extensionDeadline: sql`excluded.extension_deadline`,
        },
      })
      .returning({ id: jurisdictions.id });

    inserted += result.length;
  }

  // Count per state
  const txCount = txJurisdictions.length;
  const okCount = okJurisdictions.length;
  const flCount = flJurisdictions.length;

  console.log(`Done! Upserted ${inserted} jurisdictions:`);
  console.log(`  TX: ${txCount} counties`);
  console.log(`  OK: ${okCount} counties`);
  console.log(`  FL: ${flCount} counties`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
