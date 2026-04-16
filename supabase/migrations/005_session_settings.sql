-- Add session_settings JSONB column to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS session_settings JSONB NOT NULL DEFAULT '{
    "london":  { "start": "03:00", "end": "12:00" },
    "overlap": { "start": "08:00", "end": "12:00" },
    "ny":      { "start": "08:00", "end": "17:00" },
    "asia":    { "start": "20:00", "end": "00:00" }
  }'::jsonb;
