export const STATUS_META = {
  todo: { label: 'To Do', classes: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  completed: { label: 'Completed', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
};

export const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

/** Merah < 50, Kuning 50-80, Hijau > 80 */
export function progressTone(progress) {
  if (progress < 50) return { bar: 'bg-red-500', text: 'text-red-600', label: 'Rendah' };
  if (progress <= 80) return { bar: 'bg-amber-400', text: 'text-amber-600', label: 'Sedang' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'Tinggi' };
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** ISO -> nilai untuk <input type="datetime-local"> dalam zona waktu lokal */
export function toInputValue(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Nilai <input type="datetime-local"> (waktu lokal) -> ISO UTC */
export function fromInputValue(value) {
  return new Date(value).toISOString();
}

/** Default deadline form baru: besok pukul 17:00 */
export function defaultDeadlineInput() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return toInputValue(d.toISOString());
}

/**
 * Info sisa waktu deadline untuk ditampilkan di tabel.
 * tone: done | overdue | soon | ok
 */
export function deadlineInfo(deadlineIso, status, windowHours = 24) {
  if (status === 'completed') return { text: 'Selesai', tone: 'done' };

  const diff = new Date(deadlineIso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let span;
  if (days >= 1) span = `${days} hari`;
  else if (hours >= 1) span = `${hours} jam`;
  else span = `${Math.max(minutes, 1)} menit`;

  if (diff < 0) return { text: `Terlambat ${span}`, tone: 'overdue' };
  if (diff <= windowHours * 3600 * 1000) return { text: `Sisa ${span}`, tone: 'soon' };
  return { text: `Sisa ${span}`, tone: 'ok' };
}

export const TONE_CLASSES = {
  done: 'text-emerald-600',
  overdue: 'text-red-600',
  soon: 'text-amber-600',
  ok: 'text-slate-500',
};

export const LOG_TYPE_LABEL = {
  manual: 'Manual',
  h1: 'Otomatis (H-1)',
  overdue: 'Otomatis (Terlambat)',
};
