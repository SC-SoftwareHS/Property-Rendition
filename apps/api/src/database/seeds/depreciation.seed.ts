import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../schema';
import { depreciationSchedules } from '../schema';
import { txDepreciation } from './data/tx-depreciation';

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

  const allEntries = [...txDepreciation];

  console.log(`Seeding ${allEntries.length} depreciation schedule entries...`);

  let upserted = 0;

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < allEntries.length; i += batchSize) {
    const batch = allEntries.slice(i, i + batchSize);

    const result = await db
      .insert(depreciationSchedules)
      .values(
        batch.map((entry) => ({
          state: entry.state,
          category: entry.category as typeof depreciationSchedules.$inferInsert.category,
          yearOfLife: entry.yearOfLife,
          depreciationPercent: entry.depreciationPercent,
          sourceDocument: entry.sourceDocument,
          sourceYear: entry.sourceYear,
        })),
      )
      .onConflictDoUpdate({
        target: [
          depreciationSchedules.state,
          depreciationSchedules.category,
          depreciationSchedules.yearOfLife,
        ],
        set: {
          depreciationPercent: sql`excluded.depreciation_percent`,
          sourceDocument: sql`excluded.source_document`,
          sourceYear: sql`excluded.source_year`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: depreciationSchedules.id });

    upserted += result.length;
  }

  // Count by category
  const categoryCounts: Record<string, number> = {};
  for (const entry of allEntries) {
    categoryCounts[entry.category] = (categoryCounts[entry.category] ?? 0) + 1;
  }

  console.log(`Done! Upserted ${upserted} depreciation schedule entries:`);
  for (const [category, count] of Object.entries(categoryCounts).sort()) {
    console.log(`  ${category}: ${count} year-of-life entries`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('Depreciation seed failed:', err);
  process.exit(1);
});
