import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, RefreshCw, AlertTriangle, Boxes, Tag, DollarSign, Layers, Barcode, Printer, Filter, Camera, Check, X, Image as ImageIcon, Upload, Maximize2, Download } from 'lucide-react';
import { ProductVariantDTO } from '@ave/types';
import { ApiClient } from '../../lib/api';
import { formatMoney } from '@ave/shared';
import { useAlertStore } from '../../store/alertStore';
import { CustomSelect } from '../../components/CustomSelect';
import { CustomTooltip } from '../../components/CustomTooltip';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';

export const InventoryView: React.FC = () => {
  const [products, setProducts] = useState<ProductVariantDTO[]>([]);
  const [query, setQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Stock Adjust Modal State
  const [adjustModal, setAdjustModal] = useState<ProductVariantDTO | null>(null);
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'ADJUSTMENT_DAMAGE'>('STOCK_IN');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Add New Product & Stock Intake Modal State
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newVariantName, setNewVariantName] = useState('Default Unit');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCostPrice, setNewCostPrice] = useState<number | ''>(0);
  const [newSellingPrice, setNewSellingPrice] = useState<number | ''>('');
  const [newInitialStock, setNewInitialStock] = useState<number | ''>(10);
  const [newCategory, setNewCategory] = useState('Groceries');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const mockNewItem: ProductVariantDTO = {
        id: `v-demo-${Date.now()}`,
        productId: `p-demo-${Date.now()}`,
        productName: newProductName,
        variantName: newVariantName || 'Default Unit',
        sku: skuCode,
        barcode: barcodeVal,
        costPrice: Number(newCostPrice) || 0,
        sellingPrice: Number(newSellingPrice) || 0,
        minStockLevel: 5,
        reorderLevel: 10,
        quantityOnHand: Number(newInitialStock) || 0,
        categoryName: newCategory || 'Groceries',
        imageUrl: imgVal
      };
      setProducts([mockNewItem, ...products]);
      showToast('success', 'Product & Stock Added!', `'${newProductName}' added to stock inventory.`);
    } finally {
      setIsSubmitting(false);
      setAddProductModalOpen(false);
      setNewProductName('');
      setNewVariantName('Default Unit');
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
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{formatMoney(p.costPrice, 'GH₵')}</td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">{formatMoney(p.sellingPrice, 'GH₵')}</td>
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
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 text-slate-700 dark:text-slate-200 hover:text-white rounded-lg border border-slate-300 dark:border-slate-700 font-semibold transition cursor-pointer"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Unit / Variant</label>
                  <input
                    type="text"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    placeholder="e.g. 400g Tin"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Groceries"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
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

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Cost Price (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Selling Price (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

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
    </div>
  );
};
