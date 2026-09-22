import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../services/db';

export class ReportController {
  // Financial & Operational Performance Summary with Period & Branch Scope Filtering
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { branchId, period = 'this_month', startDate: qStartDate, endDate: qEndDate } = req.query;
      const orgId = req.user?.organizationId;

      // Determine Date Boundaries for Selected Period Scope
      let periodStartDate: Date = new Date();
      let periodEndDate: Date = new Date();
      const now = new Date();

      if (period === 'today') {
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        periodEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (period === 'this_week') {
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek + 6) % 7;
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0);
        periodEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - diffToMonday), 23, 59, 59, 999);
      } else if (period === 'this_year') {
        periodStartDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        periodEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      } else if (period === 'custom' && qStartDate && qEndDate) {
        periodStartDate = new Date(String(qStartDate));
        periodEndDate = new Date(String(qEndDate));
        periodEndDate.setHours(23, 59, 59, 999);
      } else {
        // Default: this_month
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      // Base query filters
      const whereSaleBase: any = {};
      const whereExpenseBase: any = {};

      if (branchId && branchId !== 'all') {
        whereSaleBase.branchId = String(branchId);
        whereExpenseBase.branchId = String(branchId);
      } else if (orgId) {
        whereSaleBase.branch = { organizationId: orgId };
        whereExpenseBase.organizationId = orgId;
      }

      // 1. Period-filtered queries
      const whereSalePeriod = {
        ...whereSaleBase,
        createdAt: { gte: periodStartDate, lte: periodEndDate }
      };

      const whereExpensePeriod = {
        ...whereExpenseBase,
        createdAt: { gte: periodStartDate, lte: periodEndDate }
      };

      // 2. Brought Forward (B/F) queries (prior to periodStartDate)
      const whereSalePrior = {
        ...whereSaleBase,
        createdAt: { lt: periodStartDate }
      };

      const whereExpensePrior = {
        ...whereExpenseBase,
        createdAt: { lt: periodStartDate }
      };

      // Execute Aggregations
      const [
        totalSalesCount,
        totalSalesAgg,
        totalExpenseAgg,
        priorSalesAgg,
        priorExpenseAgg,
        lowStockCount,
        activeShift
      ] = await Promise.all([
        prisma.sale.count({ where: whereSalePeriod }),
        prisma.sale.aggregate({
          where: whereSalePeriod,
          _sum: { grandTotal: true, taxTotal: true, itemDiscountTotal: true }
        }),
        prisma.expense.aggregate({
          where: whereExpensePeriod,
          _sum: { amount: true }
        }),
        prisma.sale.aggregate({
          where: whereSalePrior,
          _sum: { grandTotal: true, taxTotal: true }
        }),
        prisma.expense.aggregate({
          where: whereExpensePrior,
          _sum: { amount: true }
        }),
        prisma.inventoryBalance.count({
          where: { quantityOnHand: { lte: 10 } }
        }),
        prisma.cashierShift.findFirst({ where: { status: 'OPEN' } })
      ]);

      const grossSales = Number(totalSalesAgg._sum.grandTotal || 0);
      const totalTax = Number(totalSalesAgg._sum.taxTotal || 0);
      const totalDiscounts = Number(totalSalesAgg._sum.itemDiscountTotal || 0);
      const totalExpenses = Number(totalExpenseAgg._sum.amount || 0);
      const netSales = grossSales - totalTax;
      const netOperatingProfit = netSales - totalExpenses;

      // Brought Forward Calculation
      const priorGross = Number(priorSalesAgg._sum.grandTotal || 0);
      const priorTax = Number(priorSalesAgg._sum.taxTotal || 0);
      const priorExp = Number(priorExpenseAgg._sum.amount || 0);
      const broughtForwardBalance = Math.max(1000, priorGross - priorTax - priorExp);
      const carriedForwardBalance = broughtForwardBalance + netOperatingProfit;

      // Branch Comparison Breakdown for Selected Period
      const branches = await prisma.branch.findMany({
        where: orgId ? { organizationId: orgId } : {}
      });

      const branchComparison = await Promise.all(
        branches.map(async (b) => {
          const bSalesAgg = await prisma.sale.aggregate({
            where: {
              branchId: b.id,
              createdAt: { gte: periodStartDate, lte: periodEndDate }
            },
            _count: { id: true },
            _sum: { grandTotal: true }
          });
          const bExpAgg = await prisma.expense.aggregate({
            where: {
              branchId: b.id,
              createdAt: { gte: periodStartDate, lte: periodEndDate }
            },
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

      // Label Formatter
      const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      const periodLabel = period === 'today'
        ? `Today (${now.toLocaleDateString('en-US', dateOptions)})`
        : period === 'this_week'
        ? `This Week (${periodStartDate.toLocaleDateString('en-US', dateOptions)} - ${periodEndDate.toLocaleDateString('en-US', dateOptions)})`
        : period === 'this_year'
        ? `Fiscal Year (${now.getFullYear()})`
        : period === 'custom'
        ? `Custom Scope (${periodStartDate.toLocaleDateString('en-US', dateOptions)} - ${periodEndDate.toLocaleDateString('en-US', dateOptions)})`
        : `This Month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;

      res.json({
        success: true,
        data: {
          periodLabel,
          broughtForwardBalance,
          carriedForwardBalance,
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
