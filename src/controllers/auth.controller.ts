// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { loginUser, signupUser } from '../services/auth.service';
import { pool } from '../db/pool';
import { sendAppEmail } from '../utils/email';
import { ENV } from '../config/env';
import {
  issueOtpForUser,
  verifyOtpForUser,
} from '../services/otp.service';

// --- helper: verification token + email bhejna ---
async function createAndSendVerificationEmail(user: {
  id: string;
  email: string;
  name?: string | null;
}) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await pool.query(
    `
      UPDATE public.users
      SET verification_token = $1,
          verification_token_expires_at = $2
      WHERE id = $3
    `,
    [token, expiresAt, user.id],
  );

  const verifyUrl = `${ENV.APP_BASE_URL.replace(
    /\/+$/,
    '',
  )}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const safeName = user.name || 'there';

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #222;">
      <p>Hi ${safeName},</p>
      <p>Thank you for signing up for <b>MobiLedger</b>.</p>
      <p>Please confirm your email address by clicking the button below:</p>
      <p style="margin: 20px 0;">
        <a href="${verifyUrl}"
           style="display:inline-block;padding:10px 18px;background:#ac0c79;color:#fff;text-decoration:none;border-radius:4px;">
          Verify my email
        </a>
      </p>
      <p>Or open this link:</p>
      <p style="word-break: break-all; font-size: 12px;">${verifyUrl}</p>
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        This link will expire in 24 hours. If you didn’t create a MobiLedger account, you can ignore this email.
      </p>
      <p style="margin-top: 16px;">— MobiLedger</p>
    </div>
  `;

  await sendAppEmail({
    to: user.email,
    subject: 'Verify your MobiLedger email address',
    html,
  });
}

