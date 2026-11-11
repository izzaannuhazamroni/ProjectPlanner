import { Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmClass = variant === 'danger' ? 'btn-danger' : variant === 'whatsapp' ? 'btn-whatsapp' : 'btn-primary';

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}
