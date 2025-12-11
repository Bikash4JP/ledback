// ledback/src/routes/transactions.routes.ts
import { Router } from 'express';
import { listTransactionsHandler } from '../controllers/entries.controller';

const router = Router();

// GET /transactions  -> returns all transactions for current user_email
router.get('/', listTransactionsHandler);

export default router;
