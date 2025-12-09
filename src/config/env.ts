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
};
