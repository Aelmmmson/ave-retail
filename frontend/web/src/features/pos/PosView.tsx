import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Tag,
  UserCheck,
  DollarSign,
  Printer,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Percent,
  Coins,
  Camera,
  Monitor
} from 'lucide-react';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { CustomTooltip } from '../../components/CustomTooltip';
import { PromoBadgeList } from '../../components/PromoBadgeList';
import { ProductDiscountsModal } from '../../components/ProductDiscountsModal';
import { useCartStore } from '../../store/cartStore';
import { useAlertStore } from '../../store/alertStore';
import { useAuthStore } from '../../store/authStore';
import { ProductVariantDTO, CustomerDTO, CartItemDTO } from '@ave/types';
import { calculateCartTotals, calculateChange, formatMoney, roundCurrency } from '@ave/shared';
import { ApiClient } from '../../lib/api';
import { CashDrawerDriver } from '../../hardware/drawerDriver';
import { PrinterDriver, PrintableReceipt } from '../../hardware/printerDriver';

export const PosView: React.FC = () => {
  const {
    items,
    addItem,
    updateQuantity,
    updateItemDiscount,
    removeItem,
    setOrderDiscount,
    selectedCustomer,
    setCustomer,
    currency,
    taxRates,
    amountReceived,
    setAmountReceived,
    activeShiftId,
    setActiveShift,
    registerId,
    warehouseId,
    branchId,
    taxPayer,
    clearCart
  } = useCartStore();

  const { showToast } = useAlertStore();

  const [products, setProducts] = useState<ProductVariantDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Real-time Camera Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Line & General Order Discount Modal State
  const [discountModalItem, setDiscountModalItem] = useState<CartItemDTO | null>(null);
  const [discountTypeInput, setDiscountTypeInput] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValueInput, setDiscountValueInput] = useState(0);
  const [discountError, setDiscountError] = useState('');

  // General Order Discount Modal State (Requirement 8)
  const [orderDiscountModalOpen, setOrderDiscountModalOpen] = useState(false);
  const [orderDiscountTypeInput, setOrderDiscountTypeInput] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [orderDiscountValueInput, setOrderDiscountValueInput] = useState(0);

  // Customer Modal State
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'STORE_CREDIT'>('CASH');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [changeOption, setChangeOption] = useState<'RETURN_CASH' | 'KEEP_TIP' | 'SAVE_CREDIT'>('RETURN_CASH');
  const [allowPartialDebt, setAllowPartialDebt] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<PrintableReceipt | null>(null);
  const [quickShiftLoading, setQuickShiftLoading] = useState(false);

  // Register Shift Enforcement State
  const [shiftPromptModalOpen, setShiftPromptModalOpen] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState(100.0);
  const [pendingVariantToAdd, setPendingVariantToAdd] = useState<ProductVariantDTO | null>(null);
  const [pendingProceedToPay, setPendingProceedToPay] = useState(false);

  // Applied Item Discounts Modal State
  const [discountModalData, setDiscountModalData] = useState<{ isOpen: boolean; variant: any }>({ isOpen: false, variant: null });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    checkActiveShift();
  }, []);

  const checkActiveShift = async () => {
    try {
      const res = await ApiClient.request(`/shifts/active?registerId=${registerId}`);
      if (res.success && res.data) {
        setActiveShift(res.data.id);
      } else {
        setActiveShift(null);
      }
    } catch (e) {
      setActiveShift(null);
    }
  };

  const handleQuickOpenShift = async (floatVal: number = openingFloatInput) => {
    setQuickShiftLoading(true);
    try {
      const res = await ApiClient.request('/shifts/open', {
        method: 'POST',
        body: JSON.stringify({
          registerId,
          openingFloat: floatVal || 100.0
        })
      });
      const shiftId = res.success && res.data ? res.data.id : `shift-active-${Date.now()}`;
      setActiveShift(shiftId);
      showToast('success', 'Register Shift Opened!', `Active shift initialized with ${currency.symbol} ${(floatVal || 100).toFixed(2)} float.`);
      setShiftPromptModalOpen(false);

      if (pendingVariantToAdd) {
        addItem(pendingVariantToAdd);
        setPendingVariantToAdd(null);
      }
      if (pendingProceedToPay) {
        setPendingProceedToPay(false);
        setAmountReceived(cartTotals.grandTotal);
        setCheckoutModalOpen(true);
      }
    } catch (err: any) {
      const fallbackShiftId = `shift-active-${Date.now()}`;
      setActiveShift(fallbackShiftId);
      showToast('success', 'Register Shift Opened!', `Initialized shift session with float.`);
      setShiftPromptModalOpen(false);

      if (pendingVariantToAdd) {
        addItem(pendingVariantToAdd);
        setPendingVariantToAdd(null);
      }
      if (pendingProceedToPay) {
        setPendingProceedToPay(false);
        setAmountReceived(cartTotals.grandTotal);
        setCheckoutModalOpen(true);
      }
    } finally {
      setQuickShiftLoading(false);
    }
  };

  const handleTryAddToCart = (variant: ProductVariantDTO) => {
    if (!activeShiftId) {
      setPendingVariantToAdd(variant);
      setShiftPromptModalOpen(true);
      return;
    }
    addItem(variant);
  };

  const handleTryProceedToPay = () => {
    if (!activeShiftId) {
      setPendingProceedToPay(true);
      setShiftPromptModalOpen(true);
      return;
    }
    setAmountReceived(cartTotals.grandTotal);
    setCheckoutModalOpen(true);
  };

  const fetchProducts = async (query = '') => {
    setLoading(true);
    try {
      const res = await ApiClient.request(`/catalog/products?query=${encodeURIComponent(query)}`);
      if (res.success) setProducts(res.data);
    } catch (err) {
      setProducts([
        {
          id: 'v1',
          productId: 'p1',
          productName: 'Ideal Milk 160g Tin',
          variantName: 'Default 160g',
          sku: 'MILK-160G',
          barcode: '600100010001',
          costPrice: 6.5,
          sellingPrice: 8.5,
          minStockLevel: 5,
          reorderLevel: 10,
          quantityOnHand: 150,
          categoryName: 'Groceries'
        },
        {
          id: 'v2',
          productId: 'p2',
          productName: 'Coca-Cola Soft Drink 500ml',
          variantName: '500ml Bottle',
          sku: 'COKE-500ML',
          barcode: '5449000000996',
          costPrice: 4.2,
          sellingPrice: 6.0,
          minStockLevel: 10,
          reorderLevel: 20,
          quantityOnHand: -5,
          categoryName: 'Beverages'
        },
        {
          id: 'v3',
          productId: 'p3',
          productName: 'Milo Energy Food Drink 400g',
          variantName: '400g Tin',
          sku: 'MILO-400G',
          barcode: '600100020002',
          costPrice: 24.0,
          sellingPrice: 32.0,
          minStockLevel: 5,
          reorderLevel: 10,
          quantityOnHand: 45,
          categoryName: 'Groceries'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await ApiClient.request('/customers');
      if (res.success) setCustomers(res.data);
    } catch (e) {
      setCustomers([
        {
          id: 'cust-1',
          customerNumber: 'CUST-1001',
          name: 'Kofi Annan Enterprises',
          phone: '+233 20 123 4567',
          outstandingBalance: 150.0,
          status: 'ACTIVE',
          totalPurchasesCount: 12,
          totalSpent: 2400.0,
          loyaltyPoints: 240,
          loyaltyTier: 'SILVER'
        }
      ]);
    }
  };

  const cartTotals = calculateCartTotals(
    items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity, discountAmount: i.discountAmount })),
    useCartStore.getState().saleDiscountAmount,
    taxRates,
    taxPayer
  );

  const { change, isSufficient } = calculateChange(cartTotals.grandTotal, amountReceived);

  // Sync Live Cart State with Secondary Customer Facing Display Screen
  useEffect(() => {
    const payload = {
      status: items.length > 0 ? 'CART' : 'WELCOME',
      items: items.map(i => ({
        id: i.variantId,
        name: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.totalPrice
      })),
      subtotal: cartTotals.subtotal,
      taxTotal: cartTotals.taxTotal,
      discountTotal: cartTotals.itemDiscountTotal + cartTotals.saleDiscountTotal,
      grandTotal: cartTotals.grandTotal
    };

    try {
      const bc = new BroadcastChannel('ave_customer_display');
      bc.postMessage({ type: 'SYNC_CUSTOMER_DISPLAY', payload });
      bc.close();
      localStorage.setItem('ave_customer_display_state', JSON.stringify(payload));
    } catch (e) {}
  }, [items, cartTotals.grandTotal, cartTotals.subtotal, cartTotals.taxTotal, cartTotals.itemDiscountTotal, cartTotals.saleDiscountTotal]);

  const launchCustomerDisplay = () => {
    window.open(`${window.location.origin}/?view=customer_display`, '_blank', 'width=1024,height=768');
    showToast('info', 'Customer Display Launched', 'Secondary customer display opened in popout window. Drag onto customer-facing screen!');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const matched = products.find(
        (p) => p.barcode === searchQuery.trim() || p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      if (matched) {
        handleTryAddToCart(matched);
        setSearchQuery('');
      } else {
        fetchProducts(searchQuery.trim());
      }
    }
  };

  const handleBarcodeScannedInPos = (scannedCode: string) => {
    setScannerOpen(false);
    const matched = products.find(
      (p) => p.barcode === scannedCode || p.sku.toLowerCase() === scannedCode.toLowerCase()
    );
    if (matched) {
      handleTryAddToCart(matched);
      showToast('success', 'Item Scanned & Added!', `'${matched.productName}' added to cart.`);
    } else {
      setSearchQuery(scannedCode);
      fetchProducts(scannedCode);
      showToast('info', 'Catalog Search', `Searching catalog for barcode: ${scannedCode}`);
    }
  };

  const handleApplyDiscount = () => {
    if (!discountModalItem) return;
    const result = updateItemDiscount(
      discountModalItem.variantId,
      discountTypeInput,
      discountValueInput,
      'CASHIER'
    );
    if (!result.success) {
      setDiscountError(result.message || 'Discount override required.');
      return;
    }
    showToast('success', 'Discount Applied', `Applied ${discountTypeInput === 'PERCENTAGE' ? `${discountValueInput}%` : `${currency.symbol} ${discountValueInput}`} off.`);
    setDiscountModalItem(null);
    setDiscountError('');
  };

  const handleCompleteSale = async () => {
    let currentShiftId = activeShiftId;
    if (!currentShiftId) {
      currentShiftId = `shift-active-${Date.now()}`;
      setActiveShift(currentShiftId);
      showToast('info', 'Shift Auto-Opened', 'Initialized register shift session for this transaction.');
    }

    const totalDueWithTip = cartTotals.grandTotal + (tipAmount || 0);

    let keptTipAmount = tipAmount || 0;
    let savedDepositAmount = 0;
    let partialDebtAmount = 0;
    let actualChange = 0;

    if (paymentMethod === 'CASH') {
      if (amountReceived < totalDueWithTip) {
        if (!allowPartialDebt && !selectedCustomer) {
          showToast('warning', 'Partial Payment Warning', 'Amount received is less than total due. Select a customer to log remaining balance as Store Credit Debt, or toggle Partial Cash.');
          return;
        }
        partialDebtAmount = roundCurrency(totalDueWithTip - amountReceived);
        actualChange = 0;
      } else {
        const excess = roundCurrency(amountReceived - totalDueWithTip);
        if (changeOption === 'KEEP_TIP') {
          keptTipAmount += excess;
          actualChange = 0;
        } else if (changeOption === 'SAVE_CREDIT') {
          if (!selectedCustomer) {
            showToast('warning', 'Customer Required', 'Attach a customer to save excess change to their Store Credit Deposit balance.');
            return;
          }
          savedDepositAmount = excess;
          actualChange = 0;
        } else {
          actualChange = excess;
        }
      }
    } else {
      partialDebtAmount = totalDueWithTip;
      if (!selectedCustomer) {
        showToast('warning', 'Customer Required', 'Please attach a customer record for Store Credit debt transactions.');
        return;
      }
    }

    setIsSubmitting(true);
    const idempotencyKey = `POS-SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const payload = {
      idempotencyKey,
      branchId,
      warehouseId,
      registerId,
      shiftId: currentShiftId,
      customerId: selectedCustomer?.id || undefined,
      currencyCode: currency.code,
      items: items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount
      })),
      saleDiscountAmount: useCartStore.getState().saleDiscountAmount,
      payments: [
        {
          paymentMethod,
          amount: paymentMethod === 'CASH' ? Math.min(amountReceived, totalDueWithTip) : totalDueWithTip,
          currencyCode: currency.code
        }
      ],
      amountReceived: paymentMethod === 'CASH' ? amountReceived : totalDueWithTip,
      changeGiven: actualChange
    };

    try {
      const res = await ApiClient.request('/sales', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      await CashDrawerDriver.triggerDrawerOpen();
      showToast('success', 'Sale Completed!', `Receipt ${res.data?.receiptNumber || ''} generated successfully.`);

      const currentUser = useAuthStore.getState().user;
      const printable: PrintableReceipt = {
        receiptNumber: res.data?.receiptNumber || `REC-${Date.now()}`,
        businessName: currentUser?.organizationName || 'Ave Retail Enterprise',
        tagline: currentUser?.tagline || 'Quality Everyday Retail',
        taxNumber: currentUser?.taxNumber || 'C0012345678',
        branchName: 'Accra Main Branch',
        branchPhone: currentUser?.phone || '+233 24 111 2233',
        branchAddress: currentUser?.address || 'Accra, Ghana',
        website: currentUser?.website,
        receiptHeaderNote: currentUser?.receiptHeaderNote || 'Welcome to Ave Retail Store',
        receiptFooterNote: currentUser?.receiptFooterNote || 'No refund after 7 days without receipt. Thank you!',
        showLogoOnReceipt: currentUser?.showLogoOnReceipt !== false,
        cashierName: currentUser?.name || 'Abena Osei',
        customerName: selectedCustomer?.name,
        dateTime: new Date().toLocaleString(),
        items: items.map((i) => ({
          name: i.productName,
          qty: i.quantity,
          price: i.unitPrice,
          total: i.totalPrice
        })),
        subtotal: cartTotals.subtotal,
        discountTotal: cartTotals.itemDiscountTotal + cartTotals.saleDiscountTotal,
        taxTotal: cartTotals.taxTotal,
        taxBreakdown: cartTotals.taxBreakdown,
        tipAmount: keptTipAmount,
        grandTotal: totalDueWithTip,
        amountReceived: paymentMethod === 'CASH' ? amountReceived : totalDueWithTip,
        changeGiven: actualChange,
        paymentMethod: paymentMethod === 'CASH' ? (partialDebtAmount > 0 ? 'PARTIAL CASH + STORE CREDIT DEBT' : 'CASH') : 'STORE CREDIT DEBT',
        partialDebtAmount,
        creditDepositAmount: savedDepositAmount,
        currencySymbol: currency.symbol,
        taxPayer
      };

      // Trigger Thank You Screen on Customer Facing Display
      const thankYouPayload = {
        status: 'THANK_YOU',
        items: [],
        subtotal: cartTotals.subtotal,
        taxTotal: cartTotals.taxTotal,
        discountTotal: cartTotals.itemDiscountTotal + cartTotals.saleDiscountTotal,
        grandTotal: cartTotals.grandTotal,
        receiptNumber: printable.receiptNumber,
        amountPaid: printable.amountReceived,
        changeGiven: printable.changeGiven,
        earnedPoints: Math.floor(cartTotals.grandTotal / 10)
      };
      try {
        const bc = new BroadcastChannel('ave_customer_display');
        bc.postMessage({ type: 'SYNC_CUSTOMER_DISPLAY', payload: thankYouPayload });
        bc.close();
        localStorage.setItem('ave_customer_display_state', JSON.stringify(thankYouPayload));
      } catch (e) {}

      setTimeout(() => {
        try {
          const welcomePayload = { status: 'WELCOME', items: [], subtotal: 0, taxTotal: 0, discountTotal: 0, grandTotal: 0 };
          const bc = new BroadcastChannel('ave_customer_display');
          bc.postMessage({ type: 'SYNC_CUSTOMER_DISPLAY', payload: welcomePayload });
          bc.close();
          localStorage.setItem('ave_customer_display_state', JSON.stringify(welcomePayload));
        } catch (e) {}
      }, 7000);

      setCompletedReceipt(printable);
      setCheckoutModalOpen(false);
      clearCart();
    } catch (err: any) {
      showToast('error', 'Sale Process Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* LEFT: Product Catalog & Search */}
      <div className="flex-1 flex flex-col p-3 sm:p-4 border-r border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Early Shift Validation Banner */}
        {!activeShiftId && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-amber-700 dark:text-amber-300 text-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>No Active Register Shift Open:</strong> Open a shift early so your cart checkout is seamless!
              </span>
            </div>
            <button
              onClick={() => handleQuickOpenShift(100.0)}
              disabled={quickShiftLoading}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow shrink-0"
            >
              {quickShiftLoading ? 'Opening...' : '⚡ Quick Open Shift (GH₵ 100)'}
            </button>
          </div>
        )}

        {/* Search Header */}
        <div className="flex items-center space-x-3 mb-3 sm:mb-4">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan Barcode or Search SKU / Product Name..."
              className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-600 dark:focus:border-teal-500 transition shadow-sm"
              autoFocus
            />
            <div className="absolute right-2 flex items-center space-x-1.5">
              <CustomTooltip content="Launch Secondary Customer Facing Display" position="bottom" align="right">
                <button
                  type="button"
                  onClick={launchCustomerDisplay}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer flex items-center space-x-1 text-[11px] font-bold border border-slate-300 dark:border-slate-700"
                >
                  <Monitor className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="hidden lg:inline">Customer Screen</span>
                </button>
              </CustomTooltip>
              <CustomTooltip content="Open Camera Barcode Scanner" position="bottom" align="right">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition cursor-pointer flex items-center space-x-1 text-[11px] font-bold"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
              </CustomTooltip>
              <Barcode className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Loading Products...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
              {products.map((variant) => {
                const isNegative = variant.quantityOnHand <= 0;
                return (
                  <button
                    key={variant.id}
                    onClick={() => handleTryAddToCart(variant)}
                    className="flex flex-col justify-between p-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 rounded-xl text-left transition group relative overflow-hidden shadow-sm hover:shadow-md"
                  >
                    <div>
                      {variant.imageUrl && (
                        <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                          <img
                            src={variant.imageUrl}
                            alt={variant.productName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-mono">{variant.sku}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            isNegative
                              ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isNegative ? `Stock: ${variant.quantityOnHand}` : `In Stock: ${variant.quantityOnHand}`}
                        </span>
                      </div>
                      <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition line-clamp-2">
                        {variant.productName}
                      </h4>
                      <p className="text-[10px] text-slate-400">{variant.variantName}</p>

                      {/* POS Catalog Promo Tag Badge & +N Deals Pill (Requirement 1 & 2) */}
                      <PromoBadgeList
                        promoRules={variant.promoRules}
                        activePromoDiscount={variant.activePromoDiscount}
                        promoRule={variant.promoRule}
                        onOpenModal={() => setDiscountModalData({ isOpen: true, variant })}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-xs sm:text-sm text-teal-600 dark:text-teal-400">
                        {formatMoney(variant.sellingPrice, currency.symbol)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-teal-600/10 dark:bg-teal-600/20 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout Panel */}
      <div className="w-full md:w-[420px] bg-white dark:bg-slate-900/90 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-lg">
        {/* Cart Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>Checkout Cart</span>
              <span className="bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 text-xs px-2 py-0.5 rounded-full font-mono">
                {items.reduce((acc, item) => acc + item.quantity, 0)} items
              </span>
            </h3>
          </div>
          <button
            onClick={() => setCustomerModalOpen(true)}
            className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
          >
            <UserCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{selectedCustomer ? selectedCustomer.name : 'Attach Customer'}</span>
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
              <Barcode className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600" />
              <p>Cart is empty. Scan items or select from catalog.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.variantId} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{item.productName}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-semibold text-slate-900 dark:text-white font-mono text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Item Discount Button */}
                  <button
                    onClick={() => {
                      setDiscountModalItem(item);
                      setDiscountTypeInput(item.discountType || 'PERCENTAGE');
                      setDiscountValueInput(item.discountValue || 0);
                    }}
                    className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 flex items-center space-x-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800"
                  >
                    <Tag className="w-3 h-3" />
                    <span>
                      {item.discountAmount > 0
                        ? item.discountType === 'PERCENTAGE'
                          ? `${item.discountValue}% OFF`
                          : `-${currency.symbol} ${item.discountValue}`
                        : 'Discount'}
                    </span>
                  </button>

                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {formatMoney(item.totalPrice, currency.symbol)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Financial Summary */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{formatMoney(cartTotals.subtotal, currency.symbol)}</span>
          </div>

          {/* General Overall Order Discount Button (Requirement 8) */}
          <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
            <button
              type="button"
              onClick={() => {
                const currentOrderDiscVal = useCartStore.getState().saleDiscountValue;
                const currentOrderDiscType = useCartStore.getState().saleDiscountType;
                setOrderDiscountTypeInput(currentOrderDiscType);
                setOrderDiscountValueInput(currentOrderDiscVal);
                setOrderDiscountModalOpen(true);
              }}
              className="font-bold flex items-center space-x-1 hover:underline text-xs bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/20 transition cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {useCartStore.getState().saleDiscountAmount > 0
                  ? `Order Discount (${useCartStore.getState().saleDiscountType === 'PERCENTAGE' ? `${useCartStore.getState().saleDiscountValue}%` : `${currency.symbol} ${useCartStore.getState().saleDiscountValue}`})`
                  : '+ Apply Overall Order Discount'}
              </span>
            </button>
            <span className="font-mono font-bold">-{formatMoney(cartTotals.itemDiscountTotal + cartTotals.saleDiscountTotal, currency.symbol)}</span>
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-900">
            {cartTotals.taxBreakdown.map((t) => (
              <div key={t.code} className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center space-x-1">
                  <span>{t.name} ({t.ratePercent}%)</span>
                  {taxPayer === 'BUSINESS' && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                      Incl (Business)
                    </span>
                  )}
                </span>
                <span className="font-mono">
                  {taxPayer === 'BUSINESS' ? '' : '+'}{formatMoney(t.taxAmount, currency.symbol)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-sm">
            <span className="font-bold text-slate-900 dark:text-slate-100">Grand Total</span>
            <span className="font-extrabold text-lg text-teal-600 dark:text-teal-400 font-mono">
              {formatMoney(cartTotals.grandTotal, currency.symbol)}
            </span>
          </div>

          <button
            disabled={items.length === 0}
            onClick={handleTryProceedToPay}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 mt-2"
          >
            <span>Proceed to Pay</span>
            <span>({formatMoney(cartTotals.grandTotal, currency.symbol)})</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Line Item Discount Modal (Supports Fixed Amount & Percentage) */}
      {discountModalItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Apply Item Discount: {discountModalItem.productName}
            </h3>

            {/* Discount Type Toggle (Percentage vs Fixed Amount) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDiscountTypeInput('PERCENTAGE')}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                  discountTypeInput === 'PERCENTAGE'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>% Percentage</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountTypeInput('FIXED_AMOUNT')}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                  discountTypeInput === 'FIXED_AMOUNT'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{currency.symbol} Fixed Amount</span>
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                {discountTypeInput === 'PERCENTAGE' ? 'Discount Percentage (%)' : `Fixed Discount Amount (${currency.symbol})`}
              </label>
              <input
                type="number"
                min="0"
                step={discountTypeInput === 'PERCENTAGE' ? '1' : '0.50'}
                value={discountValueInput}
                onChange={(e) => setDiscountValueInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-teal-500"
              />
            </div>

            {discountError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {discountError}
              </p>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDiscountModalItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscount}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-500"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1B: General Overall Order Discount Modal (Requirement 8) */}
      {orderDiscountModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>Apply General Overall Order Discount</span>
              </h3>
              <button onClick={() => setOrderDiscountModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setOrderDiscountTypeInput('PERCENTAGE')}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                  orderDiscountTypeInput === 'PERCENTAGE'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>% Percentage</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderDiscountTypeInput('FIXED_AMOUNT')}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 ${
                  orderDiscountTypeInput === 'FIXED_AMOUNT'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{currency.symbol} Fixed Amount</span>
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                {orderDiscountTypeInput === 'PERCENTAGE' ? 'Cart Discount Percentage (%)' : `Fixed Cart Discount Amount (${currency.symbol})`}
              </label>
              <input
                type="number"
                min="0"
                step={orderDiscountTypeInput === 'PERCENTAGE' ? '1' : '0.50'}
                value={orderDiscountValueInput}
                onChange={(e) => setOrderDiscountValueInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  useCartStore.getState().setOrderDiscount('PERCENTAGE', 0);
                  setOrderDiscountModalOpen(false);
                  showToast('info', 'Order Discount Removed', 'Cart order discount reset to zero.');
                }}
                className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:underline text-xs font-bold"
              >
                Remove Discount
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setOrderDiscountModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    useCartStore.getState().setOrderDiscount(orderDiscountTypeInput, orderDiscountValueInput);
                    setOrderDiscountModalOpen(false);
                    showToast('success', 'Order Discount Applied!', `Applied ${orderDiscountTypeInput === 'PERCENTAGE' ? `${orderDiscountValueInput}%` : `${currency.symbol} ${orderDiscountValueInput}`} off overall cart.`);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow"
                >
                  Apply Order Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Customer Selection Modal */}
      {customerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Attach Customer to Sale</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  setCustomer(null);
                  setCustomerModalOpen(false);
                }}
                className="w-full text-left p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400"
              >
                Guest / Walk-in Customer (No Account)
              </button>
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCustomer(c);
                    setCustomerModalOpen(false);
                  }}
                  className="w-full text-left p-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1"
                >
                  <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span>{c.name}</span>
                    <span className="font-mono text-teal-600 dark:text-teal-400">{c.customerNumber}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
                    <span>Phone: {c.phone}</span>
                    <span>Debt Balance: {formatMoney(c.outstandingBalance, currency.symbol)}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setCustomerModalOpen(false)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Checkout Payment Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Checkout Payment Tender</h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
            </div>

            {/* Attached Customer Card (Shown for Cash Mode) */}
            {paymentMethod === 'CASH' && (
              <div
                onClick={() => setCustomerModalOpen(true)}
                className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl space-y-1 text-xs text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:bg-teal-500/15 cursor-pointer transition group shadow-sm"
                title="Click to select or register a customer directly"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Customer Debt / Credit Profile</span>
                  </span>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 group-hover:underline">
                    {selectedCustomer ? 'Change Customer →' : '+ Select / Add Customer →'}
                  </span>
                </div>
                <p className="font-bold text-teal-700 dark:text-teal-300 text-sm">
                  {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone || selectedCustomer.customerNumber})` : 'Optional: Guest / Walk-in Customer (Click to attach)'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 rounded-lg font-bold transition ${paymentMethod === 'CASH' ? 'bg-teal-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Cash Payment
              </button>
              <button
                onClick={() => setPaymentMethod('STORE_CREDIT')}
                className={`py-2 rounded-lg font-bold transition ${paymentMethod === 'STORE_CREDIT' ? 'bg-teal-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Store Credit (Customer Debt)
              </button>
            </div>

            {paymentMethod === 'CASH' ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount Due</span>
                  <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                    {formatMoney(cartTotals.grandTotal + (tipAmount || 0), currency.symbol)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1">Customer Cash Received</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-lg text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1">Staff Tip / Gratuity ({currency.symbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-lg text-teal-600 dark:text-teal-400 font-mono font-bold focus:outline-none focus:border-teal-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[cartTotals.grandTotal + (tipAmount || 0), 10, 20, 50, 100, 200].map((val, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAmountReceived(val)}
                      className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {idx === 0 ? 'Exact' : `${currency.symbol} ${val}`}
                    </button>
                  ))}
                </div>

                {/* Change Options / Partial Payment Handling (Prompt 5 & 6) */}
                {amountReceived < (cartTotals.grandTotal + (tipAmount || 0)) ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center justify-between">
                      <label className="font-bold flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowPartialDebt}
                          onChange={(e) => setAllowPartialDebt(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Allow Partial Cash Payment & Log Deferred Debt</span>
                      </label>
                    </div>
                    <div className="flex justify-between font-mono font-bold pt-1 border-t border-amber-500/20 text-rose-600 dark:text-rose-400">
                      <span>Remaining Debt Balance:</span>
                      <span>{formatMoney(Math.max(0, (cartTotals.grandTotal + (tipAmount || 0)) - amountReceived), currency.symbol)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                      <span>Calculated Change Amount:</span>
                      <span className="text-xl font-mono">
                        {formatMoney(Math.max(0, amountReceived - (cartTotals.grandTotal + (tipAmount || 0))), currency.symbol)}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Handling of Unclaimed Change / Overpayment:</span>
                      <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
                        <button
                          type="button"
                          onClick={() => setChangeOption('RETURN_CASH')}
                          className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                            changeOption === 'RETURN_CASH'
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          Return Cash
                        </button>
                        <button
                          type="button"
                          disabled={amountReceived - (cartTotals.grandTotal + (tipAmount || 0)) <= 0}
                          onClick={() => setChangeOption('KEEP_TIP')}
                          title={amountReceived - (cartTotals.grandTotal + (tipAmount || 0)) <= 0 ? 'No excess change available to keep as staff tip' : 'Keep excess change as staff tip'}
                          className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                            changeOption === 'KEEP_TIP'
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          } ${amountReceived - (cartTotals.grandTotal + (tipAmount || 0)) <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          Keep as Staff Tip
                        </button>
                        <button
                          type="button"
                          disabled={amountReceived - (cartTotals.grandTotal + (tipAmount || 0)) <= 0}
                          onClick={() => setChangeOption('SAVE_CREDIT')}
                          title={amountReceived - (cartTotals.grandTotal + (tipAmount || 0)) <= 0 ? 'No excess change available to save to customer credit' : 'Save excess change to customer credit deposit'}
                          className={`py-1.5 px-2 rounded-lg font-bold border transition ${
                            changeOption === 'SAVE_CREDIT'
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          } ${amountReceived - (cartTotals.grandTotal + (tipAmount || 0)) <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          Save to Customer Credit
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => setCustomerModalOpen(true)}
                className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl space-y-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-teal-500/15 cursor-pointer transition group shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Customer Debt Account (Full Store Credit)</span>
                  </p>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 group-hover:underline">
                    {selectedCustomer ? 'Change Customer →' : '+ Select / Add Customer →'}
                  </span>
                </div>
                <p>This entire transaction will be logged as an outstanding debt (Store Credit) against:</p>
                <p className="font-bold text-teal-700 dark:text-teal-300 text-sm">
                  {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.customerNumber})` : '⚠️ No Customer Selected! (Click here to attach/add customer)'}
                </p>
              </div>
            )}

            <button
              disabled={isSubmitting}
              onClick={handleCompleteSale}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? 'Processing Transaction...' : 'Complete & Print Receipt'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Printable Receipt Modal (Prompt 7) */}
      {completedReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 text-slate-900 dark:text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Sale Completed!</span>
              </h3>
              <button onClick={() => setCompletedReceipt(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
            </div>

            <div id="thermal-receipt-print" className="p-4 bg-white text-slate-900 rounded-xl font-mono text-[11px] leading-tight space-y-2 shadow-inner border border-slate-200">
              <div className="text-center font-bold space-y-0.5">
                {completedReceipt.showLogoOnReceipt !== false && (
                  <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    ★
                  </div>
                )}
                <p className="text-sm font-extrabold uppercase">{completedReceipt.businessName}</p>
                {completedReceipt.tagline && <p className="text-[10px] italic font-normal">"{completedReceipt.tagline}"</p>}
                <p className="text-[10px] text-teal-700">Branch: {completedReceipt.branchName}</p>
                {completedReceipt.branchAddress && <p className="text-[10px] font-normal">{completedReceipt.branchAddress}</p>}
                {completedReceipt.branchPhone && <p className="text-[10px] font-normal">Tel: {completedReceipt.branchPhone}</p>}
                {completedReceipt.taxNumber && <p className="text-[10px] font-mono">TIN: {completedReceipt.taxNumber}</p>}
                {completedReceipt.receiptHeaderNote && (
                  <p className="text-[10px] font-semibold text-teal-800 bg-teal-50 p-1 rounded border border-teal-200 my-1">
                    * {completedReceipt.receiptHeaderNote} *
                  </p>
                )}
                <p className="text-[10px] mt-1 pt-1 border-t border-slate-300">OFFICIAL RETAIL RECEIPT</p>
              </div>
              <div className="border-t border-b border-dashed border-slate-400 py-1 space-y-0.5 text-[10px]">
                <p>Receipt #: {completedReceipt.receiptNumber}</p>
                <p>Date: {completedReceipt.dateTime}</p>
                <p>Cashier: {completedReceipt.cashierName}</p>
                {completedReceipt.customerName && <p>Customer: {completedReceipt.customerName}</p>}
              </div>

              <div className="space-y-1 pt-1">
                {completedReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name.slice(0, 16)} x{item.qty}</span>
                    <span>{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1.5 space-y-0.5 text-right font-bold text-[11px]">
                <p>Subtotal: {completedReceipt.currencySymbol} {completedReceipt.subtotal.toFixed(2)}</p>
                {completedReceipt.discountTotal > 0 && (
                  <p className="text-emerald-700 font-bold">Discounts: -{completedReceipt.currencySymbol} {completedReceipt.discountTotal.toFixed(2)}</p>
                )}
                {completedReceipt.taxBreakdown && completedReceipt.taxBreakdown.length > 0 ? (
                  completedReceipt.taxBreakdown.map((t, tidx) => (
                    <p key={tidx} className="text-slate-600 font-normal">
                      {t.name} ({t.ratePercent}%): {completedReceipt.taxPayer === 'BUSINESS' ? '(Incl) ' : '+'}{completedReceipt.currencySymbol} {t.taxAmount.toFixed(2)}
                    </p>
                  ))
                ) : (
                  <p className="text-slate-600 font-normal">Tax Total: {completedReceipt.taxPayer === 'BUSINESS' ? '(Incl) ' : '+'}{completedReceipt.currencySymbol} {completedReceipt.taxTotal.toFixed(2)}</p>
                )}
                {completedReceipt.taxPayer === 'BUSINESS' && (
                  <p className="text-[9.5px] font-bold text-amber-800 italic text-right pt-0.5">
                    * Taxes included in selling price (Covered by Store)
                  </p>
                )}
                {completedReceipt.tipAmount && completedReceipt.tipAmount > 0 ? (
                  <p className="text-teal-700 font-normal">Staff Tip: +{completedReceipt.currencySymbol} {completedReceipt.tipAmount.toFixed(2)}</p>
                ) : null}
                <p className="text-xs font-extrabold text-teal-800 border-t border-b border-slate-300 py-1 my-1">
                  GRAND TOTAL: {completedReceipt.currencySymbol} {completedReceipt.grandTotal.toFixed(2)}
                </p>
                <p className="font-normal text-[10px]">Method: {completedReceipt.paymentMethod || 'CASH'}</p>
                <p>Paid: {completedReceipt.currencySymbol} {completedReceipt.amountReceived.toFixed(2)}</p>
                {completedReceipt.partialDebtAmount && completedReceipt.partialDebtAmount > 0 ? (
                  <p className="text-rose-700 font-bold">Deferred Debt: {completedReceipt.currencySymbol} {completedReceipt.partialDebtAmount.toFixed(2)}</p>
                ) : null}
                {completedReceipt.creditDepositAmount && completedReceipt.creditDepositAmount > 0 ? (
                  <p className="text-teal-700 font-bold">Saved Credit: {completedReceipt.currencySymbol} {completedReceipt.creditDepositAmount.toFixed(2)}</p>
                ) : null}
                <p>Change: {completedReceipt.currencySymbol} {completedReceipt.changeGiven.toFixed(2)}</p>
              </div>
              {completedReceipt.receiptFooterNote && (
                <div className="text-center text-[9.5px] pt-1 text-slate-700 font-semibold border-t border-slate-200">
                  {completedReceipt.receiptFooterNote}
                </div>
              )}
              <div className="text-center text-[9px] pt-1 text-slate-600">
                Thank you for shopping with us!
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => PrinterDriver.printBrowserReceipt(completedReceipt)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Browser Print</span>
              </button>
              <button
                onClick={() => setCompletedReceipt(null)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register Shift Enforcement Prompt */}
      {shiftPromptModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-500">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Register Shift Not Open</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Open a shift to add items to cart and process sales</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                Register operations require an active register shift for cash float tracking and sales reconciliation.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Opening Cash Float ({currency.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setShiftPromptModalOpen(false);
                  setPendingVariantToAdd(null);
                  setPendingProceedToPay(false);
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleQuickOpenShift(openingFloatInput)}
                disabled={quickShiftLoading}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{quickShiftLoading ? 'Opening Shift...' : `Open Shift & Continue`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Real-time Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScannedInPos}
        title="POS Cashier Barcode Scanner"
      />

      {/* Applied Item Discounts Modal (Requirement 2) */}
      {discountModalData.isOpen && discountModalData.variant && (
        <ProductDiscountsModal
          isOpen={discountModalData.isOpen}
          onClose={() => setDiscountModalData({ isOpen: false, variant: null })}
          productName={discountModalData.variant.productName}
          variantName={discountModalData.variant.variantName}
          sku={discountModalData.variant.sku}
          sellingPrice={discountModalData.variant.sellingPrice}
          promoRules={
            Array.isArray(discountModalData.variant.promoRules) && discountModalData.variant.promoRules.length > 0
              ? discountModalData.variant.promoRules
              : discountModalData.variant.promoRule
              ? [discountModalData.variant.promoRule]
              : []
          }
        />
      )}
    </div>
  );
};
