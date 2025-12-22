// src/routes/debugEmail.routes.ts
import { Router } from 'express';
import { sendAppEmail } from '../utils/email';
import { ENV } from '../config/env';

const router = Router();

/**
 * Simple debug endpoint:
 * GET /debug/email/test?to=someone@example.com
 */
router.get('/test', async (req, res) => {
  const to =
    (req.query.to as string) ||
    process.env.DEBUG_EMAIL_TO ||
    'app@mobi-ledger.com';

  try {
    await sendAppEmail(
      to,
      `${ENV.APP_NAME} test email`,
      `This is a test email from ${ENV.APP_NAME} backend.`,
      `<p>This is a <strong>test</strong> email from ${ENV.APP_NAME} backend.</p>`,
    );

    res.json({
      ok: true,
      to,
      message: 'Test email sent (if SMTP config is correct).',
    });
  } catch (err) {
    console.error('[debugEmail] Failed to send test email', err);
    res.status(500).json({
      error: 'Failed to send test email',
    });
  }
});

export default router;
