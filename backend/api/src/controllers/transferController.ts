import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { TransferService } from '../services/transferService';
import { broadcastStockUpdated } from '../services/socket';

export class TransferController {
  static async getTransfers(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, warehouseId } = req.query;
      const transfers = await TransferService.getTransfers(status as string, warehouseId as string);
      res.json({ success: true, data: transfers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const transfer = await TransferService.createTransfer(req.user!.id, req.body);
      res.status(201).json({ success: true, data: transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async dispatchTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await TransferService.dispatchTransfer(id, req.user!.id);
      broadcastStockUpdated(result);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async receiveTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await TransferService.receiveTransfer(id, req.user!.id);
      broadcastStockUpdated(result);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async cancelTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await TransferService.cancelTransfer(id, req.user!.id, reason);
      broadcastStockUpdated(result);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