// ========== SIGNUP ==========

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

      // Email verification mail
      try {
        await createAndSendVerificationEmail({
          id: (user as any).id,
          email: (user as any).email,
          name: (user as any).fullName ?? name,
        });
      } catch (emailErr) {
        console.error(
          'signup: failed to send verification email:',
          emailErr,
        );
        return res.status(201).json({
          ...user,
          emailVerificationSent: false,
          warning:
            'Account created but failed to send verification email. Please try again later.',
        });
      }

      return res.status(201).json({
        ...user,
        emailVerificationSent: true,
      });
    } catch (err: any) {
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

// ========== LOGIN (step 1: password check) ==========

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body ?? {};

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: 'Missing username/email or password',
      });
    }

    try {
      const user: any = await loginUser({ usernameOrEmail, password });

      if (!user.is_email_verified) {
        return res.status(403).json({
          error: 'EMAIL_NOT_VERIFIED',
          message:
            'Your email address is not verified yet. Please check your inbox and verify your email.',
        });
      }

      // NOTE: Abhi ke liye yeh sirf step 1 hai.
      // Step 2: client /auth/request-login-otp call karega.
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

// ========== EMAIL VERIFY LINK (signup) ==========

export const verifyEmailHandler = async (req: Request, res: Response) => {
  const token = (req.query.token as string | undefined)?.trim();

  if (!token) {
    return res.status(400).send('Invalid verification link.');
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `
        SELECT id, email, is_email_verified, verification_token_expires_at
        FROM public.users
        WHERE verification_token = $1
      `,
      [token],
    );

    if (rows.length === 0) {
      return res.status(400).send('Invalid or expired verification link.');
    }

    const user = rows[0];
    const now = new Date();

    if (
      user.verification_token_expires_at &&
      now > user.verification_token_expires_at
    ) {
      await client.query(
        `
          UPDATE public.users
          SET verification_token = NULL,
              verification_token_expires_at = NULL
          WHERE id = $1
        `,
        [user.id],
      );
      return res
        .status(400)
        .send(
          'Verification link has expired. Please sign in again to request a new link.',
        );
    }

    if (user.is_email_verified) {
      await client.query(
        `
          UPDATE public.users
          SET verification_token = NULL,
              verification_token_expires_at = NULL
          WHERE id = $1
        `,
        [user.id],
      );
      return res.send(`
        <html>
          <body style="font-family: system-ui; padding: 24px;">
            <h2>Email already verified</h2>
            <p>You can close this window and go back to the MobiLedger app.</p>
          </body>
        </html>
      `);
    }

    await client.query(
      `
        UPDATE public.users
        SET is_email_verified = true,
            verification_token = NULL,
            verification_token_expires_at = NULL
        WHERE id = $1
      `,
      [user.id],
    );

    return res.send(`
      <html>
        <body style="font-family: system-ui; padding: 24px;">
          <h2>Email verified</h2>
          <p>Your email has been successfully verified for <b>MobiLedger</b>.</p>
          <p>You can now return to the app and log in.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('verifyEmail error:', err);
    return res.status(500).send('Internal server error.');
  } finally {
    client.release();
  }
};

// ========== LOGIN OTP (step 2) ==========

// POST /auth/request-login-otp
// body: { userId: string }
export const requestLoginOtpHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.body ?? {};

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const { rows } = await pool.query(
      `
        SELECT id, email, is_email_verified
        FROM public.users
        WHERE id = $1
      `,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    if (!user.is_email_verified) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Your email address is not verified.',
      });
    }

    const { code, expiresAt } = await issueOtpForUser(user.id, 'login');

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #222;">
        <p>Hello,</p>
        <p>Your <b>MobiLedger</b> login code is:</p>
        <p style="font-size: 22px; font-weight: 700; letter-spacing: 3px; margin: 12px 0;">
          ${code}
        </p>
        <p>This code is valid for <b>10 minutes</b>.</p>
        <p>If you did not try to sign in, you can ignore this email.</p>
        <p style="margin-top: 16px;">— MobiLedger</p>
      </div>
    `;

    await sendAppEmail({
      to: user.email,
      subject: 'Your MobiLedger login code',
      html,
    });

    return res.status(200).json({
      ok: true,
      expiresAt,
    });
  } catch (err) {
    console.error('requestLoginOtp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /auth/verify-login-otp
// body: { userId: string, code: string }
export const verifyLoginOtpHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, code } = req.body ?? {};

    if (!userId || !code) {
      return res
        .status(400)
        .json({ error: 'Missing userId or code' });
    }

    const result = await verifyOtpForUser(userId, 'login', code);

    if (result.ok) {
      // login complete
      return res.status(200).json({ ok: true });
    }

    switch (result.reason) {
      case 'NO_OTP':
        return res.status(400).json({
          error: 'NO_OTP',
          message: 'No active code found. Please request a new code.',
        });
      case 'EXPIRED':
        return res.status(410).json({
          error: 'OTP_EXPIRED',
          message: 'This code has expired. Please request a new one.',
        });
      case 'INVALID':
        return res.status(401).json({
          error: 'INVALID_CODE',
          message: 'The code you entered is incorrect.',
        });
      case 'TOO_MANY_ATTEMPTS':
        return res.status(429).json({
          error: 'TOO_MANY_ATTEMPTS',
          message:
            'Too many incorrect attempts. Please request a new code.',
        });
      default:
        return res.status(400).json({ error: 'OTP_ERROR' });
    }
  } catch (err) {
    console.error('verifyLoginOtp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ========== PASSWORD RESET BY EMAIL OTP ==========

// POST /auth/request-password-reset
// body: { email: string }
export const requestPasswordResetHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const { rows } = await pool.query(
      `
        SELECT id, email
        FROM public.users
        WHERE LOWER(email) = LOWER($1)
      `,
      [email],
    );

    // Security ke liye: user exist ho ya na ho, same response
    if (rows.length === 0) {
      return res.status(200).json({ ok: true });
    }

    const user = rows[0];

    const { code, expiresAt } = await issueOtpForUser(user.id, 'reset');

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #222;">
        <p>Hello,</p>
        <p>Your <b>MobiLedger</b> password reset code is:</p>
        <p style="font-size: 22px; font-weight: 700; letter-spacing: 3px; margin: 12px 0;">
          ${code}
        </p>
        <p>This code is valid for <b>10 minutes</b>.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
        <p style="margin-top: 16px;">— MobiLedger</p>
      </div>
    `;

    await sendAppEmail({
      to: user.email,
      subject: 'Your MobiLedger password reset code',
      html,
    });

    return res.status(200).json({
      ok: true,
      expiresAt,
    });
  } catch (err) {
    console.error('requestPasswordReset error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /auth/verify-password-reset-otp
// body: { email: string, code: string, newPassword: string }
export const verifyPasswordResetOtpHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email, code, newPassword } = req.body ?? {};

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: 'Missing email, code or newPassword',
      });
    }

    const { rows } = await pool.query(
      `
        SELECT id
        FROM public.users
        WHERE LOWER(email) = LOWER($1)
      `,
      [email],
    );

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'INVALID_EMAIL_OR_CODE',
      });
    }

    const user = rows[0];

    const result = await verifyOtpForUser(user.id, 'reset', code);

    if (!result.ok) {
      switch (result.reason) {
        case 'NO_OTP':
          return res.status(400).json({
            error: 'NO_OTP',
            message: 'No active code found. Please request a new code.',
          });
        case 'EXPIRED':
          return res.status(410).json({
            error: 'OTP_EXPIRED',
            message: 'This code has expired. Please request a new one.',
          });
        case 'INVALID':
          return res.status(401).json({
            error: 'INVALID_CODE',
            message: 'The code you entered is incorrect.',
          });
        case 'TOO_MANY_ATTEMPTS':
          return res.status(429).json({
            error: 'TOO_MANY_ATTEMPTS',
            message:
              'Too many incorrect attempts. Please request a new code.',
          });
        default:
          return res.status(400).json({ error: 'OTP_ERROR' });
      }
    }

    // ✅ OTP OK → password reset
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
        UPDATE public.users
        SET password_hash = $2
        WHERE id = $1
      `,
      [user.id, passwordHash],
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('verifyPasswordResetOtp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
