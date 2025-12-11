// ledback/src/routes/entries.routes.ts
import { Router } from 'express';
import {
  listEntriesHandler,
  createEntryHandler,
  getEntryByIdHandler,
  listTransactionsHandler,
} from '../controllers/entries.controller';

const router = Router();

router.get('/', listEntriesHandler);
router.get('/transactions', listTransactionsHandler);
router.post('/', createEntryHandler);
router.get('/:id', getEntryByIdHandler);

export default router;
