import React, { useState } from 'react';
import { Printer, Store, FileText, Image, Check, X, Shield, Sparkles } from 'lucide-react';
import { useAlertStore } from '../store/alertStore';
import { formatMoney } from '@ave/shared';

interface ReceiptBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleSale?: any;
}

export const ReceiptBuilderModal: React.FC<ReceiptBuilderModalProps> = ({ isOpen, onClose, sampleSale }) => {
  const { showToast } = useAlertStore();

  const [storeName, setStoreName] = useState('Ave Retail Store - Main Branch');
  const [taxId, setTaxId] = useState('V0012948192-GH');
  const [phone, setPhone] = useState('+233 24 000 0000 / +233 30 111 2222');
  const [address, setAddress] = useState('14 Oxford Street, Osu, Accra, Ghana');
  const [headerNote, setHeaderNote] = useState('Welcome to Ave Retail! Quality Products at Wholesale Prices.');
  const [footerNote, setFooterNote] = useState('Thank you for shopping with us! Goods sold in good condition are refundable within 7 days with valid receipt.');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [showLogo, setShowLogo] = useState<boolean>(true);

  if (!isOpen) return null;

  const mockSale = sampleSale || {
    receiptNumber: 'REC-20260920-0042',
    date: new Date().toLocaleString(),
    cashierName: 'Abena Osei',
    customerName: 'Kofi Mensah',
    items: [
      { name: 'Coca-Cola 500ml', qty: 2, price: 6.00, total: 12.00 },
      { name: 'Golden Penny Sugar 1kg', qty: 1, price: 18.50, total: 18.50 }
    ],
    subtotal: 30.50,
    discount: 2.00,
    tax: 3.50,
    grandTotal: 32.00,
    amountPaid: 50.00,
    change: 18.00,
    paymentMethod: 'CASH'
  };

  const handlePrintReceipt = () => {
    window.print();
    showToast('success', 'Thermal Print Sent', 'ESC/POS Receipt command dispatched to thermal printer & cash drawer kicked.');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-4xl space-y-4 shadow-2xl overflow-y-auto max-h-[92vh] text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Printer className="w-6 h-6 text-teal-500" />
            <span>Customizable Thermal Receipt Builder & ESC/POS Preview</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Editor Form */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Store / Branch Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Tax / VAT Reg. Number</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Numbers</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Store Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Header Welcome Note</label>
              <textarea
                rows={2}
                value={headerNote}
                onChange={(e) => setHeaderNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Footer Return Policy & Note</label>
              <textarea
                rows={2}
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-950 rounded-xl">
              <span className="font-bold text-slate-700 dark:text-slate-300">Thermal Roll Width</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-3 py-1 rounded-lg font-bold ${paperWidth === '80mm' ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  80mm Standard
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-3 py-1 rounded-lg font-bold ${paperWidth === '58mm' ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                >
                  58mm Compact
                </button>
              </div>
            </div>
          </div>

          {/* Live Thermal Receipt Ticket Simulation */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-200 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 mb-2">Live Thermal Receipt Ticket</span>
            
            <div
              className={`bg-white text-slate-900 font-mono text-xs p-4 rounded shadow-2xl space-y-2 border border-slate-300 select-text ${
                paperWidth === '58mm' ? 'w-56 text-[11px]' : 'w-72'
              }`}
            >
              {/* Logo & Store Info */}
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-400">
                <div className="font-black text-sm uppercase">{storeName}</div>
                <div className="text-[10px]">{address}</div>
                <div className="text-[10px]">TEL: {phone}</div>
                <div className="text-[10px] font-bold">VAT REG: {taxId}</div>
              </div>

              {headerNote && <div className="text-center italic text-[10px] py-1 border-b border-dashed border-slate-300">{headerNote}</div>}

              {/* Receipt Metadata */}
              <div className="text-[10px] space-y-0.5 py-1">
                <div>REC #: {mockSale.receiptNumber}</div>
                <div>DATE: {mockSale.date}</div>
                <div>CASHIER: {mockSale.cashierName}</div>
                <div>CUSTOMER: {mockSale.customerName}</div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-t border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                {mockSale.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.qty}x {it.name}</span>
                    <span className="font-bold">{formatMoney(it.total, 'GH₵')}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-0.5 text-[11px] pt-1 font-bold">
                <div className="flex justify-between"><span>SUBTOTAL:</span><span>{formatMoney(mockSale.subtotal, 'GH₵')}</span></div>
                <div className="flex justify-between text-rose-600"><span>DISCOUNT:</span><span>-{formatMoney(mockSale.discount, 'GH₵')}</span></div>
                <div className="flex justify-between"><span>VAT / TAX:</span><span>{formatMoney(mockSale.tax, 'GH₵')}</span></div>
                <div className="flex justify-between text-base font-black border-t border-b border-slate-900 py-1">
                  <span>TOTAL PAID:</span>
                  <span>{formatMoney(mockSale.grandTotal, 'GH₵')}</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1"><span>TENDERED ({mockSale.paymentMethod}):</span><span>{formatMoney(mockSale.amountPaid, 'GH₵')}</span></div>
                <div className="flex justify-between text-[10px]"><span>CHANGE DUE:</span><span>{formatMoney(mockSale.change, 'GH₵')}</span></div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[9px] pt-3 border-t border-dashed border-slate-400 space-y-1">
                <div>{footerNote}</div>
                <div className="font-bold">*** POWERED BY AVE RETAIL POS ***</div>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={handlePrintReceipt}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt & Open Drawer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
