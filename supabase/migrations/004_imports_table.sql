-- Imports table: tracks each CSV import run
CREATE TABLE IF NOT EXISTS imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broker TEXT NOT NULL,
  filename TEXT,
  trades_imported INTEGER NOT NULL DEFAULT 0,
  trades_skipped INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imports_select" ON imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "imports_insert" ON imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "imports_delete" ON imports FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_imports_account_id ON imports(account_id);
CREATE INDEX IF NOT EXISTS idx_imports_created_at ON imports(created_at DESC);
