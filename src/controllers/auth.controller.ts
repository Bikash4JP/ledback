// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { loginUser, signupUser } from '../services/auth.service';

export const signupHandler = async (req: Request, res: Response) => {
  try {
    const {
      name,
      businessName,
      email,
      username,
      password,
      phone,
    } = req.body ?? {};

    if (!name || !email || !username || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    try {
      const user = await signupUser({
        name,
        businessName,
        email,
        username,
        password,
        phone,
      });

      return res.status(201).json(user);
    } catch (err: any) {
      // Unique violation
      if (err.code === '23505') {
        return res.status(409).json({
          error: 'Email or username already in use',
        });
      }
      if (err.message === 'MISSING_FIELDS') {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      console.error('signup error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('signup outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body ?? {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: 'Missing username/email or password',
      });
    }

    try {
      const user = await loginUser({ usernameOrEmail, password });
      return res.status(200).json(user);
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          error: 'Invalid username/email or password',
        });
      }
      if (err.message === 'MISSING_FIELDS') {
        return res.status(400).json({ error: 'Missing fields' });
      }
      console.error('login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('login outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
