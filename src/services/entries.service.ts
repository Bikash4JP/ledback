// ledback/src/services/entries.service.ts
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

export type EntryLine = {
  id: string;
  entryId: string;
  debitLedgerId: string;
  creditLedgerId: string;
  amount: number;
  narration: string | null;
  createdAt: string;
};

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

/**
 * Helpers
 */
function requireEmail(userEmail: string | null | undefined): string {
  if (!userEmail || !userEmail.trim()) {
    throw new Error('User email is required for entries');
  }
  return userEmail.trim();
}

/**
 * Get all entries ONLY for given user_email
 */
export const getAllEntries = async (userEmail: string): Promise<Entry[]> => {
  const email = requireEmail(userEmail);

  const result = await pool.query(
    `SELECT
       id,
       entry_date AS "entryDate",
       voucher_type AS "voucherType",
       narration,
       created_at AS "createdAt"
     FROM entries
     WHERE user_email = $1
     ORDER BY entry_date DESC, created_at DESC`,
    [email],
  );

  return result.rows;
};

/**
 * Get all transactions (joined entry_lines + entries) ONLY for given user_email
 */
export const getAllTransactions = async (userEmail: string): Promise<Transaction[]> => {
  const email = requireEmail(userEmail);

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
     WHERE e.user_email = $1
     ORDER BY e.entry_date ASC, el.created_at ASC`,
    [email],
  );

  return result.rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
};

/**
 * Create entry + lines for this user_email only
 */
export const createEntry = async (
  input: CreateEntryInput,
  userEmail: string,
): Promise<EntryWithLines> => {
  const email = requireEmail(userEmail);

  if (!input.lines || input.lines.length === 0) {
    throw new Error('At least one line is required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const entryId = uuidv4();

    await client.query(
      `INSERT INTO entries (
         id,
         entry_date,
         voucher_type,
         narration,
         user_email
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [entryId, input.date, input.voucherType, input.narration ?? null, email],
    );

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
           id,
           entry_id,
           debit_ledger_id,
           credit_ledger_id,
           amount,
           narration
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          lineId,
          entryId,
          line.debitLedgerId,
          line.creditLedgerId,
          line.amount,
          line.narration ?? null,
        ],
      );
    }

    await client.query('COMMIT');

    const entryResult = await client.query(
      `SELECT
         id,
         entry_date AS "entryDate",
         voucher_type AS "voucherType",
         narration,
         created_at AS "createdAt"
       FROM entries
       WHERE id = $1
         AND user_email = $2`,
      [entryId, email],
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
      [entryId],
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

/**
 * Get one entry + lines BY ID but only if it belongs to this user_email
 */
export const getEntryWithLinesById = async (
  id: string,
  userEmail: string,
): Promise<EntryWithLines | null> => {
  const email = requireEmail(userEmail);

  const entryResult = await pool.query(
    `SELECT
       id,
       entry_date AS "entryDate",
       voucher_type AS "voucherType",
       narration,
       created_at AS "createdAt"
     FROM entries
     WHERE id = $1
       AND user_email = $2`,
    [id, email],
  );

  if (entryResult.rowCount === 0) {
    return null;
  }

  const entry: Entry = entryResult.rows[0];

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
    [id],
  );

  const lines: EntryLine[] = linesResult.rows;

  return { entry, lines };
};
