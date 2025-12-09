// src/services/ledgerSeed.service.ts
import { pool } from '../db/pool';
import { DEFAULT_LEDGERS } from '../data/defaultLedgers';
import { randomUUID } from 'crypto';

export async function ensureDefaultLedgers() {
  console.log('[seed] Ensuring default ledgers exist...');

  for (const seed of DEFAULT_LEDGERS) {
    // Check if ledger with same name already exists (case-insensitive)
    const existing = await pool.query(
      'SELECT id FROM ledgers WHERE LOWER(name) = LOWER($1)',
      [seed.name],
    );

    const count = existing.rowCount ?? 0; // <- null safety

    if (count > 0) {
      // Already there → skip
      continue;
    }

    const id = randomUUID();

    // ⚠️ NOTE:
    // Agar tumhare table me column "groupName" camelCase hai,
    // to neeche group_name ki jagah "groupName" likhna hoga:
    //  (id, name, "groupName", nature, is_party, created_at, updated_at)
    await pool.query(
      `INSERT INTO ledgers
        (id, name, group_name, nature, is_party, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [id, seed.name, seed.groupName, seed.nature, seed.isParty],
    );

    console.log('[seed] created:', seed.name);
  }

  console.log('[seed] Default ledgers check completed.');
}
