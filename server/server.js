import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { assertRequiredEnv, env } from './src/config/env.js';

assertRequiredEnv();

const { errorHandler, notFound } = await import('./src/middleware/errorHandler.js');
const { apiLimiter } = await import('./src/middleware/rateLimiters.js');
const { default: routes } = await import('./src/routes/index.js');
const { initWhatsApp, shutdownWhatsApp } = await import('./src/services/whatsappService.js');
const { startCronJob, stopCronJob } = await import('./src/services/cronJob.js');

const app = express();

// Render berada di belakang proxy; diperlukan agar rate limit membaca IP asli
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Izinkan request tanpa Origin (curl, health check, cron eksternal)
      if (!origin) return callback(null, true);
      if (env.clientUrls.includes('*') || env.clientUrls.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-cron-secret'],
  })
);
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({ name: 'Project Planner API', status: 'ok', docs: 'Lihat README.md. Endpoint ada di /api' });
});

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`[SERVER] Berjalan di port ${env.port} (${env.nodeEnv})`);
  console.log(`[SERVER] CORS diizinkan untuk: ${env.clientUrls.join(', ')}`);

  initWhatsApp().catch((err) => console.error('[WA] Gagal inisialisasi:', err.message));
  startCronJob();
});

function shutdown(signal) {
  console.log(`[SERVER] ${signal} diterima, mematikan server...`);
  stopCronJob();
  shutdownWhatsApp();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('[UNHANDLED REJECTION]', reason));
