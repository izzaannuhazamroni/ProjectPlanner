import dotenv from 'dotenv';

dotenv.config();

const toBool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: toInt(process.env.PORT, 5000),

  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  waProvider: (process.env.WA_PROVIDER || 'baileys').toLowerCase(),
  fonnteToken: process.env.FONNTE_TOKEN || '',
  waAuthSession: process.env.WA_AUTH_SESSION || 'default',
  waSendDelayMs: toInt(process.env.WA_SEND_DELAY_MS, 4000),

  cronEnabled: toBool(process.env.CRON_ENABLED, true),
  cronSchedule: process.env.CRON_SCHEDULE || '0 * * * *',
  timezone: process.env.APP_TIMEZONE || 'Asia/Jakarta',
  reminderWindowHours: toInt(process.env.REMINDER_WINDOW_HOURS, 24),
  cronSecret: process.env.CRON_SECRET || '',
};

export function assertRequiredEnv() {
  const missing = [];
  if (!env.supabaseUrl) missing.push('SUPABASE_URL');
  if (!env.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Environment variable berikut belum diisi: ${missing.join(', ')}. ` +
        'Salin server/.env.example menjadi server/.env lalu lengkapi nilainya.'
    );
  }

  if (!['baileys', 'fonnte', 'none'].includes(env.waProvider)) {
    throw new Error('WA_PROVIDER harus salah satu dari: baileys | fonnte | none');
  }

  if (env.waProvider === 'fonnte' && !env.fonnteToken) {
    throw new Error('WA_PROVIDER=fonnte membutuhkan FONNTE_TOKEN.');
  }
}
