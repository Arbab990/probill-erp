import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, CheckCircle, RotateCcw } from 'lucide-react';
import { glService } from '../../services/glService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Table from '../../components/common/Table.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import usePermission from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
    draft: 'badge-muted', posted: 'badge-success', reversed: 'badge-danger',
};

const SOURCE_COLORS = {
    manual: 'badge-muted', invoice: 'badge-info', payment: 'badge-primary',
    payment_run: 'badge-warning', sales_order: 'badge-success', adjustment: 'badge-danger',
};

const JournalEntryList = () => {
    const navigate = useNavigate();
    const { isSuperAdmin, isFinanceManager } = usePermission();
    const canPost = isSuperAdmin || isFinanceManager;

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [acting, setActing] = useState(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await glService.getJournalEntries({ page, limit: 20, status: statusFilter, search });
            setEntries(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load journal entries'); }
        finally { setLoading(false); }
    }, [page, statusFilter, search]);

    useEffect(() => { fetch(); }, [fetch]);

    const handlePost = async (id) => {
        setActing(id);
        try {
            await glService.postEntry(id);
            toast.success('Entry posted — account balances updated');
            fetch();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to post'); }
        finally { setActing(null); }
    };

    const handleReverse = async (id) => {
        setActing(id);
        try {
            await glService.reverseEntry(id);
            toast.success('Entry reversed');
            fetch();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to reverse'); }
        finally { setActing(null); }
    };

    const columns = [
        { key: 'entryNo', label: 'Entry #', render: r => <span className="font-mono text-secondary text-sm">{r.entryNo}</span> },
        { key: 'date', label: 'Date', render: r => formatDate(r.date) },
        {
            key: 'narration', label: 'Narration', render: r => (
                <div>
                    <p className="text-slate-200 text-sm font-medium truncate max-w-xs">{r.narration}</p>
                    {r.sourceRef && <p className="text-xs text-slate-500 font-mono">{r.sourceRef}</p>}
                </div>
            )
        },
        { key: 'sourceType', label: 'Source', render: r => <Badge type="custom" status={SOURCE_COLORS[r.sourceType] || 'badge-muted'} label={r.sourceType.replace(/_/g, ' ')} /> },
        { key: 'totalDebit', label: 'Debit', render: r => <span className="font-mono text-sm">{formatCurrency(r.totalDebit)}</span> },
        { key: 'totalCredit', label: 'Credit', render: r => <span className="font-mono text-sm">{formatCurrency(r.totalCredit)}</span> },
        {
            key: 'isBalanced', label: 'Balanced', render: r => r.isBalanced
                ? <span className="text-success text-xs font-mono">✓ Yes</span>
                : <span className="text-danger text-xs font-mono">✗ No</span>
        },
        { key: 'status', label: 'Status', render: r => <Badge type="custom" status={STATUS_COLORS[r.status] || 'badge-muted'} label={r.status} /> },
        {
            key: 'actions', label: 'Actions', render: r => (
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/gl/journal/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye size={14} /></button>
                    {canPost && r.status === 'draft' && (
                        <button onClick={() => handlePost(r._id)} disabled={acting === r._id} className="p-1.5 rounded text-slate-400 hover:text-success hover:bg-success/10 transition-colors" title="Post">
                            <CheckCircle size={14} />
                        </button>
                    )}
                    {canPost && r.status === 'posted' && !r.reversedBy && (
                        <button onClick={() => handleReverse(r._id)} disabled={acting === r._id} className="p-1.5 rounded text-slate-400 hover:text-warning hover:bg-warning/10 transition-colors" title="Reverse">
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Journal Entries"
                subtitle="All double-entry bookkeeping records"
                breadcrumbs={[{ label: 'General Ledger', href: '/gl' }, { label: 'Journal Entries' }]}
                actions={canPost && <Button icon={Plus} onClick={() => navigate('/gl/journal/new')}>New Entry</Button>}
            />

            <div className="flex flex-col sm:flex-row gap-3">
                <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by entry number or narration..." className="flex-1" />
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[150px]">
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="posted">Posted</option>
                    <option value="reversed">Reversed</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={entries} loading={loading} emptyMessage="No journal entries. Seed your chart of accounts first, then create entries." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={20} onPageChange={setPage} />
            </div>
        </div>
    );
};

export default JournalEntryList;