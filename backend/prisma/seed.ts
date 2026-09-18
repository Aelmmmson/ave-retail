import { PrismaClient, RoleType } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Ave Retail Database Seeding...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'AVE-ORG-01' },
    update: {},
    create: {
      name: 'Ave Retail Enterprise Ltd',
      code: 'AVE-ORG-01',
      taxNumber: 'TIN-GH-9988776655'
    }
  });

  // 2. Branch & Warehouse
  const branch = await prisma.branch.upsert({
    where: { code: 'ACC-01' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Accra Central Mall Branch',
      code: 'ACC-01',
      phone: '+233 24 000 1122',
      address: 'Oxford Street, Osu, Accra'
    }
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-ACC-01' },
    update: {},
    create: {
      branchId: branch.id,
      name: 'Accra Storehouse 01',
      code: 'WH-ACC-01',
      isPrimary: true
    }
  });

  // 3. Registers
  const register = await prisma.register.upsert({
    where: { code: 'REG-ACC-01' },
    update: {},
    create: {
      branchId: branch.id,
      name: 'Main Checkout Register 01',
      code: 'REG-ACC-01',
      isActive: true
    }
  });

  // 4. Users (Admin, Manager, Cashier)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ave.com' },
    update: {
      role: RoleType.OWNER,
      roles: 'OWNER,ADMIN,CASHIER',
      permissions: 'pos,shifts,inventory,customers,expenses,reports,admin'
    } as any,
    create: {
      organizationId: org.id,
      branchId: branch.id,
      name: 'Ebenezer Mensah (Owner / Admin)',
      email: 'admin@ave.com',
      passwordHash: 'admin123',
      role: RoleType.OWNER,
      roles: 'OWNER,ADMIN,CASHIER',
      permissions: 'pos,shifts,inventory,customers,expenses,reports,admin'
    } as any
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@ave.com' },
    update: {
      role: RoleType.MANAGER,
      roles: 'MANAGER,SUPERVISOR,CASHIER',
      permissions: 'pos,shifts,inventory,customers,expenses,reports'
    } as any,
    create: {
      organizationId: org.id,
      branchId: branch.id,
      name: 'Kofi Badu (Store Manager)',
      email: 'manager@ave.com',
      passwordHash: 'manager123',
      role: RoleType.MANAGER,
      roles: 'MANAGER,SUPERVISOR,CASHIER',
      permissions: 'pos,shifts,inventory,customers,expenses,reports'
    } as any
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@ave.com' },
    update: {
      role: RoleType.CASHIER,
      roles: 'CASHIER',
      permissions: 'pos,shifts'
    } as any,
    create: {
      organizationId: org.id,
      branchId: branch.id,
      name: 'Abena Osei (Cashier)',
      email: 'cashier@ave.com',
      passwordHash: 'cashier123',
      role: RoleType.CASHIER,
      roles: 'CASHIER',
      permissions: 'pos,shifts'
    } as any
  });

  // 5. Currencies
  await prisma.currency.upsert({
    where: { code: 'GHS' },
    update: {},
    create: { code: 'GHS', name: 'Ghana Cedi', symbol: 'GH₵', exchangeRateToBase: 1.0, isBaseCurrency: true }
  });
  await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRateToBase: 0.065, isBaseCurrency: false }
  });

  // 6. Tax Rates (Ghana Retail Tax Standard)
  await prisma.taxRate.upsert({
    where: { code: 'VAT' },
    update: {},
    create: { code: 'VAT', name: 'Value Added Tax', ratePercent: 15.0 }
  });
  await prisma.taxRate.upsert({
    where: { code: 'NHIL' },
    update: {},
    create: { code: 'NHIL', name: 'National Health Insurance Levy', ratePercent: 2.5 }
  });
  await prisma.taxRate.upsert({
    where: { code: 'GETFUND' },
    update: {},
    create: { code: 'GETFUND', name: 'Ghana Education Trust Fund Levy', ratePercent: 2.5 }
  });

  // 7. Categories & Brands
  let catGroceries = await prisma.category.findFirst({ where: { organizationId: org.id, name: 'Groceries & Provisions' } });
  if (!catGroceries) {
    catGroceries = await prisma.category.create({
      data: { organizationId: org.id, name: 'Groceries & Provisions', description: 'Daily essential consumer food items' }
    });
  }

  let catBeverages = await prisma.category.findFirst({ where: { organizationId: org.id, name: 'Beverages & Soft Drinks' } });
  if (!catBeverages) {
    catBeverages = await prisma.category.create({
      data: { organizationId: org.id, name: 'Beverages & Soft Drinks', description: 'Cold drinks and juices' }
    });
  }

  let brandNestle = await prisma.brand.findFirst({ where: { organizationId: org.id, name: 'Nestlé' } });
  if (!brandNestle) {
    brandNestle = await prisma.brand.create({ data: { organizationId: org.id, name: 'Nestlé' } });
  }

  let brandCoke = await prisma.brand.findFirst({ where: { organizationId: org.id, name: 'Coca-Cola' } });
  if (!brandCoke) {
    brandCoke = await prisma.brand.create({ data: { organizationId: org.id, name: 'Coca-Cola' } });
  }

  // 8. Products & Variants (with Barcodes & SKUs)
  let prodMilk = await prisma.product.findFirst({ where: { organizationId: org.id, name: 'Ideal Milk 160g Tin' } });
  if (!prodMilk) {
    prodMilk = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: catGroceries.id,
        brandId: brandNestle.id,
        name: 'Ideal Milk 160g Tin',
        description: 'Full cream evaporated milk tin'
      }
    });
  }

  const varMilk = await prisma.productVariant.upsert({
    where: { sku: 'MILK-160G' },
    update: {
      sellingPrice: 8.5,
      costPrice: 6.5
    },
    create: {
      productId: prodMilk.id,
      variantName: 'Default 160g',
      sku: 'MILK-160G',
      barcode: '600100010001',
      costPrice: 6.5,
      sellingPrice: 8.5
    }
  });

  let prodCoke = await prisma.product.findFirst({ where: { organizationId: org.id, name: 'Coca-Cola Soft Drink 500ml' } });
  if (!prodCoke) {
    prodCoke = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: catBeverages.id,
        brandId: brandCoke.id,
        name: 'Coca-Cola Soft Drink 500ml',
        description: 'Refreshing carbonated soft drink'
      }
    });
  }

  const varCoke = await prisma.productVariant.upsert({
    where: { sku: 'COKE-500ML' },
    update: {
      sellingPrice: 6.0,
      costPrice: 4.2
    },
    create: {
      productId: prodCoke.id,
      variantName: '500ml Bottle',
      sku: 'COKE-500ML',
      barcode: '5449000000996',
      costPrice: 4.2,
      sellingPrice: 6.0
    }
  });

  // 9. Initial Inventory Balances
  await prisma.inventoryBalance.upsert({
    where: {
      variantId_warehouseId: {
        variantId: varMilk.id,
        warehouseId: warehouse.id
      }
    },
    update: { quantityOnHand: 150 },
    create: { variantId: varMilk.id, warehouseId: warehouse.id, quantityOnHand: 150 }
  });

  await prisma.inventoryBalance.upsert({
    where: {
      variantId_warehouseId: {
        variantId: varCoke.id,
        warehouseId: warehouse.id
      }
    },
    update: { quantityOnHand: 200 },
    create: { variantId: varCoke.id, warehouseId: warehouse.id, quantityOnHand: 200 }
  });

  // 10. Sample Customer
  await prisma.customer.upsert({
    where: { customerNumber: 'CUST-1001' },
    update: {},
    create: {
      customerNumber: 'CUST-1001',
      name: 'Kofi Annan Enterprises',
      phone: '+233 20 123 4567',
      email: 'kofi@annan.com',
      address: 'East Legon, Accra'
    }
  });

  console.log('✅ Ave Retail Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
