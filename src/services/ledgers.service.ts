import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import type { VoucherType } from './entries.service';

export type LedgerNature = 'Asset' | 'Liability' | 'Income' | 'Expense';

export type Ledger = {
  id: string;
  name: string;
  groupName: string;
  nature: LedgerNature;
  isParty: boolean;

  isGroup: boolean;
  categoryLedgerId: string | null;

  createdAt: string;
  updatedAt: string;
};

export type LedgerStatementLine = {
  entryId: string;
  date: string;                 // YYYY-MM-DD
  voucherType: VoucherType;
  narration: string | null;
  otherLedgerId: string;
  otherLedgerName: string;
  debit: string;                // numeric as string
  credit: string;
  runningBalance: string;       // abs(balance) as string
  balanceSide: 'Dr' | 'Cr';
};

export const getAllLedgers = async (userEmail?: string): Promise<Ledger[]> => {
  const params: any[] = [];
  let whereClause = '';

  if (userEmail) {
    // Global + user-specific
    whereClause = 'WHERE deleted_at IS NULL AND (user_email IS NULL OR user_email = $1)';
    params.push(userEmail);
  } else {
    // If no user => only global (safe)
    whereClause = 'WHERE deleted_at IS NULL AND user_email IS NULL';
  }

  const result = await pool.query(
    `
    SELECT
      id,
      name,
      group_name AS "groupName",
      nature,
      is_party AS "isParty",
      is_group AS "isGroup",
      category_ledger_id AS "categoryLedgerId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM ledgers
    ${whereClause}
    ORDER BY is_group DESC, name ASC
    `,
    params
  );

  return result.rows;
};

type CreateLedgerInput = {
  name: string;
  groupName: string;
  nature: LedgerNature;
  isParty?: boolean;

  isGroup?: boolean;
  categoryLedgerId?: string | null;
};

export const createLedger = async (
  input: CreateLedgerInput,
  userEmail?: string
): Promise<Ledger> => {
  const id = uuidv4();

  const isParty = input.isParty ?? false;
  const isGroup = input.isGroup ?? false;

  let categoryLedgerId: string | null = input.categoryLedgerId ?? null;

  // Safety: cannot point to itself
  if (categoryLedgerId && categoryLedgerId === id) {
    categoryLedgerId = null;
  }

  const result = await pool.query(
    `
    INSERT INTO ledgers (
      id, name, group_name, nature, is_party,
      is_group, category_ledger_id,
      user_email
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      name,
      group_name AS "groupName",
      nature,
      is_party AS "isParty",
      is_group AS "isGroup",
      category_ledger_id AS "categoryLedgerId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [
      id,
      input.name,
      input.groupName,
      input.nature,
      isParty,
      isGroup,
      categoryLedgerId,
      userEmail ?? null,
    ]
  );

  return result.rows[0];
};

export const getLedgerStatement = async (
  ledgerId: string,
  from?: string,
  to?: string
): Promise<LedgerStatementLine[]> => {
  const ledgerRes = await pool.query(
    `SELECT nature FROM ledgers WHERE id = $1`,
    [ledgerId]
  );

  if (ledgerRes.rowCount === 0) return [];

  const nature = ledgerRes.rows[0].nature as LedgerNature;

  const params: any[] = [ledgerId];
  let dateFilter = '';

  if (from) {
    params.push(from);
    dateFilter += ` AND e.entry_date >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    dateFilter += ` AND e.entry_date <= $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT
      el.entry_id AS "entryId",
      e.entry_date AS "date",
      e.voucher_type AS "voucherType",
      COALESCE(el.narration, e.narration) AS "narration",
      CASE
        WHEN el.debit_ledger_id = $1 THEN el.credit_ledger_id
        ELSE el.debit_ledger_id
      END AS "otherLedgerId",
      ol.name AS "otherLedgerName",
      CASE
        WHEN el.debit_ledger_id = $1 THEN el.amount
        ELSE 0
      END AS "debit",
      CASE
        WHEN el.credit_ledger_id = $1 THEN el.amount
        ELSE 0
      END AS "credit"
    FROM entry_lines el
    JOIN entries e ON e.id = el.entry_id
    JOIN ledgers ol ON ol.id = CASE
      WHEN el.debit_ledger_id = $1 THEN el.credit_ledger_id
      ELSE el.debit_ledger_id
    END
    WHERE (el.debit_ledger_id = $1 OR el.credit_ledger_id = $1)
      ${dateFilter}
    ORDER BY e.entry_date ASC, e.created_at ASC, el.created_at ASC
    `,
    params
  );

  const rows = result.rows;

  let running = 0;
  const isDebitNature = nature === 'Asset' || nature === 'Expense';

  const withBalance: LedgerStatementLine[] = rows.map((row: any) => {
    const debitNum = Number(row.debit);
    const creditNum = Number(row.credit);

    if (isDebitNature) {
      running += debitNum - creditNum;
    } else {
      running += creditNum - debitNum;
    }

    const abs = Math.abs(running);
    const side: 'Dr' | 'Cr' =
      abs === 0
        ? (isDebitNature ? 'Dr' : 'Cr')
        : running >= 0
        ? (isDebitNature ? 'Dr' : 'Cr')
        : (isDebitNature ? 'Cr' : 'Dr');

    return {
      entryId: row.entryId,
      date: row.date,
      voucherType: row.voucherType,
      narration: row.narration,
      otherLedgerId: row.otherLedgerId,
      otherLedgerName: row.otherLedgerName,
      debit: row.debit,
      credit: row.credit,
      runningBalance: abs.toFixed(2),
      balanceSide: side,
    };
  });

  return withBalance;
};
