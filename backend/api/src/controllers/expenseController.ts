import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../services/db';
import { broadcastExpenseAdded } from '../services/socket';

export class ExpenseController {
  // Get Store Expenses
  static async getExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.user?.organizationId;
      const expenses = await prisma.expense.findMany({
        where: orgId ? { organizationId: orgId } : undefined,
        include: { branch: true, createdBy: true },
        orderBy: { date: 'desc' }
      });
      res.json({ success: true, data: expenses });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Create Expense Entry
  static async createExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const { title, amount, category, notes, branchId } = req.body;
      const orgId = req.user?.organizationId;

      if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });
      if (!title || !amount) return res.status(400).json({ success: false, error: 'Title and amount are required' });

      const expense = await prisma.expense.create({
        data: {
          organizationId: orgId,
          branchId: branchId || req.user?.branchId || null,
          title,
          amount: parseFloat(amount),
          category: category || 'GENERAL',
          notes: notes || null,
          createdById: req.user?.id || null
        }
      });

      broadcastExpenseAdded(expense);

      res.status(201).json({ success: true, data: expense });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Delete Expense Entry
  static async deleteExpense(req: AuthenticatedRequest, res: Response) {
    try {
      await prisma.expense.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Expense entry deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
