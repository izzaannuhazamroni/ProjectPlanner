import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { buildReminderMessage } from '../utils/messages.js';
import { normalizePhone } from '../utils/phone.js';
import { AppError } from '../utils/AppError.js';
import * as whatsapp from './whatsappService.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function writeLog({ project, phone, type, message, status, error }) {
  const { error: dbError } = await supabase.from('notification_logs').insert({
    project_id: project.id,
    phone,
    type,
    message,
    status,
    error_message: error || null,
  });
  if (dbError) console.error('[LOG] Gagal menyimpan log notifikasi:', dbError.message);
}

/**
 * Mengirim satu pengingat dan mencatat hasilnya (berhasil / gagal) ke Supabase.
 * Melempar error bila gagal, setelah log "failed" tersimpan.
 */
export async function sendProjectReminder(project, type = 'manual') {
  const phone = normalizePhone(project.whatsapp_number);
  const message = buildReminderMessage(project, type);

  if (!phone) {
    const reason = 'Nomor WhatsApp proyek tidak valid.';
    await writeLog({ project, phone: project.whatsapp_number, type, message, status: 'failed', error: reason });
    throw new AppError(reason, 422);
  }

  try {
    await whatsapp.sendText(phone, message);
    await writeLog({ project, phone, type, message, status: 'sent' });
    return { phone, message };
  } catch (err) {
    await writeLog({ project, phone, type, message, status: 'failed', error: err.message });
    throw err;
  }
}

let running = false;

/**
 * Dipanggil cron setiap jam:
 *  1. Proyek belum selesai yang deadline-nya dalam REMINDER_WINDOW_HOURS ke depan -> pengingat H-1
 *  2. Proyek belum selesai yang sudah lewat deadline -> pengingat terlambat
 * Setiap jenis pengingat hanya dikirim sekali per deadline (ditandai di kolom reminder_*_sent).
 */
export async function runReminderCheck() {
  if (running) {
    console.log('[CRON] Pemeriksaan sebelumnya masih berjalan, dilewati.');
    return { skipped: true, reason: 'already_running' };
  }
  running = true;

  const summary = { checked: 0, sent: 0, failed: 0, skipped: false };

  try {
    if (!whatsapp.isReady()) {
      console.log('[CRON] WhatsApp belum siap, pemeriksaan dilewati.');
      return { ...summary, skipped: true, reason: 'whatsapp_not_ready' };
    }

    const now = new Date();
    const windowEnd = new Date(now.getTime() + env.reminderWindowHours * 3600 * 1000);

    const { data: dueSoon, error: e1 } = await supabase
      .from('projects')
      .select('*')
      .neq('status', 'completed')
      .eq('reminder_h1_sent', false)
      .gt('deadline', now.toISOString())
      .lte('deadline', windowEnd.toISOString())
      .order('deadline', { ascending: true });
    if (e1) throw new Error(e1.message);

    const { data: overdue, error: e2 } = await supabase
      .from('projects')
      .select('*')
      .neq('status', 'completed')
      .eq('reminder_overdue_sent', false)
      .lte('deadline', now.toISOString())
      .order('deadline', { ascending: true });
    if (e2) throw new Error(e2.message);

    const queue = [
      ...(dueSoon || []).map((p) => ({ project: p, type: 'h1', flag: 'reminder_h1_sent' })),
      ...(overdue || []).map((p) => ({ project: p, type: 'overdue', flag: 'reminder_overdue_sent' })),
    ];

    summary.checked = queue.length;
    console.log(`[CRON] ${queue.length} pengingat akan dikirim.`);

    for (let i = 0; i < queue.length; i += 1) {
      const { project, type, flag } = queue[i];
      try {
        await sendProjectReminder(project, type);
        await supabase.from('projects').update({ [flag]: true }).eq('id', project.id);
        summary.sent += 1;
        console.log(`[CRON] Terkirim (${type}) -> "${project.name}"`);
      } catch (err) {
        summary.failed += 1;
        console.error(`[CRON] Gagal (${type}) "${project.name}": ${err.message}`);
      }

      if (i < queue.length - 1) await sleep(env.waSendDelayMs);
    }

    return summary;
  } finally {
    running = false;
  }
}
