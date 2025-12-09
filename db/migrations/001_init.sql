-- 001_init.sql

-- ===== ENUM TYPES =====

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_nature') THEN
    CREATE TYPE ledger_nature AS ENUM ('Asset', 'Liability', 'Income', 'Expense');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_type') THEN
    CREATE TYPE voucher_type AS ENUM ('Journal', 'Payment', 'Receipt', 'Contra', 'Transfer');
  END IF;
END$$;

-- ===== TABLES =====

-- Ledgers master
CREATE TABLE IF NOT EXISTS ledgers (
  id           UUID PRIMARY KEY,
  name         TEXT        NOT NULL,
  group_name   TEXT        NOT NULL,
  nature       ledger_nature NOT NULL,
  is_party     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entries (voucher header)
CREATE TABLE IF NOT EXISTS entries (
  id           UUID PRIMARY KEY,
  entry_date   DATE          NOT NULL,
  voucher_type voucher_type  NOT NULL,
  narration    TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Entry lines (voucher detail)
CREATE TABLE IF NOT EXISTS entry_lines (
  id                UUID PRIMARY KEY,
  entry_id          UUID          NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  debit_ledger_id   UUID          NOT NULL REFERENCES ledgers(id),
  credit_ledger_id  UUID          NOT NULL REFERENCES ledgers(id),
  amount            NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  narration         TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_entry_lines_entry_id
  ON entry_lines(entry_id);

CREATE INDEX IF NOT EXISTS idx_entry_lines_debit_ledger
  ON entry_lines(debit_ledger_id);

CREATE INDEX IF NOT EXISTS idx_entry_lines_credit_ledger
  ON entry_lines(credit_ledger_id);
