-- Create firm_invites table for invite-based user onboarding
CREATE TABLE IF NOT EXISTS firm_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id),
  email varchar(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'preparer',
  token varchar(255) NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  accepted_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS firm_invites_email_idx ON firm_invites(email);
CREATE INDEX IF NOT EXISTS firm_invites_token_idx ON firm_invites(token);
