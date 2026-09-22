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
  taxPayer: 'CUSTOMER' | 'BUSINESS';
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
  setTaxPayer: (taxPayer: 'CUSTOMER' | 'BUSINESS') => void;
  setActiveShift: (shiftId: string | null) => void;
  clearCart: () => void;
}

function isRuleActiveNow(r: any): boolean {
  if (!r || r.isActive === false) return false;
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Optional Start Date validation (00:00:00 start of day)
  if (r.startDate && String(r.startDate).trim() !== '') {
    const startD = new Date(r.startDate);
    startD.setHours(0, 0, 0, 0);
    if (startD > now) return false;
  }

  // Optional End Date validation (23:59:59 end of day)
  if (r.endDate && String(r.endDate).trim() !== '') {
    const endD = new Date(r.endDate);
    endD.setHours(23, 59, 59, 999);
    if (endD < now) return false;
  }

  // Optional Happy Hour validation
  if (r.startHour !== undefined && r.endHour !== undefined && r.startHour !== '' && r.endHour !== '') {
    const sh = Number(r.startHour);
    const eh = Number(r.endHour);
    if (!isNaN(sh) && !isNaN(eh)) {
      if (currentHour < sh || currentHour >= eh) return false;
    }
  }

  // Optional Days of Week validation
  if (r.daysOfWeek && Array.isArray(r.daysOfWeek) && r.daysOfWeek.length > 0) {
    const activeDays = r.daysOfWeek.map(Number);
    if (!activeDays.includes(currentDay)) return false;
  }

  return true;
}

