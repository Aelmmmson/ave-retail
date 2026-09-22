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
        inventoryBalances: warehouseId ? { where: { warehouseId } } : true,
        discountRules: { where: { isActive: true } }
      },
      take: 100
    });

    return variants.map(v => {
      const balance = v.inventoryBalances.find(b => b.warehouseId === warehouseId) || v.inventoryBalances[0];
      const activeDiscountRecords = v.discountRules.filter(dr => dr.isActive);

      const promoRules: any[] = [];
      let activePromoDiscount: number | undefined = undefined;

      for (const dr of activeDiscountRecords) {
        let ruleObj: any = undefined;
        try {
          ruleObj = JSON.parse(dr.name);
          ruleObj.id = dr.id;
        } catch (e) {
          ruleObj = {
            id: dr.id,
            name: dr.name,
            type: dr.type,
            value: Number(dr.value),
            isActive: dr.isActive
          };
        }
        if (ruleObj) {
          promoRules.push(ruleObj);
          if (ruleObj.type === 'PERCENTAGE' && ruleObj.isActive !== false) {
            activePromoDiscount = (activePromoDiscount || 0) + Number(ruleObj.value || ruleObj.percentage || 0);
          }
        }
      }

      const primaryRule = promoRules.length > 0 ? promoRules[0] : undefined;

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
        imageUrl: v.product.imageUrl || '',
        promoRule: primaryRule,
        promoRules,
        activePromoDiscount: activePromoDiscount && activePromoDiscount > 0 ? activePromoDiscount : undefined
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

  static async updateProduct(id: string, data: any) {
    return prisma.$transaction(async (tx) => {
      let variant = await tx.productVariant.findUnique({
        where: { id },
        include: { product: true }
      });

      if (!variant) {
        variant = await tx.productVariant.findFirst({
          where: { productId: id },
          include: { product: true }
        });
      }

      if (!variant) {
        throw new Error(`Product variant with id '${id}' not found.`);
      }

      const updatedVariant = await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          variantName: data.variantName !== undefined ? data.variantName : variant.variantName,
          sku: data.sku !== undefined ? data.sku : variant.sku,
          barcode: data.barcode !== undefined ? data.barcode : variant.barcode,
          costPrice: data.costPrice !== undefined ? Number(data.costPrice) : variant.costPrice,
          sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : variant.sellingPrice,
          minStockLevel: data.minStockLevel !== undefined ? Number(data.minStockLevel) : variant.minStockLevel,
          reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : variant.reorderLevel
        }
      });

      if (data.productName && data.productName !== variant.product.name) {
        await tx.product.update({
          where: { id: variant.productId },
          data: { name: data.productName }
        });
      }

      const targetWarehouse = data.warehouseId || 'WH-ACC-01';
      if (data.quantityOnHand !== undefined) {
        await tx.inventoryBalance.upsert({
          where: { variantId_warehouseId: { variantId: variant.id, warehouseId: targetWarehouse } },
          update: { quantityOnHand: Number(data.quantityOnHand) },
          create: { variantId: variant.id, warehouseId: targetWarehouse, quantityOnHand: Number(data.quantityOnHand) }
        });
      }

      // Handle Multiple Concurrent Promo Rules Addition / Toggles / Clears
      if (data.clearAllPromos || data.clearPromo || data.promoRule === null) {
        await tx.discountRule.updateMany({
          where: { variantId: variant.id },
          data: { isActive: false }
        });
      } else if (data.removePromoId) {
        await tx.discountRule.updateMany({
          where: { id: data.removePromoId, variantId: variant.id },
          data: { isActive: false }
        });
      } else if (data.promoRule && typeof data.promoRule === 'object') {
        const promo = data.promoRule;
        const compactJson = JSON.stringify(promo);
        const ruleName = compactJson.length <= 191 ? compactJson : (promo.name || 'Promotional Discount').slice(0, 191);
        
        let ruleType: 'PERCENTAGE' | 'FIXED_AMOUNT' = 'PERCENTAGE';
        if (promo.type === 'FIXED_AMOUNT' || promo.type === 'TARGET_PRICE') {
          ruleType = 'FIXED_AMOUNT';
        } else {
          ruleType = 'PERCENTAGE';
        }

        const ruleValue = Number(promo.value || promo.percentage || promo.targetPrice || 0);

        let existingRule = null;
        if (promo.id) {
          existingRule = await tx.discountRule.findUnique({ where: { id: promo.id } });
        }

        if (existingRule) {
          await tx.discountRule.update({
            where: { id: existingRule.id },
            data: {
              name: ruleName,
              type: ruleType as any,
              value: ruleValue,
              isActive: promo.isActive !== false
            }
          });
        } else {
          await tx.discountRule.create({
            data: {
              variantId: variant.id,
              name: ruleName,
              type: ruleType as any,
              value: ruleValue,
              scope: 'VARIANT',
              isActive: promo.isActive !== false
            }
          });
        }
      } else if (typeof data.activePromoDiscount === 'number' && data.activePromoDiscount > 0) {
        const promoObj = {
          id: `dr-${Date.now()}`,
          name: `${data.activePromoDiscount}% Promotional Discount`,
          type: 'PERCENTAGE',
          value: data.activePromoDiscount,
          isActive: true
        };
        await tx.discountRule.create({
          data: {
            variantId: variant.id,
            name: JSON.stringify(promoObj),
            type: 'PERCENTAGE',
            value: data.activePromoDiscount,
            scope: 'VARIANT',
            isActive: true
          }
        });
      }

      // Query ALL active discount rules for this variant
      const activeDiscountRecords = await tx.discountRule.findMany({
        where: { variantId: variant.id, isActive: true }
      });

      const promoRules: any[] = [];
      let activePromoDiscount: number | undefined = undefined;

      for (const dr of activeDiscountRecords) {
        let ruleObj: any = undefined;
        try {
          ruleObj = JSON.parse(dr.name);
          ruleObj.id = dr.id;
        } catch (e) {
          ruleObj = {
            id: dr.id,
            name: dr.name,
            type: dr.type,
            value: Number(dr.value),
            isActive: dr.isActive
          };
        }
        if (ruleObj) {
          promoRules.push(ruleObj);
          if (ruleObj.type === 'PERCENTAGE' && ruleObj.isActive !== false) {
            activePromoDiscount = (activePromoDiscount || 0) + Number(ruleObj.value || ruleObj.percentage || 0);
          }
        }
      }

      const primaryRule = promoRules.length > 0 ? promoRules[0] : undefined;
      const currentBalance = await tx.inventoryBalance.findFirst({
        where: { variantId: variant.id, warehouseId: targetWarehouse }
      });

      return {
        id: updatedVariant.id,
        productId: updatedVariant.productId,
        productName: data.productName || variant.product.name,
        variantName: updatedVariant.variantName,
        sku: updatedVariant.sku,
        barcode: updatedVariant.barcode,
        costPrice: Number(updatedVariant.costPrice),
        sellingPrice: Number(updatedVariant.sellingPrice),
        quantityOnHand: currentBalance ? Number(currentBalance.quantityOnHand) : 0,
        activePromoDiscount: activePromoDiscount && activePromoDiscount > 0 ? activePromoDiscount : undefined,
        promoRule: primaryRule,
        promoRules
      };
    });
  }
}
