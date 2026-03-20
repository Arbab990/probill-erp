import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Building2, Users, ShoppingCart, CreditCard } from 'lucide-react';
import { searchService } from '../../services/searchService.js';
import { useDebounce } from '../../hooks/useDebounce.js';

const TYPE_ICONS = {
    'Invoice': FileText,
    'Vendor': Building2,
    'Customer': Users,
    'Purchase Order': ShoppingCart,
    'PR': ShoppingCart,
    'Sales Order': FileText,
    'Payment Run': CreditCard,
};

const TYPE_COLORS = {
    'Invoice': 'text-primary-light',
    'Vendor': 'text-warning',
    'Customer': 'text-secondary',
    'Purchase Order': 'text-success',
    'PR': 'text-success',
    'Sales Order': 'text-secondary',
    'Payment Run': 'text-danger',
};

const GlobalSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const debouncedQuery = useDebounce(query, 300);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Global keyboard shortcut: Ctrl+K / Cmd+K
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Search on debounced query
    useEffect(() => {
        if (debouncedQuery.length < 2) { setResults([]); setOpen(false); return; }
        setLoading(true);
        searchService.search(debouncedQuery)
            .then(r => { setResults(r.data.data); setOpen(true); setSelectedIdx(0); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [debouncedQuery]);

    const handleKeyDown = (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(p => Math.min(p + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(p => Math.max(p - 1, 0)); }
        if (e.key === 'Enter' && results[selectedIdx]) { handleSelect(results[selectedIdx]); }
    };

    const handleSelect = (result) => {
        navigate(result.link);
        setQuery('');
        setOpen(false);
        setResults([]);
    };

    const handleClear = () => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); };

    return (
        <div className="relative w-full max-w-md" ref={containerRef}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${open ? 'border-primary/40 bg-dark-card' : 'border-dark-border bg-dark-bg hover:border-dark-border/80'}`}>
                {loading
                    ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
                    : <Search size={15} className="text-slate-500 flex-shrink-0" />
                }
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (results.length) setOpen(true); }}
                    placeholder="Search anything..."
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none font-body min-w-0"
                />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {query ? (
                        <button onClick={handleClear} className="p-0.5 rounded text-slate-500 hover:text-slate-300">
                            <X size={13} />
                        </button>
                    ) : (
                        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-dark-border text-[10px] text-slate-600 font-mono">
                            ⌘K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Results Dropdown */}
            {open && results.length > 0 && (
                <div className="absolute top-10 left-0 right-0 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="py-1 max-h-80 overflow-y-auto">
                        {results.map((result, idx) => {
                            const Icon = TYPE_ICONS[result.type] || FileText;
                            const color = TYPE_COLORS[result.type] || 'text-slate-400';
                            return (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === selectedIdx ? 'bg-primary/10' : 'hover:bg-dark-hover'}`}
                                >
                                    <div className={`w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={13} className={color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 truncate">{result.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[10px] font-mono font-bold ${color}`}>{result.type}</span>
                                        {result.status && (
                                            <span className="text-[10px] text-slate-600 capitalize">{result.status}</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="px-4 py-2 border-t border-dark-border bg-dark-bg/50 flex items-center gap-3 text-[10px] text-slate-600">
                        <span>↑↓ navigate</span>
                        <span>↵ select</span>
                        <span>esc close</span>
                    </div>
                </div>
            )}

            {/* No results */}
            {open && query.length >= 2 && !loading && results.length === 0 && (
                <div className="absolute top-10 left-0 right-0 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 px-4 py-6 text-center">
                    <p className="text-sm text-slate-500 font-body">No results for "<span className="text-slate-300">{query}</span>"</p>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;