function computeItemPromoDiscount(item: { unitPrice: number; quantity: number; activePromoDiscount?: number; promoRule?: any; promoRules?: any[] }): number {
  const qty = item.quantity;
  const unitPrice = item.unitPrice;
  const maxDiscount = unitPrice * qty;

  const rulesToEvaluate: any[] = [];
  if (Array.isArray(item.promoRules) && item.promoRules.length > 0) {
    rulesToEvaluate.push(...item.promoRules);
  } else if (item.promoRule) {
    rulesToEvaluate.push(item.promoRule);
  }

  if (rulesToEvaluate.length === 0 && item.activePromoDiscount && item.activePromoDiscount > 0) {
    return roundCurrency(Math.min(maxDiscount, (unitPrice * (item.activePromoDiscount / 100)) * qty));
  }

  // Filter only rules active RIGHT NOW today
  const activeRules = rulesToEvaluate.filter(r => isRuleActiveNow(r));
  if (activeRules.length === 0) return 0;

  // 1. Evaluate BOGO rule first to separate free vs paid units
  const bogoRule = activeRules.find(r => r.type === 'BOGO');
  let freeUnits = 0;
  let bogoDiscount = 0;

  if (bogoRule) {
    const buyN = Number(bogoRule.buyQty || 1);
    const freeM = Number(bogoRule.getQtyFree || 1);
    const fullGroups = Math.floor(qty / (buyN + freeM));
    const remainder = qty % (buyN + freeM);
    freeUnits = (fullGroups * freeM) + Math.max(0, remainder - buyN);
    bogoDiscount = freeUnits * unitPrice;
  }

  // 2. Paid units count for percentage/fixed discounts
  const paidQty = Math.max(0, qty - freeUnits);
  let otherDiscounts = 0;

  for (const r of activeRules) {
    if (r.type === 'BOGO') continue; // Already calculated above

    let ruleDiscount = 0;
    if (r.type === 'PERCENTAGE') {
      ruleDiscount = (unitPrice * (Number(r.value || r.percentage || 0) / 100)) * paidQty;
    } else if (r.type === 'FIXED_AMOUNT') {
      ruleDiscount = Math.min(unitPrice * paidQty, Number(r.value || 0) * paidQty);
    } else if (r.type === 'TARGET_PRICE') {
      ruleDiscount = Math.max(0, unitPrice - Number(r.value || 0)) * paidQty;
    }

    otherDiscounts += ruleDiscount;
  }

  const totalDiscount = bogoDiscount + otherDiscounts;
  return roundCurrency(Math.min(maxDiscount, totalDiscount));
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
  taxPayer: (localStorage.getItem('ave_tax_payer') as 'CUSTOMER' | 'BUSINESS') || 'CUSTOMER',
  amountReceived: 0,
  activeShiftId: null,
  registerId: 'REG-ACC-01',
  warehouseId: 'WH-ACC-01',
  branchId: 'ACC-01',

  addItem: (variant, qty = 1) => {
    const stockLimit = (variant.quantityOnHand !== undefined && variant.quantityOnHand !== null)
      ? variant.quantityOnHand
      : Infinity;

    // Collect all rules associated with this variant
    const rulesToEvaluate: any[] = [];
    if (Array.isArray(variant.promoRules) && variant.promoRules.length > 0) {
      rulesToEvaluate.push(...variant.promoRules);
    } else if (variant.promoRule) {
      rulesToEvaluate.push(variant.promoRule);
    }

    // Check if BOGO rule is ACTIVE TODAY
    const activeBogoRule = rulesToEvaluate.find(r => r && r.type === 'BOGO' && isRuleActiveNow(r));

    let addedQty = qty;
    if (activeBogoRule) {
      const buyQty = Number(activeBogoRule.buyQty || 1);
      const getQtyFree = Number(activeBogoRule.getQtyFree || 1);
      addedQty = qty + (Math.ceil(qty / buyQty) * getQtyFree);
    }

    const existing = get().items.find((i) => i.variantId === variant.id);
    if (existing) {
      const targetQty = existing.quantity + addedQty;
      if (stockLimit !== Infinity && targetQty > stockLimit) {
        import('./alertStore').then(({ useAlertStore }) => {
          useAlertStore.getState().showToast(
            'warning',
            'Inventory Stock Limit',
            `⚠️ Cannot add more units. Only ${stockLimit} available in stock!`
          );
        });
        get().updateQuantity(variant.id, stockLimit);
        return;
      }
      get().updateQuantity(variant.id, targetQty);
      return;
    }

    let initialQty = addedQty;
    if (stockLimit !== Infinity && initialQty > stockLimit) {
      initialQty = Math.max(1, stockLimit);
      import('./alertStore').then(({ useAlertStore }) => {
        useAlertStore.getState().showToast(
          'warning',
          'Inventory Stock Limit',
          `⚠️ Cart quantity capped at available stock limit (${stockLimit} units).`
        );
      });
    } else if (activeBogoRule) {
      import('./alertStore').then(({ useAlertStore }) => {
        useAlertStore.getState().showToast(
          'success',
          '🎁 BOGO Promo Free Items Added',
          `Buy ${activeBogoRule.buyQty || 1} Get ${activeBogoRule.getQtyFree || 1} Free! Free items automatically added to cart.`
        );
      });
    }

    const tempItem: CartItemDTO = {
      variantId: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      productName: variant.productName,
      variantName: variant.variantName,
      unitPrice: variant.sellingPrice,
      quantity: initialQty,
      discountType: 'PERCENTAGE',
      discountValue: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalPrice: variant.sellingPrice * initialQty,
      promoRule: variant.promoRule,
      promoRules: variant.promoRules || (variant.promoRule ? [variant.promoRule] : []),
      activePromoDiscount: variant.activePromoDiscount,
      quantityOnHand: variant.quantityOnHand
    };

    const initialDiscount = computeItemPromoDiscount(tempItem);

    const newItem: CartItemDTO = {
      ...tempItem,
      discountType: initialDiscount > 0 ? 'FIXED_AMOUNT' : 'PERCENTAGE',
      discountValue: initialDiscount > 0 ? initialDiscount : 0,
      discountAmount: initialDiscount,
      totalPrice: roundCurrency(variant.sellingPrice * initialQty - initialDiscount)
    };

    set({ items: [...get().items, newItem] });
  },

  updateQuantity: (variantId, qty) => {
    if (qty <= 0) {
      get().removeItem(variantId);
      return;
    }

    const targetItem = get().items.find(i => i.variantId === variantId);
    let finalQty = qty;

    if (targetItem && targetItem.quantityOnHand !== undefined && targetItem.quantityOnHand !== null) {
      if (qty > targetItem.quantityOnHand) {
        finalQty = targetItem.quantityOnHand;
        import('./alertStore').then(({ useAlertStore }) => {
          useAlertStore.getState().showToast(
            'warning',
            'Stock Threshold Reached',
            `⚠️ Inventory stock limit reached. Only ${targetItem.quantityOnHand} units available!`
          );
        });
      }
    }

    set({
      items: get().items.map((i) => {
        if (i.variantId === variantId) {
          const updatedItem = { ...i, quantity: finalQty };
          let discVal = 0;
          if (i.promoRule || (i.promoRules && i.promoRules.length > 0) || i.activePromoDiscount) {
            discVal = computeItemPromoDiscount(updatedItem);
          } else {
            const lineSubtotal = i.unitPrice * finalQty;
            if (i.discountType === 'PERCENTAGE') {
              discVal = roundCurrency(lineSubtotal * (i.discountValue / 100));
            } else {
              discVal = roundCurrency(Math.min(lineSubtotal, i.discountValue));
            }
          }
          const lineSubtotal = i.unitPrice * finalQty;
          return {
            ...i,
            quantity: finalQty,
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
  setTaxPayer: (taxPayer) => {
    localStorage.setItem('ave_tax_payer', taxPayer);
    set({ taxPayer });
  },
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
