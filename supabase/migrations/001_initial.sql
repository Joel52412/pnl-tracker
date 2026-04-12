-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_balance DECIMAL(12,2) NOT NULL DEFAULT 25000,
  drawdown_type TEXT NOT NULL DEFAULT 'trailing_eod'
    CHECK (drawdown_type IN ('trailing_eod', 'static')),
  max_drawdown DECIMAL(12,2) NOT NULL DEFAULT 1500,
  daily_loss_limit DECIMAL(12,2) NOT NULL DEFAULT 400,
  pay_days_required INTEGER NOT NULL DEFAULT 5,
  pay_min_daily DECIMAL(12,2) NOT NULL DEFAULT 100,
  pay_min_request DECIMAL(12,2) NOT NULL DEFAULT 500,
  pay_max_request DECIMAL(12,2) NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "date" DATE NOT NULL,
  pnl DECIMAL(12,2) NOT NULL,
  r_value DECIMAL(8,4),
  session TEXT CHECK (session IN ('London', 'NY', 'Asia', 'Overlap', 'Other')),
  instrument TEXT CHECK (instrument IN ('MNQ', 'NQ', 'MES', 'ES', 'Other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Accounts policies
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "trades_select" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update" ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades_delete" ON trades FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades("date");
