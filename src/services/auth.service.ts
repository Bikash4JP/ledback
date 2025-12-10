// src/services/auth.service.ts
import { pool } from '../db/pool';
import bcrypt from 'bcryptjs';

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

  if (!trimmedEmail || !trimmedUsername || !password.trim() || !name.trim()) {
    throw new Error('MISSING_FIELDS');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (
       username,
       email,
       full_name,
       business_name,
       phone,
       password_hash
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
       id,
       username,
       email,
       full_name AS "fullName",
       business_name AS "businessName",
       phone,
       created_at AS "createdAt"`,
    [
      trimmedUsername,
      trimmedEmail,
      name.trim(),
      businessName ?? null,
      phone ?? null,
      passwordHash,
    ],
  );

  return result.rows[0];
}

export async function loginUser(input: LoginInput): Promise<UserRecord> {
  const identifier = input.usernameOrEmail.trim();
  const password = input.password;

  if (!identifier || !password.trim()) {
    throw new Error('MISSING_FIELDS');
  }

  const result = await pool.query(
    `SELECT
       id,
       username,
       email,
       full_name AS "fullName",
       business_name AS "businessName",
       phone,
       password_hash,
       created_at AS "createdAt"
     FROM users
     WHERE username = $1 OR email = $1
     LIMIT 1`,
    [identifier.toLowerCase()],
  );

  if (result.rowCount === 0) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const row = result.rows[0] as UserRecord & { password_hash: string };

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const { password_hash, ...userSafe } = row;
  return userSafe;
}
