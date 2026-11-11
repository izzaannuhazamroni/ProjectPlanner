const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
};

export default function StatsCard({ icon: Icon, label, value, hint, tone = 'brand', onClick, active = false }) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-card transition sm:p-5 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500' : ''
      } ${active ? 'border-brand-400 ring-2 ring-brand-500/20' : 'border-slate-200'}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={22} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="block text-2xl font-extrabold leading-tight text-slate-900">{value}</span>
        {hint && <span className="block truncate text-xs text-slate-400">{hint}</span>}
      </span>
    </Wrapper>
  );
}
