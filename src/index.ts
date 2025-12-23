// src/index.ts
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { testDbConnection } from './db/pool';
import ledgersRouter from './routes/ledgers.routes';
import entriesRouter from './routes/entries.routes';
import transactionsRouter from './routes/transactions.routes';
import authRouter from './routes/auth.routes';
import debugEmailRouter from './routes/debugEmail.routes'; // 👈 NEW
import { ensureDefaultLedgers } from './services/ledgerSeed.service';
import syncRouter from "./routes/sync.routes";


const app = express();

// ✅ PORT ko number bana diya (default 4000)
const PORT: number = ENV.PORT ? Number(ENV.PORT) : 4000;
const HOST = '0.0.0.0';

// 🔹 CORS: allow requests from anywhere (mobile app / other networks)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.use(express.json());

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/sync", syncRouter);

// 👇 AUTH ENDPOINTS
app.use('/auth', authRouter);

// 👇 DEBUG EMAIL ENDPOINTS (for testing SMTP)
app.use('/debug-email', debugEmailRouter);

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

// 🔹 Startup: DB check + seed + start server on 0.0.0.0
(async () => {
  try {
    console.log('[startup] Testing DB connection...');
    await testDbConnection();
    console.log('[startup] DB OK.');

    console.log('[startup] Ensuring default ledgers...');
    await ensureDefaultLedgers();
    console.log('[startup] Default ledgers ready.');

    app.listen(PORT, HOST, () => {
      console.log(`ledback server running on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('[startup] Failed to start server', err);
    process.exit(1);
  }
})();
