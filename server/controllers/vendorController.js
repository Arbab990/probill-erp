import Vendor from '../models/Vendor.js';
import { logAudit } from '../services/auditService.js';
import { notifyCompany } from '../services/notificationService.js';

// GET /api/vendors
export const getVendors = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', category = '' } = req.query;
        const query = { company: req.user.company };
        if (search) query.name = { $regex: search, $options: 'i' };
        if (status) query.status = status;
        if (category) query.category = category;

        const total = await Vendor.countDocuments(query);
        const vendors = await Vendor.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: vendors,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
};

// GET /api/vendors/:id
export const getVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ _id: req.params.id, company: req.user.company })
            .populate('createdBy', 'name email');
        if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
        res.json({ success: true, data: vendor });
    } catch (err) { next(err); }
};

// POST /api/vendors
export const createVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.create({ ...req.body, company: req.user.company, createdBy: req.user._id });
        await logAudit({
            action: 'VENDOR_CREATED',
            module: 'vendors',
            description: `Vendor "${vendor.name}" (${vendor.vendorCode}) registered`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: vendor._id,
            targetRef: 'Vendor',
            severity: 'info',
            company: req.user.company,
            req,
        });
        await notifyCompany({ company: req.user.company, title: 'New Vendor Registered', message: `${vendor.name} registered by ${req.user.name}`, type: 'info', module: 'vendors', link: `/vendors/${vendor._id}`, sourceRef: vendor.vendorCode });
        res.status(201).json({ success: true, message: 'Vendor created successfully', data: vendor });
    } catch (err) { next(err); }
};

// PUT /api/vendors/:id
export const updateVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            req.body,
            { new: true, runValidators: true }
        );
        if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
        await logAudit({
            action: 'VENDOR_UPDATED',
            module: 'vendors',
            description: `Vendor "${vendor.name}" (${vendor.vendorCode}) details updated`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: vendor._id,
            targetRef: 'Vendor',
            severity: 'info',
            company: req.user.company,
            req,
        });
        await notifyCompany({ company: req.user.company, title: 'Vendor Updated', message: `${vendor.name} details updated by ${req.user.name}`, type: 'info', module: 'vendors', link: `/vendors/${vendor._id}`, sourceRef: vendor.vendorCode });
        res.json({ success: true, message: 'Vendor updated', data: vendor });
    } catch (err) { next(err); }
};

// DELETE /api/vendors/:id
export const deleteVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, company: req.user.company });
        if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
        await logAudit({
            action: 'VENDOR_DELETED',
            module: 'vendors',
            description: `Vendor "${vendor.name}" (${vendor.vendorCode}) deleted`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: vendor._id,
            targetRef: 'Vendor',
            severity: 'warning',
            company: req.user.company,
            req,
        });
        await notifyCompany({ company: req.user.company, title: 'Vendor Deleted', message: `${vendor.name} deleted by ${req.user.name}`, type: 'warning', module: 'vendors', sourceRef: vendor.vendorCode });
        res.json({ success: true, message: 'Vendor deleted' });
    } catch (err) { next(err); }
};

// PUT /api/vendors/:id/status
export const updateVendorStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'under_review', 'verified', 'blacklisted'];
        if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
        const vendor = await Vendor.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            { status },
            { new: true }
        );
        if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
        await logAudit({
            action: 'VENDOR_STATUS_CHANGED',
            module: 'vendors',
            description: `Vendor "${vendor.name}" (${vendor.vendorCode}) status changed to "${status}"`,
            performedBy: req.user._id,
            performedByName: req.user.name,
            targetId: vendor._id,
            targetRef: 'Vendor',
            severity: status === 'blacklisted' ? 'critical' : status === 'verified' ? 'info' : 'warning',
            company: req.user.company,
            req,
        });
        await notifyCompany({ company: req.user.company, title: `Vendor ${status === 'verified' ? 'Approved' : status === 'blacklisted' ? 'Blacklisted' : 'Status Changed'}`, message: `${vendor.name} ${status === 'verified' ? 'approved' : status === 'blacklisted' ? 'blacklisted' : `marked as ${status}`} by ${req.user.name}`, type: status === 'blacklisted' ? 'danger' : status === 'verified' ? 'success' : 'warning', module: 'vendors', link: `/vendors/${vendor._id}`, sourceRef: vendor.vendorCode });
        res.json({ success: true, message: `Vendor status updated to ${status}`, data: vendor });
    } catch (err) { next(err); }
};
