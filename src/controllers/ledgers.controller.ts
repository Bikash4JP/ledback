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

// GET /ledgers
export const listLedgers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const ledgers = await getAllLedgers(userEmail);
    res.json(ledgers);
  } catch (err) {
    next(err);
  }
};

// POST /ledgers
export const createLedgerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      groupName,
      nature,
      isParty,

      // new
      isGroup,

      // ✅ accept both
      categoryLedgerId,
      parentLedgerId,
    } = req.body;

    const userEmail = getUserEmailFromReq(req);

    if (!userEmail) {
      return res.status(401).json({ error: 'Missing x-user-email header' });
    }

    if (!name || !groupName || !nature) {
      return res.status(400).json({ error: 'name, groupName and nature are required' });
    }

    const allowedNatures = ['Asset', 'Liability', 'Income', 'Expense'];
    if (!allowedNatures.includes(nature)) {
      return res.status(400).json({ error: `nature must be one of ${allowedNatures.join(', ')}` });
    }

    // ✅ normalize parent
    const parent = (categoryLedgerId ?? parentLedgerId ?? null) as string | null;

    const ledger = await createLedger(
      {
        name,
        groupName,
        nature,
        isParty,
        isGroup: !!isGroup,
        categoryLedgerId: parent,
      },
      userEmail
    );

    res.status(201).json(ledger);
  } catch (err) {
    next(err);
  }
};

// GET /ledgers/:id/statement
export const getLedgerStatementHandler = async (req: Request, res: Response, next: NextFunction) => {
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
