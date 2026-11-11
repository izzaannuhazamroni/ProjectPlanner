import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan.` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validasi gagal.',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Body JSON tidak valid.' });
  }

  console.error('[ERROR]', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server.',
    ...(env.isProd ? {} : { detail: err?.message }),
  });
}
