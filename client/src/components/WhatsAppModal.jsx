import { CheckCircle2, Loader2, LogOut, RefreshCw, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchWaQr, fetchWaStatus, getErrorMessage, logoutWa, reconnectWa } from '../services/api.js';
import Modal from './Modal.jsx';

export default function WhatsAppModal({ open, onClose, onStatus, notify }) {
  const [status, setStatus] = useState(null);
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const s = await fetchWaStatus();
      setStatus(s);
      onStatus?.(s);
      setError('');
      if (s.status === 'qr') setQr(await fetchWaQr());
      else setQr(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [onStatus]);

  // Polling cepat selama modal terbuka agar QR & status selalu segar
  useEffect(() => {
    if (!open) return undefined;
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [open, refresh]);

  const run = async (fn, successMessage) => {
    setBusy(true);
    try {
      const res = await fn();
      notify?.('success', res?.message || successMessage);
      await refresh();
    } catch (err) {
      notify?.('error', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const provider = status?.provider;
  const state = status?.status;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Koneksi WhatsApp"
      subtitle="Hubungkan nomor pengirim pengingat"
      size="md"
      footer={
        <button type="button" className="btn-secondary" onClick={onClose}>
          Tutup
        </button>
      }
    >
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}

      {!status && !error && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" /> Memeriksa status…
        </div>
      )}

      {provider === 'none' && (
        <p className="text-sm text-slate-600">
          Pengiriman WhatsApp dinonaktifkan (<code className="rounded bg-slate-100 px-1">WA_PROVIDER=none</code>). Ubah
          konfigurasi di <code className="rounded bg-slate-100 px-1">server/.env</code> untuk mengaktifkannya.
        </p>
      )}

      {provider === 'fonnte' && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          <p>
            Memakai gateway <strong>Fonnte</strong> lewat API. Pastikan perangkat sudah terhubung di dashboard Fonnte.
          </p>
        </div>
      )}

      {provider === 'baileys' && state === 'connected' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">WhatsApp terhubung</p>
              <p>Pengirim: +{status.phone}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary !text-red-600"
            disabled={busy}
            onClick={() => run(logoutWa, 'WhatsApp diputus.')}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Putuskan &amp; ganti nomor
          </button>
        </div>
      )}

      {provider === 'baileys' && state === 'qr' && (
        <div className="space-y-4 text-center">
          {qr ? (
            <img src={qr} alt="QR Code WhatsApp" className="mx-auto h-64 w-64 rounded-xl border border-slate-200 p-2" />
          ) : (
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl border border-dashed border-slate-300">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          )}
          <div className="mx-auto max-w-sm text-left text-sm text-slate-600">
            <p className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
              <Smartphone size={16} /> Cara memindai
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Buka WhatsApp di ponsel.</li>
              <li>
                Ketuk <strong>Perangkat tertaut</strong> → <strong>Tautkan perangkat</strong>.
              </li>
              <li>Arahkan kamera ke QR di atas. QR diperbarui otomatis.</li>
            </ol>
          </div>
        </div>
      )}

      {provider === 'baileys' && state !== 'connected' && state !== 'qr' && status && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Loader2 size={18} className="shrink-0 animate-spin" />
            <p>
              {state === 'connecting' && 'Sedang menyambung ke WhatsApp…'}
              {state === 'disconnected' && 'Koneksi terputus, mencoba menyambung kembali…'}
              {state === 'logged_out' && 'Sesi dikeluarkan. QR baru sedang disiapkan…'}
            </p>
          </div>
          {status.lastError && <p className="text-xs text-slate-500">Detail: {status.lastError}</p>}
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(reconnectWa, 'Menyambung ulang…')}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Sambung ulang
          </button>
        </div>
      )}
    </Modal>
  );
}
