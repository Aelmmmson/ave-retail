import { prisma } from './db';

export class CatalogService {
  static async searchVariants(query?: string, warehouseId?: string) {
    const whereCondition: any = {
      product: { isActive: true }
    };

    if (query) {
      whereCondition.OR = [
        { barcode: { contains: query } },
        { sku: { contains: query } },
        { variantName: { contains: query } },
        { product: { name: { contains: query } } }
      ];
    }

    const variants = await prisma.productVariant.findMany({
      where: whereCondition,
      include: {
        product: { include: { category: true, brand: true } },
        inventoryBalances: warehouseId ? { where: { warehouseId } } : true
      },
      take: 100
    });

    return variants.map(v => {
      const balance = v.inventoryBalances.find(b => b.warehouseId === warehouseId) || v.inventoryBalances[0];
      return {
        id: v.id,
        productId: v.productId,
        productName: v.product.name,
        variantName: v.variantName,
        sku: v.sku,
        barcode: v.barcode || '',
        costPrice: Number(v.costPrice),
        sellingPrice: Number(v.sellingPrice),
        minStockLevel: Number(v.minStockLevel),
        reorderLevel: Number(v.reorderLevel),
        quantityOnHand: balance ? Number(balance.quantityOnHand) : 0,
        categoryName: v.product.category?.name || 'Uncategorized',
        brandName: v.product.brand?.name || 'Generic',
        imageUrl: v.product.imageUrl || ''
      };
    });
  }

  static async adjustStock(variantId: string, warehouseId: string, quantityChange: number, type: 'STOCK_IN' | 'ADJUSTMENT_DAMAGE' | 'ADJUSTMENT_CORRECTION', notes: string) {
    return prisma.$transaction(async (tx) => {
      const balance = await tx.inventoryBalance.upsert({
        where: { variantId_warehouseId: { variantId, warehouseId } },
        update: { quantityOnHand: { increment: quantityChange } },
        create: { variantId, warehouseId, quantityOnHand: quantityChange }
      });

      await tx.inventoryMovement.create({
        data: {
          variantId,
          warehouseId,
          type: type as any,
          quantityChange,
          resultingQuantity: balance.quantityOnHand,
          notes
        }
      });

      return balance;
    });
  }

  static async createProduct(data: {
    productName: string;
    variantName?: string;
    sku: string;
    barcode?: string;
    costPrice: number;
    sellingPrice: number;
    initialStock: number;
    categoryName?: string;
    warehouseId?: string;
    organizationId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      let categoryId: string | null = null;
      if (data.categoryName) {
        let cat = await tx.category.findFirst({
          where: { name: data.categoryName }
        });
        if (!cat) {
          cat = await tx.category.create({
            data: {
              organizationId: data.organizationId || 'AVE-ORG-01',
              name: data.categoryName
            }
          });
        }
        categoryId = cat.id;
      }

      const product = await tx.product.create({
        data: {
          organizationId: data.organizationId || 'AVE-ORG-01',
          categoryId,
          name: data.productName,
          isActive: true
        }
      });

      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          variantName: data.variantName || 'Default Unit',
          sku: data.sku,
          barcode: data.barcode || data.sku,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          minStockLevel: 5,
          reorderLevel: 10
        }
      });

      const targetWarehouse = data.warehouseId || 'WH-ACC-01';
      await tx.inventoryBalance.create({
        data: {
          variantId: variant.id,
          warehouseId: targetWarehouse,
          quantityOnHand: data.initialStock || 0
        }
      });

      if (data.initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            variantId: variant.id,
            warehouseId: targetWarehouse,
            type: 'STOCK_IN',
            quantityChange: data.initialStock,
            resultingQuantity: data.initialStock,
            notes: 'Initial Stock Intake'
          }
        });
      }

      return {
        id: variant.id,
        productId: product.id,
        productName: product.name,
        variantName: variant.variantName,
        sku: variant.sku,
        barcode: variant.barcode,
        costPrice: Number(variant.costPrice),
        sellingPrice: Number(variant.sellingPrice),
        quantityOnHand: data.initialStock || 0,
        categoryName: data.categoryName || 'General'
      };
    });
  }

  static async getCategories() {
    return prisma.category.findMany();
  }

  static async getCurrencies() {
    return prisma.currency.findMany();
  }

  static async getTaxRates() {
    return prisma.taxRate.findMany({ where: { isActive: true } });
  }
}
