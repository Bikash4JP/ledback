// src/db/pool.ts
import { Pool } from 'pg';
import { ENV } from '../config/env';

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});

// Optional: simple helper to test connection
export const testDbConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
};
