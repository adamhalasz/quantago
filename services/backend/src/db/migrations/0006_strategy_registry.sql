CREATE TABLE IF NOT EXISTS strategy_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  runtime_type TEXT NOT NULL,
  language TEXT NOT NULL,
  default_frequency TEXT NOT NULL,
  min_candles INTEGER NOT NULL,
  lookback_candles INTEGER NOT NULL,
  default_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameter_schema JSONB NOT NULL DEFAULT '{"type":"object","properties":{}}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_version_id UUID
);

CREATE TABLE IF NOT EXISTS strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategy_definitions(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  runtime_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  artifact_key TEXT,
  artifact_content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(strategy_id, version)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'strategy_definitions_current_version_fk'
  ) THEN
    ALTER TABLE strategy_definitions
      ADD CONSTRAINT strategy_definitions_current_version_fk
      FOREIGN KEY (current_version_id)
      REFERENCES strategy_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS strategy_definitions_user_id_idx ON strategy_definitions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS strategy_definitions_public_idx ON strategy_definitions (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS strategy_versions_strategy_id_idx ON strategy_versions (strategy_id, created_at DESC);