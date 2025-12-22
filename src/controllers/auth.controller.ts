// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import {
  signupUser,
  verifyEmailToken,
  startLoginWithPassword,
  verifyLoginOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from '../services/auth.service';

// ─────────────────────────────
// SIGNUP
// ─────────────────────────────
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
      if (err.code === 'MISSING_FIELDS' || err.message === 'MISSING_FIELDS') {
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

// ─────────────────────────────
// EMAIL VERIFY (GET /auth/verify-email?token=...)
// ─────────────────────────────
export const verifyEmailHandler = async (req: Request, res: Response) => {
  try {
    const token = (req.query.token as string) || '';

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    try {
      const user = await verifyEmailToken(token);
      return res.status(200).json({
        message: 'Email verified successfully',
        user,
      });
    } catch (err: any) {
      if (err.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return res.status(400).json({
          error: 'Invalid or expired token',
        });
      }
      console.error('verify email error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('verify email outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────
// LOGIN STEP 1: password check + send OTP
// POST /auth/login/start
// ─────────────────────────────
export const loginStartHandler = async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body ?? {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: 'Missing username/email or password',
      });
    }

    try {
      const info = await startLoginWithPassword({
        usernameOrEmail,
        password,
      });

      return res.status(200).json({
        message: 'Password OK, login code sent to email',
        userId: info.userId,
        email: info.email,
        isEmailVerified: info.isEmailVerified,
        otpSent: true,
      });
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          error: 'Invalid username/email or password',
        });
      }
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        return res.status(403).json({
          error:
            'Email is not verified yet. Please check your inbox and verify your email.',
        });
      }
      if (err.message === 'MISSING_FIELDS') {
        return res.status(400).json({ error: 'Missing fields' });
      }
      if (err.message === 'Failed to send login code. Please try again.') {
        return res.status(500).json({ error: err.message });
      }

      console.error('loginStart error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('loginStart outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────
// LOGIN STEP 2: verify OTP
// POST /auth/login/verify-otp
// ─────────────────────────────
export const loginVerifyOtpHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, code } = req.body ?? {};

    if (!userId || !code) {
      return res.status(400).json({
        error: 'Missing userId or code',
      });
    }

    try {
      const user = await verifyLoginOtp({ userId, code });
      return res.status(200).json({
        message: 'Login successful',
        user,
      });
    } catch (err: any) {
      if (err.message === 'INVALID_OR_EXPIRED_OTP') {
        return res.status(400).json({ error: 'Invalid or expired code' });
      }
      if (err.message === 'INVALID_OTP_CODE') {
        return res.status(400).json({ error: 'Invalid code' });
      }
      if (err.message === 'OTP_MAX_ATTEMPTS_EXCEEDED') {
        return res.status(429).json({
          error:
            'Too many wrong attempts. Please request a new login code.',
        });
      }
      if (err.message === 'USER_NOT_FOUND') {
        return res.status(400).json({ error: 'User not found' });
      }

      console.error('loginVerifyOtp error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('loginVerifyOtp outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────
// PASSWORD RESET: request code
// POST /auth/password-reset/request
// ─────────────────────────────
export const passwordResetRequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      await requestPasswordReset({ email });
      // Security: always generic response
      return res.status(200).json({
        message: 'If this email exists, a reset code has been sent.',
      });
    } catch (err: any) {
      if (err.message === 'Failed to send reset code. Please try again.') {
        return res.status(500).json({ error: err.message });
      }
      console.error('passwordResetRequest error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('passwordResetRequest outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────
// PASSWORD RESET: verify code + set new password
// POST /auth/password-reset/verify
// ─────────────────────────────
export const passwordResetVerifyOtpHandler = async (
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
      await verifyPasswordResetOtp({ email, code, newPassword });
      return res.status(200).json({
        message: 'Password has been reset successfully',
      });
    } catch (err: any) {
      if (
        err.message === 'INVALID_OR_EXPIRED_OTP' ||
        err.message === 'INVALID_OTP_CODE' ||
        err.message === 'INVALID_EMAIL_OR_CODE'
      ) {
        return res.status(400).json({
          error: 'Invalid or expired code',
        });
      }
      if (err.message === 'OTP_MAX_ATTEMPTS_EXCEEDED') {
        return res.status(429).json({
          error:
            'Too many wrong attempts. Please request a new reset code.',
        });
      }
      console.error('passwordResetVerifyOtp error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (err) {
    console.error('passwordResetVerifyOtp outer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
