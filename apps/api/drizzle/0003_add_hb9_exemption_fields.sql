-- Add HB 9 ($125K BPP exemption) fields to renditions table
-- HB 9 effective Jan 1, 2026: $125K deduction from appraised BPP value per location
ALTER TABLE renditions
  ADD COLUMN hb9_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN hb9_has_related_entities boolean NOT NULL DEFAULT false,
  ADD COLUMN hb9_elect_not_to_render boolean NOT NULL DEFAULT false,
  ADD COLUMN hb9_exemption_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN hb9_net_taxable_value numeric(14,2);
