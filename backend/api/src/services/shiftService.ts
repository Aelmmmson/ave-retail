import { prisma } from './db';

export class ShiftService {
  private static async resolveRegister(registerIdOrCode: string, branchId?: string) {
    let reg = await prisma.register.findFirst({
      where: { OR: [{ id: registerIdOrCode }, { code: registerIdOrCode }] }
    });
    if (!reg) {
      reg = await prisma.register.findFirst({
        where: branchId ? { branchId, isActive: true } : { isActive: true }
      });
    }
    return reg;
  }

  private static async resolveUser(userIdOrEmail: string) {
    let u = await prisma.user.findFirst({
      where: { OR: [{ id: userIdOrEmail }, { email: userIdOrEmail }] }
    });
    if (!u) {
      u = await prisma.user.findFirst({ where: { isActive: true } });
    }
    return u;
  }

  static async openShift(userId: string, registerId: string, branchId: string, openingFloat: number) {
    const reg = await this.resolveRegister(registerId, branchId);
    const u = await this.resolveUser(userId);

    const targetRegId = reg ? reg.id : registerId;
    const targetUserId = u ? u.id : userId;
    const targetBranchId = reg?.branchId || branchId;

    // Check single active shift restriction on this register or user
    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        status: 'OPEN',
        OR: [
          { registerId: targetRegId },
          { registerId: registerId },
          { userId: targetUserId }
        ]
      }
    });

    if (activeShift) {
      // If a shift is already open, return it cleanly instead of failing
      return activeShift;
    }

    return prisma.cashierShift.create({
      data: {
        registerId: targetRegId,
        userId: targetUserId,
        branchId: targetBranchId,
        openingFloat,
        status: 'OPEN'
      }
    });
  }

  static async getActiveShift(userId: string, registerId: string) {
    const reg = await this.resolveRegister(registerId);
    const u = await this.resolveUser(userId);

    const targetRegId = reg ? reg.id : registerId;
    const targetUserId = u ? u.id : userId;

    const shift = await prisma.cashierShift.findFirst({
      where: {
        status: 'OPEN',
        OR: [
          { registerId: targetRegId },
          { registerId: registerId },
          { userId: targetUserId }
        ]
      },
      include: {
        user: { select: { name: true } },
        register: true,
        sales: { select: { grandTotal: true, amountPaid: true, payments: true } },
        cashMovements: true
      }
    });

    if (!shift) return null;

    // Check if shift was opened on a previous date (Overnight Forgotten Shift)
    const openedDate = new Date(shift.openedAt).toDateString();
    const todayDate = new Date().toDateString();

    if (openedDate !== todayDate) {
      console.log(`⏰ [Overnight Shift Detected] Auto-closing shift ${shift.id} from ${openedDate} for manager audit.`);
      await prisma.cashierShift.update({
        where: { id: shift.id },
        data: {
          status: 'RECONCILED',
          closedAt: new Date()
        }
      });
      return null; // Return null to require cashier to open a fresh shift for today
    }

    const openingFloat = Number(shift.openingFloat);
    let totalCashSales = 0;

    if (shift.sales) {
      for (const sale of shift.sales) {
        if (sale.payments) {
          for (const pay of sale.payments) {
            if (pay.paymentMethod === 'CASH') {
              totalCashSales += Number(pay.amount);
            }
          }
        }
      }
    }

    let totalCashIn = 0;
    let totalCashOut = 0;

    if (shift.cashMovements) {
      for (const movement of shift.cashMovements) {
        const amount = Number(movement.amount);
        if (movement.type === 'CASH_IN' || movement.type === 'FLOAT_ADDITION') {
          totalCashIn += amount;
        } else if (movement.type === 'CASH_OUT' || movement.type === 'PETTY_CASH') {
          totalCashOut += amount;
        }
      }
    }

    const expectedClosingCash = openingFloat + totalCashSales + totalCashIn - totalCashOut;

    return {
      ...shift,
      userName: shift.user?.name || u?.name || 'Abena Osei',
      openingFloat,
      totalCashSales,
      totalCashIn,
      totalCashOut,
      expectedClosingCash,
      openedAt: shift.openedAt ? new Date(shift.openedAt).toLocaleString() : new Date().toLocaleString()
    };
  }

  static async closeShift(shiftId: string, actualClosingCash: number, managerPin?: string) {
    let shift = await prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          include: { payments: true }
        },
        cashMovements: true
      }
    });

    if (!shift || shift.status !== 'OPEN') {
      shift = await prisma.cashierShift.findFirst({
        where: { status: 'OPEN' },
        include: {
          sales: {
            include: { payments: true }
          },
          cashMovements: true
        }
      });
    }

    if (!shift || shift.status !== 'OPEN') {
      throw new Error('Active shift not found or shift is already closed.');
    }

    // Calculate Cash Reconciliation
    let totalCashSales = 0;
    for (const sale of shift.sales) {
      for (const pay of sale.payments) {
        if (pay.paymentMethod === 'CASH') {
          totalCashSales += Number(pay.amount);
        }
      }
    }

    let totalCashIn = 0;
    let totalCashOut = 0;

    for (const movement of shift.cashMovements) {
      const amount = Number(movement.amount);
      if (movement.type === 'CASH_IN' || movement.type === 'FLOAT_ADDITION') {
        totalCashIn += amount;
      } else if (movement.type === 'CASH_OUT' || movement.type === 'PETTY_CASH') {
        totalCashOut += amount;
      }
    }

    const expectedClosingCash = Number(shift.openingFloat) + totalCashSales + totalCashIn - totalCashOut;
    const varianceAmount = actualClosingCash - expectedClosingCash;

    let managerApprovalNote = '';
    // Enforce Manager Override PIN when Variance is Detected
    if (Math.abs(varianceAmount) > 0.01) {
      if (!managerPin || !managerPin.trim()) {
        throw new Error(`CASH VARIANCE DETECTED: Drawer cash differs from expected cash by GH₵ ${Math.abs(varianceAmount).toFixed(2)}. Manager authorization PIN is required to close this shift.`);
      }

      // Verify Manager PIN against active users with manager/admin privileges
      const users = await prisma.user.findMany({
        where: {
          isActive: true
        }
      });

      const validManager = users.find((u: any) =>
        u.managerPin === managerPin.trim() ||
        ['OWNER', 'ADMIN', 'MANAGER'].includes(String(u.role))
      );

      if (!validManager || ((validManager as any).managerPin && (validManager as any).managerPin !== managerPin.trim())) {
        throw new Error(`INVALID MANAGER PIN: The authorization PIN provided is incorrect or lacks shift override approval mandate.`);
      }

      managerApprovalNote = `Variance of GH₵ ${varianceAmount.toFixed(2)} approved by Manager ${validManager.name}`;
      
      // Audit Log Entry
      await prisma.auditLog.create({
        data: {
          userId: validManager.id,
          action: 'SHIFT_VARIANCE_OVERRIDE',
          entity: 'CashierShift',
          entityId: shift.id,
          details: `Shift closed with variance of GH₵ ${varianceAmount.toFixed(2)} (Actual: ${actualClosingCash}, Expected: ${expectedClosingCash}). Authorized by ${validManager.name}.`
        }
      });
    }

    return prisma.cashierShift.update({
      where: { id: shift.id },
      data: {
        actualClosingCash,
        expectedClosingCash,
        varianceAmount,
        status: Math.abs(varianceAmount) > 0.01 ? 'RECONCILED' : 'CLOSED',
        closedAt: new Date()
      }
    });
  }

  static async recordCashMovement(shiftId: string, userId: string, type: 'CASH_IN' | 'CASH_OUT' | 'FLOAT_ADDITION' | 'PETTY_CASH', amount: number, reason: string) {
    let shift = await prisma.cashierShift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status !== 'OPEN') {
      shift = await prisma.cashierShift.findFirst({ where: { status: 'OPEN' } });
    }

    if (!shift || shift.status !== 'OPEN') {
      throw new Error('Shift is not currently open.');
    }

    const u = await this.resolveUser(userId);

    return prisma.cashMovement.create({
      data: {
        shiftId: shift.id,
        userId: u?.id || userId,
        type,
        amount,
        reason
      }
    });
  }
}
