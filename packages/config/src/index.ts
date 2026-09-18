export const PERMISSIONS = {
  // Sales & POS
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_REFUND: 'sales.refund',
  SALES_CANCEL: 'sales.cancel',
  
  // Discounts
  DISCOUNTS_APPLY_BASIC: 'discounts.apply_basic', // Up to 10%
  DISCOUNTS_APPLY_SUPERVISOR: 'discounts.apply_supervisor', // Up to 25%
  DISCOUNTS_OVERRIDE: 'discounts.override', // Unlimited

  // Inventory & Catalog
  CATALOG_VIEW: 'catalog.view',
  CATALOG_MANAGE: 'catalog.manage',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',

  // Shifts & Cash
  SHIFTS_OPEN: 'shifts.open',
  SHIFTS_CLOSE: 'shifts.close',
  SHIFTS_RECONCILE: 'shifts.reconcile',
  CASH_MOVEMENT_CREATE: 'cash_movement.create',
  CASH_DRAWER_TRIGGER: 'cash_drawer.trigger',

  // Customers & Debt
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMER_CREDIT_MANAGE: 'customer_credit.manage',

  // Admin & Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_FINANCIAL: 'reports.financial',
  SETTINGS_MANAGE: 'settings.manage',
  USERS_MANAGE: 'users.manage',
  AUDIT_VIEW: 'audit.view'
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_DEFAULTS = {
  BASE_CURRENCY: 'GHS',
  CASHIER_DISCOUNT_LIMIT_PERCENT: 10,
  SUPERVISOR_DISCOUNT_LIMIT_PERCENT: 25,
  NEGATIVE_STOCK_ALLOWED: true,
  TAX_RATES: [
    { code: 'VAT', name: 'Value Added Tax', ratePercent: 15.0, isCompounded: false },
    { code: 'NHIL', name: 'National Health Insurance Levy', ratePercent: 2.5, isCompounded: false },
    { code: 'GETFUND', name: 'Ghana Education Trust Fund Levy', ratePercent: 2.5, isCompounded: false }
  ]
};
