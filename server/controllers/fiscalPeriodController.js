import FiscalPeriod from '../models/FiscalPeriod.js';
import JournalEntry from '../models/JournalEntry.js';
import { logAudit } from '../services/auditService.js';

// ── Helper: get or auto-create the period for a given year/month ──────────────
const getOrCreatePeriod = async (company, year, month) => {
    const existing = await FiscalPeriod.findOne({ company, year, month });
    if (existing) return existing;

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return FiscalPeriod.create({
        company, year, month,
        name: `${MONTHS[month - 1]} ${year}`,
        startDate, endDate,
        status: 'open',
    });
};

// GET /api/fiscal-periods
export const getFiscalPeriods = async (req, res, next) => {
    try {
        const { year } = req.query;
        const query = { company: req.user.company };
        if (year) query.year = parseInt(year);

        // Auto-generate the current and past 12 months if they don't exist
        const now = new Date();
        for (let i = 0; i < 13; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            await getOrCreatePeriod(req.user.company, d.getFullYear(), d.getMonth() + 1);
        }

        const periods = await FiscalPeriod.find(query)
            .populate('lockedBy', 'name')
            .sort({ year: -1, month: -1 });

        res.json({ success: true, data: periods });
    } catch (err) { next(err); }
};

// PUT /api/fiscal-periods/:id/lock
export const lockPeriod = async (req, res, next) => {
    try {
        const period = await FiscalPeriod.findOne({ _id: req.params.id, company: req.user.company });
        if (!period) return res.status(404).json({ success: false, error: 'Fiscal period not found' });
        if (period.status === 'locked') return res.status(400).json({ success: false, error: 'Period is already locked' });

        // Count open JEs in this period (warn but allow lock)
        const openJEs = await JournalEntry.countDocuments({
            company: req.user.company,
            status: 'draft',
            date: { $gte: period.startDate, $lte: period.endDate },
        });

        period.status = 'locked';
        period.lockedBy = req.user._id;
        period.lockedAt = new Date();
        await period.save();

        await logAudit({
            action: 'FISCAL_PERIOD_LOCKED',
            module: 'gl',
            description: `Fiscal period "${period.name}" locked by ${req.user.name}${openJEs > 0 ? ` (${openJEs} draft JEs remain)` : ''}`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: period._id,
            targetRef: 'FiscalPeriod',
            severity: 'warning',
            company: req.user.company,
            req,
        });

        res.json({
            success: true,
            message: `Period "${period.name}" locked`,
            data: period,
            warning: openJEs > 0 ? `${openJEs} draft journal entries in this period were not posted` : null,
        });
    } catch (err) { next(err); }
};

// PUT /api/fiscal-periods/:id/unlock
export const unlockPeriod = async (req, res, next) => {
    try {
        const period = await FiscalPeriod.findOne({ _id: req.params.id, company: req.user.company });
        if (!period) return res.status(404).json({ success: false, error: 'Fiscal period not found' });
        if (period.status === 'open') return res.status(400).json({ success: false, error: 'Period is already open' });

        period.status = 'open';
        period.lockedBy = undefined;
        period.lockedAt = undefined;
        await period.save();

        await logAudit({
            action: 'FISCAL_PERIOD_UNLOCKED',
            module: 'gl',
            description: `Fiscal period "${period.name}" unlocked by ${req.user.name}`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: period._id,
            targetRef: 'FiscalPeriod',
            severity: 'warning',
            company: req.user.company,
            req,
        });

        res.json({ success: true, message: `Period "${period.name}" unlocked`, data: period });
    } catch (err) { next(err); }
};

// ── Middleware: check period is open before allowing JE post ─────────────────
// Called from glController before posting a journal entry
export const checkPeriodOpen = async (company, date) => {
    const d = new Date(date || new Date());
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const period = await FiscalPeriod.findOne({ company, year, month });
    if (period && period.status === 'locked') {
        throw new Error(`Fiscal period "${period.name}" is locked. Unlock it before posting entries.`);
    }
};