-- Add intraday_trailing drawdown mode and lock threshold
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_drawdown_type_check;
ALTER TABLE accounts
  ADD CONSTRAINT accounts_drawdown_type_check
    CHECK (drawdown_type IN ('trailing_eod', 'intraday_trailing', 'static'));

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS drawdown_lock_threshold NUMERIC DEFAULT 0;
