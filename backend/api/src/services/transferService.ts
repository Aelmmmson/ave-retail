import { prisma } from './db';

export class TransferService {
  static async getTransfers(status?: string, warehouseId?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (warehouseId && warehouseId !== 'ALL') {
      where.OR = [
        { sourceWarehouseId: warehouseId },
        { destinationWarehouseId: warehouseId }
      ];
    }

    return prisma.warehouseTransfer.findMany({
      where,
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createTransfer(requestedBy: string, data: {
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    notes?: string;
    items: { variantId: string; quantity: number }[];
  }) {
    if (data.sourceWarehouseId === data.destinationWarehouseId) {
      throw new Error('Source and destination warehouses cannot be the same.');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('At least one item must be included in the transfer request.');
    }

    const count = await prisma.warehouseTransfer.count();
    const transferNumber = `TRF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${(count + 1).toString().padStart(4, '0')}`;

    return prisma.$transaction(async (tx) => {
      const transfer = await tx.warehouseTransfer.create({
        data: {
          transferNumber,
          sourceWarehouseId: data.sourceWarehouseId,
          destinationWarehouseId: data.destinationWarehouseId,
          status: 'REQUESTED',
          requestedBy,
          notes: data.notes || null,
          items: {
            create: data.items.map(i => ({
              variantId: i.variantId,
              quantity: i.quantity
            }))
          }
        },
        include: {
          items: { include: { variant: true } },
          sourceWarehouse: true,
          destinationWarehouse: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: requestedBy,
          action: 'TRANSFER_REQUESTED',
          entity: 'WarehouseTransfer',
          entityId: transfer.id,
          details: `Transfer ${transferNumber} requested from ${transfer.sourceWarehouse.name} to ${transfer.destinationWarehouse.name}`
        }
      });

      return transfer;
    });
  }

  // Dispatch Stock (Source ➔ In Transit)
  static async dispatchTransfer(transferId: string, dispatchedBy: string) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.warehouseTransfer.findUnique({
        where: { id: transferId },
        include: { items: true, sourceWarehouse: true }
      });

      if (!transfer) throw new Error('Transfer record not found.');
      if (transfer.status !== 'REQUESTED' && transfer.status !== 'DRAFT') {
        throw new Error(`Transfer cannot be dispatched because current status is ${transfer.status}.`);
      }

      // Decrement Inventory Balance at Source Warehouse
      for (const item of transfer.items) {
        const balance = await tx.inventoryBalance.upsert({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: transfer.sourceWarehouseId
            }
          },
          update: { quantityOnHand: { decrement: Number(item.quantity) } },
          create: { variantId: item.variantId, warehouseId: transfer.sourceWarehouseId, quantityOnHand: 0 - Number(item.quantity) }
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            warehouseId: transfer.sourceWarehouseId,
            type: 'TRANSFER_OUT',
            quantityChange: 0 - Number(item.quantity),
            resultingQuantity: balance.quantityOnHand,
            referenceId: transfer.id,
            notes: `Dispatched Transfer ${transfer.transferNumber}`
          }
        });
      }

      const updated = await tx.warehouseTransfer.update({
        where: { id: transferId },
        data: {
          status: 'DISPATCHED',
          approvedBy: dispatchedBy
        },
        include: { items: true, sourceWarehouse: true, destinationWarehouse: true }
      });

      await tx.auditLog.create({
        data: {
          userId: dispatchedBy,
          action: 'TRANSFER_DISPATCHED',
          entity: 'WarehouseTransfer',
          entityId: transferId,
          details: `Stock dispatched for transfer ${transfer.transferNumber}`
        }
      });

      return updated;
    });
  }

  // Receive & Accept Stock (In Transit ➔ Destination Received)
  static async receiveTransfer(transferId: string, receivedBy: string) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.warehouseTransfer.findUnique({
        where: { id: transferId },
        include: { items: true, destinationWarehouse: true }
      });

      if (!transfer) throw new Error('Transfer record not found.');
      if (transfer.status !== 'DISPATCHED' && transfer.status !== 'APPROVED') {
        throw new Error(`Transfer cannot be received because current status is ${transfer.status}.`);
      }

      // Increment Inventory Balance at Destination Warehouse
      for (const item of transfer.items) {
        const balance = await tx.inventoryBalance.upsert({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: transfer.destinationWarehouseId
            }
          },
          update: { quantityOnHand: { increment: Number(item.quantity) } },
          create: { variantId: item.variantId, warehouseId: transfer.destinationWarehouseId, quantityOnHand: Number(item.quantity) }
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            warehouseId: transfer.destinationWarehouseId,
            type: 'TRANSFER_IN',
            quantityChange: Number(item.quantity),
            resultingQuantity: balance.quantityOnHand,
            referenceId: transfer.id,
            notes: `Received Transfer ${transfer.transferNumber}`
          }
        });
      }

      const updated = await tx.warehouseTransfer.update({
        where: { id: transferId },
        data: {
          status: 'RECEIVED'
        },
        include: { items: true, sourceWarehouse: true, destinationWarehouse: true }
      });

      await tx.auditLog.create({
        data: {
          userId: receivedBy,
          action: 'TRANSFER_RECEIVED',
          entity: 'WarehouseTransfer',
          entityId: transferId,
          details: `Stock accepted & received at ${transfer.destinationWarehouse.name} for transfer ${transfer.transferNumber}`
        }
      });

      return updated;
    });
  }

  // Reject / Cancel Transfer
  static async cancelTransfer(transferId: string, cancelledBy: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.warehouseTransfer.findUnique({
        where: { id: transferId },
        include: { items: true }
      });

      if (!transfer) throw new Error('Transfer record not found.');
      if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
        throw new Error(`Transfer status is ${transfer.status} and cannot be cancelled.`);
      }

      // If already dispatched, restore stock back to source warehouse
      if (transfer.status === 'DISPATCHED') {
        for (const item of transfer.items) {
          const balance = await tx.inventoryBalance.upsert({
            where: {
              variantId_warehouseId: {
                variantId: item.variantId,
                warehouseId: transfer.sourceWarehouseId
              }
            },
            update: { quantityOnHand: { increment: Number(item.quantity) } },
            create: { variantId: item.variantId, warehouseId: transfer.sourceWarehouseId, quantityOnHand: Number(item.quantity) }
          });

          await tx.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              warehouseId: transfer.sourceWarehouseId,
              type: 'STOCK_IN',
              quantityChange: Number(item.quantity),
              resultingQuantity: balance.quantityOnHand,
              referenceId: transfer.id,
              notes: `Cancelled Transfer ${transfer.transferNumber} - Stock Restored`
            }
          });
        }
      }

      const updated = await tx.warehouseTransfer.update({
        where: { id: transferId },
        data: {
          status: 'CANCELLED',
          notes: reason ? `${transfer.notes || ''} [Cancelled Reason: ${reason}]` : transfer.notes
        }
      });

      await tx.auditLog.create({
        data: {
          userId: cancelledBy,
          action: 'TRANSFER_CANCELLED',
          entity: 'WarehouseTransfer',
          entityId: transferId,
          details: `Transfer ${transfer.transferNumber} cancelled. Reason: ${reason || 'User action'}`
        }
      });

      return updated;
    });
  }
}
