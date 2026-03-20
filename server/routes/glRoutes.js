import express from 'express';
import {
    seedChartOfAccounts, getAccounts, createAccount, updateAccount,
    getJournalEntries, getJournalEntry, createJournalEntry,
    postJournalEntry, reverseJournalEntry,
    getTrialBalance, getBalanceSheet, getProfitLoss,
} from '../controllers/glController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();
router.use(protect);

// Chart of Accounts
router.post('/accounts/seed', authorize('super_admin', 'finance_manager'), seedChartOfAccounts);
router.get('/accounts', getAccounts);
router.post('/accounts', authorize('super_admin', 'finance_manager'), createAccount);
router.put('/accounts/:id', authorize('super_admin', 'finance_manager'), updateAccount);

// Journal Entries
router.get('/journal', getJournalEntries);
router.post('/journal', authorize('super_admin', 'finance_manager'), createJournalEntry);
router.get('/journal/:id', getJournalEntry);
router.put('/journal/:id/post', authorize('super_admin', 'finance_manager'), postJournalEntry);
router.put('/journal/:id/reverse', authorize('super_admin', 'finance_manager'), reverseJournalEntry);

// Reports
router.get('/reports/trial-balance', getTrialBalance);
router.get('/reports/balance-sheet', getBalanceSheet);
router.get('/reports/profit-loss', getProfitLoss);

export default router;