// src/services/ledgers.service.ts
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
  debit: string;                // numeric(18,2) as string from pg
  credit: string;
  runningBalance: string;       // cumulative balance as string
  balanceSide: 'Dr' | 'Cr';     // current side of balance
};

// 👇 ab ye function optional userEmail accept karega
export const getAllLedgers = async (
  userEmail?: string
): Promise<Ledger[]> => {
  const params: any[] = [];
  let whereClause = '';

  if (userEmail) {
    // Global + user-specific dono dikhao:
    // - global rows: user_email IS NULL
    // - user rows:  user_email = $1
    whereClause = 'WHERE user_email IS NULL OR user_email = $1';
    params.push(userEmail);
  }

  const result = await pool.query(
    `
    SELECT
      id,
      name,
      group_name AS "groupName",
      nature,
      is_party AS "isParty",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM ledgers
    ${whereClause}
    ORDER BY name ASC
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
};

export const createLedger = async (
  input: CreateLedgerInput,
  userEmail?: string
): Promise<Ledger> => {
  const id = uuidv4();
  const isParty = input.isParty ?? false;

  const result = await pool.query(
    `
    INSERT INTO ledgers (id, name, group_name, nature, is_party, user_email)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      name,
      group_name AS "groupName",
      nature,
      is_party AS "isParty",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [id, input.name, input.groupName, input.nature, isParty, userEmail ?? null]
  );

  return result.rows[0];
};

export const getLedgerStatement = async (
  ledgerId: string,
  from?: string,
  to?: string
): Promise<LedgerStatementLine[]> => {
  // 1) Get ledger nature (Asset/Liability/Income/Expense)
  const ledgerRes = await pool.query(
    `SELECT nature FROM ledgers WHERE id = $1`,
    [ledgerId]
  );

  if (ledgerRes.rowCount === 0) {
    // unknown ledger -> no rows
    return [];
  }

  const nature = ledgerRes.rows[0].nature as LedgerNature;

  // 2) Build date filters
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

  // 3) Fetch raw movements
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
    JOIN entries e
      ON e.id = el.entry_id
    JOIN ledgers ol
      ON ol.id = CASE
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

  // 4) Compute running balance per row
  let running = 0; // internal numeric running balance

  const isDebitNature = nature === 'Asset' || nature === 'Expense';

  const withBalance: LedgerStatementLine[] = rows.map((row: any) => {
    const debitNum = Number(row.debit);
    const creditNum = Number(row.credit);

    // Movement direction depends on nature:
    // For Asset/Expense: Dr increases, Cr decreases
    // For Liability/Income: Cr increases, Dr decreases
    if (isDebitNature) {
      running += debitNum - creditNum;
    } else {
      running += creditNum - debitNum;
    }

    const abs = Math.abs(running);
    const side: 'Dr' | 'Cr' =
      abs === 0
        ? (isDebitNature ? 'Dr' : 'Cr') // zero balance default side
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
