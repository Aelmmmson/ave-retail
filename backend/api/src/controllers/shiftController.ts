import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ShiftService } from '../services/shiftService';
import { validateOpenShift, validateCloseShift, validateCashMovement } from '@ave/validation';
import { broadcastShiftUpdated } from '../services/socket';

export class ShiftController {
  // Open Cashier Shift
  static async openShift(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = validateOpenShift(req.body);
      if (!validation.valid) return res.status(400).json({ success: false, errors: validation.errors });

      const shift = await ShiftService.openShift(
        req.user!.id,
        req.body.registerId,
        req.user!.branchId || 'ACC-01',
        req.body.openingFloat
      );
      broadcastShiftUpdated(shift);
      res.status(201).json({ success: true, data: shift });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Get Active Shift
  static async getActiveShift(req: AuthenticatedRequest, res: Response) {
    try {
      const registerId = (req.query.registerId as string) || 'REG-ACC-01';
      const shift = await ShiftService.getActiveShift(req.user!.id, registerId);
      res.json({ success: true, data: shift });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Close Cashier Shift & Reconcile Cash Drawer
  static async closeShift(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = validateCloseShift(req.body);
      if (!validation.valid) return res.status(400).json({ success: false, errors: validation.errors });

      const shift = await ShiftService.closeShift(req.body.shiftId, req.body.actualClosingCash, req.body.managerPin);
      broadcastShiftUpdated(shift);
      res.json({ success: true, data: shift });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Record Cash In / Cash Out Movement
  static async recordCashMovement(req: AuthenticatedRequest, res: Response) {
    try {
      const validation = validateCashMovement(req.body);
      if (!validation.valid) return res.status(400).json({ success: false, errors: validation.errors });

      const movement = await ShiftService.recordCashMovement(
        req.body.shiftId,
        req.user!.id,
        req.body.type,
        req.body.amount,
        req.body.reason
      );
      broadcastShiftUpdated(movement);
      res.json({ success: true, data: movement });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
