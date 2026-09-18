import { Router } from 'express';
import { ShiftController } from '../controllers/shiftController';
import { authMiddleware } from '../middleware/auth';

export const shiftRouter = Router();

shiftRouter.use(authMiddleware);
shiftRouter.post('/open', ShiftController.openShift);
shiftRouter.get('/active', ShiftController.getActiveShift);
shiftRouter.post('/close', ShiftController.closeShift);
shiftRouter.post('/movement', ShiftController.recordCashMovement);
