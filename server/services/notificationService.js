import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Create notification for specific user
export const notify = async ({ recipient, title, message, type = 'info', module = 'system', link, sourceRef, company }) => {
    try {
        await Notification.create({ recipient, title, message, type, module, link, sourceRef, company });
    } catch (err) {
        console.error('Notification error (non-critical):', err.message);
    }
};

// Notify all users in a company with a given role (or all users)
export const notifyCompany = async ({ company, roles = null, title, message, type = 'info', module = 'system', link, sourceRef }) => {
    try {
        const query = { company, isActive: { $ne: false } };
        if (roles?.length) query.role = { $in: roles };
        const users = await User.find(query).select('_id');
        if (!users.length) return;
        const notifications = users.map(u => ({
            recipient: u._id, title, message, type, module, link, sourceRef, company,
        }));
        await Notification.insertMany(notifications);
    } catch (err) {
        console.error('Notify company error:', err.message);
    }
};