"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEntryByIdHandler = exports.createEntryHandler = exports.listTransactions = exports.listEntries = void 0;
const entries_service_1 = require("../services/entries.service");
const listEntries = async (_req, res, next) => {
    try {
        const entries = await (0, entries_service_1.getAllEntries)();
        res.json(entries);
    }
    catch (err) {
        next(err);
    }
};
exports.listEntries = listEntries;
const listTransactions = async (_req, res, next) => {
    try {
        const tx = await (0, entries_service_1.getAllTransactions)();
        res.json(tx);
    }
    catch (err) {
        next(err);
    }
};
exports.listTransactions = listTransactions;
const createEntryHandler = async (req, res, next) => {
    try {
        const { date, voucherType, narration, lines } = req.body;
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
        const created = await (0, entries_service_1.createEntry)({
            date,
            voucherType,
            narration,
            lines,
        });
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
};
exports.createEntryHandler = createEntryHandler;
const getEntryByIdHandler = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await (0, entries_service_1.getEntryWithLinesById)(id);
        if (!result) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        res.json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.getEntryByIdHandler = getEntryByIdHandler;
