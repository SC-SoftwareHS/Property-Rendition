-- Related entity groups for HB 9 aggregation
-- Businesses under common ownership at the same address are grouped
-- Their BPP values are aggregated to determine the $125K exemption threshold
CREATE TABLE IF NOT EXISTS related_entity_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id),
  name varchar(255) NOT NULL,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS related_entity_groups_firm_id_idx ON related_entity_groups(firm_id);

-- Junction table: which clients belong to which related entity group
CREATE TABLE IF NOT EXISTS related_entity_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES related_entity_groups(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id),
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(group_id, client_id)
);

CREATE INDEX IF NOT EXISTS related_entity_members_group_id_idx ON related_entity_members(group_id);
CREATE INDEX IF NOT EXISTS related_entity_members_client_id_idx ON related_entity_members(client_id);
