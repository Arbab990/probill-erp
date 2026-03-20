import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';

const NotFound = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center">
            <div className="text-center space-y-5 max-w-md px-4">
                <div className="text-8xl font-display font-black text-primary/20 select-none">404</div>
                <div>
                    <h1 className="font-display font-bold text-2xl text-slate-100">Page Not Found</h1>
                    <p className="text-slate-400 font-body mt-2">The page you're looking for doesn't exist or has been moved.</p>
                </div>
                <div className="flex gap-3 justify-center">
                    <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
                    <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;