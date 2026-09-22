import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authMiddleware } from '../middleware/auth';

export const auditRouter = Router();

auditRouter.use(authMiddleware);
auditRouter.get('/logs', AuditController.getLogs);
auditRouter.post('/logs', AuditController.createLog);
