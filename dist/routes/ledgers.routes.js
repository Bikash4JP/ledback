"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ledgers_controller_1 = require("../controllers/ledgers.controller");
const router = (0, express_1.Router)();
// GET /ledgers
router.get('/', ledgers_controller_1.listLedgers);
// GET /ledgers/:id/statement
router.get('/:id/statement', ledgers_controller_1.getLedgerStatementHandler);
// POST /ledgers
router.post('/', ledgers_controller_1.createLedgerHandler);
exports.default = router;
