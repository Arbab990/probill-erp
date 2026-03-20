import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title = 'Confirm Action', message = 'Are you sure?', confirmLabel = 'Confirm', variant = 'danger', loading = false }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
        <div className="flex flex-col items-center text-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-danger/10' : 'bg-warning/10'}`}>
                <AlertTriangle size={24} className={variant === 'danger' ? 'text-danger' : 'text-warning'} />
            </div>
            <p className="text-slate-300 font-body text-sm">{message}</p>
            <div className="flex gap-3 w-full">
                <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button variant={variant} className="flex-1" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
            </div>
        </div>
    </Modal>
);

export default ConfirmDialog;