// src/routes/auth.routes.ts
import { Router } from 'express';
import { loginHandler, signupHandler } from '../controllers/auth.controller';

const router = Router();

// POST /auth/signup
router.post('/signup', signupHandler);

// POST /auth/login
router.post('/login', loginHandler);

export default router;
