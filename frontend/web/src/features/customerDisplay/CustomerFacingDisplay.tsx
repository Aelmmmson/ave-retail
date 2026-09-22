import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, Sparkles, Store, Clock } from 'lucide-react';
import { formatMoney } from '@ave/shared';
import { useAuthStore } from '../../store/authStore';

export interface CustomerDisplayCartItem {
  id: string;
  name: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
}

export interface CustomerDisplayState {
  status: 'WELCOME' | 'CART' | 'THANK_YOU';
  items: CustomerDisplayCartItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  receiptNumber?: string;
  amountPaid?: number;
  changeGiven?: number;
  earnedPoints?: number;
}

export const CustomerFacingDisplay: React.FC = () => {
  const { user, currentBranch } = useAuthStore();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ave_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const [displayState, setDisplayState] = useState<CustomerDisplayState>({
    status: 'WELCOME',
    items: [],
    subtotal: 0,
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: 0
  });

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const bc = new BroadcastChannel('ave_customer_display');

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_CUSTOMER_DISPLAY') {
        setDisplayState(event.data.payload);
      }
      if (event.data && event.data.type === 'SYNC_THEME') {
        setTheme(event.data.theme);
      }
    };

    bc.onmessage = handleMessage;

    const checkStorage = () => {
      const stored = localStorage.getItem('ave_customer_display_state');
      if (stored) {
        try {
          setDisplayState(JSON.parse(stored));
        } catch (e) {}
      }
      const savedTheme = localStorage.getItem('ave_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    };
    checkStorage();

    window.addEventListener('storage', checkStorage);

    return () => {
      bc.close();
      window.removeEventListener('storage', checkStorage);
    };
  }, []);

  const orgName = user?.organizationName || 'Ave Retail';
  const tagline = user?.tagline || 'Everyday Quality Retail';

  return (
    <div className={`min-h-screen flex flex-col justify-between font-urbanist select-none overflow-hidden transition-colors ${
      theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Banner Header */}
      <header className={`px-8 py-5 border-b flex justify-between items-center shadow-lg transition-colors ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-inner">
            <Store className="w-7 h-7 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{orgName}</h1>
            <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-widest">{currentBranch?.name || tagline}</p>
          </div>
        </div>

        <div className={`flex items-center space-x-3 px-5 py-2.5 rounded-2xl border font-mono text-sm transition-colors ${
          theme === 'dark' ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>{currentTime}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center p-8">
        {/* STATE A: WELCOME DISPLAY */}
        {displayState.status === 'WELCOME' && (
          <div className="text-center space-y-6 max-w-3xl mx-auto py-12 animate-fade-in">
            <div className="inline-flex p-6 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 shadow-2xl mb-2">
              <Sparkles className="w-16 h-16 animate-pulse" />
            </div>
            <h2 className={`text-4xl sm:text-5xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Welcome to {orgName}!
            </h2>
            <p className={`text-lg max-w-xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              We are delighted to serve you. Your cart items and transaction summary will display right here as items are scanned.
            </p>
            <div className={`inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border ${
              theme === 'dark' ? 'bg-teal-950/60 text-teal-400 border-teal-800/60' : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              <ShoppingBag className="w-4 h-4" />
              <span>Ready for Checkout</span>
            </div>
          </div>
        )}

        {/* STATE B: LIVE CART DISPLAY */}
        {displayState.status === 'CART' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full items-start">
            {/* Left: Cart Items List */}
            <div className={`lg:col-span-2 border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[70vh] flex flex-col transition-colors ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex justify-between items-center border-b pb-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <h2 className={`text-lg font-bold flex items-center space-x-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  <ShoppingBag className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>Your Scanned Items ({displayState.items.reduce((a, b) => a + b.quantity, 0)})</span>
                </h2>
                <span className="text-xs text-slate-500 font-mono">Live Checkout</span>
              </div>

              <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                {displayState.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition ${
                      theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-14 h-14 object-cover rounded-xl border border-slate-300 dark:border-slate-800" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg border border-teal-500/20">
                          {item.quantity}×
                        </div>
                      )}
                      <div>
                        <div className={`font-extrabold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                        {item.variantName && (
                          <div className="text-xs text-teal-600 dark:text-teal-400 font-medium">{item.variantName}</div>
                        )}
                        <div className="text-xs text-slate-500 font-mono">
                          {item.quantity} × {formatMoney(item.unitPrice, 'GH₵')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black font-mono text-teal-600 dark:text-teal-300">
                        {formatMoney(item.lineTotal, 'GH₵')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Total & Payment Summary Box */}
            <div className={`border rounded-3xl p-6 shadow-2xl space-y-6 flex flex-col justify-between transition-colors ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 border-b pb-2 ${
                  theme === 'dark' ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                }`}>
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Subtotal</span>
                    <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatMoney(displayState.subtotal, 'GH₵')}</span>
                  </div>

                  {displayState.taxTotal > 0 && (
                    <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Tax Obligations</span>
                      <span className="font-mono font-bold text-rose-500">+ {formatMoney(displayState.taxTotal, 'GH₵')}</span>
                    </div>
                  )}

                  {displayState.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Discounts & Savings</span>
                      <span className="font-mono">- {formatMoney(displayState.discountTotal, 'GH₵')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-teal-600 text-white rounded-2xl text-center space-y-1 shadow-xl">
                <span className="text-xs font-bold text-teal-100 uppercase tracking-widest block">Total Amount to Pay</span>
                <div className="text-4xl font-black font-mono tracking-tight">
                  {formatMoney(displayState.grandTotal, 'GH₵')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE C: THANK YOU / RECEIPT SUMMARY DISPLAY */}
        {displayState.status === 'THANK_YOU' && (
          <div className="text-center space-y-6 max-w-2xl mx-auto py-10 animate-scale-up">
            <div className="inline-flex p-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 shadow-2xl">
              <CheckCircle className="w-20 h-20 animate-bounce" />
            </div>

            <h2 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Thank You for Shopping with Us!</h2>
            <p className="text-slate-500 text-sm">Your payment has been successfully received.</p>

            <div className={`p-6 border rounded-3xl space-y-3 shadow-2xl text-sm max-w-md mx-auto transition-colors ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Receipt Number</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{displayState.receiptNumber || 'REC-COMPLETED'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Amount Paid</span>
                <span className={`font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatMoney(displayState.amountPaid || displayState.grandTotal, 'GH₵')}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Change Returned</span>
                <span className="font-mono text-base">{formatMoney(displayState.changeGiven || 0, 'GH₵')}</span>
              </div>
              {displayState.earnedPoints && displayState.earnedPoints > 0 && (
                <div className="pt-2 text-xs text-amber-500 font-bold flex items-center justify-center space-x-1">
                  <Sparkles className="w-4 h-4" />
                  <span>You earned +{displayState.earnedPoints} Loyalty Rewards Points!</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 pt-4">We look forward to welcoming you back soon!</p>
          </div>
        )}
      </main>

      {/* Footer Note */}
      <footer className={`px-8 py-4 border-t text-center text-xs text-slate-500 transition-colors ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <span>Powered by <strong>{orgName}</strong> POS System</span>
      </footer>
    </div>
  );
};
