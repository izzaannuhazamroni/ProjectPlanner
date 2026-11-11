import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi sebentar.' },
});

// Pengiriman WhatsApp dibatasi lebih ketat untuk mencegah spam / pemblokiran nomor.
export const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak pengiriman pesan. Tunggu semenit lalu coba lagi.' },
});
