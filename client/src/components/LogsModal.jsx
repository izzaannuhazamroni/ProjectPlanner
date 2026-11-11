import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchProjectLogs, getErrorMessage } from '../services/api.js';
import { formatDateTime, LOG_TYPE_LABEL } from '../utils/format.js';
import Modal from './Modal.jsx';

export default function LogsModal({ project, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!project) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchProjectLogs(project.id)
      .then((data) => !cancelled && setLogs(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [project]);

  return (
    <Modal
      open={Boolean(project)}
      onClose={onClose}
      title="Riwayat Pengiriman WhatsApp"
      subtitle={project?.name}
      size="md"
      footer={
        <button type="button" className="btn-secondary" onClick={onClose}>
          Tutup
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" /> Memuat riwayat…
        </div>
      ) : error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      ) : logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Belum ada pesan yang dikirim untuk proyek ini.</p>
      ) : (
        <ul className="space-y-2.5">
          {logs.map((log) => (
            <li key={log.id} className="flex gap-3 rounded-xl border border-slate-200 p-3.5">
              {log.status === 'sent' ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-semibold text-slate-800">
                    {log.status === 'sent' ? 'Terkirim' : 'Gagal'} · {LOG_TYPE_LABEL[log.type] || log.type}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Ke +{log.phone}</p>
                {log.error_message && <p className="mt-1 text-xs text-red-600">{log.error_message}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
