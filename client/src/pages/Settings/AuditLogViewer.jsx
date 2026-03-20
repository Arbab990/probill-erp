import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settingsService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import Table from '../../components/common/Table.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import { formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = {
    info: 'badge-info',
    warning: 'badge-warning',
    critical: 'badge-danger',
};

const MODULE_COLORS = {
    settings: 'badge-muted',
    invoices: 'badge-primary',
    vendors: 'badge-warning',
    purchase: 'badge-success',
    orders: 'badge-secondary',
    payments: 'badge-info',
    gl: 'badge-danger',
};

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await settingsService.getAuditLog({
                page, limit: 30,
                module: moduleFilter,
                severity: severityFilter,
                search,
            });
            setLogs(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load audit log'); }
        finally { setLoading(false); }
    }, [page, moduleFilter, severityFilter, search]);

    useEffect(() => { fetch(); }, [fetch]);

    const columns = [
        {
            key: 'action', label: 'Action', render: r => (
                <div>
                    <p className="font-mono text-xs text-primary-light font-bold">{r.action}</p>
                    <p className="text-xs text-slate-400 font-body mt-0.5">{r.description}</p>
                </div>
            )
        },
        { key: 'module', label: 'Module', render: r => <Badge type="custom" status={MODULE_COLORS[r.module] || 'badge-muted'} label={r.module} /> },
        { key: 'severity', label: 'Severity', render: r => <Badge type="custom" status={SEVERITY_COLORS[r.severity] || 'badge-muted'} label={r.severity} /> },
        {
            key: 'performedBy', label: 'Performed By', render: r => (
                <div>
                    <p className="text-sm text-slate-200">{r.performedByName || r.performedBy?.name || '—'}</p>
                    {r.targetRef && <p className="text-xs text-slate-500 font-mono">{r.targetRef}</p>}
                </div>
            )
        },
        { key: 'ipAddress', label: 'IP Address', render: r => <span className="text-xs font-mono text-slate-500">{r.ipAddress || '—'}</span> },
        { key: 'createdAt', label: 'Time', render: r => <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span> },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Audit Log"
                subtitle={`${pagination.total || 0} total events recorded`}
                breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Audit Log' }]}
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search actions, users..." className="flex-1" />
                <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[140px]">
                    <option value="">All Modules</option>
                    {['settings', 'invoices', 'vendors', 'purchase', 'orders', 'payments', 'gl'].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[140px]">
                    <option value="">All Severities</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                </select>
            </div>

            <Card className="p-0 overflow-hidden">
                <Table columns={columns} data={logs} loading={loading} emptyMessage="No audit events yet. Events are recorded automatically as users perform actions." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={30} onPageChange={setPage} />
            </Card>
        </div>
    );
};

export default AuditLogViewer;