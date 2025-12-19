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

  // App branding
  APP_NAME: process.env.APP_NAME || 'MobiLedger',

  // SMTP / Email
  SMTP_HOST: required('SMTP_HOST'),
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: required('SMTP_USER'),
  SMTP_PASS: required('SMTP_PASS'),
  SMTP_FROM_EMAIL: required('SMTP_FROM_EMAIL'),
  APP_BASE_URL: process.env.APP_BASE_URL!,
};
