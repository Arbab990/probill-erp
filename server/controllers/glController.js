import ChartOfAccounts from '../models/ChartOfAccounts.js';
import JournalEntry from '../models/JournalEntry.js';
import { checkPeriodOpen } from './fiscalPeriodController.js';
import mongoose from 'mongoose';
import { logAudit } from '../services/auditService.js';
import { notifyCompany } from '../services/notificationService.js';

// ════════════════════════════════════════════════
// CHART OF ACCOUNTS — Seed defaults
// ════════════════════════════════════════════════

const DEFAULT_ACCOUNTS = [
    // Assets
    { accountCode: '1000', accountName: 'Cash and Cash Equivalents', accountType: 'asset', accountSubType: 'cash', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '1010', accountName: 'Bank Account', accountType: 'asset', accountSubType: 'bank', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '1100', accountName: 'Accounts Receivable', accountType: 'asset', accountSubType: 'accounts_receivable', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '1200', accountName: 'Inventory', accountType: 'asset', accountSubType: 'current_asset', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '1500', accountName: 'Fixed Assets', accountType: 'asset', accountSubType: 'fixed_asset', normalBalance: 'debit', isSystemAccount: false },
    // Liabilities
    { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'liability', accountSubType: 'accounts_payable', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '2100', accountName: 'GST Payable', accountType: 'liability', accountSubType: 'current_liability', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '2200', accountName: 'TDS Payable', accountType: 'liability', accountSubType: 'current_liability', normalBalance: 'credit', isSystemAccount: false },
    { accountCode: '2500', accountName: 'Long Term Loans', accountType: 'liability', accountSubType: 'long_term_liability', normalBalance: 'credit', isSystemAccount: false },
    // Equity
    { accountCode: '3000', accountName: 'Owner Equity', accountType: 'equity', accountSubType: 'equity', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '3100', accountName: 'Retained Earnings', accountType: 'equity', accountSubType: 'retained_earnings', normalBalance: 'credit', isSystemAccount: true },
    // Revenue
    { accountCode: '4000', accountName: 'Sales Revenue', accountType: 'revenue', accountSubType: 'operating_revenue', normalBalance: 'credit', isSystemAccount: true },
    { accountCode: '4100', accountName: 'Service Revenue', accountType: 'revenue', accountSubType: 'operating_revenue', normalBalance: 'credit', isSystemAccount: false },
    { accountCode: '4900', accountName: 'Other Income', accountType: 'revenue', accountSubType: 'other_revenue', normalBalance: 'credit', isSystemAccount: false },
    // Expenses
    { accountCode: '5000', accountName: 'Cost of Goods Sold', accountType: 'expense', accountSubType: 'cost_of_goods', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '5100', accountName: 'Operating Expenses', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '5200', accountName: 'Salaries & Wages', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '5300', accountName: 'Rent Expense', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystemAccount: false },
    { accountCode: '5400', accountName: 'GST Input Credit', accountType: 'expense', accountSubType: 'tax_expense', normalBalance: 'debit', isSystemAccount: true },
    { accountCode: '5900', accountName: 'Depreciation', accountType: 'expense', accountSubType: 'depreciation', normalBalance: 'debit', isSystemAccount: false },
];

// POST /api/gl/accounts/seed
export const seedChartOfAccounts = async (req, res, next) => {
    try {
        const existing = await ChartOfAccounts.countDocuments({ company: req.user.company });
        if (existing > 0) return res.status(400).json({ success: false, error: 'Chart of accounts already seeded for this company' });

        const accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, company: req.user.company }));
        await ChartOfAccounts.insertMany(accounts);
        await logAudit({ action: 'GL_SEEDED', module: 'gl', description: `Chart of Accounts seeded with ${accounts.length} default accounts`, performedBy: req.user._id, performedByName: req.user.name, severity: 'info', company: req.user.company, req });
        res.json({ success: true, message: `${accounts.length} accounts created`, data: accounts });
    } catch (err) { next(err); }
};

// GET /api/gl/accounts
export const getAccounts = async (req, res, next) => {
    try {
        const { type = '' } = req.query;
        const query = { company: req.user.company, isActive: true };
        if (type) query.accountType = type;

        const accounts = await ChartOfAccounts.find(query).sort({ accountCode: 1 });
        res.json({ success: true, data: accounts });
    } catch (err) { next(err); }
};

// POST /api/gl/accounts
export const createAccount = async (req, res, next) => {
    try {
        const account = await ChartOfAccounts.create({ ...req.body, company: req.user.company });
        await logAudit({ action: 'GL_ACCOUNT_CREATED', module: 'gl', description: `GL Account "${account.accountName}" (${account.accountCode}) created`, performedBy: req.user._id, performedByName: req.user.name, targetId: account._id, targetRef: 'ChartOfAccounts', severity: 'info', company: req.user.company, req });
        res.status(201).json({ success: true, message: 'Account created', data: account });
    } catch (err) { next(err); }
};

