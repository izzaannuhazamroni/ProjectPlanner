import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-3.5 shadow-pop animate-slide-up ${
            t.type === 'error' ? 'border-red-200' : 'border-emerald-200'
          }`}
          role="status"
        >
          {t.type === 'error' ? (
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
          )}
          <p className="flex-1 text-sm text-slate-700">{t.message}</p>
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => onDismiss(t.id)} aria-label="Tutup">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
