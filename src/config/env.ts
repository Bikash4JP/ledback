// src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

export const ENV = {
  PORT: process.env.PORT || '4000',
  DATABASE_URL: required('DATABASE_URL'),

  // App name / base URL
  APP_NAME: process.env.APP_NAME || 'MobiLedger',
  // Backend base URL (for links inside emails, etc.)
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:4000',

  // SMTP / Email
  SMTP_HOST: required('SMTP_HOST'),
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: required('SMTP_USER'),
  SMTP_PASS: required('SMTP_PASS'),
  SMTP_FROM_EMAIL: required('SMTP_FROM_EMAIL'),

  // Expiries + limits
  EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES: parseInt(
    process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES || '60',
    10,
  ),
  OTP_EXPIRY_MINUTES: parseInt(
    process.env.OTP_EXPIRY_MINUTES || '10',
    10,
  ),
  OTP_MAX_ATTEMPTS: parseInt(
    process.env.OTP_MAX_ATTEMPTS || '5',
    10,
  ),
};
