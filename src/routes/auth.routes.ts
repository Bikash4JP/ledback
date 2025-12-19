// src/routes/auth.routes.ts
import { Router } from 'express';
import {
  signupHandler,
  loginStartHandler,
  loginVerifyOtpHandler,
  requestPasswordResetHandler,
  verifyPasswordResetOtpHandler,
} from '../controllers/auth.controller';

const router = Router();

// Sign up (create account)
router.post('/signup', signupHandler);

// Login step 1: check password + send OTP email
router.post('/login/start', loginStartHandler);

// Login step 2: verify OTP + return user
router.post('/login/verify-otp', loginVerifyOtpHandler);

// Password reset: send OTP to email
router.post('/password-reset/request', requestPasswordResetHandler);

// Password reset: verify OTP + set new password
router.post('/password-reset/verify', verifyPasswordResetOtpHandler);

export default router;
