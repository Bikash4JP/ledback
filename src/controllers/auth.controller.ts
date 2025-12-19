// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import {
  signupUser,
  // startPasswordLogin, // Removed because it is not exported from auth.service
  verifyLoginOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  // optional: keep old direct login if you still use it somewhere
  // loginUser, // Removed because it is not exported from auth.service
} from '../services/auth.service';

// ---------- SIGN UP ----------
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

      // user ko return karte hain (password hash removed in service)
      return res.status(201).json(user);
    } catch (err: any) {
      // Unique violation (Postgres 23505)
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

// ---------- LOGIN: STEP 1 (PASSWORD → SEND OTP) ----------
export const loginStartHandler = async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body ?? {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: 'Missing username/email or password',
      });
    }

    // TODO: Implement login start logic or restore startPasswordLogin export in auth.service
    return res.status(501).json({ error: 'Login start not implemented. Please contact support.' });
  } catch (err) {
    console.error('loginStart outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ---------- LOGIN: STEP 2 (VERIFY OTP) ----------
export const loginVerifyOtpHandler = async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body ?? {};

    if (!userId || !code) {
      return res.status(400).json({
        error: 'Missing userId or code',
      });
    }

    try {
      const user = await verifyLoginOtp({
        userId,
        code,
      });

      // Frontend expects: { message, user }
      return res.status(200).json({
        message: 'Login successful',
        user,
      });
    } catch (err: any) {
      if (err.message === 'OTP_NOT_FOUND') {
        return res.status(404).json({ error: 'Login code not found' });
      }
      if (err.message === 'OTP_EXPIRED') {
        return res.status(400).json({ error: 'Login code expired' });
      }
      if (err.message === 'OTP_ALREADY_USED') {
        return res
          .status(400)
          .json({ error: 'Login code already used. Please request a new one.' });
      }
      if (err.message === 'OTP_MAX_ATTEMPTS') {
        return res.status(429).json({
          error: 'Too many wrong attempts. Please request a new login code.',
        });
      }
      if (err.message === 'OTP_INVALID') {
        return res.status(400).json({ error: 'Invalid login code.' });
      }

      console.error('loginVerifyOtp error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('loginVerifyOtp outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ---------- PASSWORD RESET: REQUEST OTP ----------
export const requestPasswordResetHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    try {
      await requestPasswordReset({ email });
      return res.status(200).json({
        message: 'Password reset code sent if account exists.',
      });
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') {
        // Security: still 200 bhej dete hain
        return res.status(200).json({
          message: 'Password reset code sent if account exists.',
        });
      }

      console.error('requestPasswordReset error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('requestPasswordReset outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ---------- PASSWORD RESET: VERIFY OTP + SET NEW PASSWORD ----------
export const verifyPasswordResetOtpHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, code, newPassword } = req.body ?? {};

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: 'Email, code and newPassword are required',
      });
    }

    try {
      await verifyPasswordResetOtp({
        email,
        code,
        newPassword,
      });

      return res.status(200).json({
        message: 'Password has been reset successfully.',
      });
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }
      if (err.message === 'OTP_NOT_FOUND') {
        return res.status(404).json({ error: 'Reset code not found' });
      }
      if (err.message === 'OTP_EXPIRED') {
        return res.status(400).json({ error: 'Reset code expired' });
      }
      if (err.message === 'OTP_ALREADY_USED') {
        return res.status(400).json({
          error: 'Reset code already used. Please request a new one.',
        });
      }
      if (err.message === 'OTP_MAX_ATTEMPTS') {
        return res.status(429).json({
          error: 'Too many wrong attempts. Please request a new reset code.',
        });
      }
      if (err.message === 'OTP_INVALID') {
        return res.status(400).json({ error: 'Invalid reset code.' });
      }

      console.error('verifyPasswordResetOtp error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('verifyPasswordResetOtp outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// (Optional) keep old direct /auth/login handler if needed elsewhere
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
function loginUser(arg0: { usernameOrEmail: any; password: any; }) {
  throw new Error('Function not implemented.');
}

