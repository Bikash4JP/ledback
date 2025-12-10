// src/db/pool.ts
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://ledgeruser:Bikash4JP@localhost:5432/ledgerdb';

export const pool = new Pool({
  connectionString,
});

export async function testDbConnection(): Promise<void> {
  const res = await pool.query('SELECT 1');
  console.log('[db] test result:', res.rows[0]);
}
