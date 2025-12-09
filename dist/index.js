"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const pool_1 = require("./db/pool");
const ledgers_routes_1 = __importDefault(require("./routes/ledgers.routes"));
const entries_routes_1 = __importDefault(require("./routes/entries.routes"));
const transactions_routes_1 = __importDefault(require("./routes/transactions.routes"));
const ledgerSeed_service_1 = require("./services/ledgerSeed.service");
const app = (0, express_1.default)();
const PORT = env_1.ENV.PORT;
// ----- CORS setup (for Expo web + mobile) -----
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:8081', // web dev
        'http://192.168.11.4:8081', // expo web from LAN (adjust if IP change)
        'exp://192.168.11.4:8081', // expo go (native)
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
// Body parser
app.use(express_1.default.json());
// (Optional) simple request logger – debug ke liye helpful:
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// API routes
app.use('/ledgers', ledgers_routes_1.default);
app.use('/entries', entries_routes_1.default);
app.use('/transactions', transactions_routes_1.default);
// Basic health
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'ledback',
        time: new Date().toISOString(),
    });
});
// DB health check
app.get('/health/db', async (_req, res) => {
    try {
        await (0, pool_1.testDbConnection)();
        res.json({ status: 'ok', db: 'connected' });
    }
    catch (err) {
        console.error('DB health error:', err);
        res.status(500).json({ status: 'error', db: 'failed' });
    }
});
// ---- startup: db check + default ledgers ----
async function start() {
    try {
        console.log('[startup] Testing DB connection...');
        await (0, pool_1.testDbConnection)();
        console.log('[startup] DB OK.');
        console.log('[startup] Ensuring default ledgers...');
        await (0, ledgerSeed_service_1.ensureDefaultLedgers)();
        console.log('[startup] Default ledgers ready.');
        app.listen(PORT, () => {
            console.log(`ledback server running on http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error('Startup error:', err);
        process.exit(1);
    }
}
start();
