// src/services/auth.service.ts
import { pool } from '../db/pool';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { sendAppEmail } from '../utils/email';

export type UserRecord = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  businessName: string | null;
  phone: string | null;
  createdAt: string;
};

export type SignupInput = {
  name: string;
  businessName?: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
};

export type LoginInput = {
  usernameOrEmail: string;
  password: string;
};

type UserWithPassword = UserRecord & {
  password_hash: string;
  isEmailVerified: boolean;
};

const generateVerificationToken = (): string =>
  crypto.randomBytes(32).toString('hex');

const generateOtpCode = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);

// ─────────────────────────────
// SIGNUP + VERIFICATION EMAIL
// ─────────────────────────────
export async function signupUser(input: SignupInput): Promise<UserRecord> {
  const {
    name,
    businessName,
    email,
    username,
    password,
    phone,
  } = input;

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedUsername = username.trim();
  const trimmedName = name.trim();

  if (!trimmedEmail || !trimmedUsername || !password.trim() || !trimmedName) {
    throw new Error('MISSING_FIELDS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = generateVerificationToken();
  const expiresAt = addMinutes(
    new Date(),
    ENV.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES,
  );

  const result = await pool.query(
    `INSERT INTO users (
       username,
       email,
       full_name,
       business_name,
       phone,
       password_hash,
       is_email_verified,
       verification_token,
       verification_token_expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
     RETURNING
       id,
       username,
       email,
       full_name       AS "fullName",
       business_name   AS "businessName",
       phone,
       created_at      AS "createdAt"`,
    [
      trimmedUsername,
      trimmedEmail,
      trimmedName,
      businessName ?? null,
      phone ?? null,
      passwordHash,
      verificationToken,
      expiresAt,
    ],
  );

  const user = result.rows[0] as UserRecord;

  // Send verification email (best-effort)
  const verifyUrl = `${ENV.APP_BASE_URL}/auth/verify-email?token=${encodeURIComponent(
    verificationToken,
  )}`;

  const subject = `${ENV.APP_NAME} - Verify your email`;
  const text =
    `Hi ${trimmedName},\n\n` +
    `Please verify your email for ${ENV.APP_NAME} by opening this link:\n` +
    `${verifyUrl}\n\n` +
    `If you didn't create this account, you can ignore this email.\n`;

  const html =
    `<p>Hi ${trimmedName},</p>` +
    `<p>Please verify your email for <strong>${ENV.APP_NAME}</strong> by clicking this link:</p>` +
    `<p><a href="${verifyUrl}">${verifyUrl}</a></p>` +
    `<p>If you didn't create this account, you can ignore this email.</p>`;

  try {
    await sendAppEmail(trimmedEmail, subject, text, html);
  } catch (err) {
    console.error('[email] Failed to send verification email', err);
    // User is created anyway; email resend can be handled later.
  }

  return user;
}

// ─────────────────────────────
// VERIFY EMAIL TOKEN
// ─────────────────────────────
export async function verifyEmailToken(
  token: string,
): Promise<UserRecord> {
  const result = await pool.query(
    `SELECT
       id,
       username,
       email,
       full_name       AS "fullName",
       business_name   AS "businessName",
       phone,
       created_at      AS "createdAt",
       verification_token_expires_at
     FROM users
     WHERE verification_token = $1
       AND verification_token_expires_at IS NOT NULL
       AND verification_token_expires_at > now()
     LIMIT 1`,
    [token],
  );

  if (result.rowCount === 0) {
    throw new Error('INVALID_OR_EXPIRED_TOKEN');
  }

  const user = result.rows[0] as UserRecord & {
    verification_token_expires_at: string;
  };

  await pool.query(
    `UPDATE users
     SET is_email_verified = TRUE,
         verification_token = NULL,
         verification_token_expires_at = NULL
     WHERE id = $1`,
    [user.id],
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    businessName: user.businessName,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

// ─────────────────────────────
// LOGIN STEP 1: password check + send OTP
// ─────────────────────────────
export type LoginStartInput = {
  usernameOrEmail: string;
  password: string;
};

export type LoginStartResult = {
  userId: string;
  email: string;
  isEmailVerified: boolean;
};

export async function startLoginWithPassword(
  input: LoginStartInput,
): Promise<LoginStartResult> {
  const identifier = input.usernameOrEmail.trim().toLowerCase();
  const password = input.password;

  if (!identifier || !password.trim()) {
    throw new Error('MISSING_FIELDS');
  }

  const result = await pool.query(
    `SELECT
       id,
       username,
       email,
       full_name       AS "fullName",
       business_name   AS "businessName",
       phone,
       password_hash,
       created_at      AS "createdAt",
       is_email_verified AS "isEmailVerified"
     FROM users
     WHERE username = $1
        OR LOWER(email) = $1
     LIMIT 1`,
    [identifier],
  );

  if (result.rowCount === 0) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const row = result.rows[0] as UserWithPassword;

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!row.isEmailVerified) {
    const err: any = new Error('Email not verified');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  // Generate OTP
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = addMinutes(new Date(), ENV.OTP_EXPIRY_MINUTES);

  await pool.query(
    `INSERT INTO user_otps (
       user_id,
       purpose,
       code_hash,
       expires_at
     )
     VALUES ($1, $2, $3, $4)`,
    [row.id, 'login', codeHash, expiresAt],
  );

  const subject = `${ENV.APP_NAME} login code`;
  const text =
    `Your ${ENV.APP_NAME} login code is ${code}.\n` +
    `It will expire in ${ENV.OTP_EXPIRY_MINUTES} minutes.\n`;

  const html =
    `<p>Your <strong>${ENV.APP_NAME}</strong> login code is:</p>` +
    `<p><strong style="font-size:20px;">${code}</strong></p>` +
    `<p>This code will expire in ${ENV.OTP_EXPIRY_MINUTES} minutes.</p>`;

  try {
    await sendAppEmail(row.email, subject, text, html);
  } catch (err) {
    console.error('[email] Failed to send login code', err);
    throw new Error('Failed to send login code. Please try again.');
  }

  return {
    userId: row.id,
    email: row.email,
    isEmailVerified: row.isEmailVerified,
  };
}

// ─────────────────────────────
// LOGIN STEP 2: verify OTP
// ─────────────────────────────
export type LoginVerifyOtpInput = {
  userId: string;
  code: string;
};

export async function verifyLoginOtp(
  input: LoginVerifyOtpInput,
): Promise<UserRecord> {
  const { userId, code } = input;
  const trimmedCode = code.trim();

  if (!userId || !trimmedCode) {
    throw new Error('MISSING_FIELDS');
  }

  const otpResult = await pool.query(
    `SELECT
       id,
       user_id,
       purpose,
       code_hash,
       expires_at,
       consumed_at,
       attempt_count,
       created_at
     FROM user_otps
     WHERE user_id = $1
       AND purpose = 'login'
       AND consumed_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  if (otpResult.rowCount === 0) {
    throw new Error('INVALID_OR_EXPIRED_OTP');
  }

  const otpRow = otpResult.rows[0] as {
    id: string;
    code_hash: string;
    attempt_count: number;
  };

  const isMatch = await bcrypt.compare(trimmedCode, otpRow.code_hash);
  if (!isMatch) {
    const updated = await pool.query(
      `UPDATE user_otps
       SET attempt_count = attempt_count + 1
       WHERE id = $1
       RETURNING attempt_count`,
      [otpRow.id],
    );

    const attempts = updated.rows[0].attempt_count as number;
    if (attempts >= ENV.OTP_MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE user_otps
         SET consumed_at = now()
         WHERE id = $1`,
        [otpRow.id],
      );
      throw new Error('OTP_MAX_ATTEMPTS_EXCEEDED');
    }

    throw new Error('INVALID_OTP_CODE');
  }

  await pool.query(
    `UPDATE user_otps
     SET consumed_at = now()
     WHERE id = $1`,
    [otpRow.id],
  );

  const userResult = await pool.query(
    `SELECT
       id,
       username,
       email,
       full_name       AS "fullName",
       business_name   AS "businessName",
       phone,
       created_at      AS "createdAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  if (userResult.rowCount === 0) {
    throw new Error('USER_NOT_FOUND');
  }

  return userResult.rows[0] as UserRecord;
}

// ─────────────────────────────
// PASSWORD RESET: request OTP
// ─────────────────────────────
export type PasswordResetRequestInput = {
  email: string;
};

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error('MISSING_FIELDS');
  }

  const userResult = await pool.query(
    `SELECT
       id,
       username,
       email,
       full_name       AS "fullName",
       business_name   AS "businessName",
       phone,
       created_at      AS "createdAt"
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [email],
  );

  if (userResult.rowCount === 0) {
    // Security: do nothing, but pretend success
    return;
  }

  const user = userResult.rows[0] as UserRecord;

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = addMinutes(new Date(), ENV.OTP_EXPIRY_MINUTES);

  await pool.query(
    `INSERT INTO user_otps (
       user_id,
       purpose,
       code_hash,
       expires_at
     )
     VALUES ($1, $2, $3, $4)`,
    [user.id, 'reset', codeHash, expiresAt],
  );

  const subject = `${ENV.APP_NAME} password reset code`;
  const text =
    `Hi ${user.fullName || user.username},\n\n` +
    `Your ${ENV.APP_NAME} password reset code is ${code}.\n` +
    `It will expire in ${ENV.OTP_EXPIRY_MINUTES} minutes.\n\n` +
    `If you didn't request this, you can ignore this email.\n`;

  const html =
    `<p>Hi ${user.fullName || user.username},</p>` +
    `<p>Your <strong>${ENV.APP_NAME}</strong> password reset code is:</p>` +
    `<p><strong style="font-size:20px;">${code}</strong></p>` +
    `<p>This code will expire in ${ENV.OTP_EXPIRY_MINUTES} minutes.</p>` +
    `<p>If you didn't request this, you can ignore this email.</p>`;

  try {
    await sendAppEmail(user.email, subject, text, html);
  } catch (err) {
    console.error('[email] Failed to send reset code', err);
    throw new Error('Failed to send reset code. Please try again.');
  }
}

// ─────────────────────────────
// PASSWORD RESET: verify OTP + set new password
// ─────────────────────────────
export type PasswordResetVerifyInput = {
  email: string;
  code: string;
  newPassword: string;
};

export async function verifyPasswordResetOtp(
  input: PasswordResetVerifyInput,
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();
  const newPassword = input.newPassword;

  if (!email || !code || !newPassword.trim()) {
    throw new Error('MISSING_FIELDS');
  }

  const userResult = await pool.query(
    `SELECT id
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [email],
  );

  if (userResult.rowCount === 0) {
    throw new Error('INVALID_EMAIL_OR_CODE');
  }

  const userId = userResult.rows[0].id as string;

  const otpResult = await pool.query(
    `SELECT
       id,
       user_id,
       purpose,
       code_hash,
       expires_at,
       consumed_at,
       attempt_count,
       created_at
     FROM user_otps
     WHERE user_id = $1
       AND purpose = 'reset'
       AND consumed_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  if (otpResult.rowCount === 0) {
    throw new Error('INVALID_OR_EXPIRED_OTP');
  }

  const otpRow = otpResult.rows[0] as {
    id: string;
    code_hash: string;
    attempt_count: number;
  };

  const isMatch = await bcrypt.compare(code, otpRow.code_hash);
  if (!isMatch) {
    const updated = await pool.query(
      `UPDATE user_otps
       SET attempt_count = attempt_count + 1
       WHERE id = $1
       RETURNING attempt_count`,
      [otpRow.id],
    );

    const attempts = updated.rows[0].attempt_count as number;
    if (attempts >= ENV.OTP_MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE user_otps
         SET consumed_at = now()
         WHERE id = $1`,
        [otpRow.id],
      );
      throw new Error('OTP_MAX_ATTEMPTS_EXCEEDED');
    }

    throw new Error('INVALID_OTP_CODE');
  }

  await pool.query(
    `UPDATE user_otps
     SET consumed_at = now()
     WHERE id = $1`,
    [otpRow.id],
  );

  const newHash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `UPDATE users
     SET password_hash = $1
     WHERE id = $2`,
    [newHash, userId],
  );
}
