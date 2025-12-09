// src/data/defaultLedgers.ts
export type LedgerSeed = {
  name: string;
  groupName: string;
  nature: 'Asset' | 'Liability' | 'Income' | 'Expense';
  isParty: boolean;
};

export const DEFAULT_LEDGERS: LedgerSeed[] = [
  // --- P&L / Trading accounts ---
  { name: 'Sales', groupName: 'Sales', nature: 'Income', isParty: false },
  {
    name: 'Sales Returns',
    groupName: 'Sales',
    nature: 'Income',
    isParty: false,
  },
  {
    name: 'Purchases',
    groupName: 'Purchases',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Purchase Returns',
    groupName: 'Purchases',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Opening Stock',
    groupName: 'Inventory',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Closing Stock',
    groupName: 'Inventory',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Wages',
    groupName: 'Direct Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Carriage Inward/Freight on Purchases',
    groupName: 'Direct Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Fuel/Power',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Rent Paid',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Salaries',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Interest Paid',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Commission Paid',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Discount Allowed',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Bad Debts',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Depreciation',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Repairs',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Advertising',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Rent Received',
    groupName: 'Indirect Income',
    nature: 'Income',
    isParty: false,
  },
  {
    name: 'Interest Received',
    groupName: 'Indirect Income',
    nature: 'Income',
    isParty: false,
  },
  {
    name: 'Commission Received',
    groupName: 'Indirect Income',
    nature: 'Income',
    isParty: false,
  },
  {
    name: 'Discount Received',
    groupName: 'Indirect Income',
    nature: 'Income',
    isParty: false,
  },

  // Extra P&L
  {
    name: 'Insurance',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Electricity',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Telephone/Internet',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Travel Expenses',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Office Expenses',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Printing & Stationery',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Legal Fees',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Audit Fees',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Loss/Gain on Sale of Asset',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Provision for Doubtful Debts',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },
  {
    name: 'Bank Charges',
    groupName: 'Indirect Expense',
    nature: 'Expense',
    isParty: false,
  },

  // --- Assets ---
  {
    name: 'Land',
    groupName: 'Fixed Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Building',
    groupName: 'Fixed Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Plant & Machinery',
    groupName: 'Fixed Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Furniture',
    groupName: 'Fixed Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Vehicles',
    groupName: 'Fixed Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Cash in Hand',
    groupName: 'Current Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Cash at Bank',
    groupName: 'Current Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Debtors/Accounts Receivable',
    groupName: 'Current Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Bills Receivable',
    groupName: 'Current Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Prepaid Expenses',
    groupName: 'Current Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Advance Payments',
    groupName: 'Current Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Stock/Inventory',
    groupName: 'Current Asset',
    nature: 'Asset',
    isParty: false,
  },
  {
    name: 'Investments',
    groupName: 'Investment',
    nature: 'Asset',
    isParty: false,
  },

  // Extra assets (optional – add as needed later)
  // ...

  // --- Liabilities & Equity ---
  {
    name: 'Capital',
    groupName: 'Capital & Reserves',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Bank Loan',
    groupName: 'Loan',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Creditors/Accounts Payable',
    groupName: 'Current Liability',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Bills Payable',
    groupName: 'Current Liability',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Outstanding Expenses',
    groupName: 'Current Liability',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Interest Due',
    groupName: 'Current Liability',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Drawings',
    groupName: 'Capital & Reserves',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Profit/Loss (from P&L)',
    groupName: 'Capital & Reserves',
    nature: 'Liability',
    isParty: false,
  },
  {
    name: 'Reserves',
    groupName: 'Capital & Reserves',
    nature: 'Liability',
    isParty: false,
  },

  // Special internal
  {
    name: 'Opening Balance Adjustment',
    groupName: 'Capital & Reserves',
    nature: 'Liability',
    isParty: false,
  },
];
