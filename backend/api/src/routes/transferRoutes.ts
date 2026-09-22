import { Router } from 'express';
import { TransferController } from '../controllers/transferController';
import { authMiddleware } from '../middleware/auth';

export const transferRouter = Router();

transferRouter.use(authMiddleware);

transferRouter.get('/', TransferController.getTransfers);
transferRouter.post('/', TransferController.createTransfer);
transferRouter.post('/:id/dispatch', TransferController.dispatchTransfer);
transferRouter.post('/:id/receive', TransferController.receiveTransfer);
transferRouter.post('/:id/cancel', TransferController.cancelTransfer);
