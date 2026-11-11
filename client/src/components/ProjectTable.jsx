import { Clock, History, Loader2, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { deadlineInfo, formatDateTime, TONE_CLASSES } from '../utils/format.js';
import { formatPhone } from '../utils/phone.js';
import ProgressBar from './ProgressBar.jsx';
import StatusBadge from './StatusBadge.jsx';

function Actions({ project, sendingId, onSend, onLogs, onEdit, onDelete }) {
  const sending = sendingId === project.id;
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        className="icon-btn !text-emerald-600 hover:!bg-emerald-50"
        title="Kirim pengingat WhatsApp sekarang"
        aria-label={`Kirim pengingat WhatsApp untuk ${project.name}`}
        onClick={() => onSend(project)}
        disabled={sending}
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
      </button>
      <button type="button" className="icon-btn" title="Riwayat pengiriman" aria-label="Riwayat pengiriman" onClick={() => onLogs(project)}>
        <History size={16} />
      </button>
      <button type="button" className="icon-btn" title="Ubah" aria-label={`Ubah ${project.name}`} onClick={() => onEdit(project)}>
        <Pencil size={16} />
      </button>
      <button
        type="button"
        className="icon-btn hover:!bg-red-50 hover:!text-red-600"
        title="Hapus"
        aria-label={`Hapus ${project.name}`}
        onClick={() => onDelete(project)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function Deadline({ project, windowHours }) {
  const info = deadlineInfo(project.deadline, project.status, windowHours);
  return (
    <div>
      <p className="whitespace-nowrap text-sm font-medium text-slate-800">{formatDateTime(project.deadline)}</p>
      <p className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${TONE_CLASSES[info.tone]}`}>
        <Clock size={12} />
        {info.text}
      </p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
          <div className="h-4 w-1/4 rounded bg-slate-100" />
          <div className="h-4 w-1/6 rounded bg-slate-100" />
          <div className="h-4 w-1/6 rounded bg-slate-100" />
          <div className="h-4 flex-1 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function ProjectTable({ projects, loading, windowHours, hasFilters, ...actions }) {
  if (loading && projects.length === 0) return <SkeletonRows />;

  if (projects.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-base font-semibold text-slate-800">
          {hasFilters ? 'Tidak ada proyek yang cocok' : 'Belum ada proyek'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? 'Ubah kata kunci atau filter status untuk melihat proyek lain.'
            : 'Klik “Proyek Baru” untuk membuat jadwal proyek pertama Anda.'}
        </p>
      </div>
    );
  }

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Proyek</th>
              <th className="px-3 py-3">Deadline</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Progres</th>
              <th className="px-3 py-3">WhatsApp</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((p) => (
              <tr key={p.id} className="transition hover:bg-slate-50/60">
                <td className="max-w-xs px-5 py-4 align-top">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                </td>
                <td className="px-3 py-4 align-top">
                  <Deadline project={p} windowHours={windowHours} />
                </td>
                <td className="px-3 py-4 align-top">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-3 py-4 align-top">
                  <ProgressBar value={p.progress} />
                </td>
                <td className="whitespace-nowrap px-3 py-4 align-top text-sm text-slate-600">{formatPhone(p.whatsapp_number)}</td>
                <td className="px-5 py-4 align-top">
                  <div className="flex justify-end">
                    <Actions project={p} {...actions} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {projects.map((p) => (
          <li key={p.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{p.name}</p>
                {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
              </div>
              <StatusBadge status={p.status} />
            </div>
            <ProgressBar value={p.progress} />
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <Deadline project={p} windowHours={windowHours} />
                <p className="text-xs text-slate-500">{formatPhone(p.whatsapp_number)}</p>
              </div>
              <Actions project={p} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
