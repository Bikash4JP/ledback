// src/routes/transactions.routes.ts
import { Router } from 'express';
import { listTransactions } from '../controllers/entries.controller';

const router = Router();

// GET /transactions
router.get('/', listTransactions);

export default router;
