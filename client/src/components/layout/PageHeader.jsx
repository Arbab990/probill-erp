import { ChevronRight } from 'lucide-react';

const PageHeader = ({ title, subtitle, breadcrumbs, actions }) => (
    <div className="flex items-start justify-between gap-4 mb-6">
        <div>
            {breadcrumbs?.length > 0 && (
                <nav className="flex items-center gap-1 mb-1.5">
                    {breadcrumbs.map((crumb, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && <ChevronRight size={12} className="text-slate-600" />}
                            {crumb.href
                                ? <a href={crumb.href} className="text-xs text-slate-500 hover:text-slate-300">{crumb.label}</a>
                                : <span className="text-xs text-slate-400">{crumb.label}</span>}
                        </span>
                    ))}
                </nav>
            )}
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="text-sm text-slate-400 font-body mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
);

export default PageHeader;