// src/services/otp.service.ts
import crypto from 'crypto';
import { pool } from '../db/pool';

export type OtpPurpose = 'login' | 'reset';

const OTP_TTL_MINUTES = 10; // 10 minute valid
const MAX_ATTEMPTS = 5;

// Simple SHA-256 hash for OTP
const hashOtpCode = (code: string): string =>
  crypto.createHash('sha256').update(code).digest('hex');

// 👉 OTP generate + DB me save
export async function issueOtpForUser(
  userId: string,
  purpose: OtpPurpose,
): Promise<{ code: string; expiresAt: Date }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Purane OTP (same purpose) clean karo
    await client.query(
      'DELETE FROM public.user_otps WHERE user_id = $1 AND purpose = $2',
      [userId, purpose],
    );

    // 6 digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(
      Date.now() + OTP_TTL_MINUTES * 60 * 1000,
    );

    await client.query(
      `
        INSERT INTO public.user_otps (user_id, purpose, code_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [userId, purpose, codeHash, expiresAt],
    );

    await client.query('COMMIT');

    return { code, expiresAt };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export type VerifyOtpResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'NO_OTP' | 'EXPIRED' | 'INVALID' | 'TOO_MANY_ATTEMPTS';
    };

// 👉 OTP verify + attempts + expiry handle
export async function verifyOtpForUser(
  userId: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyOtpResult> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
        SELECT id, code_hash, expires_at, consumed_at, attempt_count
        FROM public.user_otps
        WHERE user_id = $1
          AND purpose = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId, purpose],
    );

    if (rows.length === 0) {
      return { ok: false, reason: 'NO_OTP' };
    }

    const otp = rows[0] as {
      id: string;
      code_hash: string;
      expires_at: Date;
      consumed_at: Date | null;
      attempt_count: number;
    };

    if (otp.consumed_at) {
      return { ok: false, reason: 'NO_OTP' };
    }

    const now = new Date();
    if (now > new Date(otp.expires_at)) {
      await client.query(
        `
          UPDATE public.user_otps
          SET consumed_at = now()
          WHERE id = $1
        `,
        [otp.id],
      );
      return { ok: false, reason: 'EXPIRED' };
    }

    if (otp.attempt_count >= MAX_ATTEMPTS) {
      await client.query(
        `
          UPDATE public.user_otps
          SET consumed_at = now()
          WHERE id = $1
        `,
        [otp.id],
      );
      return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
    }

    const hashed = hashOtpCode(code);

    if (hashed !== otp.code_hash) {
      const newCount = otp.attempt_count + 1;
      const shouldConsume = newCount >= MAX_ATTEMPTS;

      await client.query(
        `
          UPDATE public.user_otps
          SET attempt_count = $2,
              consumed_at = CASE WHEN $3 THEN now() ELSE consumed_at END
          WHERE id = $1
        `,
        [otp.id, newCount, shouldConsume],
      );

      return { ok: false, reason: 'INVALID' };
    }

    // ✅ success
    await client.query(
      `
        UPDATE public.user_otps
        SET attempt_count = attempt_count + 1,
            consumed_at = now()
        WHERE id = $1
      `,
      [otp.id],
    );

    return { ok: true };
  } finally {
    client.release();
  }
}
