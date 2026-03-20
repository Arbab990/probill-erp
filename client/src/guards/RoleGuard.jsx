import useAuth from '../hooks/useAuth.js';

const RoleGuard = ({ roles, children, fallback = null }) => {
    const { role } = useAuth();
    if (!roles || roles.length === 0) return children;
    if (!role || !roles.includes(role)) return fallback;
    return children;
};

export default RoleGuard;