import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, RefreshCw, AlertTriangle, Boxes, Tag, DollarSign, Layers, Barcode, Printer, Filter, Camera, Check, X, Image as ImageIcon, Upload, Maximize2, Download, Edit, Percent, Calendar, Clock } from 'lucide-react';
import { ProductVariantDTO, PromoRule } from '@ave/types';
import { ApiClient } from '../../lib/api';
import { formatMoney } from '@ave/shared';
import { useAlertStore } from '../../store/alertStore';
import { CustomSelect } from '../../components/CustomSelect';
import { CustomTooltip } from '../../components/CustomTooltip';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { PromoBadgeList } from '../../components/PromoBadgeList';
import { ProductDiscountsModal } from '../../components/ProductDiscountsModal';

interface InventoryViewProps {
  selectedProductIdToAdjust?: string | null;
  onClearSelectedProductToAdjust?: () => void;
}

const getPromoExplanation = (p: ProductVariantDTO): string => {
  if (p.promoRule && p.promoRule.isActive) {
    const r = p.promoRule;
    let desc = '';
    if (r.type === 'PERCENTAGE') {
      const orig = p.sellingPrice;
      const discounted = orig * (1 - r.value / 100);
      desc = `🔥 ${r.value}% Percentage Off Sale: Reduces standard selling price from ${formatMoney(orig, 'GH₵')} down to ${formatMoney(discounted, 'GH₵')} (${formatMoney(orig - discounted, 'GH₵')} savings per unit).`;
    } else if (r.type === 'FIXED_AMOUNT') {
      desc = `🏷️ Flat ${formatMoney(r.value, 'GH₵')} Discount: Deducts ${formatMoney(r.value, 'GH₵')} off standard selling price (${formatMoney(p.sellingPrice, 'GH₵')}).`;
    } else if (r.type === 'TARGET_PRICE') {
      desc = `🎯 Special Target Promo Price: Selling price is set to fixed price of ${formatMoney(r.value, 'GH₵')} (Regular ${formatMoney(p.sellingPrice, 'GH₵')}).`;
    } else if (r.type === 'BOGO') {
      desc = `🎁 Buy ${r.buyQty || 1} Get ${r.getQtyFree || 1} Free Special: Buy ${r.buyQty || 1} item(s) and get ${r.getQtyFree || 1} extra item(s) free automatically at checkout!`;
    }
    if (r.daysOfWeek && r.daysOfWeek.length > 0) {
      const days = r.daysOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
      desc += ` Valid on: ${days}.`;
    }
    if (r.startHour !== undefined && r.endHour !== undefined && r.startHour !== null && r.endHour !== null) {
      desc += ` Active hours: ${r.startHour}:00 to ${r.endHour}:00.`;
    }
    return desc;
  }
  if (p.activePromoDiscount && p.activePromoDiscount > 0) {
    const orig = p.sellingPrice;
    const discounted = orig * (1 - p.activePromoDiscount / 100);
    return `🔥 Active ${p.activePromoDiscount}% Promotional Discount: Standard selling price (${formatMoney(orig, 'GH₵')}) is reduced by ${p.activePromoDiscount}% to ${formatMoney(discounted, 'GH₵')}.`;
  }
  return 'Active promotional discount applied.';
};

