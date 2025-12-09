import { Router } from 'express';
import {
  listEntries,
  createEntryHandler,
  getEntryByIdHandler,
} from '../controllers/entries.controller';

const router = Router();

// GET /entries
router.get('/', listEntries);

// GET /entries/:id
router.get('/:id', getEntryByIdHandler);

// POST /entries
router.post('/', createEntryHandler);

export default router;
