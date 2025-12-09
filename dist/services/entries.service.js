"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEntryWithLinesById = exports.createEntry = exports.getAllTransactions = exports.getAllEntries = void 0;
const pool_1 = require("../db/pool");
const uuid_1 = require("uuid");
const getAllEntries = async () => {
    const result = await pool_1.pool.query(`SELECT
       id,
       entry_date AS "entryDate",
       voucher_type AS "voucherType",
       narration,
       created_at AS "createdAt"
     FROM entries
     ORDER BY entry_date DESC, created_at DESC`);
    return result.rows;
};
exports.getAllEntries = getAllEntries;
const getAllTransactions = async () => {
    const result = await pool_1.pool.query(`SELECT
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
     ORDER BY e.entry_date ASC, el.created_at ASC`);
    // pg numeric -> JS number
    return result.rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
    }));
};
exports.getAllTransactions = getAllTransactions;
const createEntry = async (input) => {
    if (!input.lines || input.lines.length === 0) {
        throw new Error('At least one line is required');
    }
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        const entryId = (0, uuid_1.v4)();
        // Insert entry header
        await client.query(`INSERT INTO entries (id, entry_date, voucher_type, narration)
       VALUES ($1, $2, $3, $4)`, [entryId, input.date, input.voucherType, input.narration ?? null]);
        // Insert each line
        for (const line of input.lines) {
            if (!line.debitLedgerId || !line.creditLedgerId) {
                throw new Error('Each line must have debitLedgerId and creditLedgerId');
            }
            if (!line.amount || line.amount <= 0) {
                throw new Error('Line amount must be > 0');
            }
            const lineId = (0, uuid_1.v4)();
            await client.query(`INSERT INTO entry_lines (
           id, entry_id, debit_ledger_id, credit_ledger_id, amount, narration
         )
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                lineId,
                entryId,
                line.debitLedgerId,
                line.creditLedgerId,
                line.amount,
                line.narration ?? null,
            ]);
        }
        await client.query('COMMIT');
        // Fetch back header
        const entryResult = await client.query(`SELECT
         id,
         entry_date AS "entryDate",
         voucher_type AS "voucherType",
         narration,
         created_at AS "createdAt"
       FROM entries
       WHERE id = $1`, [entryId]);
        const linesResult = await client.query(`SELECT
         id,
         entry_id AS "entryId",
         debit_ledger_id AS "debitLedgerId",
         credit_ledger_id AS "creditLedgerId",
         amount,
         narration,
         created_at AS "createdAt"
       FROM entry_lines
       WHERE entry_id = $1
       ORDER BY created_at ASC`, [entryId]);
        const entry = entryResult.rows[0];
        const lines = linesResult.rows;
        return { entry, lines };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
};
exports.createEntry = createEntry;
const getEntryWithLinesById = async (id) => {
    // Fetch header
    const entryResult = await pool_1.pool.query(`SELECT
       id,
       entry_date AS "entryDate",
       voucher_type AS "voucherType",
       narration,
       created_at AS "createdAt"
     FROM entries
     WHERE id = $1`, [id]);
    if (entryResult.rowCount === 0) {
        return null;
    }
    const entry = entryResult.rows[0];
    // Fetch lines
    const linesResult = await pool_1.pool.query(`SELECT
       id,
       entry_id AS "entryId",
       debit_ledger_id AS "debitLedgerId",
       credit_ledger_id AS "creditLedgerId",
       amount,
       narration,
       created_at AS "createdAt"
     FROM entry_lines
     WHERE entry_id = $1
     ORDER BY created_at ASC`, [id]);
    const lines = linesResult.rows;
    return { entry, lines };
};
exports.getEntryWithLinesById = getEntryWithLinesById;
