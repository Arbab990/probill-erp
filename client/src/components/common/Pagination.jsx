import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ page = 1, pages = 0, total = 0, limit = 10, onPageChange }) => {
    if (!pages || pages <= 1) return null;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border">
            <p className="text-sm text-slate-400 font-body">Showing <span className="text-slate-200 font-medium">{start}–{end}</span> of <span className="text-slate-200 font-medium">{total}</span></p>
            <div className="flex items-center gap-1">
                <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={16} />
                </button>
                {[...Array(Math.min(pages, 5))].map((_, i) => {
                    const p = i + 1;
                    return (
                        <button key={p} onClick={() => onPageChange(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-dark-hover'}`}>
                            {p}
                        </button>
                    );
                })}
                <button onClick={() => onPageChange(page + 1)} disabled={page === pages} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;