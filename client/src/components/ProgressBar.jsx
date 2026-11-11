import { progressTone } from '../utils/format.js';

/** Progress bar dinamis: merah < 50%, kuning 50-80%, hijau > 80%. */
export default function ProgressBar({ value }) {
  const tone = progressTone(value);
  return (
    <div className="flex min-w-[130px] items-center gap-3">
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${tone.bar}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`w-10 text-right text-xs font-bold tabular-nums ${tone.text}`}>{value}%</span>
    </div>
  );
}
