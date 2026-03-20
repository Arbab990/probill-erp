import useAuth from './useAuth.js';
import { PERMISSIONS } from '../utils/constants.js';

const usePermission = () => {
    const { role } = useAuth();
    const can = (module, action) => {
        if (!role) return false;
        return PERMISSIONS[module]?.[action]?.includes(role) ?? false;
    };
    return {
        can,
        isSuperAdmin: role === 'super_admin',
        isFinanceManager: role === 'finance_manager',
        isProcurementOfficer: role === 'procurement_officer',
        isSalesExecutive: role === 'sales_executive',
        isAuditor: role === 'auditor',
        isViewer: role === 'viewer',
        role,
    };
};

export default usePermission;