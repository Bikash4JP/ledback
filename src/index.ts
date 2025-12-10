// src/index.ts
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { testDbConnection } from './db/pool';
import ledgersRouter from './routes/ledgers.routes';
import entriesRouter from './routes/entries.routes';
import transactionsRouter from './routes/transactions.routes';
import authRouter from './routes/auth.routes';
import { ensureDefaultLedgers } from './services/ledgerSeed.service';

const app = express();
const PORT = ENV.PORT;

app.use(
  cors({
    origin: [
      'http://localhost:8081',
      'http://192.168.11.4:8081',
      'exp://192.168.11.4:8081',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 👇 AUTH ENDPOINTS
app.use('/auth', authRouter);

// API routes
app.use('/ledgers', ledgersRouter);
app.use('/entries', entriesRouter);
app.use('/transactions', transactionsRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ledback',
    time: new Date().toISOString(),
  });
});

app.get('/health/db', async (_req, res) => {
  try {
    await testDbConnection();
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('DB health error:', err);
    res.status(500).json({ status: 'error', db: 'failed' });
  }
});

async function start() {
  try {
    console.log('[startup] Testing DB connection...');
    await testDbConnection();
    console.log('[startup] DB OK.');

    console.log('[startup] Ensuring default ledgers...');
    await ensureDefaultLedgers();
    console.log('[startup] Default ledgers ready.');

    app.listen(PORT, () => {
      console.log(`ledback server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
