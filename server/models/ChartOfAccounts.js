import mongoose from 'mongoose';

const coaSchema = new mongoose.Schema(
    {
        accountCode: { type: String, required: true },
        accountName: { type: String, required: true, trim: true },
        accountType: {
            type: String,
            enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
            required: true,
        },
        accountSubType: {
            type: String,
            enum: [
                // Assets
                'current_asset', 'fixed_asset', 'bank', 'cash', 'accounts_receivable',
                // Liabilities
                'current_liability', 'long_term_liability', 'accounts_payable',
                // Equity
                'equity', 'retained_earnings',
                // Revenue
                'operating_revenue', 'other_revenue',
                // Expenses
                'operating_expense', 'cost_of_goods', 'tax_expense', 'depreciation',
            ],
        },
        normalBalance: { type: String, enum: ['debit', 'credit'], required: true },
        // debit increases assets/expenses, credit increases liabilities/equity/revenue
        parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts' },
        isSystemAccount: { type: Boolean, default: false }, // cannot be deleted
        isActive: { type: Boolean, default: true },
        description: String,
        currentBalance: { type: Number, default: 0 },
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    },
    { timestamps: true }
);

// Compound unique index: accountCode unique per company
coaSchema.index({ accountCode: 1, company: 1 }, { unique: true });

export default mongoose.model('ChartOfAccounts', coaSchema);