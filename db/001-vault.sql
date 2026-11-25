CREATE SEQUENCE IF NOT EXISTS note_versions;
CREATE TABLE IF NOT EXISTS notes (
  id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 128),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 20000),
  tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT nextval('note_versions')
);
CREATE TABLE IF NOT EXISTS image_assets (
  id uuid PRIMARY KEY,
  digest text UNIQUE NOT NULL,
  data bytea NOT NULL CHECK (octet_length(data) <= 3670016),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS note_attachments (
  note_id text NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES image_assets(id),
  position integer NOT NULL CHECK (position BETWEEN 0 AND 11),
  PRIMARY KEY (note_id, image_id),
  UNIQUE (note_id, position)
);
CREATE TABLE IF NOT EXISTS vault_sessions (
  token_hash text PRIMARY KEY,
  password_stamp text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_sessions_expiry ON vault_sessions(expires_at);
CREATE TABLE IF NOT EXISTS vault_login_attempts (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  resets_at timestamptz NOT NULL
);
