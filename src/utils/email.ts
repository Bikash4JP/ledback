// src/utils/email.ts
import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: Number(ENV.SMTP_PORT),
  secure: Number(ENV.SMTP_PORT) === 465,
  auth: {
    user: ENV.SMTP_USER,
    pass: ENV.SMTP_PASS,
  },
});

export async function sendAppEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  options?: nodemailer.SendMailOptions,
): Promise<void> {
  const mailOptions: nodemailer.SendMailOptions = {
    from: ENV.SMTP_FROM_EMAIL,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
    ...(options ?? {}),
  };

  await transporter.sendMail(mailOptions);
}
