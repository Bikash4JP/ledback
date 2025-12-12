// src/routes/ledgers.routes.ts
import { Router, type Request, type Response } from 'express';
import { pool } from '../db/pool';
import {
  listLedgers,
  createLedgerHandler,
  getLedgerStatementHandler,
} from '../controllers/ledgers.controller';

const router = Router();

// List all ledgers
router.get('/', listLedgers);

// Create new ledger
router.post('/', createLedgerHandler);

// Existing: ledger statement (date range)
router.get('/:id/statement', getLedgerStatementHandler);

// Get single ledger by id (for master edit screen)
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Ledger id is required.' });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        group_name AS "groupName",
        nature,
        is_party AS "isParty",
        created_at,
        updated_at
      FROM ledgers
      WHERE id = $1
      `,
      [id],
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Ledger not found.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[GET /ledgers/:id] error', err);
    return res.status(500).json({ error: 'Failed to fetch ledger.' });
  }
});

// Update ledger master (name, group, nature, isParty)
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, groupName, nature, isParty } = req.body ?? {};

  if (!id) {
    return res.status(400).json({ error: 'Ledger id is required.' });
  }

  if (!name || !groupName || !nature) {
    return res.status(400).json({
      error: 'name, groupName and nature are required.',
    });
  }

  const allowedNature = ['Asset', 'Liability', 'Income', 'Expense'];
  if (!allowedNature.includes(nature)) {
    return res.status(400).json({
      error: `Invalid nature. Allowed: ${allowedNature.join(', ')}`,
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE ledgers
      SET
        name      = $1,
        group_name = $2,
        nature    = $3,
        is_party  = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        id,
        name,
        group_name AS "groupName",
        nature,
        is_party AS "isParty",
        created_at,
        updated_at
      `,
      [name, groupName, nature, !!isParty, id],
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Ledger not found.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /ledgers/:id] error', err);
    return res.status(500).json({ error: 'Failed to update ledger.' });
  }
});

// Delete ledger (only if no entries exist)
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Ledger id is required.' });
  }

  try {
    // Check if ledger is used in any entry_lines
    const usage = await pool.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM entry_lines
      WHERE debit_ledger_id = $1
         OR credit_ledger_id = $1
      `,
      [id],
    );

    const cnt = usage.rows[0]?.cnt ?? 0;

    if (cnt > 0) {
      return res.status(400).json({
        error:
          'This ledger has entries and cannot be deleted. Please delete/reverse entries first.',
      });
    }

    const del = await pool.query('DELETE FROM ledgers WHERE id = $1', [id]);

    if ((del.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Ledger not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('[DELETE /ledgers/:id] error', err);
    return res.status(500).json({ error: 'Failed to delete ledger.' });
  }
});

export default router;
