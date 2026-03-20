import { SkeletonRow } from './Loader.jsx';

const Table = ({ columns, data, loading, emptyMessage = 'No records found', rowKey = '_id' }) => (
    <div className="table-container">
        <table className="table-base">
            <thead>
                <tr>
                    {columns.map(col => (
                        <th key={col.key} style={col.width ? { width: col.width } : {}}>{col.label}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : data.length === 0 ? (
                    <tr>
                        <td colSpan={columns.length} className="text-center py-16 text-slate-500 font-body">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-3xl">📭</span>
                                <span>{emptyMessage}</span>
                            </div>
                        </td>
                    </tr>
                ) : (
                    data.map(row => (
                        <tr key={row[rowKey] || row._id}>
                            {columns.map(col => (
                                <td key={col.key}>
                                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
);

export default Table;