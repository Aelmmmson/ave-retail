import { Router } from 'express';
import { SalesController } from '../controllers/salesController';
import { authMiddleware } from '../middleware/auth';

export const salesRouter = Router();

salesRouter.use(authMiddleware);
salesRouter.post('/', SalesController.createSale);
salesRouter.get('/', SalesController.getSales);
salesRouter.post('/refund', SalesController.processRefund);
