"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const entries_controller_1 = require("../controllers/entries.controller");
const router = (0, express_1.Router)();
// GET /entries
router.get('/', entries_controller_1.listEntries);
// GET /entries/:id
router.get('/:id', entries_controller_1.getEntryByIdHandler);
// POST /entries
router.post('/', entries_controller_1.createEntryHandler);
exports.default = router;
