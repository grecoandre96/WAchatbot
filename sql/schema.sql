CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  business_desc TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES leads(id),
  status        TEXT NOT NULL DEFAULT 'active',
  score         INTEGER,
  outcome       TEXT,
  calendly_sent BOOLEAN DEFAULT false,
  started_at    TIMESTAMP DEFAULT now(),
  completed_at  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id),
  direction        TEXT NOT NULL,
  body             TEXT NOT NULL,
  sent_at          TIMESTAMP DEFAULT now(),
  twilio_sid       TEXT
);
