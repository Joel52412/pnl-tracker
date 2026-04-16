-- Tag each trade with its import batch so undo-import is possible
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES imports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS trades_import_batch_id_idx ON trades(import_batch_id);
