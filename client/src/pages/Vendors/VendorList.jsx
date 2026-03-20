import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { vendorService } from '../../services/vendorService.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Table from '../../components/common/Table.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import usePermission from '../../hooks/usePermission.js';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters.js';

const VendorList = () => {
    const navigate = useNavigate();
    const { can } = usePermission();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchVendors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await vendorService.getAll({ page, limit: 10, search, status: statusFilter });
            setVendors(res.data.data);
            setPagination(res.data.pagination);
        } catch { toast.error('Failed to load vendors'); }
        finally { setLoading(false); }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchVendors(); }, [fetchVendors]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await vendorService.delete(deleteTarget._id);
            toast.success('Vendor deleted');
            setDeleteTarget(null);
            fetchVendors();
        } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
        finally { setDeleting(false); }
    };

    const columns = [
        { key: 'vendorCode', label: 'Code', width: '100px' },
        {
            key: 'name', label: 'Vendor Name', render: r => (
                <div>
                    <p className="font-medium text-slate-200">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.email || '—'}</p>
                </div>
            )
        },
        { key: 'category', label: 'Category', render: r => <span className="capitalize">{r.category}</span> },
        { key: 'paymentTerms', label: 'Payment Terms', render: r => `Net ${r.paymentTerms} days` },
        { key: 'status', label: 'Status', render: r => <Badge type="vendor" status={r.status} /> },
        { key: 'createdAt', label: 'Added', render: r => formatDate(r.createdAt) },
        {
            key: 'actions', label: 'Actions', render: r => (
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/vendors/${r._id}`)} className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View"><Eye size={14} /></button>
                    {can('vendors', 'write') && (
                        <button onClick={() => navigate(`/vendors/${r._id}/edit`)} className="p-1.5 rounded text-slate-400 hover:text-warning hover:bg-warning/10 transition-colors" title="Edit"><Pencil size={14} /></button>
                    )}
                    {can('vendors', 'delete') && (
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors" title="Delete"><Trash2 size={14} /></button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Vendors"
                subtitle="Manage your supplier relationships"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendors' }]}
                actions={can('vendors', 'write') && (
                    <Button icon={Plus} onClick={() => navigate('/vendors/new')}>Add Vendor</Button>
                )}
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search vendors..." className="flex-1" />
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[160px]">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="verified">Verified</option>
                    <option value="blacklisted">Blacklisted</option>
                </select>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                <Table columns={columns} data={vendors} loading={loading} emptyMessage="No vendors found. Add your first vendor." />
                <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={10} onPageChange={setPage} />
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Delete Vendor"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
                confirmLabel="Delete Vendor"
            />
        </div>
    );
};

export default VendorList;