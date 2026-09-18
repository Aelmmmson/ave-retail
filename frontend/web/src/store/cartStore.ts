import { create } from 'zustand';
import { CartItemDTO, ProductVariantDTO, CustomerDTO, CurrencyDTO, TaxRateDTO } from '@ave/types';
import { calculateCartTotals, roundCurrency } from '@ave/shared';

interface CartState {
  items: CartItemDTO[];
  selectedCustomer: CustomerDTO | null;
  saleDiscountAmount: number;
  saleDiscountValue: number;
  saleDiscountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  currency: CurrencyDTO;
  currencies: CurrencyDTO[];
  taxRates: TaxRateDTO[];
  amountReceived: number;
  activeShiftId: string | null;
  registerId: string;
  warehouseId: string;
  branchId: string;

  // Actions
  addItem: (variant: ProductVariantDTO, qty?: number) => void;
  updateQuantity: (variantId: string, qty: number) => void;
  updateItemDiscount: (
    variantId: string,
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: number,
    userRole: string
  ) => { success: boolean; message?: string };
  removeItem: (variantId: string) => void;
  setOrderDiscount: (discountType: 'PERCENTAGE' | 'FIXED_AMOUNT', discountValue: number) => void;
  setCustomer: (customer: CustomerDTO | null) => void;
  setCurrency: (currencyCode: string) => void;
  setAmountReceived: (amount: number) => void;
  setTaxRates: (taxes: TaxRateDTO[]) => void;
  setActiveShift: (shiftId: string | null) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedCustomer: null,
  saleDiscountAmount: 0,
  saleDiscountValue: 0,
  saleDiscountType: 'PERCENTAGE',
  currency: { code: 'GHS', symbol: 'GH₵', name: 'Ghana Cedi', exchangeRateToBase: 1.0, isBaseCurrency: true },
  currencies: [
    { code: 'GHS', symbol: 'GH₵', name: 'Ghana Cedi', exchangeRateToBase: 1.0, isBaseCurrency: true },
    { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRateToBase: 0.065, isBaseCurrency: false }
  ],
  taxRates: [
    { id: '1', code: 'VAT', name: 'VAT (15%)', ratePercent: 15, isActive: true },
    { id: '2', code: 'NHIL', name: 'NHIL (2.5%)', ratePercent: 2.5, isActive: true },
    { id: '3', code: 'GETFUND', name: 'GETFund (2.5%)', ratePercent: 2.5, isActive: true }
  ],
  amountReceived: 0,
  activeShiftId: null,
  registerId: 'REG-ACC-01',
  warehouseId: 'WH-ACC-01',
  branchId: 'ACC-01',

  addItem: (variant, qty = 1) => {
    const existing = get().items.find((i) => i.variantId === variant.id);
    if (existing) {
      get().updateQuantity(variant.id, existing.quantity + qty);
      return;
    }

    const newItem: CartItemDTO = {
      variantId: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      productName: variant.productName,
      variantName: variant.variantName,
      unitPrice: variant.sellingPrice,
      quantity: qty,
      discountType: 'PERCENTAGE',
      discountValue: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalPrice: variant.sellingPrice * qty
    };

    set({ items: [...get().items, newItem] });
  },

  updateQuantity: (variantId, qty) => {
    if (qty <= 0) {
      get().removeItem(variantId);
      return;
    }
    set({
      items: get().items.map((i) => {
        if (i.variantId === variantId) {
          const lineSubtotal = i.unitPrice * qty;
          let discVal = 0;
          if (i.discountType === 'PERCENTAGE') {
            discVal = roundCurrency(lineSubtotal * (i.discountValue / 100));
          } else {
            discVal = roundCurrency(Math.min(lineSubtotal, i.discountValue));
          }
          return {
            ...i,
            quantity: qty,
            discountAmount: discVal,
            totalPrice: roundCurrency(lineSubtotal - discVal)
          };
        }
        return i;
      })
    });
  },

  updateItemDiscount: (variantId, discountType, discountValue, userRole) => {
    // Enforcement: Cashier limits (Up to 10% percentage OR up to 10% equivalent fixed amount)
    const targetItem = get().items.find((i) => i.variantId === variantId);
    if (!targetItem) return { success: false, message: 'Item not found in cart.' };

    const lineSubtotal = targetItem.unitPrice * targetItem.quantity;
    let discAmount = 0;

    if (discountType === 'PERCENTAGE') {
      if (userRole === 'CASHIER' && discountValue > 10) {
        return { success: false, message: '⚠️ Cashier limit is 10%. Higher discounts require Supervisor Override.' };
      }
      discAmount = roundCurrency(lineSubtotal * (discountValue / 100));
    } else {
      const equivPercent = (discountValue / lineSubtotal) * 100;
      if (userRole === 'CASHIER' && equivPercent > 10) {
        return { success: false, message: '⚠️ Fixed discount exceeds Cashier 10% threshold. Supervisor Override required.' };
      }
      discAmount = roundCurrency(Math.min(lineSubtotal, discountValue));
    }

    set({
      items: get().items.map((i) => {
        if (i.variantId === variantId) {
          return {
            ...i,
            discountType,
            discountValue,
            discountAmount: discAmount,
            totalPrice: roundCurrency(lineSubtotal - discAmount)
          };
        }
        return i;
      })
    });

    return { success: true };
  },

  removeItem: (variantId) => {
    set({ items: get().items.filter((i) => i.variantId !== variantId) });
  },

  setOrderDiscount: (discountType, discountValue) => {
    const totals = calculateCartTotals(
      get().items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity, discountAmount: i.discountAmount })),
      0,
      []
    );

    let orderDiscVal = 0;
    if (discountType === 'PERCENTAGE') {
      orderDiscVal = roundCurrency(totals.subtotal * (discountValue / 100));
    } else {
      orderDiscVal = roundCurrency(Math.min(totals.subtotal, discountValue));
    }

    set({
      saleDiscountType: discountType,
      saleDiscountValue: discountValue,
      saleDiscountAmount: orderDiscVal
    });
  },

  setCustomer: (customer) => set({ selectedCustomer: customer }),
  setCurrency: (code) => {
    const found = get().currencies.find((c) => c.code === code);
    if (found) set({ currency: found });
  },
  setAmountReceived: (amount) => set({ amountReceived: amount }),
  setTaxRates: (taxRates) => set({ taxRates }),
  setActiveShift: (activeShiftId) => set({ activeShiftId }),
  clearCart: () =>
    set({
      items: [],
      saleDiscountAmount: 0,
      saleDiscountValue: 0,
      amountReceived: 0,
      selectedCustomer: null
    })
}));
