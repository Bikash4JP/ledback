// src/routes/auth.routes.ts
import { Router } from 'express';
import {
  signupHandler,
  loginHandler,
} from '../controllers/auth.controller';

const router = Router();

// POST /auth/signup
router.post('/signup', signupHandler);

// POST /auth/login
router.post('/login', loginHandler);

export default router;
//just a test commit 