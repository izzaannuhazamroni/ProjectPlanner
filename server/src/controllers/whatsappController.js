import * as whatsapp from '../services/whatsappService.js';
import { runReminderCheck } from '../services/reminderService.js';

export async function status(req, res) {
  res.json({ success: true, data: whatsapp.getStatus() });
}

export async function qr(req, res) {
  const dataUrl = await whatsapp.getQrDataUrl();
  res.json({ success: true, data: { qr: dataUrl } });
}

export async function logout(req, res) {
  await whatsapp.logoutWhatsApp();
  res.json({ success: true, message: 'WhatsApp diputus. QR baru akan segera tersedia.' });
}

export async function reconnect(req, res) {
  await whatsapp.reconnectWhatsApp();
  res.json({ success: true, message: 'Menyambung ulang WhatsApp...' });
}

export async function runCron(req, res) {
  const result = await runReminderCheck();
  res.json({ success: true, data: result });
}
