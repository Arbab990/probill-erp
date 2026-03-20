import useAuthStore from '../store/authStore.js';

const useAuth = () => {
    const { user, token, isAuthenticated, setAuth, logout, updateUser } = useAuthStore();
    return { user, token, isAuthenticated, setAuth, logout, updateUser, role: user?.role, company: user?.company };
};

export default useAuth;