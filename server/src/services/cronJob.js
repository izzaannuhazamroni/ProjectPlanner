import cron from 'node-cron';
import { env } from '../config/env.js';
import { runReminderCheck } from './reminderService.js';

let task = null;

export function startCronJob() {
  if (!env.cronEnabled) {
    console.log('[CRON] Dinonaktifkan (CRON_ENABLED=false).');
    return;
  }

  if (!cron.validate(env.cronSchedule)) {
    throw new Error(`CRON_SCHEDULE tidak valid: "${env.cronSchedule}"`);
  }

  task = cron.schedule(
    env.cronSchedule,
    async () => {
      console.log(`[CRON] Menjalankan pemeriksaan deadline @ ${new Date().toISOString()}`);
      try {
        const result = await runReminderCheck();
        console.log('[CRON] Selesai:', JSON.stringify(result));
      } catch (err) {
        console.error('[CRON] Error:', err.message);
      }
    },
    { timezone: env.timezone }
  );

  console.log(`[CRON] Aktif dengan jadwal "${env.cronSchedule}" (${env.timezone}).`);
}

export function stopCronJob() {
  task?.stop();
}
