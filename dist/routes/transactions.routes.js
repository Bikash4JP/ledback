"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/transactions.routes.ts
const express_1 = require("express");
const entries_controller_1 = require("../controllers/entries.controller");
const router = (0, express_1.Router)();
// GET /transactions
router.get('/', entries_controller_1.listTransactions);
exports.default = router;
