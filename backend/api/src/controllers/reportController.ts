import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../services/db';

export class ReportController {
  // Financial & Operational Performance Summary
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { branchId } = req.query;
      const orgId = req.user?.organizationId;

      const whereSale: any = {};
      const whereExpense: any = {};

      if (branchId && branchId !== 'all') {
        whereSale.branchId = String(branchId);
        whereExpense.branchId = String(branchId);
      } else if (orgId) {
        whereSale.branch = { organizationId: orgId };
        whereExpense.organizationId = orgId;
      }

      const totalSalesCount = await prisma.sale.count({ where: whereSale });
      const totalSalesAgg = await prisma.sale.aggregate({
        where: whereSale,
        _sum: { grandTotal: true, taxTotal: true, itemDiscountTotal: true }
      });
      const totalExpenseAgg = await prisma.expense.aggregate({
        where: whereExpense,
        _sum: { amount: true }
      });
      const lowStockCount = await prisma.inventoryBalance.count({
        where: { quantityOnHand: { lte: 10 } }
      });
      const activeShift = await prisma.cashierShift.findFirst({ where: { status: 'OPEN' } });

      const grossSales = Number(totalSalesAgg._sum.grandTotal || 0);
      const totalTax = Number(totalSalesAgg._sum.taxTotal || 0);
      const totalDiscounts = Number(totalSalesAgg._sum.itemDiscountTotal || 0);
      const totalExpenses = Number(totalExpenseAgg._sum.amount || 0);
      const netSales = grossSales - totalTax;
      const netOperatingProfit = netSales - totalExpenses;

      // Branch Comparison Breakdown for Owners & Managers
      const branches = await prisma.branch.findMany({
        where: orgId ? { organizationId: orgId } : {}
      });

      const branchComparison = await Promise.all(
        branches.map(async (b) => {
          const bSalesAgg = await prisma.sale.aggregate({
            where: { branchId: b.id },
            _count: { id: true },
            _sum: { grandTotal: true }
          });
          const bExpAgg = await prisma.expense.aggregate({
            where: { branchId: b.id },
            _sum: { amount: true }
          });
          const bGross = Number(bSalesAgg._sum.grandTotal || 0);
          const bExp = Number(bExpAgg._sum.amount || 0);
          return {
            branchId: b.id,
            branchName: b.name,
            branchCode: b.code,
            salesCount: bSalesAgg._count.id || 0,
            grossSales: bGross,
            totalExpenses: bExp,
            netProfit: bGross - bExp
          };
        })
      );

      res.json({
        success: true,
        data: {
          totalSalesCount,
          grossSales,
          totalTax,
          totalDiscounts,
          totalExpenses,
          netSales,
          netOperatingProfit,
          lowStockItemsCount: lowStockCount,
          activeShiftId: activeShift?.id || null,
          branchComparison
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
