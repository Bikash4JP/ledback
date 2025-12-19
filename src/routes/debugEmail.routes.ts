// src/routes/debugEmail.routes.ts
import { Router } from 'express';
import { sendAppEmail } from '../utils/email';

const router = Router();

/**
 * GET /debug-email/test?to=someone@example.com
 * Simple test route to check if SMTP is working.
 */
router.get('/test', async (req, res) => {
  const to = (req.query.to as string) || '';

  if (!to) {
    return res.status(400).json({
      error: 'Missing "to" query param. Example: /debug-email/test?to=you@example.com',
    });
  }

  try {
    await sendAppEmail({
      to,
      subject: 'MobiLedger test email',
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <h2>MobiLedger test email</h2>
          <p>If you see this, your SMTP settings are working 🎉</p>
        </div>
      `,
    });

    return res.json({ ok: true, message: 'Test email sent', to });
  } catch (err) {
    console.error('[DEBUG EMAIL] failed:', err);
    return res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
