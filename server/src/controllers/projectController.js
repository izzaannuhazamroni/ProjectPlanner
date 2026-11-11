import { z } from 'zod';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { normalizePhone } from '../utils/phone.js';
import { sendProjectReminder } from '../services/reminderService.js';

const STATUSES = ['todo', 'in_progress', 'completed'];

const phoneField = z
  .string({ required_error: 'Nomor WhatsApp wajib diisi.' })
  .trim()
  .min(1, 'Nomor WhatsApp wajib diisi.')
  .transform((val, ctx) => {
    const normalized = normalizePhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nomor WhatsApp tidak valid. Gunakan format Indonesia, mis. +6281234567890 atau 081234567890.',
      });
      return z.NEVER;
    }
    return normalized;
  });

const deadlineField = z
  .string({ required_error: 'Deadline wajib diisi.' })
  .min(1, 'Deadline wajib diisi.')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Format tanggal & waktu deadline tidak valid.')
  .transform((v) => new Date(v).toISOString());

const createSchema = z.object({
  name: z
    .string({ required_error: 'Nama proyek wajib diisi.' })
    .trim()
    .min(1, 'Nama proyek wajib diisi.')
    .max(150, 'Nama proyek maksimal 150 karakter.'),
  description: z.string().trim().max(2000, 'Keterangan maksimal 2000 karakter.').optional().default(''),
  deadline: deadlineField,
  progress: z.coerce
    .number({ invalid_type_error: 'Progres harus berupa angka.' })
    .int('Progres harus bilangan bulat.')
    .min(0, 'Progres minimal 0.')
    .max(100, 'Progres maksimal 100.')
    .optional()
    .default(0),
  status: z.enum(STATUSES, { errorMap: () => ({ message: 'Status harus todo, in_progress, atau completed.' }) }).optional(),
  whatsapp_number: phoneField,
});

const updateSchema = createSchema.partial();

/**
 * Menyelaraskan status & progres agar konsisten:
 *  - progres 100 atau status completed -> keduanya completed / 100
 *  - status belum ditentukan: 0 => todo, 1-99 => in_progress
 *  - status todo dengan progres > 0 => naik menjadi in_progress
 */
function reconcile(values) {
  const out = { ...values };

  if (out.status === 'completed') out.progress = 100;
  if (out.progress === 100) out.status = 'completed';

  if (out.progress !== undefined) {
    if (!out.status) out.status = out.progress === 0 ? 'todo' : 'in_progress';
    else if (out.status === 'todo' && out.progress > 0) out.status = 'in_progress';
  }
  return out;
}

const uuidSchema = z.string().uuid('ID proyek tidak valid.');

async function findOrFail(id) {
  const parsedId = uuidSchema.parse(id);
  const { data, error } = await supabase.from('projects').select('*').eq('id', parsedId).maybeSingle();
  if (error) throw new AppError(error.message, 500);
  if (!data) throw new AppError('Proyek tidak ditemukan.', 404);
  return data;
}

// ---------- READ ----------

export async function listProjects(req, res) {
  const { search = '', status = 'all', sort = 'deadline', order = 'asc' } = req.query;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + env.reminderWindowHours * 3600 * 1000);

  let query = supabase.from('projects').select('*');

  switch (status) {
    case 'todo':
    case 'in_progress':
    case 'completed':
      query = query.eq('status', status);
      break;
    case 'overdue':
      query = query.neq('status', 'completed').lt('deadline', now.toISOString());
      break;
    case 'near':
      query = query
        .neq('status', 'completed')
        .gte('deadline', now.toISOString())
        .lte('deadline', windowEnd.toISOString());
      break;
    default:
      break;
  }

  // Bersihkan karakter yang punya arti khusus di filter PostgREST
  const term = String(search).replace(/[%,()*\\]/g, ' ').trim();
  if (term) {
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const sortColumn = ['deadline', 'created_at', 'progress', 'name'].includes(sort) ? sort : 'deadline';
  query = query.order(sortColumn, { ascending: order !== 'desc' });

  const { data, error } = await query;
  if (error) throw new AppError(error.message, 500);

  res.json({ success: true, data });
}

export async function getStats(req, res) {
  const { data, error } = await supabase.from('projects').select('status, deadline');
  if (error) throw new AppError(error.message, 500);

  const now = Date.now();
  const windowMs = env.reminderWindowHours * 3600 * 1000;

  const stats = {
    total: data.length,
    todo: 0,
    in_progress: 0,
    completed: 0,
    near_deadline: 0,
    overdue: 0,
    window_hours: env.reminderWindowHours,
  };

  for (const p of data) {
    stats[p.status] += 1;
    if (p.status !== 'completed') {
      const t = new Date(p.deadline).getTime();
      if (t < now) stats.overdue += 1;
      else if (t - now <= windowMs) stats.near_deadline += 1;
    }
  }

  res.json({ success: true, data: stats });
}

export async function getProject(req, res) {
  const project = await findOrFail(req.params.id);
  res.json({ success: true, data: project });
}

// ---------- CREATE ----------

export async function createProject(req, res) {
  const input = reconcile(createSchema.parse(req.body));

  const { data, error } = await supabase.from('projects').insert(input).select().single();
  if (error) throw new AppError(error.message, 500);

  res.status(201).json({ success: true, message: 'Proyek berhasil ditambahkan.', data });
}

// ---------- UPDATE ----------

export async function updateProject(req, res) {
  const existing = await findOrFail(req.params.id);
  const input = updateSchema.parse(req.body);

  if (Object.keys(input).length === 0) {
    throw new AppError('Tidak ada data yang diperbarui.', 400);
  }

  // Gabungkan dengan data lama agar rekonsiliasi status/progres akurat
  const merged = reconcile({
    progress: existing.progress,
    status: existing.status,
    ...input,
    // bila hanya progres yang diubah, status dihitung ulang dari progres
    ...(input.progress !== undefined && input.status === undefined ? { status: undefined } : {}),
  });

  const patch = { ...input, progress: merged.progress, status: merged.status };

  // Deadline berubah / proyek dibuka kembali -> izinkan pengingat dikirim lagi
  const deadlineChanged = input.deadline && new Date(input.deadline).getTime() !== new Date(existing.deadline).getTime();
  const reopened = existing.status === 'completed' && merged.status !== 'completed';
  if (deadlineChanged || reopened) {
    patch.reminder_h1_sent = false;
    patch.reminder_overdue_sent = false;
  }

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', existing.id)
    .select()
    .single();
  if (error) throw new AppError(error.message, 500);

  res.json({ success: true, message: 'Proyek berhasil diperbarui.', data });
}

// ---------- DELETE ----------

export async function deleteProject(req, res) {
  const existing = await findOrFail(req.params.id);
  const { error } = await supabase.from('projects').delete().eq('id', existing.id);
  if (error) throw new AppError(error.message, 500);

  res.json({ success: true, message: 'Proyek berhasil dihapus.' });
}

// ---------- WHATSAPP: kirim manual & riwayat ----------

export async function sendManualReminder(req, res) {
  const project = await findOrFail(req.params.id);
  const { phone } = await sendProjectReminder(project, 'manual');
  res.json({ success: true, message: `Pengingat berhasil dikirim ke +${phone}.` });
}

export async function getProjectLogs(req, res) {
  const project = await findOrFail(req.params.id);
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id, type, phone, status, error_message, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new AppError(error.message, 500);

  res.json({ success: true, data });
}
