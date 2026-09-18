export interface PrintableReceipt {
  receiptNumber: string;
  businessName: string;
  tagline?: string;
  taxNumber?: string;
  branchName: string;
  branchPhone?: string;
  branchAddress?: string;
  cashierName: string;
  customerName?: string;
  dateTime: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountReceived: number;
  changeGiven: number;
  currencySymbol: string;
}

export class PrinterDriver {
  // Mode 1: Standard Window Print
  static printBrowserReceipt(receipt: PrintableReceipt) {
    window.print();
  }

  // Mode 2: Direct ESC/POS Thermal Printer Command Generator
  static generateEscPosCommands(receipt: PrintableReceipt): Uint8Array {
    const ESC = 0x1b;
    const GS = 0x1d;

    const commands: number[] = [];

    // Initialize Printer
    commands.push(ESC, 0x40);

    // Center Align
    commands.push(ESC, 0x61, 0x01);

    // Header Text
    let header = `${receipt.businessName.toUpperCase()}\n`;
    if (receipt.tagline) header += `"${receipt.tagline}"\n`;
    header += `Branch: ${receipt.branchName}\n`;
    if (receipt.branchAddress) header += `${receipt.branchAddress}\n`;
    if (receipt.branchPhone) header += `Tel: ${receipt.branchPhone}\n`;
    if (receipt.taxNumber) header += `TIN: ${receipt.taxNumber}\n`;
    header += `--------------------------------\nOFFICIAL RETAIL RECEIPT\n`;
    for (let i = 0; i < header.length; i++) commands.push(header.charCodeAt(i));

    // Left Align
    commands.push(ESC, 0x61, 0x00);

    const meta = `Receipt #: ${receipt.receiptNumber}\nDate: ${receipt.dateTime}\nCashier: ${receipt.cashierName}\n${receipt.customerName ? `Customer: ${receipt.customerName}\n` : ''}--------------------------------\n`;
    for (let i = 0; i < meta.length; i++) commands.push(meta.charCodeAt(i));

    // Line Items
    receipt.items.forEach(item => {
      const itemLine = `${item.name.slice(0, 18).padEnd(18)} ${item.qty}x ${item.total.toFixed(2)}\n`;
      for (let i = 0; i < itemLine.length; i++) commands.push(itemLine.charCodeAt(i));
    });

    const footer = `--------------------------------\nSubtotal:     ${receipt.currencySymbol} ${receipt.subtotal.toFixed(2)}\nDiscounts:    -${receipt.currencySymbol} ${receipt.discountTotal.toFixed(2)}\nTaxes:        +${receipt.currencySymbol} ${receipt.taxTotal.toFixed(2)}\nGRAND TOTAL:  ${receipt.currencySymbol} ${receipt.grandTotal.toFixed(2)}\nAmount Paid:  ${receipt.currencySymbol} ${receipt.amountReceived.toFixed(2)}\nChange Given: ${receipt.currencySymbol} ${receipt.changeGiven.toFixed(2)}\n--------------------------------\nThank you for shopping with us!\n\n\n`;
    for (let i = 0; i < footer.length; i++) commands.push(footer.charCodeAt(i));

    // Cut Paper Command
    commands.push(GS, 0x56, 0x41, 0x03);

    return new Uint8Array(commands);
  }
}
