-- Expand asset_category enum from 9 to 16 values
-- New categories: office_equipment, medical_equipment, restaurant_equipment,
-- telecommunications, software, tools_dies, signs_displays

ALTER TYPE asset_category ADD VALUE IF NOT EXISTS 'office_equipment';
ALTER TYPE asset_category ADD VALUE IF NOT EXISTS 'medical_equipment';
ALTER TYPE asset_category ADD VALUE IF NOT EXISTS 'restaurant_equipment';
ALTER TYPE asset_category ADD VALUE IF NOT EXISTS 'telecommunications';
ALTER TYPE asset_category ADD VALUE IF NOT EXISTS 'software';
ALTER TYPE asset_category ADD VALUE IF NOT EXISTS 'tools_dies';
ALTER TYPE asset_category ADD VALUE IF NOT EXISTS 'signs_displays';
