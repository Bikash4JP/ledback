// src/utils/email.ts
import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: Number(ENV.SMTP_PORT),
  secure: false, // 587 = STARTTLS (secure: false)
  auth: {
    user: ENV.SMTP_USER,
    pass: ENV.SMTP_PASS,
  },
});

/**
 * Low-level helper: send any HTML email from MobiLedger.
 */
export async function sendAppEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const info = await transporter.sendMail({
    from: ENV.SMTP_FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  console.log('[EMAIL] sent:', info.messageId, 'to:', options.to);
  return info;
}

/**
 * Helper for signup email verification (we'll use this later).
 */
export async function sendVerificationEmail(params: {
  to: string;
  verifyUrl: string;
  userName?: string;
}) {
  const { to, verifyUrl, userName } = params;
  const appName = ENV.APP_NAME;

  const subject = `${appName} - Verify your email address`;
  const greeting = userName ? `Hi ${userName},` : 'Hi,';

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #222;">
      <p>${greeting}</p>
      <p>Thank you for signing up for <strong>${appName}</strong>.</p>
      <p>Please click the button below to verify your email address:</p>
      <p style="margin: 16px 0;">
        <a href="${verifyUrl}"
           style="background: #ac0c79; color: #fff; padding: 10px 18px; border-radius: 4px; text-decoration: none; display: inline-block;">
          Verify Email
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #555;">${verifyUrl}</p>
      <p style="margin-top: 20px;">Best regards,<br/>${appName} Team</p>
    </div>
  `;

  return sendAppEmail({ to, subject, html });
}

/**
 * Helper for login / password reset OTP emails (we'll hook this later).
 */
export async function sendOtpEmail(params: {
  to: string;
  otpCode: string;
  purpose: 'login' | 'reset';
}) {
  const { to, otpCode, purpose } = params;
  const appName = ENV.APP_NAME;

  const purposeLabel =
    purpose === 'login' ? 'Login confirmation' : 'Password reset';
  const subject = `${appName} - ${purposeLabel} code`;

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #222;">
      <p>Hi,</p>
      <p>Your <strong>${purposeLabel.toLowerCase()}</strong> code for <strong>${appName}</strong> is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">
        ${otpCode}
      </p>
      <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      <p style="margin-top: 20px;">Best regards,<br/>${appName} Team</p>
    </div>
  `;

  return sendAppEmail({ to, subject, html });
}
