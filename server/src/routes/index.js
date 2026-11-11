import { Router } from 'express';
import { env } from '../config/env.js';
import { runCron } from '../controllers/whatsappController.js';
import projectRoutes from './projectRoutes.js';
import whatsappRoutes from './whatsappRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.use('/projects', projectRoutes);
router.use('/whatsapp', whatsappRoutes);

// Pemicu cron dari layanan luar (berguna saat hosting gratis "tertidur").
router.post('/cron/run', (req, res, next) => {
  if (!env.cronSecret) {
    return res.status(404).json({ success: false, message: 'Endpoint dinonaktifkan (CRON_SECRET belum diisi).' });
  }
  if (req.get('x-cron-secret') !== env.cronSecret) {
    return res.status(401).json({ success: false, message: 'Secret tidak valid.' });
  }
  return runCron(req, res, next);
});

export default router;
