import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authMiddleware } from '../middleware/auth';

export const reportRouter = Router();

reportRouter.use(authMiddleware);
reportRouter.get('/summary', ReportController.getSummary);
