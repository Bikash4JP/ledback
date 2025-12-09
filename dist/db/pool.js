"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDbConnection = exports.pool = void 0;
const pg_1 = require("pg");
const env_1 = require("../config/env");
exports.pool = new pg_1.Pool({
    connectionString: env_1.ENV.DATABASE_URL,
});
// Optional: simple helper to test connection
const testDbConnection = async () => {
    const client = await exports.pool.connect();
    try {
        await client.query('SELECT 1');
    }
    finally {
        client.release();
    }
};
exports.testDbConnection = testDbConnection;
