-- Add outcome column to trades table for explicit WIN/LOSS/BE tracking
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS outcome TEXT
    CHECK (outcome IN ('WIN', 'LOSS', 'BE'));

-- Back-fill from existing pnl values
UPDATE trades
SET outcome = CASE
  WHEN pnl > 0 THEN 'WIN'
  WHEN pnl < 0 THEN 'LOSS'
  ELSE 'BE'
END
WHERE outcome IS NULL;
