// Precision financial calculations (rounding to 2 decimal places cleanly)
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, symbol: string = 'GHS'): string {
  const formatted = roundCurrency(amount).toFixed(2);
  return `${symbol} ${formatted}`;
}

export interface TaxBreakdown {
  code: string;
  name: string;
  ratePercent: number;
  taxAmount: number;
}

export function calculateTaxes(
  taxableAmount: number,
  taxRates: Array<{ code: string; name: string; ratePercent: number }>,
  taxPayer: 'CUSTOMER' | 'BUSINESS' = 'CUSTOMER'
): {
  totalTax: number;
  breakdown: TaxBreakdown[];
} {
  let totalTax = 0;
  const breakdown: TaxBreakdown[] = [];

  const totalRatePercent = taxRates.reduce((sum, t) => sum + (t.ratePercent || 0), 0);

  for (const tax of taxRates) {
    let taxAmount = 0;
    if (taxPayer === 'BUSINESS') {
      // Business Covers Tax: Tax is absorbed/included in the selling price
      const factor = totalRatePercent > 0 ? (tax.ratePercent / (100 + totalRatePercent)) : 0;
      taxAmount = roundCurrency(taxableAmount * factor);
    } else {
      // Customer Pays Tax: Tax is added on top of the selling price
      taxAmount = roundCurrency(taxableAmount * (tax.ratePercent / 100));
    }

    totalTax += taxAmount;
    breakdown.push({
      code: tax.code,
      name: tax.name,
      ratePercent: tax.ratePercent,
      taxAmount
    });
  }

  return {
    totalTax: roundCurrency(totalTax),
    breakdown
  };
}

export function calculateCartTotals(
  items: Array<{ unitPrice: number; quantity: number; discountAmount: number }>,
  orderDiscountAmount: number = 0,
  taxRates: Array<{ code: string; name: string; ratePercent: number }> = [],
  taxPayer: 'CUSTOMER' | 'BUSINESS' = 'CUSTOMER'
) {
  let subtotal = 0;
  let itemDiscountTotal = 0;

  for (const item of items) {
    const itemSubtotal = item.unitPrice * item.quantity;
    subtotal += itemSubtotal;
    itemDiscountTotal += item.discountAmount;
  }

  subtotal = roundCurrency(subtotal);
  itemDiscountTotal = roundCurrency(itemDiscountTotal);

  const taxableAmount = roundCurrency(Math.max(0, subtotal - itemDiscountTotal - orderDiscountAmount));
  const { totalTax, breakdown: taxBreakdown } = calculateTaxes(taxableAmount, taxRates, taxPayer);

  // If CUSTOMER pays tax -> Grand Total = Taxable Amount + Tax
  // If BUSINESS covers tax -> Grand Total = Taxable Amount (Customer pays item price only)
  const grandTotal = taxPayer === 'BUSINESS'
    ? taxableAmount
    : roundCurrency(taxableAmount + totalTax);

  return {
    subtotal,
    itemDiscountTotal,
    saleDiscountTotal: roundCurrency(orderDiscountAmount),
    taxTotal: totalTax,
    taxBreakdown,
    grandTotal,
    taxPayer
  };
}

export function calculateChange(grandTotal: number, amountReceived: number): { change: number; isSufficient: boolean } {
  const diff = roundCurrency(amountReceived - grandTotal);
  return {
    change: diff >= 0 ? diff : 0,
    isSufficient: diff >= 0
  };
}
