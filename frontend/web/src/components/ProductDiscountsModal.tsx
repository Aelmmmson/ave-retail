import React from 'react';
import { Tag, Sparkles, Calendar, Clock, CheckCircle2, X, Gift, Percent, DollarSign, Target } from 'lucide-react';
import { formatMoney } from '@ave/shared';

interface ProductDiscountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  variantName?: string;
  sku: string;
  sellingPrice: number;
  promoRules: any[];
}

export const ProductDiscountsModal: React.FC<ProductDiscountsModalProps> = ({
  isOpen,
  onClose,
  productName,
  variantName,
  sku,
  sellingPrice,
  promoRules
}) => {
  if (!isOpen) return null;

  const getRuleIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'PERCENTAGE': return <Percent className="w-4 h-4 text-rose-500" />;
      case 'FIXED_AMOUNT': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'TARGET_PRICE': return <Target className="w-4 h-4 text-amber-500" />;
      case 'BOGO': return <Gift className="w-4 h-4 text-indigo-500" />;
      default: return <Tag className="w-4 h-4 text-teal-500" />;
    }
  };

  const getRuleBadgeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'PERCENTAGE': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'FIXED_AMOUNT': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'TARGET_PRICE': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'BOGO': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      default: return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30';
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
              <Sparkles className="w-4 h-4" />
              <span>Applied Promotional Campaigns</span>
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
              {productName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              SKU: {sku} • Standard Price: {formatMoney(sellingPrice, 'GH₵')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Applied Promo Rules List */}
        <div className="space-y-3">
          {promoRules.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No active promotional discounts currently configured for this product.
            </div>
          ) : (
            promoRules.map((rule, idx) => {
              const ruleName = rule.name || rule.title || `Promotional Discount #${idx + 1}`;
              const ruleType = rule.type || 'PERCENTAGE';
              const days = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek.map(Number) : [];

              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 transition hover:border-teal-500/40"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-xl border ${getRuleBadgeColor(ruleType)}`}>
                        {getRuleIcon(ruleType)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {ruleName}
                        </h4>
                        <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block mt-0.5 ${getRuleBadgeColor(ruleType)}`}>
                          {ruleType === 'BOGO' ? `BUY ${rule.buyQty || 1} GET ${rule.getQtyFree || 1} FREE` : `${ruleType} PROMO`}
                        </span>
                      </div>
                    </div>

                    <span className="flex items-center space-x-1 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ACTIVE</span>
                    </span>
                  </div>

                  {/* Value / Benefit Explanation */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {ruleType === 'PERCENTAGE' && (
                      <span>🔥 <strong>{rule.value || rule.percentage}% OFF</strong> standard selling price per unit.</span>
                    )}
                    {ruleType === 'FIXED_AMOUNT' && (
                      <span>🏷️ <strong>GH₵ {Number(rule.value || 0).toFixed(2)} OFF</strong> flat discount per unit.</span>
                    )}
                    {ruleType === 'TARGET_PRICE' && (
                      <span>🎯 Fixed Promo Selling Price: <strong>GH₵ {Number(rule.value || 0).toFixed(2)}</strong> per unit.</span>
                    )}
                    {ruleType === 'BOGO' && (
                      <span>🎁 Buy <strong>{rule.buyQty || 1}</strong> unit(s), get <strong>{rule.getQtyFree || 1}</strong> unit(s) <strong>100% FREE</strong>.</span>
                    )}
                  </div>

                  {/* Schedule & Days Subset Info */}
                  <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400 pt-1">
                    {days.length > 0 ? (
                      <div className="flex items-center space-x-1 text-teal-600 dark:text-teal-400 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Days: {days.map(d => dayNames[d]).join(', ')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Valid Every Day (Mon-Sun)</span>
                      </div>
                    )}

                    {(rule.startHour !== undefined && rule.endHour !== undefined && rule.startHour !== '' && rule.endHour !== '') && (
                      <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Hours: {rule.startHour}:00 - {rule.endHour}:00</span>
                      </div>
                    )}

                    {rule.startDate && (
                      <span className="font-mono text-[10px]">From: {new Date(rule.startDate).toLocaleDateString()}</span>
                    )}
                    {rule.endDate && (
                      <span className="font-mono text-[10px]">To: {new Date(rule.endDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center text-xs">
          <span className="text-slate-400">Total Active Rules: <strong>{promoRules.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow transition cursor-pointer"
          >
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
