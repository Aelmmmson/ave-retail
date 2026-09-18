import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SalesService } from '../services/salesService';
import { validateCreateSale } from '@ave/validation';
import { broadcastSaleCreated } from '../services/socket';

export class SalesController {
  // Create New Sale (with Idempotency & Stock Deduction)
  static async createSale(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = validateCreateSale(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, errors: validation.errors });
      }

      const { sale, isDuplicate } = await SalesService.createSale(req.user!.id, req.body);
      
      if (!isDuplicate) {
        broadcastSaleCreated(sale);
      }

      res.status(isDuplicate ? 200 : 201).json({
        success: true,
        isDuplicate,
        data: sale
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Get Sales History
  static async getSales(req: AuthenticatedRequest, res: Response) {
    try {
      const sales = await SalesService.getSales(req.user?.branchId);
      res.json({ success: true, data: sales });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Process Item/Sale Refund
  static async processRefund(req: AuthenticatedRequest, res: Response) {
    try {
      const { saleId, reason, items } = req.body;
      const refund = await SalesService.processRefund(saleId, req.user!.id, reason, items);
      res.json({ success: true, data: refund });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
