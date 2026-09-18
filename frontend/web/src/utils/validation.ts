/**
 * Sanitizes input to accept only telephone characters (digits, +, -, parentheses, spaces).
 * Strips all alphabetic characters and illegal symbols.
 */
export const sanitizePhoneNumber = (input: string): string => {
  if (!input) return '';
  return input.replace(/[^0-9+\-()\s]/g, '');
};
