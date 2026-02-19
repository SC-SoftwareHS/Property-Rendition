-- Add profile columns to firms table
ALTER TABLE firms ADD COLUMN IF NOT EXISTS logo_url varchar(500);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS address varchar(255);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS city varchar(100);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS state varchar(2);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS zip varchar(10);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS website varchar(255);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS default_state varchar(2) DEFAULT 'TX';
ALTER TABLE firms ADD COLUMN IF NOT EXISTS timezone varchar(50) DEFAULT 'America/Chicago';
