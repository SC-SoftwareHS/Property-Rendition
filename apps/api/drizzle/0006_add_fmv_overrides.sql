-- Add FMV overrides column to renditions table.
-- Stores a JSON map of assetId → { overrideValue, reason, appliedBy, appliedAt }
-- Rendition-scoped: overrides apply only to the specific rendition, not globally to the asset.
ALTER TABLE renditions ADD COLUMN fmv_overrides jsonb DEFAULT '{}';
