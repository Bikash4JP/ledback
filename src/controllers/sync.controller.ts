import { Request, Response } from "express";
import { pullChanges, applyPushBatch } from "../services/sync.service.js";

function getUserEmail(req: Request): string | null {
  const email = req.header("x-user-email");
  return email && email.trim().length ? email.trim() : null;
}

function parseSince(req: Request): Date {
  const sinceStr = (req.query.since as string | undefined) ?? "1970-01-01T00:00:00.000Z";
  const d = new Date(sinceStr);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid 'since' query param. Use ISO date string.");
  }
  return d;
}

export async function pullHandler(req: Request, res: Response) {
  try {
    const email = getUserEmail(req);
    if (!email) return res.status(401).json({ error: "Missing x-user-email" });

    const since = parseSince(req);
    const data = await pullChanges(email, since);

    return res.json(data);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "pull failed" });
  }
}

export async function pushHandler(req: Request, res: Response) {
  try {
    const email = getUserEmail(req);
    if (!email) return res.status(401).json({ error: "Missing x-user-email" });

    // body shape is validated lightly inside service too
    const result = await applyPushBatch(email, req.body);

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "push failed" });
  }
}
