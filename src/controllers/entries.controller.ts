import { Request, Response, NextFunction } from 'express';
import {
  getAllEntries,
  createEntry,
  CreateEntryInput,
  getEntryWithLinesById,
  getAllTransactions,
} from '../services/entries.service';


export const listEntries = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const entries = await getAllEntries();
    res.json(entries);
  } catch (err) {
    next(err);
  }
};
export const listTransactions = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tx = await getAllTransactions();
    res.json(tx);
  } catch (err) {
    next(err);
  }
};


export const createEntryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { date, voucherType, narration, lines } = req.body as CreateEntryInput;

    if (!date || !voucherType || !Array.isArray(lines)) {
      return res.status(400).json({
        error: 'date, voucherType and lines are required',
      });
    }

    const allowedTypes = ['Journal', 'Payment', 'Receipt', 'Contra', 'Transfer'];
    if (!allowedTypes.includes(voucherType)) {
      return res.status(400).json({
        error: `voucherType must be one of ${allowedTypes.join(', ')}`,
      });
    }

    if (lines.length === 0) {
      return res.status(400).json({
        error: 'At least one line is required',
      });
    }

    const created = await createEntry({
      date,
      voucherType,
      narration,
      lines,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};
export const getEntryByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const result = await getEntryWithLinesById(id);

    if (!result) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};
