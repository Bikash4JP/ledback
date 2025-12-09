"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultLedgers = ensureDefaultLedgers;
// src/services/ledgerSeed.service.ts
const pool_1 = require("../db/pool");
const defaultLedgers_1 = require("../data/defaultLedgers");
const crypto_1 = require("crypto");
async function ensureDefaultLedgers() {
    console.log('[seed] Ensuring default ledgers exist...');
    for (const seed of defaultLedgers_1.DEFAULT_LEDGERS) {
        // Check if ledger with same name already exists (case-insensitive)
        const existing = await pool_1.pool.query('SELECT id FROM ledgers WHERE LOWER(name) = LOWER($1)', [seed.name]);
        const count = existing.rowCount ?? 0; // <- null safety
        if (count > 0) {
            // Already there → skip
            continue;
        }
        const id = (0, crypto_1.randomUUID)();
        // ⚠️ NOTE:
        // Agar tumhare table me column "groupName" camelCase hai,
        // to neeche group_name ki jagah "groupName" likhna hoga:
        //  (id, name, "groupName", nature, is_party, created_at, updated_at)
        await pool_1.pool.query(`INSERT INTO ledgers
        (id, name, group_name, nature, is_party, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`, [id, seed.name, seed.groupName, seed.nature, seed.isParty]);
        console.log('[seed] created:', seed.name);
    }
    console.log('[seed] Default ledgers check completed.');
}
