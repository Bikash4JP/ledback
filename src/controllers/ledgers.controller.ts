// ledback/src/controllers/ledgers.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  getAllLedgers,
  createLedger,
  getLedgerStatement,
} from '../services/ledgers.service';

function getUserEmailFromReq(req: Request): string | undefined {
  const raw = req.header('x-user-email');
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim();
  }
  return undefined;
}

// small helper: clean strings safely
function cleanText(v: any): string {
  if (typeof v !== 'string') return '';
  return v.trim();
}

// GET /ledgers
export const listLedgers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const ledgers = await getAllLedgers(userEmail);
    res.json(ledgers);
  } catch (err) {
    next(err);
  }
};

// POST /ledgers
export const createLedgerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userEmail = getUserEmailFromReq(req);

    // ✅ Create should always be user-specific
    if (!userEmail) {
      return res.status(401).json({ error: 'Missing x-user-email header' });
    }

    // Accept both frontend keys (old+new)
    const rawName = req.body?.name;
    const rawGroupName = req.body?.groupName;
    const rawNature = req.body?.nature;
    const rawIsParty = req.body?.isParty;
    const rawIsGroup = req.body?.isGroup;

    const rawCategoryLedgerId = req.body?.categoryLedgerId;
    const rawParentLedgerId = req.body?.parentLedgerId;

    // ✅ sanitize
    const name = cleanText(rawName);
    const groupName = cleanText(rawGroupName);
    const nature = cleanText(rawNature) as any;

    // ✅ normalize booleans
    const isParty = !!rawIsParty;
    const isGroup = !!rawIsGroup;

    // ✅ normalize parent id (string or null)
    const parent =
      (typeof rawCategoryLedgerId === 'string' && rawCategoryLedgerId.trim() !== ''
        ? rawCategoryLedgerId.trim()
        : typeof rawParentLedgerId === 'string' && rawParentLedgerId.trim() !== ''
          ? rawParentLedgerId.trim()
          : null) as string | null;

    // ✅ DEBUG (temporary, but very useful)
    console.log('[LEDGER_CREATE]', {
      userEmail,
      name,
      groupName,
      nature,
      isParty,
      isGroup,
      categoryLedgerId: parent,
      rawBody: req.body,
    });

    // Basic validation
    if (!name || !groupName || !nature) {
      return res.status(400).json({
        error: 'name, groupName and nature are required',
      });
    }

    const allowedNatures = ['Asset', 'Liability', 'Income', 'Expense'];
    if (!allowedNatures.includes(nature)) {
      return res.status(400).json({
        error: `nature must be one of ${allowedNatures.join(', ')}`,
      });
    }

    const ledger = await createLedger(
      {
        name,
        groupName,
        nature,
        isParty,

        // ✅ NEW
        isGroup,
        categoryLedgerId: parent,
      },
      userEmail,
    );

    return res.status(201).json(ledger);
  } catch (err) {
    next(err);
  }
};

// GET /ledgers/:id/statement
export const getLedgerStatementHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const fromStr = typeof from === 'string' ? from : undefined;
    const toStr = typeof to === 'string' ? to : undefined;

    const lines = await getLedgerStatement(id, fromStr, toStr);
    res.json(lines);
  } catch (err) {
    next(err);
  }
};
