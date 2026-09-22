export type RoleType = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'CASHIER' | 'INVENTORY_OFFICER' | 'ACCOUNTANT';
export type TaxPayerType = 'CUSTOMER' | 'BUSINESS';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: RoleType;
  branchId?: string;
  permissions: string[];
  organizationName?: string;
  tagline?: string;
  taxNumber?: string;
  phone?: string;
  address?: string;
  website?: string;
  receiptHeaderNote?: string;
  receiptFooterNote?: string;
  showLogoOnReceipt?: boolean;
  loyaltyEarnRate?: number;
  taxPayer?: TaxPayerType;
}

export interface AuthState {
  user: UserDTO | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface TaxRateDTO {
  id: string;
  code: string;
  name: string;
  ratePercent: number;
  isActive: boolean;
  taxPayer?: TaxPayerType;
}

export interface CurrencyDTO {
  code: string;
  symbol: string;
  name: string;
  exchangeRateToBase: number;
  isBaseCurrency: boolean;
}

export interface BrandDTO {
  id: string;
  name: string;
  createdAt?: string;
}

export interface ExpenseDTO {
  id: string;
  title: string;
  amount: number;
  category: string;
  notes?: string;
  date: string;
  createdByName?: string;
  branchId?: string;
  createdAt?: string;
}

export interface WarehouseTransferItemDTO {
  id: string;
  variantId: string;
  variantName?: string;
  sku?: string;
  quantity: number;
}

export interface WarehouseTransferDTO {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName?: string;
  destinationWarehouseId: string;
  destinationWarehouseName?: string;
  status: 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  items: WarehouseTransferItemDTO[];
}

export interface PromoRule {
  id?: string;
  name?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TARGET_PRICE' | 'BOGO';
  value: number; // Percentage off, fixed amount off, or target selling price
  buyQty?: number; // e.g. Buy 1 (or N)
  getQtyFree?: number; // e.g. Get 1 free
  startDate?: string;
  endDate?: string;
  startHour?: number; // 0-23
  endHour?: number; // 0-23
  daysOfWeek?: number[]; // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]
  isActive: boolean;
}

export interface ProductVariantDTO {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  variantName: string;
  costPrice: number;
  sellingPrice: number;
  costCurrency?: string; // e.g. USD, EUR, CNY
  sellingCurrency?: string; // e.g. GHS
  exchangeRateRecorded?: number; // Rate snapshot at time of product intake
  minStockLevel: number;
  reorderLevel: number;
  quantityOnHand: number;
  categoryName?: string;
  brandName?: string;
  imageUrl?: string;
  activePromoDiscount?: number; // Active promotional discount
  promoRule?: PromoRule;
  promoRules?: PromoRule[]; // All active promo rules applied to this variant
}

export interface CartItemDTO {
  variantId: string;
  sku: string;
  barcode?: string;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number; // percentage (10) or fixed amount (5.00)
  discountAmount: number; // calculated total currency amount off
  taxAmount: number;
  totalPrice: number;
  promoRule?: PromoRule;
  promoRules?: PromoRule[];
  activePromoDiscount?: number;
  quantityOnHand?: number;
}

export interface SalePaymentInput {
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER' | 'STORE_CREDIT';
  amount: number;
  currencyCode: string;
  referenceNumber?: string;
}

export interface CreateSaleDTO {
  idempotencyKey: string;
  branchId: string;
  warehouseId: string;
  registerId: string;
  shiftId: string;
  customerId?: string;
  currencyCode: string;
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
  }>;
  saleDiscountAmount: number;
  payments: SalePaymentInput[];
  amountReceived: number;
  changeGiven: number;
  notes?: string;
  redeemedPoints?: number;
  redeemedPointsDiscount?: number;
  taxPayer?: TaxPayerType;
}

export interface SaleDTO {
  id: string;
  receiptNumber: string;
  branchId: string;
  warehouseId: string;
  registerId: string;
  shiftId: string;
  cashierName: string;
  customerName?: string;
  currencyCode: string;
  subtotal: number;
  itemDiscountTotal: number;
  saleDiscountTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  changeGiven: number;
  status: 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'FULLY_REFUNDED' | 'CANCELLED';
  createdAt: string;
  items: Array<{
    id: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface CashierShiftDTO {
  id: string;
  registerId: string;
  userId: string;
  userName: string;
  branchId: string;
  openingFloat: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  varianceAmount?: number;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
  openedAt: string;
  closedAt?: string;
  totalCashSales: number;
  totalCashIn: number;
  totalCashRefunds: number;
  totalCashOut: number;
}

export interface CashMovementDTO {
  id: string;
  shiftId: string;
  userId: string;
  userName: string;
  type: 'CASH_IN' | 'CASH_OUT' | 'FLOAT_ADDITION' | 'PETTY_CASH';
  amount: number;
  reason: string;
  createdAt: string;
}

export interface CustomerDTO {
  id: string;
  customerNumber: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  outstandingBalance: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalPurchasesCount: number;
  totalSpent: number;
}

export interface CustomerLedgerEntryDTO {
  id: string;
  customerId: string;
  type: 'CREDIT_SALE' | 'DEBT_PAYMENT' | 'CREDIT_NOTE' | 'ADJUSTMENT';
  debit: number;
  credit: number;
  runningBalance: number;
  notes?: string;
  createdAt: string;
}
