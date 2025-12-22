// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';

// DB me hum ye columns assume kar rahe hain:
// users(id, name, business_name, email, username, password_hash, ...)

type DbUserRow = {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  name?: string | null;
  business_name?: string | null;
};

type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  businessName: string | null;
};

function mapRowToAuthUser(row: DbUserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.name ?? null,
    businessName: row.business_name ?? null,
  };
}

// POST /auth/login
// body: { usernameOrEmail: string, password: string }
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body ?? {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: 'usernameOrEmail and password are required',
      });
    }

    const identifier = String(usernameOrEmail).trim();

    const result = await pool.query<DbUserRow>(
      `
      SELECT
        id,
        email,
        username,
        password_hash,
        name,
        business_name
      FROM users
      WHERE email = $1 OR username = $1
      LIMIT 1
      `,
      [identifier],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result.rows[0];

    const ok = await bcrypt.compare(String(password), row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = mapRowToAuthUser(row);

    // frontend ko yahi shape chahiye: { id, username, email, fullName, businessName }
    return res.json(user);
  } catch (err) {
    console.error('loginHandler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /auth/signup
// body: { name, businessName, email, username, password }
export const signupHandler = async (req: Request, res: Response) => {
  try {
    const { name, businessName, email, username, password } = req.body ?? {};

    if (!name || !email || !username || !password) {
      return res.status(400).json({
        error: 'name, email, username and password are required',
      });
    }

    const trimmedEmail = String(email).trim();
    const trimmedUsername = String(username).trim();

    // check existing
    const exists = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1 OR username = $2
      `,
      [trimmedEmail, trimmedUsername],
    );

    if (exists.rowCount && exists.rowCount > 0) {
      return res
        .status(409)
        .json({ error: 'Email or username already registered' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const inserted = await pool.query<DbUserRow>(
      `
      INSERT INTO users (name, business_name, email, username, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        email,
        username,
        password_hash,
        name,
        business_name
      `,
      [
        String(name).trim(),
        businessName ? String(businessName).trim() : null,
        trimmedEmail,
        trimmedUsername,
        passwordHash,
      ],
    );

    const user = mapRowToAuthUser(inserted.rows[0]);
    return res.status(201).json(user);
  } catch (err) {
    console.error('signupHandler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