export const InventoryView: React.FC<InventoryViewProps> = ({
  selectedProductIdToAdjust,
  onClearSelectedProductToAdjust
}) => {
  const [products, setProducts] = useState<ProductVariantDTO[]>([]);
  const [query, setQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Edit Product & Promotional Rules Modal State (Item 3 & Item 8)
  const [editProductModal, setEditProductModal] = useState<ProductVariantDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editVariantName, setEditVariantName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editCostPrice, setEditCostPrice] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editQuantityOnHand, setEditQuantityOnHand] = useState<number>(0);
  const [editMinStockLevel, setEditMinStockLevel] = useState<number>(5);
  const [editReorderLevel, setEditReorderLevel] = useState<number>(10);
  const [editCategory, setEditCategory] = useState('Groceries');
  const [editImageUrl, setEditImageUrl] = useState('');

  // Promo Rules State (Item 3)
  const [promoActive, setPromoActive] = useState<boolean>(false);
  const [promoType, setPromoType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | 'TARGET_PRICE' | 'BOGO'>('PERCENTAGE');
  const [promoValue, setPromoValue] = useState<number>(10);
  const [targetSellingPriceInput, setTargetSellingPriceInput] = useState<number>(0);
  const [bogoBuyQty, setBogoBuyQty] = useState<number>(1);
  const [bogoGetQtyFree, setBogoGetQtyFree] = useState<number>(1);
  const [promoStartDate, setPromoStartDate] = useState<string>('');
  const [promoEndDate, setPromoEndDate] = useState<string>('');
  const [promoStartHour, setPromoStartHour] = useState<number | ''>('');
  const [promoEndHour, setPromoEndHour] = useState<number | ''>('');
  const [promoDaysOfWeek, setPromoDaysOfWeek] = useState<number[]>([]);

  // Stock Adjust Modal State
  const [adjustModal, setAdjustModal] = useState<ProductVariantDTO | null>(null);
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'ADJUSTMENT_DAMAGE'>('STOCK_IN');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Applied Item Discounts Modal State
  const [discountModalData, setDiscountModalData] = useState<{ isOpen: boolean; variant: any }>({ isOpen: false, variant: null });

  // Add New Product & Stock Intake Modal State
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newVariantName, setNewVariantName] = useState('Default Unit');
  const [newSize, setNewSize] = useState('');
  const [newTypeFlavour, setNewTypeFlavour] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCostCurrency, setNewCostCurrency] = useState<string>('GHS');
  const [newSellingCurrency, setNewSellingCurrency] = useState<string>('GHS');
  const [editCostCurrency, setEditCostCurrency] = useState<string>('GHS');
  const [editSellingCurrency, setEditSellingCurrency] = useState<string>('GHS');
  const [newCostPrice, setNewCostPrice] = useState<number | ''>(0);
  const [newSellingPrice, setNewSellingPrice] = useState<number | ''>('');
  const [newInitialStock, setNewInitialStock] = useState<number | ''>(10);
  const [newMinStockLevel, setNewMinStockLevel] = useState<number>(5);
  const [newReorderLevel, setNewReorderLevel] = useState<number>(10);
  const [newCategory, setNewCategory] = useState('Groceries');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [categoriesList, setCategoriesList] = useState<string[]>([
    'Groceries',
    'Beverages',
    'Dairy',
    'Bakery',
    'Frozen Foods',
    'Personal Care',
    'Cosmetics',
    'Electronics',
    'Clothing & Apparel',
    'Pharmacy & Health',
    'Household & Cleaning',
    'Stationery & Office',
    'General Merchandise'
  ]);
  const [newBrand, setNewBrand] = useState('Nestle');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common Presets for Quick Item Configuration
  const SIZE_PRESETS = ['250ml', '500ml', '1L', '1.5L', '100g', '250g', '500g', '1kg', 'Small', 'Medium', 'Large', 'XL', 'Pack of 6', 'Box of 12'];
  const TYPE_PRESETS = ['Original', 'Vanilla', 'Chocolate', 'Strawberry', 'Sugar-Free', 'Regular', 'Diet', 'Spicy', 'Mint', 'Premium', 'Whole Wheat'];

  // Brand Management Modal State (CRUD Option 1)
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([
    { id: 'b1', name: 'Nestle' },
    { id: 'b2', name: 'Coca-Cola Company' },
    { id: 'b3', name: 'Unilever' },
    { id: 'b4', name: 'FanMilk Ghana' }
  ]);
  const [brandNameInput, setBrandNameInput] = useState('');
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  // Real-Time Barcode Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);

  // Barcode Label Generator Modal State
  const [barcodeModalItem, setBarcodeModalItem] = useState<ProductVariantDTO | null>(null);
  const [barcodeCopies, setBarcodeCopies] = useState<number>(6);

  // Image Lightbox Preview State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const { showToast } = useAlertStore();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductIdToAdjust && products.length > 0) {
      const match = products.find(p => p.id === selectedProductIdToAdjust || p.productId === selectedProductIdToAdjust || p.sku === selectedProductIdToAdjust);
      if (match) {
        setAdjustModal(match);
        if (onClearSelectedProductToAdjust) onClearSelectedProductToAdjust();
      }
    }
  }, [selectedProductIdToAdjust, products]);

  const loadProducts = async () => {
    try {
      const res = await ApiClient.request('/catalog/products');
      if (res.success) setProducts(res.data);
    } catch (e) {
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
          categoryName: 'Groceries',
          imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80'
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
          categoryName: 'Beverages',
          imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80'
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
          categoryName: 'Groceries',
          imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&auto=format&fit=crop&q=80'
        }
      ]);
    }
  };

  // Base64 File Upload Handler for Device Local Images
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('warning', 'File Size Limit', 'Please select an image smaller than 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setNewImageUrl(base64Data);
      showToast('success', 'Image Uploaded!', 'Local device image converted and attached as Base64 data.');
    };
    reader.readAsDataURL(file);
  };

  // Start Real-Time Camera Scanner
  const startCameraScan = () => {
    setScannerOpen(true);
  };

  const handleSimulatedScan = (scannedBarcode: string) => {
    setNewBarcode(scannedBarcode);
    showToast('success', 'Barcode Scanned!', `Scanned Code: ${scannedBarcode}`);
    setScannerOpen(false);
  };

  const handleStockAdjust = async () => {
    if (!adjustModal) return;
    const change = adjustType === 'STOCK_IN' ? adjustQty : -adjustQty;

    try {
      await ApiClient.request('/catalog/stock-adjust', {
        method: 'POST',
        body: JSON.stringify({
          variantId: adjustModal.id,
          warehouseId: 'WH-ACC-01',
          quantityChange: change,
          type: adjustType,
          notes: adjustNotes || 'Stock Adjustment'
        })
      });
      showToast('success', 'Stock Adjusted!', `Inventory balance for ${adjustModal.productName} updated.`);
      setAdjustModal(null);
      loadProducts();
    } catch (e: any) {
      showToast('error', 'Adjustment Failed', e.message);
    }
  };

  const openEditModal = (p: ProductVariantDTO) => {
    setEditProductModal(p);
    setEditName(p.productName);
    setEditVariantName(p.variantName || 'Default Unit');
    setEditSku(p.sku);
    setEditBarcode(p.barcode || '');
    setEditCostPrice(p.costPrice);
    setEditSellingPrice(p.sellingPrice);
    setEditQuantityOnHand(p.quantityOnHand);
    setEditMinStockLevel(p.minStockLevel || 5);
    setEditReorderLevel(p.reorderLevel || 10);
    setEditCategory(p.categoryName || 'Groceries');
    setEditImageUrl(p.imageUrl || '');

    if (p.promoRule) {
      setPromoActive(p.promoRule.isActive);
      setPromoType(p.promoRule.type);
      setPromoValue(p.promoRule.value);
      if (p.promoRule.type === 'TARGET_PRICE') {
        setTargetSellingPriceInput(p.promoRule.value);
      } else {
        setTargetSellingPriceInput(p.sellingPrice * 0.8);
      }
      setBogoBuyQty(p.promoRule.buyQty || 1);
      setBogoGetQtyFree(p.promoRule.getQtyFree || 1);
      setPromoStartDate(p.promoRule.startDate || '');
      setPromoEndDate(p.promoRule.endDate || '');
      setPromoStartHour(p.promoRule.startHour !== undefined ? p.promoRule.startHour : '');
      setPromoEndHour(p.promoRule.endHour !== undefined ? p.promoRule.endHour : '');
      setPromoDaysOfWeek(p.promoRule.daysOfWeek || []);
    } else {
      setPromoActive(false);
      setPromoType('PERCENTAGE');
      setPromoValue(10);
      setTargetSellingPriceInput(p.sellingPrice * 0.8);
      setBogoBuyQty(1);
      setBogoGetQtyFree(1);
      setPromoStartDate('');
      setPromoEndDate('');
      setPromoStartHour('');
      setPromoEndHour('');
      setPromoDaysOfWeek([]);
    }
  };

  const handleSaveProductEdit = () => {
    if (!editProductModal) return;

    let computedPromoVal = promoValue;
    let computedActiveDisc = 0;

    if (promoActive) {
      if (promoType === 'PERCENTAGE') {
        computedPromoVal = promoValue;
        computedActiveDisc = promoValue;
      } else if (promoType === 'TARGET_PRICE') {
        computedPromoVal = targetSellingPriceInput;
        const discountAmt = Math.max(0, editSellingPrice - targetSellingPriceInput);
        computedActiveDisc = editSellingPrice > 0 ? (discountAmt / editSellingPrice) * 100 : 0;
      } else if (promoType === 'FIXED_AMOUNT') {
        computedPromoVal = promoValue;
        computedActiveDisc = editSellingPrice > 0 ? (promoValue / editSellingPrice) * 100 : 0;
      } else if (promoType === 'BOGO') {
        computedPromoVal = 0;
        computedActiveDisc = 50;
      }
    }

    const updatedRule: PromoRule | undefined = promoActive
      ? {
          id: editProductModal.promoRule?.id || `promo-${Date.now()}`,
          name: `${promoType} Promo`,
          type: promoType,
          value: computedPromoVal,
          buyQty: bogoBuyQty,
          getQtyFree: bogoGetQtyFree,
          startDate: promoStartDate || undefined,
          endDate: promoEndDate || undefined,
          startHour: promoStartHour !== '' ? Number(promoStartHour) : undefined,
          endHour: promoEndHour !== '' ? Number(promoEndHour) : undefined,
          daysOfWeek: promoDaysOfWeek.length > 0 ? promoDaysOfWeek : undefined,
          isActive: true
        }
      : undefined;

    const updatedProducts = products.map((item) => {
      if (item.id === editProductModal.id) {
        return {
          ...item,
          productName: editName,
          variantName: editVariantName,
          sku: editSku,
          barcode: editBarcode,
          costPrice: editCostPrice,
          sellingPrice: editSellingPrice,
          quantityOnHand: editQuantityOnHand,
          minStockLevel: editMinStockLevel,
          reorderLevel: editReorderLevel,
          categoryName: editCategory,
          imageUrl: editImageUrl,
          activePromoDiscount: promoActive ? Number(computedActiveDisc.toFixed(1)) : undefined,
          promoRule: updatedRule
        };
      }
      return item;
    });

    setProducts(updatedProducts);
    setEditProductModal(null);
    showToast('success', 'Product & Promo Saved!', `'${editName}' catalog details and promo rules updated successfully.`);
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newSellingPrice) {
      showToast('warning', 'Required Fields', 'Please enter a product name and selling price.');
      return;
    }

    setIsSubmitting(true);
    const skuCode = newSku.trim() || `SKU-${Date.now().toString().slice(-6)}`;
    const barcodeVal = newBarcode.trim() || skuCode;
    const imgVal = newImageUrl.trim() || 'https://images.unsplash.com/photo-1584473457406-6df3a637210c?w=300&auto=format&fit=crop&q=80';

    try {
      const res = await ApiClient.request('/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          productName: newProductName,
          variantName: newVariantName || 'Default Unit',
          sku: skuCode,
          barcode: barcodeVal,
          costPrice: Number(newCostPrice) || 0,
          sellingPrice: Number(newSellingPrice) || 0,
          initialStock: Number(newInitialStock) || 0,
          categoryName: newCategory,
          imageUrl: imgVal
        })
      });

      if (res.success && res.data) {
        showToast('success', 'Product & Stock Added!', `'${newProductName}' created with ${newInitialStock || 0} initial units.`);
        setProducts([{ ...res.data, imageUrl: imgVal }, ...products]);
      }
    } catch (e: any) {
      showToast('error', 'Product Addition Failed', e.message || 'Could not save product to database.');
    } finally {
      setIsSubmitting(false);
      setAddProductModalOpen(false);
      setNewProductName('');
      setNewVariantName('Default Unit');
      setNewSize('');
      setNewTypeFlavour('');
      setNewSku('');
      setNewBarcode('');
      setNewCostPrice(0);
      setNewSellingPrice('');
      setNewInitialStock(10);
      setNewImageUrl('');
    }
  };

  const lowStockItems = products.filter(p => p.quantityOnHand <= (p.reorderLevel || 10));

  const filteredProducts = products.filter(p => {
    const matchesQuery =
      p.productName.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      (p.barcode && p.barcode.includes(query)) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(query.toLowerCase()));
    
    if (showLowStockOnly) {
      return matchesQuery && p.quantityOnHand <= (p.reorderLevel || 10);
    }
    return matchesQuery;
  });

  const handlePrintBarcodeStickers = () => {
    if (!barcodeModalItem) return;
    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) return;

    const numCopies = Math.max(1, barcodeCopies);
    const stickersHtml = Array.from({ length: numCopies }).map(() => `
      <div style="border:1px solid #cbd5e1; border-radius:8px; padding:8px; text-align:center; font-family:sans-serif; width:170px; display:inline-block; margin:6px; box-sizing:border-box; background:#fff;">
        <div style="font-size:9px; font-weight:bold; color:#0f766e; text-transform:uppercase;">Ave Retail</div>
        <div style="font-size:11px; font-weight:bold; margin:2px 0; max-height:28px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${barcodeModalItem.productName}</div>
        <div style="font-size:14px; font-weight:900; color:#0d9488; margin-bottom:4px;">GH₵ ${barcodeModalItem.sellingPrice.toFixed(2)}</div>
        <!-- Barcode Lines -->
        <div style="display:flex; justify-content:center; align-items:flex-end; height:32px; gap:2px; background:#f8fafc; padding:4px 2px; border-radius:4px;">
          ${Array.from({ length: 24 }).map((_, i) => `<div style="width:${i % 3 === 0 ? '3px' : '1.5px'}; height:100%; background:#0f172a;"></div>`).join('')}
        </div>
        <div style="font-size:9px; font-family:monospace; margin-top:2px; color:#475569;">${barcodeModalItem.barcode || barcodeModalItem.sku}</div>
      </div>
    `).join('');

    printWin.document.write(`
      <html>
        <head>
          <title>Print Barcode Price Stickers - ${barcodeModalItem.productName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
              @page { size: auto; margin: 0mm; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div style="display:flex; flex-wrap:wrap; justify-content:flex-start;">
            ${stickersHtml}
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header & Single Unified Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <Package className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Product Catalog & Stock Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create catalog items, attach device/URL images, print barcode labels, record stock intake, and monitor low-stock levels.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* SINGLE Low Stock Filter Button */}
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 border ${
              showLowStockOnly
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="w-4 h-4 text-amber-500" />
            <span>{showLowStockOnly ? 'Showing Low Stock Only' : `Low Stock Filter (${lowStockItems.length})`}</span>
          </button>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Name, SKU, Barcode..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => setBrandModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Manage Brands</span>
          </button>

          <button
            onClick={() => setAddProductModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product / Receive Stock</span>
          </button>
        </div>
      </div>

      {/* Active Low Stock Filter Banner */}
      {showLowStockOnly && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Low-Stock Isolation Active:</strong> Displaying <strong>{filteredProducts.length}</strong> product(s) at or below reorder levels.
            </span>
          </div>
          <button
            onClick={() => setShowLowStockOnly(false)}
            className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-amber-600 transition cursor-pointer"
          >
            Clear Filter (Show All Products)
          </button>
        </div>
      )}

      {/* Catalog Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Product Item</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cost Price</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">Stock Level</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No products found matching your search query or low-stock filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isNegative = p.quantityOnHand <= 0;
                  const isLowStock = p.quantityOnHand <= (p.reorderLevel || 10);
                  return (
                    <tr key={p.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center space-x-3">
                          {p.imageUrl ? (
                            <button
                              onClick={() => setLightboxImage({ url: p.imageUrl!, title: p.productName })}
                              className="relative group cursor-pointer focus:outline-none shrink-0"
                              title="Click for Large Image Preview"
                            >
                              <img
                                src={p.imageUrl}
                                alt={p.productName}
                                className="w-11 h-11 object-cover rounded-xl border border-slate-200 dark:border-slate-800 group-hover:opacity-80 transition shadow-sm bg-slate-100 dark:bg-slate-950"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{p.productName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{p.variantName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        <div>{p.sku}</div>
                        <div className="text-[10px] text-teal-600 dark:text-teal-400">{p.barcode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.categoryName || 'General'}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        <div>{formatMoney(p.costPrice, 'GH₵')}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                        <div>{formatMoney(p.sellingPrice, 'GH₵')}</div>
                        <PromoBadgeList
                          promoRules={p.promoRules}
                          activePromoDiscount={p.activePromoDiscount}
                          promoRule={p.promoRule}
                          onOpenModal={() => setDiscountModalData({ isOpen: true, variant: p })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono inline-flex items-center space-x-1 ${
                          isNegative
                            ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : isLowStock
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {(isNegative || isLowStock) && <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />}
                          <span>{p.quantityOnHand} units</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5 ml-auto">
                          <CustomTooltip content="Edit Item Details & Set Promotional Discount Rules">
                            <button
                              onClick={() => openEditModal(p)}
                              className="px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-600 text-teal-600 dark:text-teal-400 hover:text-white rounded-lg border border-teal-500/30 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit Product</span>
                            </button>
                          </CustomTooltip>

                          <CustomTooltip content="Print Barcode & Price Tag Labels">
                            <button
                              onClick={() => {
                                setBarcodeModalItem(p);
                                setBarcodeCopies(6);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                            >
                              <Barcode className="w-4 h-4" />
                            </button>
                          </CustomTooltip>

                          <button
                            onClick={() => {
                              setAdjustModal(p);
                              setAdjustQty(10);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 text-slate-700 dark:text-slate-200 hover:text-white rounded-lg border border-slate-300 dark:border-slate-700 font-semibold transition cursor-pointer"
                          >
                            Adjust Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Adjust Existing Stock */}
      {adjustModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Stock Adjustment: {adjustModal.productName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current Stock Balance: <span className="font-mono text-slate-900 dark:text-white font-bold">{adjustModal.quantityOnHand} units</span>
            </p>

            <div className="space-y-3">
              <div>
                <CustomSelect
                  label="Adjustment Action"
                  options={[
                    { value: 'STOCK_IN', label: 'Stock Intake / Purchase (+)', description: 'Increase available stock quantity' },
                    { value: 'ADJUSTMENT_DAMAGE', label: 'Damaged / Expired Stock (-)', description: 'Deduct damaged or lost stock' }
                  ]}
                  value={adjustType}
                  onChange={(val: any) => setAdjustType(val)}
                  icon={Package}
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Received shipment from supplier"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setAdjustModal(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer">Cancel</button>
              <button onClick={handleStockAdjust} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer">Save Adjustment</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New Product & Stock Intake (Supports Local Device Base64 Upload & URLs) */}
      {addProductModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Add Product & Stock Intake</span>
              </h3>
              <button onClick={() => setAddProductModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Cerelac Wheat & Milk 400g"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Product Image URL, Base64 Device File Upload & Presets */}
              <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Product Image (File Upload or Web URL)</span>
                  </label>

                  {/* Device File Upload Button (Converts to Base64) */}
                  <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer flex items-center space-x-1.5 text-[11px] shrink-0">
                    <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Upload Device Image (Base64)</span>
                    <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                  </label>
                </div>

                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste Image URL or click 'Upload Device Image' above..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-[11px]"
                />

                {newImageUrl && (
                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setLightboxImage({ url: newImageUrl, title: newProductName || 'Product Preview' })}
                      className="relative group cursor-pointer focus:outline-none shrink-0"
                    >
                      <img src={newImageUrl} alt="Preview" className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </button>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>Image Ready for POS & Catalog (Click preview to enlarge)</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Category & Brand Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                      className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      {showAddCategoryInput ? 'Choose Existing' : '+ Add Custom Category'}
                    </button>
                  </div>
                  {showAddCategoryInput ? (
                    <div className="flex space-x-1.5">
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="New category name..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = customCategoryInput.trim();
                          if (trimmed && !categoriesList.includes(trimmed)) {
                            setCategoriesList([...categoriesList, trimmed]);
                            setNewCategory(trimmed);
                            setCustomCategoryInput('');
                            setShowAddCategoryInput(false);
                            showToast('success', 'Category Added', `Category '${trimmed}' created.`);
                          }
                        }}
                        className="px-3 py-2 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-500 cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <CustomSelect
                      value={newCategory}
                      onChange={(val) => setNewCategory(val)}
                      options={categoriesList.map(c => ({ value: c, label: c }))}
                    />
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">Manufacturer Brand</label>
                    <button
                      type="button"
                      onClick={() => setBrandModalOpen(true)}
                      className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      + Manage Brands
                    </button>
                  </div>
                  <CustomSelect
                    value={newBrand}
                    onChange={(val) => setNewBrand(val)}
                    options={brands.map(b => ({ value: b.name, label: b.name }))}
                  />
                </div>
              </div>

              {/* Item Specifications: Sizes, Types, Flavours */}
              <div className="p-3 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Item Specifications (Size, Volume, Type & Flavour)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click presets to set values</span>
                </div>

                {/* Size / Volume / Weight Picker */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">Size / Volume / Weight</label>
                    {newSize && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewSize('');
                          const parts = [newTypeFlavour].filter(Boolean);
                          setNewVariantName(parts.length ? parts.join(' / ') : 'Default Unit');
                        }}
                        className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                      >
                        Clear Size
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newSize}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSize(val);
                      const parts = [val, newTypeFlavour].filter(Boolean);
                      setNewVariantName(parts.length ? parts.join(' / ') : 'Default Unit');
                    }}
                    placeholder="e.g. 500ml, 1kg, Large, Pack of 6..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs mb-1.5"
                  />
                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {SIZE_PRESETS.map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => {
                          setNewSize(sz);
                          const parts = [sz, newTypeFlavour].filter(Boolean);
                          setNewVariantName(parts.length ? parts.join(' / ') : 'Default Unit');
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                          newSize === sz
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type / Flavour / Style Picker */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">Type / Flavour / Style</label>
                    {newTypeFlavour && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewTypeFlavour('');
                          const parts = [newSize].filter(Boolean);
                          setNewVariantName(parts.length ? parts.join(' / ') : 'Default Unit');
                        }}
                        className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                      >
                        Clear Type/Flavour
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newTypeFlavour}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTypeFlavour(val);
                      const parts = [newSize, val].filter(Boolean);
                      setNewVariantName(parts.length ? parts.join(' / ') : 'Default Unit');
                    }}
                    placeholder="e.g. Vanilla, Chocolate, Original, Sugar-Free..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs mb-1.5"
                  />
                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {TYPE_PRESETS.map((tf) => (
                      <button
                        type="button"
                        key={tf}
                        onClick={() => {
                          setNewTypeFlavour(tf);
                          const parts = [newSize, tf].filter(Boolean);
                          setNewVariantName(parts.length ? parts.join(' / ') : 'Default Unit');
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                          newTypeFlavour === tf
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Final Assembled Unit / Variant Name */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Final Unit / Variant Label</label>
                  <input
                    type="text"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    placeholder="e.g. 500ml Bottle / Vanilla Flavour"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-teal-500/50 rounded-xl text-slate-900 dark:text-white font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Barcode</label>
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      value={newBarcode}
                      onChange={(e) => setNewBarcode(e.target.value)}
                      placeholder="Scan or type barcode"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                    <CustomTooltip content="Open Camera Barcode Scanner" align="right">
                      <button
                        type="button"
                        onClick={startCameraScan}
                        className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl flex items-center justify-center transition cursor-pointer shrink-0"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </CustomTooltip>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">Cost Price</label>
                    <div className="w-32">
                      <CustomSelect
                        value={newCostCurrency}
                        onChange={(val) => setNewCostCurrency(val)}
                        options={[
                          { value: 'GHS', label: 'GHS (GH₵)' },
                          { value: 'USD', label: 'USD ($)' },
                          { value: 'EUR', label: 'EUR (€)' },
                          { value: 'GBP', label: 'GBP (£)' },
                          { value: 'CNY', label: 'CNY (¥)' }
                        ]}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-xs text-slate-400 font-mono">
                      {newCostCurrency === 'USD' ? '$' : newCostCurrency === 'EUR' ? '€' : newCostCurrency === 'GBP' ? '£' : newCostCurrency === 'CNY' ? '¥' : 'GH₵'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">Selling Price *</label>
                    <div className="w-32">
                      <CustomSelect
                        value={newSellingCurrency}
                        onChange={(val) => setNewSellingCurrency(val)}
                        options={[
                          { value: 'GHS', label: 'GHS (GH₵)' },
                          { value: 'USD', label: 'USD ($)' },
                          { value: 'EUR', label: 'EUR (€)' },
                          { value: 'GBP', label: 'GBP (£)' },
                          { value: 'CNY', label: 'CNY (¥)' }
                        ]}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-xs text-teal-600 font-mono">
                      {newSellingCurrency === 'USD' ? '$' : newSellingCurrency === 'EUR' ? '€' : newSellingCurrency === 'GBP' ? '£' : newSellingCurrency === 'CNY' ? '¥' : 'GH₵'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={newSellingPrice}
                      onChange={(e) => setNewSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Currency Exchange Rate Alert Banner */}
              {newCostCurrency !== newSellingCurrency && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Multi-Currency Cost & Selling Valuation Alert</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Cost is set in <span className="font-bold text-amber-600 dark:text-amber-300">{newCostCurrency}</span> while Selling Price is in <span className="font-bold text-teal-600 dark:text-teal-400">{newSellingCurrency}</span>. The system real-time rate (1 {newCostCurrency} = {newCostCurrency === 'USD' ? '15.80' : newCostCurrency === 'EUR' ? '17.20' : newCostCurrency === 'GBP' ? '20.10' : newCostCurrency === 'CNY' ? '2.20' : '1.00'} {newSellingCurrency}) will be recorded upon form submission to ensure financial reports align properly.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Initial Stock Intake</label>
                  <input
                    type="number"
                    min="0"
                    value={newInitialStock}
                    onChange={(e) => setNewInitialStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Min Stock Level</label>
                  <input
                    type="number"
                    min="1"
                    value={newMinStockLevel}
                    onChange={(e) => setNewMinStockLevel(Number(e.target.value))}
                    placeholder="5"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Reorder Point</label>
                  <input
                    type="number"
                    min="1"
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(Number(e.target.value))}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Add Stock Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Real-Time Camera Barcode Scanner Overlay */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleSimulatedScan}
        title="Inventory Barcode Scanner"
      />

      {/* MODAL 4: Print Barcode & Price Tag Sticker Generator */}
      {barcodeModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Barcode & Price Tag Generator</span>
              </h3>
              <button onClick={() => setBarcodeModalItem(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Live Sticker Preview</span>
              <div className="w-48 bg-white text-slate-900 border border-slate-300 rounded-xl p-3 text-center shadow-md font-sans">
                <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Ave Retail Enterprise</div>
                <div className="font-extrabold text-xs truncate my-0.5">{barcodeModalItem.productName}</div>
                <div className="text-base font-black text-teal-600 font-mono">GH₵ {barcodeModalItem.sellingPrice.toFixed(2)}</div>
                
                {/* Visual Barcode Pattern */}
                <div className="flex justify-center items-end h-8 gap-0.5 my-1 bg-slate-50 p-1 rounded">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className={`h-full ${i % 3 === 0 ? 'w-[3px]' : 'w-[1.5px]'} bg-slate-900`} />
                  ))}
                </div>
                <div className="text-[9px] font-mono text-slate-500">{barcodeModalItem.barcode || barcodeModalItem.sku}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">Number of Sticker Copies to Print</label>
              
              {/* Quick Preset Buttons */}
              <div className="flex items-center space-x-2">
                {[1, 6, 12, 24, 50].map((num) => (
                  <button
                    key={num}
                    onClick={() => setBarcodeCopies(num)}
                    className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                      barcodeCopies === num
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Custom Number Input Field */}
              <div className="flex items-center space-x-3 pt-1">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Custom Exact Count:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={barcodeCopies}
                  onChange={(e) => setBarcodeCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-28 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs"
                />
                <span className="text-slate-400 text-[11px]">stuck labels</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setBarcodeModalItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintBarcodeStickers}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer text-xs flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print {barcodeCopies} Sticker Label{barcodeCopies > 1 ? 's' : ''}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Image Lightbox Preview Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{lightboxImage.title}</span>
              </h3>
              <button onClick={() => setLightboxImage(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="flex items-center justify-center bg-slate-950 rounded-2xl p-2 overflow-hidden border border-slate-800 max-h-[65vh]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xl"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setLightboxImage(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Brand Management Modal (CRUD Option 1) */}
      {brandModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Tag className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Brand Management</span>
              </h3>
              <button onClick={() => setBrandModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            {/* Add / Edit Brand Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!brandNameInput) return;
                if (editingBrandId) {
                  setBrands(brands.map(b => b.id === editingBrandId ? { ...b, name: brandNameInput } : b));
                  showToast('success', 'Brand Updated', `Brand renamed to '${brandNameInput}'.`);
                  setEditingBrandId(null);
                } else {
                  setBrands([...brands, { id: `b-${Date.now()}`, name: brandNameInput }]);
                  showToast('success', 'Brand Created', `New brand '${brandNameInput}' added.`);
                }
                setBrandNameInput('');
              }}
              className="flex items-center space-x-2 text-xs"
            >
              <input
                type="text"
                required
                value={brandNameInput}
                onChange={(e) => setBrandNameInput(e.target.value)}
                placeholder={editingBrandId ? 'Update brand name...' : 'Enter new brand name...'}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shrink-0 cursor-pointer"
              >
                {editingBrandId ? 'Save' : 'Add Brand'}
              </button>
              {editingBrandId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBrandId(null);
                    setBrandNameInput('');
                  }}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </form>

            {/* Registered Brands List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Registered Brands ({brands.length})</span>
              {brands.map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{b.name}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingBrandId(b.id);
                        setBrandNameInput(b.name);
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setBrands(brands.filter(x => x.id !== b.id));
                        showToast('info', 'Brand Deleted', `Brand '${b.name}' deleted.`);
                      }}
                      className="px-2 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setBrandModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Product & Advanced Promotional Discount Engine (Prompt 3 & Prompt 8) */}
      {editProductModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-extrabold text-base">Edit Product Catalog & Stock Details</h3>
              </div>
              <button onClick={() => setEditProductModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Product Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Variant Name</label>
                <input
                  type="text"
                  value={editVariantName}
                  onChange={(e) => setEditVariantName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">SKU Code</label>
                <input
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Barcode</label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Cost Price</label>
                  <div className="w-32">
                    <CustomSelect
                      value={editCostCurrency}
                      onChange={(val) => setEditCostCurrency(val)}
                      options={[
                        { value: 'GHS', label: 'GHS (GH₵)' },
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'EUR', label: 'EUR (€)' },
                        { value: 'GBP', label: 'GBP (£)' },
                        { value: 'CNY', label: 'CNY (¥)' }
                      ]}
                    />
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-xs text-slate-400 font-mono">
                    {editCostCurrency === 'USD' ? '$' : editCostCurrency === 'EUR' ? '€' : editCostCurrency === 'GBP' ? '£' : editCostCurrency === 'CNY' ? '¥' : 'GH₵'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Standard Selling Price *</label>
                  <div className="w-32">
                    <CustomSelect
                      value={editSellingCurrency}
                      onChange={(val) => setEditSellingCurrency(val)}
                      options={[
                        { value: 'GHS', label: 'GHS (GH₵)' },
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'EUR', label: 'EUR (€)' },
                        { value: 'GBP', label: 'GBP (£)' },
                        { value: 'CNY', label: 'CNY (¥)' }
                      ]}
                    />
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-xs text-teal-600 font-mono">
                    {editSellingCurrency === 'USD' ? '$' : editSellingCurrency === 'EUR' ? '€' : editSellingCurrency === 'GBP' ? '£' : editSellingCurrency === 'CNY' ? '¥' : 'GH₵'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-teal-600 dark:text-teal-400"
                  />
                </div>
              </div>

              {editCostCurrency !== editSellingCurrency && (
                <div className="col-span-1 sm:col-span-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Multi-Currency Cost & Selling Valuation Alert</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Cost is set in <span className="font-bold text-amber-600 dark:text-amber-300">{editCostCurrency}</span> while Selling Price is in <span className="font-bold text-teal-600 dark:text-teal-400">{editSellingCurrency}</span>. The system real-time exchange rate will be recorded to align accounting reports.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Current Stock Quantity</label>
                <input
                  type="number"
                  value={editQuantityOnHand}
                  onChange={(e) => setEditQuantityOnHand(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Reorder Level Alert</label>
                <input
                  type="number"
                  value={editReorderLevel}
                  onChange={(e) => setEditReorderLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* SECTION 2: Advanced Promotional Discount Engine Configurator (Prompt 3) */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Percent className="w-4 h-4 text-rose-500" />
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">Catalog Promotional Discount Engine</span>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoActive}
                    onChange={(e) => setPromoActive(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-bold text-rose-600 dark:text-rose-400">Enable Promo Sales</span>
                </label>
              </div>

              {promoActive && (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {/* Promo Type Options */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">Promotion Model Type</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setPromoType('PERCENTAGE')}
                        className={`py-2 px-3 rounded-xl font-bold border transition ${
                          promoType === 'PERCENTAGE'
                            ? 'bg-rose-600 text-white border-rose-600 shadow'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Percentage Off
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoType('FIXED_AMOUNT')}
                        className={`py-2 px-3 rounded-xl font-bold border transition ${
                          promoType === 'FIXED_AMOUNT'
                            ? 'bg-rose-600 text-white border-rose-600 shadow'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Fixed Amount Off
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoType('TARGET_PRICE')}
                        className={`py-2 px-3 rounded-xl font-bold border transition ${
                          promoType === 'TARGET_PRICE'
                            ? 'bg-rose-600 text-white border-rose-600 shadow'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Target Promo Price
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoType('BOGO')}
                        className={`py-2 px-3 rounded-xl font-bold border transition ${
                          promoType === 'BOGO'
                            ? 'bg-rose-600 text-white border-rose-600 shadow'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Buy 1 Get 1 (BOGO)
                      </button>
                    </div>
                  </div>

                  {/* Type Specific Fields */}
                  {promoType === 'PERCENTAGE' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Discount Percentage (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={promoValue}
                        onChange={(e) => setPromoValue(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {promoType === 'FIXED_AMOUNT' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Fixed Discount Amount Off (GH₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={promoValue}
                        onChange={(e) => setPromoValue(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Target Price Auto-Calculator (Prompt 3 feature) */}
                  {promoType === 'TARGET_PRICE' && (
                    <div className="space-y-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Enter Desired Promo Selling Price (GH₵)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={targetSellingPriceInput}
                        onChange={(e) => setTargetSellingPriceInput(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm"
                        placeholder="e.g. 8.00"
                      />
                      {editSellingPrice > 0 && targetSellingPriceInput > 0 && (
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-semibold flex items-center justify-between border border-rose-200 dark:border-rose-900">
                          <span>Calculated Discount Output:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                            {(((editSellingPrice - targetSellingPriceInput) / editSellingPrice) * 100).toFixed(1)}% OFF (Savings: GH₵ {(editSellingPrice - targetSellingPriceInput).toFixed(2)})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {promoType === 'BOGO' && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Buy Quantity (N)</label>
                        <input
                          type="number"
                          min="1"
                          value={bogoBuyQty}
                          onChange={(e) => setBogoBuyQty(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Get Free Quantity (M)</label>
                        <input
                          type="number"
                          min="1"
                          value={bogoGetQtyFree}
                          onChange={(e) => setBogoGetQtyFree(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Schedule, Days of Week & Hour Range Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Start Date (Optional)</span>
                      </label>
                      <input
                        type="date"
                        value={promoStartDate}
                        onChange={(e) => setPromoStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>End Date (Leave blank if active until turned off)</span>
                      </label>
                      <input
                        type="date"
                        value={promoEndDate}
                        onChange={(e) => setPromoEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Days of Week Selection (Requirement 4) */}
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                      Active Days of the Week (Click to select/unselect specific days e.g. Tuesday-only promos)
                    </span>
                    <div className="grid grid-cols-7 gap-1">
                      {[
                        { day: 0, label: 'Sun' },
                        { day: 1, label: 'Mon' },
                        { day: 2, label: 'Tue' },
                        { day: 3, label: 'Wed' },
                        { day: 4, label: 'Thu' },
                        { day: 5, label: 'Fri' },
                        { day: 6, label: 'Sat' }
                      ].map((item) => {
                        const isSelected = promoDaysOfWeek.includes(item.day);
                        return (
                          <button
                            key={item.day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setPromoDaysOfWeek(promoDaysOfWeek.filter((d) => d !== item.day));
                              } else {
                                setPromoDaysOfWeek([...promoDaysOfWeek, item.day]);
                              }
                            }}
                            className={`py-1.5 rounded-lg font-bold text-[11px] border transition ${
                              isSelected
                                ? 'bg-rose-600 text-white border-rose-600 shadow'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {promoDaysOfWeek.length === 0
                        ? '* Promo applies on ALL days of the week.'
                        : `* Active only on: ${promoDaysOfWeek.map((d) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]).join(', ')}.`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Happy Hour Start (0-23)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="e.g. 14 for 2PM"
                        value={promoStartHour}
                        onChange={(e) => setPromoStartHour(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Happy Hour End (0-23)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="e.g. 18 for 6PM"
                        value={promoEndHour}
                        onChange={(e) => setPromoEndHour(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditProductModal(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProductEdit}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-teal-600/30 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Catalog & Promo Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
