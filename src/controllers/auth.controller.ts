// ledback/src/controllers/entries.controller.ts
import { Request, Response } from 'express';
import {
  createEntry,
  getAllEntries,
  getAllTransactions,
  getEntryWithLinesById,
} from '../services/entries.service';

function getUserEmail(req: Request): string | null {
  const raw = (req.headers['x-user-email'] as string | undefined) ?? '';
  const trimmed = raw.trim();
  return trimmed || null;
}

export const listEntriesHandler = async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    if (!email) {
      // not logged in → empty list
      return res.json([]);
    }
    const entries = await getAllEntries(email);
    res.json(entries);
  } catch (err) {
    console.error('listEntriesHandler error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listTransactionsHandler = async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return res.json([]);
    }
    const tx = await getAllTransactions(email);
    res.json(tx);
  } catch (err) {
    console.error('listTransactionsHandler error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEntryHandler = async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return res.status(400).json({ error: 'Missing user email' });
    }

    const input = req.body;
    const created = await createEntry(input, email);

    res.status(201).json(created);
  } catch (err: any) {
    console.error('createEntryHandler error', err);
    res.status(400).json({
      error: err?.message || 'Failed to create entry',
    });
  }
};

export const getEntryByIdHandler = async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return res.status(404).json({ error: 'Not found' });
    }

    const id = req.params.id;
    const data = await getEntryWithLinesById(id, email);

    if (!data) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(data);
  } catch (err) {
    console.error('getEntryByIdHandler error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const signupHandler = (req: import('express').Request, res: import('express').Response) => {
  // Implement your signup logic here
  res.send('Signup handler');
};