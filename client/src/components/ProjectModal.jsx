import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getErrorMessage } from '../services/api.js';
import { defaultDeadlineInput, fromInputValue, STATUS_OPTIONS, toInputValue, progressTone } from '../utils/format.js';
import { normalizePhone } from '../utils/phone.js';
import Modal from './Modal.jsx';

const emptyForm = () => ({
  name: '',
  description: '',
  deadline: defaultDeadlineInput(),
  progress: 0,
  status: 'todo',
  whatsapp_number: '',
});

function FieldError({ message }) {
  return message ? <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p> : null;
}

/**
 * Modal tambah / ubah proyek.
 * @param project null => mode tambah, objek proyek => mode ubah
 * @param onSubmit async (payload) => void ; melempar error bila gagal
 */
export default function ProjectModal({ open, project, onClose, onSubmit }) {
  const isEdit = Boolean(project);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError('');
    setSaving(false);
    setForm(
      project
        ? {
            name: project.name,
            description: project.description || '',
            deadline: toInputValue(project.deadline),
            progress: project.progress,
            status: project.status,
            whatsapp_number: `+${project.whatsapp_number}`,
          }
        : emptyForm()
    );
  }, [open, project]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Progres & status saling menyesuaikan agar konsisten
  const changeProgress = (raw) => {
    const value = Math.min(100, Math.max(0, Number.isNaN(parseInt(raw, 10)) ? 0 : parseInt(raw, 10)));
    setForm((prev) => {
      let status = prev.status;
      if (value === 100) status = 'completed';
      else if (value > 0 && status === 'todo') status = 'in_progress';
      else if (value < 100 && status === 'completed') status = 'in_progress';
      else if (value === 0 && status === 'in_progress') status = 'todo';
      return { ...prev, progress: value, status };
    });
  };

  const changeStatus = (status) => {
    setForm((prev) => {
      let progress = prev.progress;
      if (status === 'completed') progress = 100;
      else if (status === 'todo') progress = 0;
      else if (status === 'in_progress' && (progress === 0 || progress === 100)) progress = progress === 100 ? 90 : 10;
      return { ...prev, status, progress };
    });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Nama proyek wajib diisi.';
    if (!form.deadline || Number.isNaN(new Date(form.deadline).getTime())) next.deadline = 'Deadline wajib diisi.';
    if (!form.whatsapp_number.trim()) next.whatsapp_number = 'Nomor WhatsApp wajib diisi.';
    else if (!normalizePhone(form.whatsapp_number)) {
      next.whatsapp_number = 'Nomor tidak valid. Contoh: +6281234567890 atau 081234567890.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        deadline: fromInputValue(form.deadline),
        progress: Number(form.progress),
        status: form.status,
        whatsapp_number: normalizePhone(form.whatsapp_number),
      });
    } catch (err) {
      setFormError(getErrorMessage(err));
      if (err.fieldErrors) setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      setSaving(false);
    }
  };

  const normalized = normalizePhone(form.whatsapp_number);
  const tone = progressTone(Number(form.progress));
  const sliderStyle = {
    background: `linear-gradient(to right, var(--track) ${form.progress}%, #e2e8f0 ${form.progress}%)`,
    '--track': form.progress < 50 ? '#ef4444' : form.progress <= 80 ? '#fbbf24' : '#10b981',
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Ubah Proyek' : 'Tambah Proyek Baru'}
      subtitle={isEdit ? 'Perbarui detail jadwal dan progres proyek.' : 'Isi detail proyek dan nomor WhatsApp penerima pengingat.'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" form="project-form" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Tambah Proyek'}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>
        )}

        <div>
          <label htmlFor="name" className="label">
            Nama Proyek <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            className={`input ${errors.name ? 'border-red-400' : ''}`}
            value={form.name}
            maxLength={150}
            placeholder="mis. Redesain Website Klien A"
            onChange={(e) => setField('name', e.target.value)}
            autoFocus
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <label htmlFor="description" className="label">
            Keterangan
          </label>
          <textarea
            id="description"
            rows={3}
            className="input resize-y"
            value={form.description}
            maxLength={2000}
            placeholder="Detail pekerjaan, catatan, atau target yang harus dicapai"
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="deadline" className="label">
              Deadline (Tanggal &amp; Waktu) <span className="text-red-500">*</span>
            </label>
            <input
              id="deadline"
              type="datetime-local"
              className={`input ${errors.deadline ? 'border-red-400' : ''}`}
              value={form.deadline}
              onChange={(e) => setField('deadline', e.target.value)}
            />
            <FieldError message={errors.deadline} />
          </div>

          <div>
            <label htmlFor="status" className="label">
              Status Pekerjaan
            </label>
            <select id="status" className="input" value={form.status} onChange={(e) => changeStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="progress" className="label !mb-0">
              Progres
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                aria-label="Progres dalam persen"
                className="input !w-20 !py-1 text-center font-bold tabular-nums"
                value={form.progress}
                onChange={(e) => changeProgress(e.target.value)}
              />
              <span className={`text-sm font-bold ${tone.text}`}>%</span>
            </div>
          </div>
          <input
            id="progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.progress}
            onChange={(e) => changeProgress(e.target.value)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={sliderStyle}
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
            <span>0%</span>
            <span>&lt;50% merah · 50–80% kuning · &gt;80% hijau</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label htmlFor="whatsapp_number" className="label">
            Nomor WhatsApp Penerima <span className="text-red-500">*</span>
          </label>
          <input
            id="whatsapp_number"
            type="tel"
            inputMode="tel"
            className={`input ${errors.whatsapp_number ? 'border-red-400' : ''}`}
            value={form.whatsapp_number}
            placeholder="+62 812-3456-7890"
            onChange={(e) => setField('whatsapp_number', e.target.value)}
          />
          {errors.whatsapp_number ? (
            <FieldError message={errors.whatsapp_number} />
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">
              {normalized ? (
                <>
                  Akan dikirim ke <span className="font-semibold text-emerald-600">+{normalized}</span>
                </>
              ) : (
                'Format internasional (+62). Awalan 08… otomatis diubah menjadi 628….'
              )}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
