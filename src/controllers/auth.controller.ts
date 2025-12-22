// src/controllers/auth.controller.ts
import { Request, Response } from 'express';

/**
 * 🚨 NOTE:
 * Ye "soft auth" hai – abhi ke liye koi DB use nahi kar rahe,
 * sirf user object bana ke return karenge so that mobile app works.
 * Later jab chaho proper users table + password hash add kar sakte ho.
 */

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  businessName: string | null;
  phone: string | null;
  createdAt: string;
};

// Helper: common user object builder
function buildUser(
  username: string,
  email: string,
  fullName?: string,
  businessName?: string | null,
): AuthUser {
  const base = username || email.split('@')[0] || 'user';
  return {
    id: `demo-${base}`,
    username: base,
    email,
    fullName: fullName || base,
    businessName: businessName ?? null,
    phone: null,
    createdAt: new Date().toISOString(),
  };
}

// POST /auth/signup
export async function signupHandler(req: Request, res: Response) {
  try {
    const { name, email, username, businessName } = req.body ?? {};

    if (!name || !email || !username) {
      return res
        .status(400)
        .json({ error: 'name, email, username are required.' });
    }

    const user = buildUser(username, email, name, businessName);
    // 🔹 Abhi ke liye DB me save nahi kar rahe, sirf client ko return
    return res.status(201).json(user);
  } catch (err) {
    console.error('signupHandler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /auth/login
export async function loginHandler(req: Request, res: Response) {
  try {
    const { usernameOrEmail } = req.body ?? {};

    if (!usernameOrEmail) {
      return res
        .status(400)
        .json({ error: 'usernameOrEmail is required.' });
    }

    const raw = String(usernameOrEmail).trim();

    let username: string;
    let email: string;

    if (raw.includes('@')) {
      // e.g. bikash@example.com
      email = raw;
      username = raw.split('@')[0] || raw;
    } else {
      // e.g. "bikash" → fake email
      username = raw;
      email = `${raw}@demo.local`;
    }

    const user = buildUser(username, email, username, null);

    // ✅ Password check skip (soft auth)
    // Later yahan par real password hash check add kar sakte ho

    return res.json(user);
  } catch (err) {
    console.error('loginHandler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
