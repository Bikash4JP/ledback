import { Router } from "express";
import { pullHandler, pushHandler } from "../controllers/sync.controller.js";

const router = Router();

// GET /sync/pull?since=2025-12-01T00:00:00.000Z
router.get("/pull", pullHandler);

// POST /sync/push
router.post("/push", pushHandler);

export default router;
