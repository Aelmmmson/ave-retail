import React, { useState, useEffect } from 'react';
import { Percent, Tag, Plus, CheckCircle2, Clock, Calendar, AlertTriangle, Search, Filter, Edit, RefreshCw, ShoppingBag, Sparkles, Layers, Check, X, Trash2, Layers3 } from 'lucide-react';
import { ApiClient } from '../../lib/api';
import { ProductVariantDTO, PromoRule } from '@ave/types';
import { formatMoney } from '@ave/shared';
import { useAlertStore } from '../../store/alertStore';
import { CustomSelect } from '../../components/CustomSelect';
import { CustomTooltip } from '../../components/CustomTooltip';

export const DiscountsView: React.FC = () => {
  const [products, setProducts] = useState<ProductVariantDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const { showToast } = useAlertStore();

  // Modal State for Creating/Editing Promos
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editModalItem, setEditModalItem] = useState<ProductVariantDTO | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Target Product Scope Selection: SINGLE | MULTI | ALL
  const [targetScope, setTargetScope] = useState<'SINGLE' | 'MULTI' | 'ALL'>('SINGLE');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Promo Rule Form Fields
  const [promoActive, setPromoActive] = useState<boolean>(true);
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadCatalogPromos();
  }, []);

  const loadCatalogPromos = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request('/catalog/products');
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      }
    } catch (e) {
      showToast('error', 'Error', 'Failed to load catalog products');
    } finally {
      setLoading(false);
    }
  };

  const openNewPromoModal = () => {
    const firstItem = products[0] || null;
    setEditModalItem(firstItem);
    setSelectedProductId(firstItem?.id || '');
    setSelectedProductIds([]);
    setTargetScope('SINGLE');
    setEditingRuleId(null);
    resetFormFields(firstItem);
    setIsModalOpen(true);
  };

  const openEditRuleModal = (p: ProductVariantDTO, r?: PromoRule) => {
    setEditModalItem(p);
    setSelectedProductId(p.id);
    setSelectedProductIds([p.id]);
    setTargetScope('SINGLE');
    setEditingRuleId(r?.id || null);

    if (r) {
      setPromoActive(r.isActive !== undefined ? r.isActive : true);
      setPromoType(r.type || 'PERCENTAGE');
      setPromoValue(r.value || 10);
      setBogoBuyQty(r.buyQty || 1);
      setBogoGetQtyFree(r.getQtyFree || 1);
      setPromoStartDate(r.startDate || '');
      setPromoEndDate(r.endDate || '');
      setPromoStartHour(r.startHour !== undefined ? r.startHour : '');
      setPromoEndHour(r.endHour !== undefined ? r.endHour : '');
      setPromoDaysOfWeek(r.daysOfWeek || []);
      if (r.type === 'TARGET_PRICE') {
        setTargetSellingPriceInput(r.value || 0);
      } else if (r.type === 'PERCENTAGE' && p.sellingPrice > 0) {
        setTargetSellingPriceInput(Number((p.sellingPrice * (1 - r.value / 100)).toFixed(2)));
      } else {
        setTargetSellingPriceInput(r.value || 0);
      }
    } else {
      resetFormFields(p);
    }
    setIsModalOpen(true);
  };

  const resetFormFields = (p?: ProductVariantDTO | null) => {
    const defaultPrice = p ? p.sellingPrice : 0;
    setPromoActive(true);
    setPromoType('PERCENTAGE');
    setPromoValue(10);
    setBogoBuyQty(1);
    setBogoGetQtyFree(1);
    setPromoStartDate('');
    setPromoEndDate('');
    setPromoStartHour('');
    setPromoEndHour('');
    setPromoDaysOfWeek([]);
    setTargetSellingPriceInput(defaultPrice > 0 ? Number((defaultPrice * 0.9).toFixed(2)) : 0);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let targetIds: string[] = [];
      if (targetScope === 'ALL') {
        targetIds = products.map(p => p.id);
      } else if (targetScope === 'MULTI') {
        targetIds = selectedProductIds;
      } else {
        const singleId = selectedProductId || (editModalItem ? editModalItem.id : '');
        if (singleId) targetIds = [singleId];
      }

      if (targetIds.length === 0) {
        showToast('error', 'Selection Required', 'Please select at least one product item for the promotion.');
        setIsSubmitting(false);
        return;
      }

      let promoValueToSave = promoValue;
      if (promoType === 'TARGET_PRICE') {
        promoValueToSave = targetSellingPriceInput;
      }

      const ruleIdToUse = editingRuleId || `pr-${Date.now()}`;

      for (const pid of targetIds) {
        const targetProd = products.find(x => x.id === pid);
        const ruleName = `${promoType} Promotion - ${targetProd ? targetProd.productName : 'Catalog Item'}`;

        const updatedPromoRule: PromoRule = {
          id: ruleIdToUse,
          name: ruleName,
          type: promoType,
          value: promoValueToSave,
          buyQty: promoType === 'BOGO' ? bogoBuyQty : undefined,
          getQtyFree: promoType === 'BOGO' ? bogoGetQtyFree : undefined,
          startDate: promoStartDate || undefined,
          endDate: promoEndDate || undefined,
          startHour: promoStartHour !== '' ? Number(promoStartHour) : undefined,
          endHour: promoEndHour !== '' ? Number(promoEndHour) : undefined,
          daysOfWeek: promoDaysOfWeek.length ? promoDaysOfWeek : undefined,
          isActive: promoActive
        };

        await ApiClient.request(`/catalog/products/${pid}`, {
          method: 'PUT',
          body: JSON.stringify({
            promoRule: updatedPromoRule
          })
        });
      }

      showToast('success', 'Promo Campaign Saved', `Promotional deal applied to ${targetIds.length} catalog item(s).`);
      setIsModalOpen(false);
      await loadCatalogPromos();
    } catch (err: any) {
      showToast('error', 'Error Saving Promo', err.message || 'Failed to save promo campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSpecificRule = async (p: ProductVariantDTO, ruleId: string) => {
    try {
      await ApiClient.request(`/catalog/products/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          removePromoId: ruleId
        })
      });
      showToast('info', 'Promo Removed', `Selected promo deal removed from '${p.productName}'.`);
      await loadCatalogPromos();
    } catch (e: any) {
      showToast('error', 'Error Removing Promo', e.message);
    }
  };

  const handleClearAllPromos = async (p: ProductVariantDTO) => {
    try {
      await ApiClient.request(`/catalog/products/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          clearAllPromos: true
        })
      });
      showToast('info', 'All Promos Cleared', `All promotional deals removed from '${p.productName}'.`);
      await loadCatalogPromos();
    } catch (e: any) {
      showToast('error', 'Error Clearing Promos', e.message);
    }
  };

  const promoProducts = products.filter(p => {
    const rules = (p.promoRules && p.promoRules.length > 0) ? p.promoRules : (p.promoRule ? [p.promoRule] : []);
    const hasActiveRules = rules.some(r => r.isActive !== false);
    if (!hasActiveRules && filterType !== 'ALL') return false;

    if (filterType === 'PERCENTAGE' && !rules.some(r => r.type === 'PERCENTAGE' && r.isActive !== false)) return false;
    if (filterType === 'BOGO' && !rules.some(r => r.type === 'BOGO' && r.isActive !== false)) return false;
    if (filterType === 'FIXED_AMOUNT' && !rules.some(r => r.type === 'FIXED_AMOUNT' && r.isActive !== false)) return false;
    if (filterType === 'TARGET_PRICE' && !rules.some(r => r.type === 'TARGET_PRICE' && r.isActive !== false)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const activePromoItemCount = products.filter(p => {
    const rules = (p.promoRules && p.promoRules.length > 0) ? p.promoRules : (p.promoRule ? [p.promoRule] : []);
    return rules.some(r => r.isActive !== false);
  }).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Percent className="w-6 h-6 text-rose-500" />
            <span>Catalog Promotional Discount Engine & Campaigns</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, edit, toggle, and configure percentage off sales, BOGO buy-1-get-3 free deals, target price overrides, day-of-week sales, and happy hour promos.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openNewPromoModal}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Promo Campaign</span>
          </button>

          <button
            onClick={loadCatalogPromos}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-teal-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Promotional Items</span>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {activePromoItemCount} Items
          </div>
          <p className="text-[10px] text-slate-500">Currently running promo discounts in catalog</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Buy N Get M Free (BOGO) Specials</span>
          <div className="text-3xl font-black text-amber-500 font-mono">
            {products.filter(p => (p.promoRules || [p.promoRule]).some(r => r?.type === 'BOGO' && r?.isActive !== false)).length} Deals
          </div>
          <p className="text-[10px] text-slate-500">Automated free item rewards on checkout</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weekday & Happy Hour Promos</span>
          <div className="text-3xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {products.filter(p => (p.promoRules || [p.promoRule]).some(r => r?.daysOfWeek && r.daysOfWeek.length > 0)).length} Scheduled
          </div>
          <p className="text-[10px] text-slate-500">Scheduled time window campaigns</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="w-full sm:w-64">
          <CustomSelect
            label="Filter Promotion Type"
            value={filterType}
            onChange={(val) => setFilterType(val)}
            options={[
              { value: 'ALL', label: 'All Catalog Items', description: 'Show complete catalog' },
              { value: 'PERCENTAGE', label: '🔥 Percentage Off Deals', description: 'Percentage discounts' },
              { value: 'BOGO', label: '🎁 Buy N Get M Free', description: 'BOGO rewards' },
              { value: 'FIXED_AMOUNT', label: '🏷️ Fixed Amount Off', description: 'Flat cash deduction' },
              { value: 'TARGET_PRICE', label: '🎯 Target Price Overrides', description: 'Custom selling price' }
            ]}
            icon={Filter}
          />
        </div>
      </div>

      {/* Promos Management Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Product Name & SKU</th>
                <th className="px-4 py-3">Standard Price</th>
                <th className="px-4 py-3">Active Promotional Deals</th>
                <th className="px-4 py-3">Effective Promo Price</th>
                <th className="px-4 py-3">Schedule / Days</th>
                <th className="px-4 py-3 text-right">Actions / Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {promoProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No promotional discount rules found matching your filter.
                  </td>
                </tr>
              ) : (
                promoProducts.map((p) => {
                  const rules: PromoRule[] = (p.promoRules && p.promoRules.length > 0)
                    ? p.promoRules
                    : p.promoRule ? [p.promoRule] : [];
                  const activeRules = rules.filter(r => r && r.isActive !== false);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                        <div>{p.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">{p.sku} • {p.variantName}</div>
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {formatMoney(p.sellingPrice, 'GH₵')}
                      </td>

                      <td className="px-4 py-3">
                        {activeRules.length > 0 ? (
                          <div className="space-y-1.5">
                            {activeRules.map((r, idx) => (
                              <div key={r.id || idx} className="flex items-center space-x-1.5">
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center space-x-1">
                                  {r.type === 'BOGO'
                                    ? `🎁 BUY ${r.buyQty || 1} GET ${r.getQtyFree || 1} FREE`
                                    : r.type === 'PERCENTAGE'
                                    ? `🔥 ${r.value}% OFF`
                                    : r.type === 'FIXED_AMOUNT'
                                    ? `🏷️ GH₵ ${r.value} OFF`
                                    : `🎯 Target GH₵ ${r.value}`}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => openEditRuleModal(p, r)}
                                  className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-500 hover:text-white rounded text-slate-500 dark:text-slate-400 transition"
                                  title="Edit specific deal"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpecificRule(p, r.id)}
                                  className="p-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 rounded transition"
                                  title="Remove this specific deal"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : p.activePromoDiscount ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            🔥 {p.activePromoDiscount}% PROMO OFF
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-normal">Standard Pricing</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {activeRules.length > 0 ? (
                          activeRules.map((r, idx) => (
                            <div key={idx}>
                              {r.type === 'PERCENTAGE'
                                ? formatMoney(p.sellingPrice * (1 - (r.value || 0) / 100), 'GH₵')
                                : r.type === 'FIXED_AMOUNT'
                                ? formatMoney(Math.max(0, p.sellingPrice - (r.value || 0)), 'GH₵')
                                : r.type === 'TARGET_PRICE'
                                ? formatMoney(r.value || p.sellingPrice, 'GH₵')
                                : r.type === 'BOGO'
                                ? `Buy ${r.buyQty || 1} Get ${r.getQtyFree || 1} Free`
                                : formatMoney(p.sellingPrice, 'GH₵')}
                            </div>
                          ))
                        ) : (
                          formatMoney(p.sellingPrice, 'GH₵')
                        )}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-300">
                        {activeRules.some(r => r.daysOfWeek && r.daysOfWeek.length > 0) ? (
                          <div className="flex flex-wrap gap-1">
                            {activeRules.flatMap(r => r.daysOfWeek || []).map((d, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 rounded font-bold text-[9px]">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">All Days</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditRuleModal(p)}
                            className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Deal</span>
                          </button>

                          {activeRules.length > 0 && (
                            <button
                              onClick={() => handleClearAllPromos(p)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center space-x-1"
                              title="Clear all promotional deals on this product"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear All Promos</span>
                            </button>
                          )}
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

      {/* FULL CRUD MODAL: Configure Promo Campaign Rule */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-900 dark:text-slate-100">
            {/* System Designed Title Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Percent className="w-6 h-6 text-rose-500" />
                <span>Configure Catalog Promotional Campaign</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-4 text-xs">
              {/* Scope Selection: SINGLE | MULTI | ALL */}
              <div>
                <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">Apply Promotion To</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetScope('SINGLE')}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-xs flex items-center justify-center space-x-1 ${
                      targetScope === 'SINGLE'
                        ? 'bg-rose-600 text-white border-rose-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>Single Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('MULTI')}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-xs flex items-center justify-center space-x-1 ${
                      targetScope === 'MULTI'
                        ? 'bg-rose-600 text-white border-rose-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>Selected Products</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('ALL')}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-xs flex items-center justify-center space-x-1 ${
                      targetScope === 'ALL'
                        ? 'bg-rose-600 text-white border-rose-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <Layers3 className="w-3.5 h-3.5" />
                    <span>ALL Catalog Items</span>
                  </button>
                </div>
              </div>

              {/* Product Target Selectors */}
              {targetScope === 'SINGLE' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Target Product Item</label>
                  <CustomSelect
                    value={selectedProductId}
                    onChange={(val) => {
                      setSelectedProductId(val);
                      const found = products.find(x => x.id === val);
                      if (found) setEditModalItem(found);
                    }}
                    options={products.map(p => ({
                      value: p.id,
                      label: `${p.productName} (${p.sku}) - Price: ${formatMoney(p.sellingPrice, 'GH₵')}`
                    }))}
                  />
                </div>
              )}

              {targetScope === 'MULTI' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Select Target Products ({selectedProductIds.length} Selected)
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 space-y-1">
                    {products.map((p) => {
                      const isChecked = selectedProductIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center space-x-2.5 p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds([...selectedProductIds, p.id]);
                              } else {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                              }
                            }}
                            className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.productName} <span className="text-slate-400 font-mono text-[10px]">({p.sku}) - {formatMoney(p.sellingPrice, 'GH₵')}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {targetScope === 'ALL' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  <span>Global Campaign: Promotion will be applied to ALL {products.length} products in catalog.</span>
                </div>
              )}

              {/* Promo Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200">Promotion Status</span>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoActive}
                    onChange={(e) => setPromoActive(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="font-bold text-rose-600 dark:text-rose-400">Enable Promo Campaign</span>
                </label>
              </div>

              {/* Promotion Model Selection */}
              <div>
                <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">Promotion Model Type</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPromoType('PERCENTAGE')}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
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
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
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
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
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
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                      promoType === 'BOGO'
                        ? 'bg-rose-600 text-white border-rose-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    🎁 Buy N Get M Free
                  </button>
                </div>
              </div>

              {/* DYNAMIC INPUT FIELDS FOR ALL PROMO TYPES */}
              {promoType === 'PERCENTAGE' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Percentage Discount (% OFF)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={promoValue}
                      onChange={(e) => {
                        const pct = Number(e.target.value);
                        setPromoValue(pct);
                        if (editModalItem && editModalItem.sellingPrice > 0) {
                          setTargetSellingPriceInput(Number((editModalItem.sellingPrice * (1 - pct / 100)).toFixed(2)));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Target Promo Selling Price (GH₵)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={targetSellingPriceInput}
                      onChange={(e) => {
                        const targetVal = Number(e.target.value);
                        setTargetSellingPriceInput(targetVal);
                        if (editModalItem && editModalItem.sellingPrice > 0 && targetVal < editModalItem.sellingPrice) {
                          const autoPct = Number((((editModalItem.sellingPrice - targetVal) / editModalItem.sellingPrice) * 100).toFixed(1));
                          setPromoValue(autoPct);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-teal-500 rounded-xl font-mono font-bold text-teal-600 dark:text-teal-400"
                    />
                  </div>
                </div>
              )}

              {promoType === 'FIXED_AMOUNT' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Fixed Cash Amount Off (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={promoValue}
                    onChange={(e) => setPromoValue(Number(e.target.value))}
                    placeholder="e.g. 5.00 for GH₵ 5.00 OFF"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-rose-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Directly deducts GH₵ {promoValue || 0} off the item selling price during checkout.</p>
                </div>
              )}

              {promoType === 'TARGET_PRICE' && (
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Target Promotional Selling Price Override (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetSellingPriceInput}
                    onChange={(e) => setTargetSellingPriceInput(Number(e.target.value))}
                    placeholder="e.g. 15.00 for selling item at GH₵ 15.00"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-teal-500 rounded-xl font-mono font-bold text-teal-600 dark:text-teal-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Overrides standard price so item sells at exactly GH₵ {targetSellingPriceInput || 0} during campaign.</p>
                </div>
              )}

              {promoType === 'BOGO' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Buy Quantity (Required)</label>
                    <input
                      type="number"
                      min="1"
                      value={bogoBuyQty}
                      onChange={(e) => setBogoBuyQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Get Free Quantity (Free Units)</label>
                    <input
                      type="number"
                      min="1"
                      value={bogoGetQtyFree}
                      onChange={(e) => setBogoGetQtyFree(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-500 rounded-xl font-mono font-bold text-amber-600"
                    />
                  </div>
                </div>
              )}

              {/* Days of the Week Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">Active Days of the Week (Optional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                    const isSelected = promoDaysOfWeek.includes(idx);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          if (isSelected) {
                            setPromoDaysOfWeek(promoDaysOfWeek.filter(d => d !== idx));
                          } else {
                            setPromoDaysOfWeek([...promoDaysOfWeek, idx]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hour Range & Date Schedule */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={promoStartDate}
                    onChange={(e) => setPromoStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Start Hour (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={promoStartHour}
                    onChange={(e) => setPromoStartHour(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 14"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">End Hour (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={promoEndHour}
                    onChange={(e) => setPromoEndHour(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 18"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  {isSubmitting ? 'Saving Campaign...' : 'Save & Activate Promo Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
