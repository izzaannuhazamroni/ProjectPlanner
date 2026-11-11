import { Router } from 'express';
import * as controller from '../controllers/whatsappController.js';

const router = Router();

router.get('/status', controller.status);
router.get('/qr', controller.qr);
router.post('/logout', controller.logout);
router.post('/reconnect', controller.reconnect);

export default router;
