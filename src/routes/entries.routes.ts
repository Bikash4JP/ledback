// src/routes/entries.routes.ts
import { Router, type Request, type Response } from 'express';
import {
  listEntriesHandler,
  createEntryHandler,
  getEntryByIdHandler,
  listTransactionsHandler,
} from '../controllers/entries.controller';
import { pool } from '../db/pool';

const router = Router();

// List all entries (raw)
router.get('/', listEntriesHandler);

// Combined transactions list (flattened)
router.get('/transactions', listTransactionsHandler);

// Create new entry (voucher)
router.post('/', createEntryHandler);

// 🔹 NEW: Delete an entry completely (entry + its lines)
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Entry id is required.' });
  }

  try {
    // Check if entry exists
    const existing = await pool.query(
      'SELECT id FROM entries WHERE id = $1',
      [id],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    await pool.query('BEGIN');

    // First delete child lines
    await pool.query('DELETE FROM entry_lines WHERE entry_id = $1', [id]);

    // Then delete parent entry
    await pool.query('DELETE FROM entries WHERE id = $1', [id]);

    await pool.query('COMMIT');

    // 204 = No Content (success, no body)
    return res.status(204).send();
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('[DELETE /entries/:id] error', err);
    return res.status(500).json({ error: 'Failed to delete entry.' });
  }
});

// Get single entry by id
router.get('/:id', getEntryByIdHandler);

export default router;
