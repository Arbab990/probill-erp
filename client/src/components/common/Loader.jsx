import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 20, className = '' }) => (
    <Loader2 size={size} className={`animate-spin text-primary ${className}`} />
);

export const PageLoader = () => (
    <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
            <Spinner size={32} />
            <p className="text-sm text-slate-400 font-body">Loading...</p>
        </div>
    </div>
);

export const SkeletonRow = () => (
    <tr>
        {[...Array(5)].map((_, i) => (
            <td key={i} className="px-4 py-3">
                <div className="h-4 bg-dark-hover rounded animate-pulse" style={{ width: `${Math.random() * 40 + 40}%` }} />
            </td>
        ))}
    </tr>
);

export default Spinner;