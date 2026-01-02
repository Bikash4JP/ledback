import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Postgres unique violation
  if (err?.code === '23505') {
    return res.status(409).json({
      code: 'DUPLICATE_LEDGER_NAME',
      message: 'Same ledger name already exists (same user + same parent).',
      details: { constraint: err?.constraint },
    });
  }

  console.error('[API] ERROR:', err);
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: err?.message || 'Internal server error',
  });
}
