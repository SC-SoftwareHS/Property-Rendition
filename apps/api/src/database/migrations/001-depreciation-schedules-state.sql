-- Migration: depreciation_schedules - replace jurisdiction_id with state + add sourceDocument/sourceYear
-- Date: 2026-02-10
-- Context: Depreciation tables are state-level, not county-level. TX/OK/FL all publish
-- depreciation schedules at the state level. This migration corrects the schema.

-- Step 1: Drop the old FK constraint and unique index
ALTER TABLE "depreciation_schedules" DROP CONSTRAINT IF EXISTS "depreciation_schedules_jurisdiction_id_jurisdictions_id_fk";
DROP INDEX IF EXISTS "depreciation_schedules_unique_idx";

-- Step 2: Drop jurisdiction_id, add state + metadata columns
ALTER TABLE "depreciation_schedules" DROP COLUMN IF EXISTS "jurisdiction_id";
ALTER TABLE "depreciation_schedules" ADD COLUMN IF NOT EXISTS "state" varchar(2) NOT NULL DEFAULT 'TX';
ALTER TABLE "depreciation_schedules" ADD COLUMN IF NOT EXISTS "source_document" varchar(255);
ALTER TABLE "depreciation_schedules" ADD COLUMN IF NOT EXISTS "source_year" integer;

-- Step 3: Remove the default on state (was only for migration safety)
ALTER TABLE "depreciation_schedules" ALTER COLUMN "state" DROP DEFAULT;

-- Step 4: Change default method from 'straight_line' to 'percent_good'
ALTER TABLE "depreciation_schedules" ALTER COLUMN "method" SET DEFAULT 'percent_good';

-- Step 5: Create new unique index on (state, category, year_of_life)
CREATE UNIQUE INDEX "depreciation_schedules_unique_idx" ON "depreciation_schedules" USING btree ("state", "category", "year_of_life");
