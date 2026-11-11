import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export const STATUS_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'near', label: 'Mendekati Deadline' },
  { value: 'overdue', label: 'Terlambat' },
];

const SORTS = [
  { value: 'deadline:asc', label: 'Deadline terdekat' },
  { value: 'deadline:desc', label: 'Deadline terjauh' },
  { value: 'created_at:desc', label: 'Terbaru dibuat' },
  { value: 'progress:asc', label: 'Progres terendah' },
  { value: 'progress:desc', label: 'Progres tertinggi' },
  { value: 'name:asc', label: 'Nama A–Z' },
];

export default function Toolbar({ filters, onChange }) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce pencarian agar tidak memanggil API di setiap ketikan
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) onChange({ search: searchInput });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-9 !pr-9"
            placeholder="Cari nama atau keterangan proyek…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Cari proyek"
          />
          {searchInput && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              onClick={() => {
                setSearchInput('');
                onChange({ search: '' });
              }}
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="input sm:!w-52"
          value={`${filters.sort}:${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(':');
            onChange({ sort, order });
          }}
          aria-label="Urutkan"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_FILTERS.map((f) => {
          const active = filters.status === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ status: f.value })}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
