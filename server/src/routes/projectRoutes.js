import { Router } from 'express';
import * as controller from '../controllers/projectController.js';
import { sendLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.get('/stats', controller.getStats);
router.get('/', controller.listProjects);
router.post('/', controller.createProject);
router.get('/:id', controller.getProject);
router.put('/:id', controller.updateProject);
router.patch('/:id', controller.updateProject);
router.delete('/:id', controller.deleteProject);

router.post('/:id/remind', sendLimiter, controller.sendManualReminder);
router.get('/:id/logs', controller.getProjectLogs);

export default router;
