import { pool } from "../db/pool"; // adjust path if yours is different

type UUID = string;

type LedgerRow = {
  id: UUID;
  name: string;
  group_name: string;
  nature: string;
  is_party: boolean;
  user_email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type EntryRow = {
  id: UUID;
  entry_date: string;
  narration: string | null;
  voucher_type: string;
  user_email: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type EntryLineRow = {
  id: UUID;
  entry_id: UUID;
  debit_ledger_id: UUID;
  credit_ledger_id: UUID;
  amount: string; // numeric from pg comes as string
  narration: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DeleteRow = { id: UUID; deleted_at: string; updated_at: string };

function isoNow() {
  return new Date().toISOString();
}

function requireArray<T>(x: any, name: string): T[] {
  if (!x) return [];
  if (!Array.isArray(x)) throw new Error(`${name} must be an array`);
  return x as T[];
}

/**
 * GET /sync/pull?since=ISO
 */
export async function pullChanges(email: string, since: Date) {
  const sinceIso = since.toISOString();
  const serverTime = isoNow();

  const client = await pool.connect();
  try {
    // 1) changed (non-deleted) ledgers
    const ledgers = await client.query<LedgerRow>(
      `
      SELECT *
      FROM ledgers
      WHERE (user_email = $1 OR user_email IS NULL)
        AND updated_at > $2
        AND deleted_at IS NULL
      ORDER BY updated_at ASC
      `,
      [email, sinceIso]
    );

    // 2) deleted ledgers (only user-owned)
    const ledgersDeleted = await client.query<DeleteRow>(
      `
      SELECT id, deleted_at, updated_at
      FROM ledgers
      WHERE user_email = $1
        AND deleted_at IS NOT NULL
        AND deleted_at > $2
      ORDER BY deleted_at ASC
      `,
      [email, sinceIso]
    );

    // 3) changed (non-deleted) entries
    const entries = await client.query<EntryRow>(
      `
      SELECT *
      FROM entries
      WHERE user_email = $1
        AND updated_at > $2
        AND deleted_at IS NULL
      ORDER BY updated_at ASC
      `,
      [email, sinceIso]
    );

    // 4) deleted entries
    const entriesDeleted = await client.query<DeleteRow>(
      `
      SELECT id, deleted_at, updated_at
      FROM entries
      WHERE user_email = $1
        AND deleted_at IS NOT NULL
        AND deleted_at > $2
      ORDER BY deleted_at ASC
      `,
      [email, sinceIso]
    );

    // 5) changed (non-deleted) entry_lines for user entries
    const entryLines = await client.query<EntryLineRow>(
      `
      SELECT l.*
      FROM entry_lines l
      JOIN entries e ON e.id = l.entry_id
      WHERE e.user_email = $1
        AND e.deleted_at IS NULL
        AND l.updated_at > $2
        AND l.deleted_at IS NULL
      ORDER BY l.updated_at ASC
      `,
      [email, sinceIso]
    );

    // 6) deleted entry_lines (optional, but good for correctness)
    const entryLinesDeleted = await client.query<DeleteRow>(
      `
      SELECT l.id, l.deleted_at, l.updated_at
      FROM entry_lines l
      JOIN entries e ON e.id = l.entry_id
      WHERE e.user_email = $1
        AND l.deleted_at IS NOT NULL
        AND l.deleted_at > $2
      ORDER BY l.deleted_at ASC
      `,
      [email, sinceIso]
    );

    return {
      cursor: serverTime, // client should store as lastSyncAt
      ledgers: ledgers.rows,
      entries: entries.rows,
      entry_lines: entryLines.rows,
      deleted: {
        ledgers: ledgersDeleted.rows,
        entries: entriesDeleted.rows,
        entry_lines: entryLinesDeleted.rows,
      },
    };
  } finally {
    client.release();
  }
}

/**
 * POST /sync/push
 * body:
 * {
 *   ledgersUpsert: LedgerRowLike[],
 *   entriesUpsert: EntryRowLike[],
 *   entryLinesUpsert: EntryLineRowLike[],
 *   deletes: [{table:"entries"|"ledgers"|"entry_lines", id, deleted_at?}]
 * }
 */
export async function applyPushBatch(email: string, body: any) {
  const ledgersUpsert = requireArray<any>(body?.ledgersUpsert, "ledgersUpsert");
  const entriesUpsert = requireArray<any>(body?.entriesUpsert, "entriesUpsert");
  const entryLinesUpsert = requireArray<any>(body?.entryLinesUpsert, "entryLinesUpsert");
  const deletes = requireArray<any>(body?.deletes, "deletes");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Upsert ledgers (user ledgers only; block default/global edits)
    for (const l of ledgersUpsert) {
      if (!l?.id || !l?.name) throw new Error("Ledger upsert requires id + name");
      // force ownership to current user
      const user_email = email;

      await client.query(
        `
        INSERT INTO ledgers (id, name, group_name, nature, is_party, user_email, created_at, updated_at, deleted_at)
        VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, now()), COALESCE($8, now()), NULL)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          group_name = EXCLUDED.group_name,
          nature = EXCLUDED.nature,
          is_party = EXCLUDED.is_party,
          user_email = EXCLUDED.user_email,
          updated_at = GREATEST(ledgers.updated_at, EXCLUDED.updated_at),
          deleted_at = NULL
        `,
        [
          l.id,
          l.name,
          l.group_name ?? "Assets",
          l.nature ?? "Asset",
          !!l.is_party,
          user_email,
          l.created_at ?? null,
          l.updated_at ?? null,
        ]
      );
    }

    // 2) Upsert entries
    for (const e of entriesUpsert) {
      if (!e?.id || !e?.entry_date || !e?.voucher_type) {
        throw new Error("Entry upsert requires id + entry_date + voucher_type");
      }

      const tags = Array.isArray(e.tags) ? e.tags : [];

      await client.query(
        `
        INSERT INTO entries (id, entry_date, narration, voucher_type, user_email, tags, created_at, updated_at, deleted_at)
        VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, now()), COALESCE($8, now()), NULL)
        ON CONFLICT (id) DO UPDATE SET
          entry_date = EXCLUDED.entry_date,
          narration = EXCLUDED.narration,
          voucher_type = EXCLUDED.voucher_type,
          user_email = EXCLUDED.user_email,
          tags = EXCLUDED.tags,
          updated_at = GREATEST(entries.updated_at, EXCLUDED.updated_at),
          deleted_at = NULL
        `,
        [
          e.id,
          e.entry_date,
          e.narration ?? null,
          e.voucher_type,
          email, // force to current user
          tags,
          e.created_at ?? null,
          e.updated_at ?? null,
        ]
      );
    }

    // 3) Upsert entry_lines (must belong to user's entry)
    for (const l of entryLinesUpsert) {
      if (!l?.id || !l?.entry_id) throw new Error("EntryLine upsert requires id + entry_id");

      // Ensure entry belongs to user (or exists in same tx)
      const chk = await client.query(
        `SELECT 1 FROM entries WHERE id = $1 AND user_email = $2 AND deleted_at IS NULL`,
        [l.entry_id, email]
      );
      if (chk.rowCount === 0) {
        throw new Error(`EntryLine refers to missing/unauthorized entry_id: ${l.entry_id}`);
      }

      await client.query(
        `
        INSERT INTO entry_lines (id, entry_id, debit_ledger_id, credit_ledger_id, amount, narration, created_at, updated_at, deleted_at)
        VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, now()), COALESCE($8, now()), NULL)
        ON CONFLICT (id) DO UPDATE SET
          entry_id = EXCLUDED.entry_id,
          debit_ledger_id = EXCLUDED.debit_ledger_id,
          credit_ledger_id = EXCLUDED.credit_ledger_id,
          amount = EXCLUDED.amount,
          narration = EXCLUDED.narration,
          updated_at = GREATEST(entry_lines.updated_at, EXCLUDED.updated_at),
          deleted_at = NULL
        `,
        [
          l.id,
          l.entry_id,
          l.debit_ledger_id,
          l.credit_ledger_id,
          l.amount,
          l.narration ?? null,
          l.created_at ?? null,
          l.updated_at ?? null,
        ]
      );
    }

    // 4) Deletes (soft delete)
    for (const d of deletes) {
      if (!d?.table || !d?.id) throw new Error("delete requires table + id");
      const deletedAt = d.deleted_at ? new Date(d.deleted_at) : new Date();

      if (d.table === "entries") {
        // mark entry deleted
        await client.query(
          `UPDATE entries SET deleted_at = $1, updated_at = now()
           WHERE id = $2 AND user_email = $3`,
          [deletedAt.toISOString(), d.id, email]
        );
        // mark lines deleted too
        await client.query(
          `UPDATE entry_lines SET deleted_at = $1, updated_at = now()
           WHERE entry_id = $2`,
          [deletedAt.toISOString(), d.id]
        );
      } else if (d.table === "ledgers") {
        await client.query(
          `UPDATE ledgers SET deleted_at = $1, updated_at = now()
           WHERE id = $2 AND user_email = $3`,
          [deletedAt.toISOString(), d.id, email]
        );
      } else if (d.table === "entry_lines") {
        // ensure belongs to user's entry
        const chk = await client.query(
          `
          SELECT 1
          FROM entry_lines l
          JOIN entries e ON e.id = l.entry_id
          WHERE l.id = $1 AND e.user_email = $2
          `,
          [d.id, email]
        );
        if (chk.rowCount === 0) throw new Error("Unauthorized entry_line delete");

        await client.query(
          `UPDATE entry_lines SET deleted_at = $1, updated_at = now()
           WHERE id = $2`,
          [deletedAt.toISOString(), d.id]
        );
      } else {
        throw new Error(`Unsupported delete table: ${d.table}`);
      }
    }

    await client.query("COMMIT");

    return { ok: true, serverTime: isoNow() };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
