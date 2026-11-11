import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import axios from 'axios';
import pino from 'pino';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { useSupabaseAuthState } from './supabaseAuthState.js';

const logger = pino({ level: 'silent' });

/**
 * status:
 *  - disabled      : WA_PROVIDER=none
 *  - ready         : provider HTTP (fonnte) siap dipakai
 *  - connecting    : Baileys sedang menyambung
 *  - qr            : menunggu QR dipindai
 *  - connected     : Baileys tersambung
 *  - disconnected  : terputus, akan mencoba menyambung ulang
 *  - logged_out    : sesi dikeluarkan dari ponsel, QR baru akan dibuat
 */
const state = {
  status: env.waProvider === 'none' ? 'disabled' : env.waProvider === 'fonnte' ? 'ready' : 'disconnected',
  qr: null,
  phone: null,
  lastError: null,
};

let sock = null;
let authHandle = null;
let reconnectTimer = null;
let starting = false;
let shuttingDown = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function scheduleReconnect(delayMs = 5000) {
  if (shuttingDown || env.waProvider !== 'baileys') return;
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connectBaileys().catch((err) => console.error('[WA] Gagal menyambung ulang:', err.message));
  }, delayMs);
}

async function connectBaileys() {
  if (starting) return;
  starting = true;

  try {
    state.status = 'connecting';
    state.lastError = null;

    authHandle = await useSupabaseAuthState(supabase, env.waAuthSession);

    let version;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      console.warn('[WA] Tidak bisa mengambil versi WhatsApp terbaru, memakai versi bawaan Baileys.');
    }

    sock = makeWASocket({
      ...(version ? { version } : {}),
      logger,
      browser: ['Project Planner', 'Chrome', '1.0.0'],
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      auth: {
        creds: authHandle.state.creds,
        keys: makeCacheableSignalKeyStore(authHandle.state.keys, logger),
      },
    });

    sock.ev.on('creds.update', async () => {
      try {
        await authHandle.saveCreds();
      } catch (err) {
        console.error('[WA] saveCreds gagal:', err.message);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.qr = qr;
        state.status = 'qr';
        console.log('[WA] QR siap. Buka aplikasi web -> ikon WhatsApp di Navbar untuk memindai.');
        try {
          console.log(await QRCode.toString(qr, { type: 'terminal', small: true }));
        } catch {
          /* QR di terminal hanya bonus */
        }
      }

      if (connection === 'open') {
        state.status = 'connected';
        state.qr = null;
        state.lastError = null;
        state.phone = sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null;
        console.log(`[WA] Tersambung sebagai ${state.phone}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        state.qr = null;
        state.phone = null;
        sock = null;

        if (loggedOut) {
          state.status = 'logged_out';
          console.warn('[WA] Sesi dikeluarkan dari ponsel. Menghapus sesi & membuat QR baru...');
          try {
            await authHandle?.clearAll();
          } catch (err) {
            console.error('[WA] Gagal menghapus sesi:', err.message);
          }
          scheduleReconnect(2000);
        } else {
          state.status = 'disconnected';
          state.lastError = lastDisconnect?.error?.message || null;
          console.warn(`[WA] Koneksi terputus (kode ${statusCode ?? 'tidak diketahui'}). Mencoba lagi...`);
          scheduleReconnect(5000);
        }
      }
    });
  } finally {
    starting = false;
  }
}

/** Dipanggil sekali saat server start. */
export async function initWhatsApp() {
  if (env.waProvider === 'none') {
    console.log('[WA] Provider dinonaktifkan (WA_PROVIDER=none).');
    return;
  }
  if (env.waProvider === 'fonnte') {
    console.log('[WA] Memakai provider Fonnte (HTTP API).');
    return;
  }
  console.log('[WA] Memulai Baileys...');
  await connectBaileys();
}

export function getStatus() {
  return {
    provider: env.waProvider,
    status: state.status,
    connected: isReady(),
    phone: state.phone,
    hasQr: Boolean(state.qr),
    lastError: state.lastError,
  };
}

export async function getQrDataUrl() {
  if (!state.qr) return null;
  return QRCode.toDataURL(state.qr, { margin: 1, width: 320 });
}

export function isReady() {
  if (env.waProvider === 'baileys') return state.status === 'connected';
  if (env.waProvider === 'fonnte') return true;
  return false;
}

async function sendViaBaileys(phone, text) {
  if (!sock || state.status !== 'connected') {
    throw new AppError(
      'WhatsApp belum terhubung. Buka ikon WhatsApp di Navbar dan pindai QR terlebih dahulu.',
      503
    );
  }

  const jid = `${phone}@s.whatsapp.net`;

  const [lookup] = (await sock.onWhatsApp(jid)) || [];
  if (!lookup?.exists) {
    throw new AppError(`Nomor ${phone} tidak terdaftar di WhatsApp.`, 422);
  }

  const result = await sock.sendMessage(lookup.jid || jid, { text });
  return { id: result?.key?.id || null };
}

async function sendViaFonnte(phone, text) {
  try {
    const body = new URLSearchParams({ target: phone, message: text, countryCode: '62' });
    const { data } = await axios.post('https://api.fonnte.com/send', body.toString(), {
      headers: {
        Authorization: env.fonnteToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 20000,
    });

    if (data?.status === false) {
      throw new AppError(`Fonnte menolak pengiriman: ${data.reason || 'alasan tidak diketahui'}`, 502);
    }
    return { id: Array.isArray(data?.id) ? data.id[0] : data?.id ?? null };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Gagal menghubungi Fonnte: ${err.response?.data?.reason || err.message}`, 502);
  }
}

/**
 * Mengirim pesan teks WhatsApp.
 * @param {string} phone nomor yang sudah dinormalisasi (62xxxxxxxxxx)
 * @param {string} text
 */
export async function sendText(phone, text) {
  switch (env.waProvider) {
    case 'baileys':
      return sendViaBaileys(phone, text);
    case 'fonnte':
      return sendViaFonnte(phone, text);
    default:
      throw new AppError('Pengiriman WhatsApp dinonaktifkan (WA_PROVIDER=none).', 503);
  }
}

/** Keluar dari WhatsApp (unlink perangkat) lalu siapkan QR baru. */
export async function logoutWhatsApp() {
  if (env.waProvider !== 'baileys') {
    throw new AppError('Logout hanya tersedia untuk provider Baileys.', 400);
  }

  clearTimeout(reconnectTimer);
  try {
    if (sock) await sock.logout();
  } catch (err) {
    console.warn('[WA] logout dari server WA gagal (mungkin sudah terputus):', err.message);
  }
  try {
    await authHandle?.clearAll();
  } catch (err) {
    console.error('[WA] Gagal menghapus sesi:', err.message);
  }
  sock = null;
  state.status = 'logged_out';
  state.qr = null;
  state.phone = null;
  scheduleReconnect(1500);
}

/** Paksa sambung ulang (mis. saat status macet). */
export async function reconnectWhatsApp() {
  if (env.waProvider !== 'baileys') {
    throw new AppError('Reconnect hanya tersedia untuk provider Baileys.', 400);
  }
  clearTimeout(reconnectTimer);
  try {
    sock?.end(undefined);
  } catch {
    /* abaikan */
  }
  sock = null;
  await sleep(300);
  await connectBaileys();
}

export function shutdownWhatsApp() {
  shuttingDown = true;
  clearTimeout(reconnectTimer);
  try {
    sock?.end(undefined);
  } catch {
    /* abaikan */
  }
}
