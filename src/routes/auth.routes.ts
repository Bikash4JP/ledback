// src/routes/auth.routes.ts
import { Router } from 'express';
import {
  loginHandler,
  signupHandler,
  verifyEmailHandler,
  requestLoginOtpHandler,
  verifyLoginOtpHandler,
  requestPasswordResetHandler,
  verifyPasswordResetOtpHandler,
} from '../controllers/auth.controller';

const router = Router();

// Basic auth
router.post('/signup', signupHandler);
router.post('/login', loginHandler);

// Email verification link
router.get('/verify-email', verifyEmailHandler);

// Login OTP (2nd step)
router.post('/request-login-otp', requestLoginOtpHandler);
router.post('/verify-login-otp', verifyLoginOtpHandler);

// Password reset via OTP
router.post('/request-password-reset', requestPasswordResetHandler);
router.post('/verify-password-reset-otp', verifyPasswordResetOtpHandler);

export default router;
