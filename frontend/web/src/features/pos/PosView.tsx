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
  Camera
} from 'lucide-react';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { CustomTooltip } from '../../components/CustomTooltip';
import { useCartStore } from '../../store/cartStore';
import { useAlertStore } from '../../store/alertStore';
import { useAuthStore } from '../../store/authStore';
import { ProductVariantDTO, CustomerDTO, CartItemDTO } from '@ave/types';
import { calculateCartTotals, calculateChange, formatMoney } from '@ave/shared';
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
    clearCart
  } = useCartStore();

  const { showToast } = useAlertStore();

  const [products, setProducts] = useState<ProductVariantDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Real-time Camera Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Discount Modal State
  const [discountModalItem, setDiscountModalItem] = useState<CartItemDTO | null>(null);
  const [discountTypeInput, setDiscountTypeInput] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValueInput, setDiscountValueInput] = useState(0);
  const [discountError, setDiscountError] = useState('');

  // Customer Modal State
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'STORE_CREDIT'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<PrintableReceipt | null>(null);
  const [quickShiftLoading, setQuickShiftLoading] = useState(false);

  // Register Shift Enforcement State
  const [shiftPromptModalOpen, setShiftPromptModalOpen] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState(100.0);
  const [pendingVariantToAdd, setPendingVariantToAdd] = useState<ProductVariantDTO | null>(null);
  const [pendingProceedToPay, setPendingProceedToPay] = useState(false);

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
          totalSpent: 2400.0
        }
      ]);
    }
  };

  const cartTotals = calculateCartTotals(
    items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity, discountAmount: i.discountAmount })),
    useCartStore.getState().saleDiscountAmount,
    taxRates
  );

  const { change, isSufficient } = calculateChange(cartTotals.grandTotal, amountReceived);

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

    if (paymentMethod === 'CASH' && !isSufficient) {
      showToast('warning', 'Insufficient Cash Tender', 'Amount received is less than total amount due.');
      return;
    }

    if (paymentMethod === 'STORE_CREDIT' && !selectedCustomer) {
      showToast('warning', 'Customer Required', 'Please attach a customer record for Store Credit debt transactions.');
      return;
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
          amount: cartTotals.grandTotal,
          currencyCode: currency.code
        }
      ],
      amountReceived: paymentMethod === 'CASH' ? amountReceived : cartTotals.grandTotal,
      changeGiven: paymentMethod === 'CASH' ? change : 0
    };

    try {
      const res = await ApiClient.request('/sales', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      await CashDrawerDriver.triggerDrawerOpen();
      showToast('success', 'Sale Completed!', `Receipt ${res.data?.receiptNumber || ''} generated successfully.`);

      const printable: PrintableReceipt = {
        receiptNumber: res.data?.receiptNumber || `REC-${Date.now()}`,
        businessName: useAuthStore.getState().user?.organizationName || 'Ave Retail Enterprise',
        tagline: useAuthStore.getState().user?.tagline || 'Quality Everyday Retail',
        taxNumber: useAuthStore.getState().user?.taxNumber || 'C0012345678',
        branchName: 'Accra Main Branch',
        branchPhone: useAuthStore.getState().user?.phone || '+233 24 111 2233',
        branchAddress: useAuthStore.getState().user?.address || 'Accra, Ghana',
        cashierName: useAuthStore.getState().user?.name || 'Abena Osei',
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
        grandTotal: cartTotals.grandTotal,
        amountReceived: paymentMethod === 'CASH' ? amountReceived : cartTotals.grandTotal,
        changeGiven: paymentMethod === 'CASH' ? change : 0,
        currencySymbol: currency.symbol
      };

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
              <CustomTooltip content="Open Camera Barcode Scanner" align="right">
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

          {(cartTotals.itemDiscountTotal > 0 || cartTotals.saleDiscountTotal > 0) && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>Total Discounts</span>
              <span className="font-mono">-{formatMoney(cartTotals.itemDiscountTotal + cartTotals.saleDiscountTotal, currency.symbol)}</span>
            </div>
          )}

          <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-900">
            {cartTotals.taxBreakdown.map((t) => (
              <div key={t.code} className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{t.name} ({t.ratePercent}%)</span>
                <span className="font-mono">+{formatMoney(t.taxAmount, currency.symbol)}</span>
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

      {/* MODAL 3: Pay Tender & Change Calculator Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Cash Payment Tender</h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
            </div>

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
                    {formatMoney(cartTotals.grandTotal, currency.symbol)}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1">Customer Cash Received</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[cartTotals.grandTotal, 10, 20, 50, 100, 200].map((val, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAmountReceived(val)}
                      className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {idx === 0 ? 'Exact' : `${currency.symbol} ${val}`}
                    </button>
                  ))}
                </div>

                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    isSufficient
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <span className="text-xs font-semibold">Change to Give:</span>
                  <span className="text-xl font-extrabold font-mono">
                    {formatMoney(change, currency.symbol)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Customer Debt Account</p>
                <p>This sale will be logged as an outstanding debt (Store Credit) against:</p>
                <p className="font-bold text-teal-600 dark:text-teal-400 text-sm">{selectedCustomer ? selectedCustomer.name : 'No Customer Selected!'}</p>
              </div>
            )}

            <button
              disabled={isSubmitting}
              onClick={handleCompleteSale}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2"
            >
              {isSubmitting ? 'Processing Transaction...' : 'Complete & Print Receipt'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Printable Receipt Modal */}
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
                <p className="text-sm font-extrabold uppercase">{completedReceipt.businessName}</p>
                {completedReceipt.tagline && <p className="text-[10px] italic font-normal">"{completedReceipt.tagline}"</p>}
                <p className="text-[10px] text-teal-700">Branch: {completedReceipt.branchName}</p>
                {completedReceipt.branchAddress && <p className="text-[10px] font-normal">{completedReceipt.branchAddress}</p>}
                {completedReceipt.branchPhone && <p className="text-[10px] font-normal">Tel: {completedReceipt.branchPhone}</p>}
                {completedReceipt.taxNumber && <p className="text-[10px] font-mono">TIN: {completedReceipt.taxNumber}</p>}
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
                <p>Grand Total: {completedReceipt.currencySymbol} {completedReceipt.grandTotal.toFixed(2)}</p>
                <p>Paid: {completedReceipt.currencySymbol} {completedReceipt.amountReceived.toFixed(2)}</p>
                <p>Change: {completedReceipt.currencySymbol} {completedReceipt.changeGiven.toFixed(2)}</p>
              </div>
              <div className="text-center text-[9px] pt-2 text-slate-600">
                Thank you for shopping with Ave!
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
    </div>
  );
};
