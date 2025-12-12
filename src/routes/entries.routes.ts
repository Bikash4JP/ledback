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

router.get('/', listEntriesHandler);
router.get('/transactions', listTransactionsHandler);
router.post('/', createEntryHandler);
router.get('/:id', getEntryByIdHandler);

// DELETE /entries/:id  → entry + lines delete
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Entry id is required.' });
  }

  try {
    // Check entry exists
    const byEntry = await pool.query(
      'SELECT id FROM entries WHERE id = $1',
      [id],
    );

    if (!byEntry || (byEntry.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    // Delete child lines first
    await pool.query(
      'DELETE FROM entry_lines WHERE entry_id = $1',
      [id],
    );

    // Then delete entry
    await pool.query('DELETE FROM entries WHERE id = $1', [id]);

    return res.status(204).send();
  } catch (err) {
    console.error('[DELETE /entries/:id] error', err);
    return res.status(500).json({ error: 'Failed to delete entry.' });
  }
});

export default router;
