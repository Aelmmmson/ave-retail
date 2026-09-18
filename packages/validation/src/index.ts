export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLogin(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data.email || typeof data.email !== 'string') errors.push('Valid email is required');
  if (!data.password || typeof data.password !== 'string') errors.push('Password is required');
  return { valid: errors.length === 0, errors };
}

export function validateCreateSale(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data.idempotencyKey) errors.push('Idempotency key is required');
  if (!data.branchId) errors.push('Branch ID is required');
  if (!data.warehouseId) errors.push('Warehouse ID is required');
  if (!data.registerId) errors.push('Register ID is required');
  if (!data.shiftId) errors.push('Active shift ID is required');
  if (!Array.isArray(data.items) || data.items.length === 0) errors.push('Cart must contain at least 1 item');
  
  if (Array.isArray(data.items)) {
    data.items.forEach((item: any, idx: number) => {
      if (!item.variantId) errors.push(`Item ${idx + 1}: Variant ID missing`);
      if (typeof item.quantity !== 'number' || item.quantity <= 0) errors.push(`Item ${idx + 1}: Quantity must be > 0`);
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) errors.push(`Item ${idx + 1}: Invalid unit price`);
    });
  }

  if (typeof data.amountReceived !== 'number') errors.push('Amount received is required');
  return { valid: errors.length === 0, errors };
}

export function validateOpenShift(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data.registerId) errors.push('Register ID is required');
  if (typeof data.openingFloat !== 'number' || data.openingFloat < 0) errors.push('Opening float must be >= 0');
  return { valid: errors.length === 0, errors };
}

export function validateCloseShift(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data.shiftId) errors.push('Shift ID is required');
  if (typeof data.actualClosingCash !== 'number' || data.actualClosingCash < 0) errors.push('Actual closing cash counted is required');
  return { valid: errors.length === 0, errors };
}

export function validateCashMovement(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data.shiftId) errors.push('Shift ID is required');
  if (!['CASH_IN', 'CASH_OUT', 'FLOAT_ADDITION', 'PETTY_CASH'].includes(data.type)) errors.push('Invalid cash movement type');
  if (typeof data.amount !== 'number' || data.amount <= 0) errors.push('Amount must be > 0');
  if (!data.reason || typeof data.reason !== 'string') errors.push('Reason is required');
  return { valid: errors.length === 0, errors };
}
