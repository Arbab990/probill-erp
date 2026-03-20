import { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

const AIInsightCard = ({ summary, loading, onRefresh, fallback }) => (
    <div className="card border border-primary/20 bg-gradient-to-br from-primary/5 to-dark-card relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles size={15} className="text-primary-light" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-primary-light font-body uppercase tracking-wider">AI Financial Summary</p>
                    <p className="text-[11px] text-slate-500 font-body">Powered by Gemini</p>
                </div>
            </div>
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors disabled:opacity-40"
                    title="Refresh AI summary"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            )}
        </div>

        <div className="mt-3 relative z-10">
            {loading ? (
                <div className="space-y-2">
                    {[80, 95, 60].map((w, i) => (
                        <div key={i} className="h-3.5 bg-primary/10 rounded animate-pulse" style={{ width: `${w}%` }} />
                    ))}
                </div>
            ) : fallback ? (
                <div className="flex items-start gap-2 text-slate-500">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-body">{summary}</p>
                </div>
            ) : (
                <p className="text-sm text-slate-300 font-body leading-relaxed">{summary || 'No summary available.'}</p>
            )}
        </div>
    </div>
);

export default AIInsightCard;