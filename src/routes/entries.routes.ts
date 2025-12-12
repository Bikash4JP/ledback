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

// 🔹 Delete an entry completely (entry + its lines)
// Param id ho sakta hai:
//  - ya to entries.id
//  - ya entry_lines.id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Entry id is required.' });
  }

  try {
    await pool.query('BEGIN');

    let entryId: string | null = null;

    // 1) Pehle entries table me direct id se try karo
    const byEntry = await pool.query(
      'SELECT id FROM entries WHERE id = $1',
      [id],
    );

    const entryRowCount = byEntry.rowCount ?? 0;
    if (entryRowCount > 0) {
      // Ye direct entries.id hai
      entryId = byEntry.rows[0].id as string;
    } else {
      // 2) Nahi mila → shayad ye entry_lines.id hai
      const byLine = await pool.query(
        'SELECT entry_id FROM entry_lines WHERE id = $1',
        [id],
      );

      const lineRowCount = byLine.rowCount ?? 0;
      if (lineRowCount === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Entry not found.' });
      }

      entryId = byLine.rows[0].entry_id as string;
    }

    if (!entryId) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Entry not found.' });
    }

    // 3) Pehle child lines delete
    await pool.query('DELETE FROM entry_lines WHERE entry_id = $1', [entryId]);

    // 4) Fir parent entry delete
    await pool.query('DELETE FROM entries WHERE id = $1', [entryId]);

    await pool.query('COMMIT');

    // 204 = No Content
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
