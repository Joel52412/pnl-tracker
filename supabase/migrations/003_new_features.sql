-- New columns on accounts table
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'simple'
    CHECK (account_type IN ('simple', 'eval', 'funded')),
  ADD COLUMN IF NOT EXISTS profit_target DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS min_trading_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consistency_limit DECIMAL(5,2) DEFAULT 0;

-- Payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "date" DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_select" ON payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payouts_insert" ON payouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payouts_update" ON payouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payouts_delete" ON payouts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_account_id ON payouts(account_id);

-- Journals table (one entry per day per account)
CREATE TABLE IF NOT EXISTS journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "date" DATE NOT NULL,
  premarket TEXT,
  postmarket TEXT,
  mindset TEXT,
  mindset_rating INTEGER CHECK (mindset_rating BETWEEN 1 AND 5),
  market_condition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(account_id, "date")
);

ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journals_select" ON journals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journals_insert" ON journals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journals_update" ON journals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "journals_delete" ON journals FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_journals_account_id ON journals(account_id);
CREATE INDEX IF NOT EXISTS idx_journals_date ON journals("date");
