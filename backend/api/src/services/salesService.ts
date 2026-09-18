import { prisma } from './db';
import { calculateCartTotals, calculateChange } from '@ave/shared';
import { CreateSaleDTO } from '@ave/types';

export class SalesService {
  static async createSale(userId: string, data: CreateSaleDTO) {
    // 1. Idempotency Check
    const existingSale = await prisma.sale.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: { items: true, payments: true }
    });
    if (existingSale) {
      return { sale: existingSale, isDuplicate: true };
    }

    // 2. Shift Verification
    const shift = await prisma.cashierShift.findFirst({
      where: { id: data.shiftId, status: 'OPEN' }
    });
    if (!shift) {
      throw new Error(`Active shift not found or shift is closed.`);
    }

    // 3. Tax Rates Fetching
    const activeTaxes = await prisma.taxRate.findMany({ where: { isActive: true } });
    const taxRates = activeTaxes.map(t => ({
      code: t.code,
      name: t.name,
      ratePercent: Number(t.ratePercent)
    }));

    // 4. Cart Calculations
    const cartTotals = calculateCartTotals(
      data.items.map(i => ({
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        discountAmount: i.discountAmount
      })),
      data.saleDiscountAmount || 0,
      taxRates
    );

    const { change } = calculateChange(cartTotals.grandTotal, data.amountReceived);

    // 5. Generate Receipt Number
    const count = await prisma.sale.count();
    const receiptNumber = `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${(count + 1).toString().padStart(4, '0')}`;

    // 6. Execute Atomic Database Transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create Sale Record
      const newSale = await tx.sale.create({
        data: {
          receiptNumber,
          branchId: data.branchId,
          warehouseId: data.warehouseId,
          registerId: data.registerId,
          shiftId: data.shiftId,
          userId,
          customerId: data.customerId || null,
          currencyCode: data.currencyCode || 'GHS',
          subtotal: cartTotals.subtotal,
          itemDiscountTotal: cartTotals.itemDiscountTotal,
          saleDiscountTotal: cartTotals.saleDiscountTotal,
          taxTotal: cartTotals.taxTotal,
          grandTotal: cartTotals.grandTotal,
          amountPaid: data.amountReceived,
          changeGiven: change,
          idempotencyKey: data.idempotencyKey,
          notes: data.notes || null,
          status: 'COMPLETED'
        }
      });

      // Create Sale Items & Inventory Movements
      for (const item of data.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!variant) throw new Error(`Product variant ${item.variantId} not found.`);

        const itemSubtotal = item.unitPrice * item.quantity - item.discountAmount;

        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            variantId: item.variantId,
            quantity: item.quantity,
            unitCost: variant.costPrice,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            taxAmount: (cartTotals.taxTotal / data.items.length),
            totalPrice: itemSubtotal
          }
        });

        // Get/Create Inventory Balance (Negative stock supported)
        const balance = await tx.inventoryBalance.upsert({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: data.warehouseId
            }
          },
          update: {
            quantityOnHand: { decrement: item.quantity }
          },
          create: {
            variantId: item.variantId,
            warehouseId: data.warehouseId,
            quantityOnHand: 0 - item.quantity
          }
        });

        // Record Append-Only Inventory Movement
        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            warehouseId: data.warehouseId,
            type: 'SALE_DEDUCTION',
            quantityChange: 0 - item.quantity,
            resultingQuantity: balance.quantityOnHand,
            referenceId: newSale.id,
            notes: `POS Sale ${receiptNumber}`
          }
        });
      }

      // Record Payments (Supporting Multi-Payment Tenders)
      for (const p of data.payments) {
        await tx.salePayment.create({
          data: {
            saleId: newSale.id,
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            currencyCode: p.currencyCode || 'GHS',
            referenceNumber: p.referenceNumber || null
          }
        });

        // If Store Credit sale, record Customer Ledger Debit Entry
        if (p.paymentMethod === 'STORE_CREDIT' && data.customerId) {
          const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
          if (customer) {
            const newBalance = Number(customer.outstandingBalance) + p.amount;
            await tx.customer.update({
              where: { id: data.customerId },
              data: { outstandingBalance: newBalance }
            });

            await tx.customerLedgerEntry.create({
              data: {
                customerId: data.customerId,
                saleId: newSale.id,
                type: 'CREDIT_SALE',
                debit: p.amount,
                credit: 0,
                runningBalance: newBalance,
                notes: `Store Credit Sale ${receiptNumber}`
              }
            });
          }
        }
      }

      // Log Audit Event
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SALE_COMPLETED',
          entity: 'Sale',
          entityId: newSale.id,
          details: JSON.stringify({ receiptNumber, grandTotal: cartTotals.grandTotal })
        }
      });

      return newSale;
    });

    return { sale, isDuplicate: false };
  }

  static async getSales(branchId?: string) {
    return prisma.sale.findMany({
      where: branchId ? { branchId } : {},
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        user: { select: { name: true } },
        customer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  static async processRefund(saleId: string, userId: string, reason: string, itemsToRefund: Array<{ saleItemId: string; quantity: number }>) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true, shift: true }
    });
    if (!sale) throw new Error('Sale not found');

    const refundCount = await prisma.refund.count();
    const refundNumber = `REF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${(refundCount + 1).toString().padStart(4, '0')}`;

    return prisma.$transaction(async (tx) => {
      let refundTotal = 0;

      const refund = await tx.refund.create({
        data: {
          saleId: sale.id,
          refundNumber,
          totalAmount: 0, // Updated below
          reason,
          userId
        }
      });

      for (const itemRef of itemsToRefund) {
        const saleItem = sale.items.find(i => i.id === itemRef.saleItemId);
        if (!saleItem) continue;

        const lineRefund = Number(saleItem.unitPrice) * itemRef.quantity;
        refundTotal += lineRefund;

        await tx.refundItem.create({
          data: {
            refundId: refund.id,
            saleItemId: saleItem.id,
            variantId: saleItem.variantId,
            quantity: itemRef.quantity,
            refundAmount: lineRefund,
            isRestocked: true
          }
        });

        // Restock inventory balance
        const balance = await tx.inventoryBalance.upsert({
          where: {
            variantId_warehouseId: { variantId: saleItem.variantId, warehouseId: sale.warehouseId }
          },
          update: { quantityOnHand: { increment: itemRef.quantity } },
          create: { variantId: saleItem.variantId, warehouseId: sale.warehouseId, quantityOnHand: itemRef.quantity }
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: saleItem.variantId,
            warehouseId: sale.warehouseId,
            type: 'REFUND_RESTORATION',
            quantityChange: itemRef.quantity,
            resultingQuantity: balance.quantityOnHand,
            referenceId: refund.id,
            notes: `Refund ${refundNumber}`
          }
        });
      }

      await tx.refund.update({
        where: { id: refund.id },
        data: { totalAmount: refundTotal }
      });

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: 'PARTIALLY_REFUNDED' }
      });

      // Record cash drawer refund movement if shift active
      if (sale.shiftId) {
        await tx.cashMovement.create({
          data: {
            shiftId: sale.shiftId,
            userId,
            type: 'CASH_OUT',
            amount: refundTotal,
            reason: `Refund Payout for ${sale.receiptNumber}`
          }
        });
      }

      return refund;
    });
  }
}
