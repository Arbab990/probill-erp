import { Search, X } from 'lucide-react';

const SearchBar = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
    <div className={`flex items-center gap-2 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 focus-within:border-primary/50 transition-colors ${className}`}>
        <Search size={14} className="text-slate-500 flex-shrink-0" />
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full font-body"
        />
        {value && (
            <button onClick={() => onChange('')} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={14} />
            </button>
        )}
    </div>
);

export default SearchBar;