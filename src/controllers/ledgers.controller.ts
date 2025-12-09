import { Request, Response, NextFunction } from 'express';
import { getAllLedgers, createLedger, getLedgerStatement } from '../services/ledgers.service';

export const listLedgers = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ledgers = await getAllLedgers();
    res.json(ledgers);
  } catch (err) {
    next(err);
  }
};

export const createLedgerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, groupName, nature, isParty } = req.body;

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

    const ledger = await createLedger({
      name,
      groupName,
      nature,
      isParty,
    });

    res.status(201).json(ledger);
  } catch (err) {
    next(err);
  }
};


export const getLedgerStatementHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
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