// PUT /api/gl/accounts/:id
export const updateAccount = async (req, res, next) => {
    try {
        const account = await ChartOfAccounts.findOne({ _id: req.params.id, company: req.user.company });
        if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
        if (account.isSystemAccount && req.body.accountCode) {
            return res.status(400).json({ success: false, error: 'Cannot change code of system accounts' });
        }
        Object.assign(account, req.body);
        await account.save();
        await logAudit({ action: 'GL_ACCOUNT_UPDATED', module: 'gl', description: `GL Account "${account.accountName}" (${account.accountCode}) updated`, performedBy: req.user._id, performedByName: req.user.name, targetId: account._id, targetRef: 'ChartOfAccounts', severity: 'info', company: req.user.company, req });
        res.json({ success: true, message: 'Account updated', data: account });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// JOURNAL ENTRIES
// ════════════════════════════════════════════════

// GET /api/gl/journal
export const getJournalEntries = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status = '', sourceType = '', search = '', sourceId = '' } = req.query;
        const query = { company: req.user.company };
        if (status) query.status = status;
        if (sourceType) query.sourceType = sourceType;
        if (sourceId) query.sourceId = sourceId; // filter by linked document (invoice, SO, etc.)
        if (search) query.$or = [
            { entryNo: { $regex: search, $options: 'i' } },
            { narration: { $regex: search, $options: 'i' } },
            { sourceRef: { $regex: search, $options: 'i' } },
        ];

        const total = await JournalEntry.countDocuments(query);
        const entries = await JournalEntry.find(query)
            .populate('createdBy', 'name')
            .populate('postedBy', 'name')
            .sort({ date: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true, data: entries,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
};

// GET /api/gl/journal/:id
export const getJournalEntry = async (req, res, next) => {
    try {
        const entry = await JournalEntry.findOne({ _id: req.params.id, company: req.user.company })
            .populate('createdBy', 'name email')
            .populate('postedBy', 'name')
            .populate('lines.account', 'accountCode accountName accountType');
        if (!entry) return res.status(404).json({ success: false, error: 'Journal entry not found' });
        res.json({ success: true, data: entry });
    } catch (err) { next(err); }
};

// POST /api/gl/journal
export const createJournalEntry = async (req, res, next) => {
    try {
        const { date, narration, lines = [], sourceType = 'manual', sourceId, sourceRef } = req.body;

        if (lines.length < 2) return res.status(400).json({ success: false, error: 'Journal entry needs at least 2 lines' });

        // Validate double-entry balance
        const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
        const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        if (!isBalanced) {
            return res.status(400).json({
                success: false,
                error: `Entry is not balanced. Debits: ₹${totalDebit.toFixed(2)}, Credits: ₹${totalCredit.toFixed(2)}, Difference: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
            });
        }

        // Enrich lines with account details
        const enrichedLines = await Promise.all(lines.map(async (line) => {
            const account = await ChartOfAccounts.findById(line.account);
            return {
                ...line,
                accountCode: account?.accountCode || '',
                accountName: account?.accountName || '',
                debit: parseFloat(line.debit) || 0,
                credit: parseFloat(line.credit) || 0,
            };
        }));

        const entry = await JournalEntry.create({
            date, narration, lines: enrichedLines,
            totalDebit, totalCredit, isBalanced,
            sourceType, sourceId, sourceRef,
            company: req.user.company,
            createdBy: req.user._id,
        });

        await logAudit({ action: 'JE_CREATED', module: 'gl', description: `Journal Entry ${entry.entryNo} created — ₹${totalDebit} (${sourceType})`, performedBy: req.user._id, performedByName: req.user.name, targetId: entry._id, targetRef: 'JournalEntry', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Journal Entry Created', message: `${entry.entryNo} created by ${req.user.name} — ₹${totalDebit}`, type: 'info', module: 'gl', link: `/gl/journal/${entry._id}`, sourceRef: entry.entryNo });
        res.status(201).json({ success: true, message: 'Journal entry created', data: entry });
    } catch (err) { next(err); }
};

// PUT /api/gl/journal/:id/post
export const postJournalEntry = async (req, res, next) => {
    try {
        const entry = await JournalEntry.findOne({ _id: req.params.id, company: req.user.company });
        if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
        if (entry.status !== 'draft') return res.status(400).json({ success: false, error: 'Only draft entries can be posted' });
        if (!entry.isBalanced) return res.status(400).json({ success: false, error: 'Cannot post an unbalanced entry' });

        // Update account balances
        for (const line of entry.lines) {
            const account = await ChartOfAccounts.findById(line.account);
            if (!account) continue;

            // For debit-normal accounts (assets, expenses): debit increases, credit decreases
            // For credit-normal accounts (liabilities, equity, revenue): credit increases, debit decreases
            const balanceChange = account.normalBalance === 'debit'
                ? (line.debit - line.credit)
                : (line.credit - line.debit);

            await ChartOfAccounts.findByIdAndUpdate(line.account, {
                $inc: { currentBalance: balanceChange },
            });
        }

        entry.status = 'posted';
        entry.postedBy = req.user._id;
        entry.postedAt = new Date();
        await entry.save();

        await logAudit({ action: 'JE_POSTED', module: 'gl', description: `Journal Entry ${entry.entryNo} posted — ₹${entry.totalDebit}`, performedBy: req.user._id, performedByName: req.user.name, targetId: entry._id, targetRef: 'JournalEntry', severity: 'info', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Journal Entry Posted', message: `${entry.entryNo} posted by ${req.user.name}`, type: 'success', module: 'gl', link: `/gl/journal/${entry._id}`, sourceRef: entry.entryNo });
        res.json({ success: true, message: 'Journal entry posted', data: entry });
    } catch (err) { next(err); }
};

// PUT /api/gl/journal/:id/reverse
export const reverseJournalEntry = async (req, res, next) => {
    try {
        const original = await JournalEntry.findOne({ _id: req.params.id, company: req.user.company });
        if (!original) return res.status(404).json({ success: false, error: 'Entry not found' });
        if (original.status !== 'posted') return res.status(400).json({ success: false, error: 'Only posted entries can be reversed' });
        if (original.reversedBy) return res.status(400).json({ success: false, error: 'Entry already reversed' });

        // Create reversal — flip debits and credits
        const reversalLines = original.lines.map(line => ({
            account: line.account,
            accountCode: line.accountCode,
            accountName: line.accountName,
            debit: line.credit,
            credit: line.debit,
            description: `Reversal: ${line.description || ''}`,
        }));

        const reversal = await JournalEntry.create({
            date: new Date(),
            narration: `Reversal of ${original.entryNo}: ${original.narration}`,
            lines: reversalLines,
            totalDebit: original.totalCredit,
            totalCredit: original.totalDebit,
            isBalanced: true,
            sourceType: 'adjustment',
            sourceRef: original.entryNo,
            reversalOf: original._id,
            company: req.user.company,
            createdBy: req.user._id,
        });

        // Auto-post the reversal and update balances
        for (const line of reversal.lines) {
            const account = await ChartOfAccounts.findById(line.account);
            if (!account) continue;
            const balanceChange = account.normalBalance === 'debit'
                ? (line.debit - line.credit)
                : (line.credit - line.debit);
            await ChartOfAccounts.findByIdAndUpdate(line.account, { $inc: { currentBalance: balanceChange } });
        }

        reversal.status = 'posted';
        reversal.postedBy = req.user._id;
        reversal.postedAt = new Date();
        await reversal.save();

        // Mark original as reversed
        original.status = 'reversed';
        original.reversedBy = reversal._id;
        await original.save();

        await logAudit({ action: 'JE_REVERSED', module: 'gl', description: `Journal Entry ${original.entryNo} reversed → new entry ${reversal.entryNo}`, performedBy: req.user._id, performedByName: req.user.name, targetId: reversal._id, targetRef: 'JournalEntry', severity: 'warning', company: req.user.company, req });
        await notifyCompany({ company: req.user.company, title: 'Journal Entry Reversed', message: `${original.entryNo} reversed by ${req.user.name} → ${reversal.entryNo}`, type: 'warning', module: 'gl', link: `/gl/journal/${reversal._id}`, sourceRef: reversal.entryNo });
        res.json({ success: true, message: 'Entry reversed', data: reversal });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// FINANCIAL REPORTS
// ════════════════════════════════════════════════

// GET /api/gl/reports/trial-balance
export const getTrialBalance = async (req, res, next) => {
    try {
        const accounts = await ChartOfAccounts.find({
            company: req.user.company,
            isActive: true,
            currentBalance: { $ne: 0 },
        }).sort({ accountCode: 1 });

        const rows = accounts.map(acc => ({
            accountCode: acc.accountCode,
            accountName: acc.accountName,
            accountType: acc.accountType,
            debit: acc.normalBalance === 'debit' && acc.currentBalance > 0 ? acc.currentBalance : 0,
            credit: acc.normalBalance === 'credit' && acc.currentBalance > 0 ? acc.currentBalance : 0,
        }));

        const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
        const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        res.json({ success: true, data: { rows, totalDebit, totalCredit, isBalanced } });
    } catch (err) { next(err); }
};

// GET /api/gl/reports/balance-sheet
export const getBalanceSheet = async (req, res, next) => {
    try {
        const accounts = await ChartOfAccounts.find({
            company: req.user.company,
            isActive: true,
            accountType: { $in: ['asset', 'liability', 'equity'] },
        }).sort({ accountCode: 1 });

        const group = (type) => accounts
            .filter(a => a.accountType === type)
            .map(a => ({ code: a.accountCode, name: a.accountName, subType: a.accountSubType, balance: a.currentBalance }));

        const assets = group('asset');
        const liabilities = group('liability');
        const equity = group('equity');

        const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
        const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
        const totalEquity = equity.reduce((s, a) => s + a.balance, 0);
        const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

        res.json({
            success: true,
            data: { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, isBalanced },
        });
    } catch (err) { next(err); }
};

// GET /api/gl/reports/profit-loss
export const getProfitLoss = async (req, res, next) => {
    try {
        const { fromDate, toDate } = req.query;

        // Get journal lines posted in date range
        const matchStage = {
            company: req.user.company,
            status: 'posted',
            ...(fromDate || toDate ? {
                date: {
                    ...(fromDate ? { $gte: new Date(fromDate) } : {}),
                    ...(toDate ? { $lte: new Date(toDate) } : {}),
                },
            } : {}),
        };

        const entries = await JournalEntry.find(matchStage);

        // Aggregate by account
        const accountTotals = {};
        for (const entry of entries) {
            for (const line of entry.lines) {
                const key = line.account.toString();
                if (!accountTotals[key]) accountTotals[key] = { debit: 0, credit: 0, accountCode: line.accountCode, accountName: line.accountName };
                accountTotals[key].debit += line.debit;
                accountTotals[key].credit += line.credit;
            }
        }

        // Get revenue and expense accounts
        const revenueAccounts = await ChartOfAccounts.find({ company: req.user.company, accountType: 'revenue' });
        const expenseAccounts = await ChartOfAccounts.find({ company: req.user.company, accountType: 'expense' });

        const buildPLRows = (accounts) => accounts.map(acc => {
            const totals = accountTotals[acc._id.toString()] || { debit: 0, credit: 0 };
            // Revenue: net = credit - debit; Expense: net = debit - credit
            const net = acc.accountType === 'revenue'
                ? totals.credit - totals.debit
                : totals.debit - totals.credit;
            return { code: acc.accountCode, name: acc.accountName, subType: acc.accountSubType, amount: net };
        }).filter(r => r.amount !== 0);

        const revenues = buildPLRows(revenueAccounts);
        const expenses = buildPLRows(expenseAccounts);
        const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
        const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        res.json({
            success: true,
            data: { revenues, expenses, totalRevenue, totalExpenses, netProfit, fromDate, toDate },
        });
    } catch (err) { next(err); }
};

// ════════════════════════════════════════════════
// PHASE 6 GL STUB — Auto-post GL when payment run executes
// Called from paymentController after execution
// ════════════════════════════════════════════════
export const postPaymentRunGL = async (company, userId, run) => {
    try {
        // Get system accounts
        const apAccount = await ChartOfAccounts.findOne({ company, accountCode: '2000' }); // Accounts Payable
        const bankAccount = await ChartOfAccounts.findOne({ company, accountCode: '1010' }); // Bank Account
        if (!apAccount || !bankAccount) return null;

        const processedEntries = run.entries.filter(e => e.status === 'processed');
        if (!processedEntries.length) return null;

        const totalNet = processedEntries.reduce((s, e) => s + e.amount, 0);

        // Double entry: Dr Accounts Payable / Cr Bank Account
        const lines = [
            {
                account: apAccount._id,
                accountCode: apAccount.accountCode,
                accountName: apAccount.accountName,
                debit: totalNet,
                credit: 0,
                description: `Payment run ${run.runNumber}`,
            },
            {
                account: bankAccount._id,
                accountCode: bankAccount.accountCode,
                accountName: bankAccount.accountName,
                debit: 0,
                credit: totalNet,
                description: `Payment run ${run.runNumber}`,
            },
        ];

        const entry = await JournalEntry.create({
            date: new Date(),
            narration: `Payment Run ${run.runNumber} — ${processedEntries.length} invoices paid`,
            lines,
            totalDebit: totalNet,
            totalCredit: totalNet,
            isBalanced: true,
            sourceType: 'payment_run',
            sourceId: run._id,
            sourceRef: run.runNumber,
            status: 'posted',
            postedBy: userId,
            postedAt: new Date(),
            company,
        });

        // Update account balances
        // AP: debit reduces liability (credit-normal account)
        await ChartOfAccounts.findByIdAndUpdate(apAccount._id, { $inc: { currentBalance: -totalNet } });
        // Bank: credit reduces asset (debit-normal account)
        await ChartOfAccounts.findByIdAndUpdate(bankAccount._id, { $inc: { currentBalance: -totalNet } });

        return entry;
    } catch (err) {
        console.error('GL posting error:', err.message);
        return null;
    }
};