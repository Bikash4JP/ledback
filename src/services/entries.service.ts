import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';

export type VoucherType = 'Journal' | 'Payment' | 'Receipt' | 'Contra' | 'Transfer';
export type Transaction = {
  id: string;
  entryId: string;
  date: string;          // YYYY-MM-DD
  voucherType: VoucherType;
  debitLedgerId: string;
  creditLedgerId: string;
  amount: number;
  narration: string | null;
  createdAt: string;
};


export type Entry = {
  id: string;
  entryDate: string;      // YYYY-MM-DD
  voucherType: VoucherType;
  narration: string | null;
  createdAt: string;
};

export const getAllEntries = async (): Promise<Entry[]> => {
  const result = await pool.query(
    `SELECT
       id,
       entry_date AS "entryDate",
       voucher_type AS "voucherType",
       narration,
       created_at AS "createdAt"
     FROM entries
     ORDER BY entry_date DESC, created_at DESC`
  );

  return result.rows;
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  const result = await pool.query(
    `SELECT
       el.id,
       el.entry_id AS "entryId",
       e.entry_date AS "date",
       e.voucher_type AS "voucherType",
       el.debit_ledger_id AS "debitLedgerId",
       el.credit_ledger_id AS "creditLedgerId",
       el.amount,
       COALESCE(el.narration, e.narration) AS "narration",
       el.created_at AS "createdAt"
     FROM entry_lines el
     JOIN entries e
       ON e.id = el.entry_id
     ORDER BY e.entry_date ASC, el.created_at ASC`
  );

  // pg numeric -> JS number
  return result.rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
};

// One DB line: one pair of debit + credit ledger
export type EntryLine = {
  id: string;
  entryId: string;
  debitLedgerId: string;
  creditLedgerId: string;
  amount: number;
  narration: string | null;
  createdAt: string;
};

// Input format for creating entry
export type EntryLineInput = {
  debitLedgerId: string;
  creditLedgerId: string;
  amount: number;
  narration?: string;
};

export type CreateEntryInput = {
  date: string;                // YYYY-MM-DD
  voucherType: VoucherType;
  narration?: string;
  lines: EntryLineInput[];
};

export type EntryWithLines = {
  entry: Entry;
  lines: EntryLine[];
};

export const createEntry = async (input: CreateEntryInput): Promise<EntryWithLines> => {
  if (!input.lines || input.lines.length === 0) {
    throw new Error('At least one line is required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const entryId = uuidv4();

    // Insert entry header
    await client.query(
      `INSERT INTO entries (id, entry_date, voucher_type, narration)
       VALUES ($1, $2, $3, $4)`,
      [entryId, input.date, input.voucherType, input.narration ?? null]
    );

    // Insert each line
    for (const line of input.lines) {
      if (!line.debitLedgerId || !line.creditLedgerId) {
        throw new Error('Each line must have debitLedgerId and creditLedgerId');
      }
      if (!line.amount || line.amount <= 0) {
        throw new Error('Line amount must be > 0');
      }

      const lineId = uuidv4();
      await client.query(
        `INSERT INTO entry_lines (
           id, entry_id, debit_ledger_id, credit_ledger_id, amount, narration
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          lineId,
          entryId,
          line.debitLedgerId,
          line.creditLedgerId,
          line.amount,
          line.narration ?? null,
        ]
      );
    }

    await client.query('COMMIT');

    // Fetch back header
    const entryResult = await client.query(
      `SELECT
         id,
         entry_date AS "entryDate",
         voucher_type AS "voucherType",
         narration,
         created_at AS "createdAt"
       FROM entries
       WHERE id = $1`,
      [entryId]
    );

    const linesResult = await client.query(
      `SELECT
         id,
         entry_id AS "entryId",
         debit_ledger_id AS "debitLedgerId",
         credit_ledger_id AS "creditLedgerId",
         amount,
         narration,
         created_at AS "createdAt"
       FROM entry_lines
       WHERE entry_id = $1
       ORDER BY created_at ASC`,
      [entryId]
    );

    const entry: Entry = entryResult.rows[0];
    const lines: EntryLine[] = linesResult.rows;

    return { entry, lines };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
export const getEntryWithLinesById = async (id: string): Promise<EntryWithLines | null> => {
  // Fetch header
  const entryResult = await pool.query(
    `SELECT
       id,
       entry_date AS "entryDate",
       voucher_type AS "voucherType",
       narration,
       created_at AS "createdAt"
     FROM entries
     WHERE id = $1`,
    [id]
  );

  if (entryResult.rowCount === 0) {
    return null;
  }

  const entry: Entry = entryResult.rows[0];

  // Fetch lines
  const linesResult = await pool.query(
    `SELECT
       id,
       entry_id AS "entryId",
       debit_ledger_id AS "debitLedgerId",
       credit_ledger_id AS "creditLedgerId",
       amount,
       narration,
       created_at AS "createdAt"
     FROM entry_lines
     WHERE entry_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  const lines: EntryLine[] = linesResult.rows;

  return { entry, lines };
};
