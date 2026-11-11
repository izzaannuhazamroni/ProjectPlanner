import { CalendarCheck2, MessageCircle, Plus } from 'lucide-react';

const WA_BADGE = {
  connected: { label: 'WhatsApp terhubung', dot: 'bg-emerald-500', ring: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  ready: { label: 'Gateway siap', dot: 'bg-emerald-500', ring: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  qr: { label: 'Scan QR WhatsApp', dot: 'bg-amber-500', ring: 'border-amber-200 bg-amber-50 text-amber-700' },
  connecting: { label: 'Menyambung…', dot: 'bg-amber-500', ring: 'border-amber-200 bg-amber-50 text-amber-700' },
  disabled: { label: 'WhatsApp nonaktif', dot: 'bg-slate-400', ring: 'border-slate-200 bg-slate-50 text-slate-600' },
  unreachable: { label: 'Server tidak terjangkau', dot: 'bg-red-500', ring: 'border-red-200 bg-red-50 text-red-700' },
  default: { label: 'WhatsApp terputus', dot: 'bg-red-500', ring: 'border-red-200 bg-red-50 text-red-700' },
};

export default function Navbar({ waStatus, onAdd, onOpenWhatsApp }) {
  const badge = WA_BADGE[waStatus?.status] || WA_BADGE.default;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <CalendarCheck2 size={20} />
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight text-slate-900">Project Planner</p>
            <p className="hidden text-xs text-slate-500 sm:block">Jadwal proyek &amp; pengingat WhatsApp</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenWhatsApp}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:brightness-95 ${badge.ring}`}
            title="Kelola koneksi WhatsApp"
          >
            <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
            <MessageCircle size={14} className="hidden sm:block" />
            <span className="hidden sm:inline">{badge.label}</span>
            <span className="sm:hidden">WA</span>
          </button>

          <button type="button" onClick={onAdd} className="btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">Proyek Baru</span>
            <span className="sm:hidden">Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
}
