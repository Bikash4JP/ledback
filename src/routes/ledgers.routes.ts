import { Router } from 'express';
import {
  listLedgers,
  createLedgerHandler,
  getLedgerStatementHandler,
} from '../controllers/ledgers.controller';

const router = Router();

// GET /ledgers
router.get('/', listLedgers);

// GET /ledgers/:id/statement
router.get('/:id/statement', getLedgerStatementHandler);

// POST /ledgers
router.post('/', createLedgerHandler);

export default router;
