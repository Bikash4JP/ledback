// src/routes/auth.routes.ts
import { Router } from 'express';
import {
  signupHandler,
  verifyEmailHandler,
  loginStartHandler,
  loginVerifyOtpHandler,
  passwordResetRequestHandler,
  passwordResetVerifyOtpHandler,
} from '../controllers/auth.controller';

const router = Router();

// Signup
router.post('/signup', signupHandler);

// Email verification
router.get('/verify-email', verifyEmailHandler);

// Login (2-step: password -> OTP)
router.post('/login/start', loginStartHandler);
router.post('/login/verify-otp', loginVerifyOtpHandler);

// Password reset (request + verify)
router.post('/password-reset/request', passwordResetRequestHandler);
router.post('/password-reset/verify', passwordResetVerifyOtpHandler);

export default router;
