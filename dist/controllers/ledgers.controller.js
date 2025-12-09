"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLedgerStatementHandler = exports.createLedgerHandler = exports.listLedgers = void 0;
const ledgers_service_1 = require("../services/ledgers.service");
const listLedgers = async (_req, res, next) => {
    try {
        const ledgers = await (0, ledgers_service_1.getAllLedgers)();
        res.json(ledgers);
    }
    catch (err) {
        next(err);
    }
};
exports.listLedgers = listLedgers;
const createLedgerHandler = async (req, res, next) => {
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
        const ledger = await (0, ledgers_service_1.createLedger)({
            name,
            groupName,
            nature,
            isParty,
        });
        res.status(201).json(ledger);
    }
    catch (err) {
        next(err);
    }
};
exports.createLedgerHandler = createLedgerHandler;
const getLedgerStatementHandler = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;
        const fromStr = typeof from === 'string' ? from : undefined;
        const toStr = typeof to === 'string' ? to : undefined;
        const lines = await (0, ledgers_service_1.getLedgerStatement)(id, fromStr, toStr);
        res.json(lines);
    }
    catch (err) {
        next(err);
    }
};
exports.getLedgerStatementHandler = getLedgerStatementHandler;
