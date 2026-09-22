import React from 'react';
import { Sparkles, Layers, Tag, Gift, Percent, DollarSign } from 'lucide-react';

interface PromoBadgeListProps {
  promoRules?: any[];
  activePromoDiscount?: number;
  promoRule?: any;
  onOpenModal: () => void;
}

export const PromoBadgeList: React.FC<PromoBadgeListProps> = ({
  promoRules = [],
  activePromoDiscount,
  promoRule,
  onOpenModal
}) => {
  // Aggregate all valid rules
  const allRules: any[] = [];
  if (Array.isArray(promoRules) && promoRules.length > 0) {
    allRules.push(...promoRules);
  } else if (promoRule) {
    allRules.push(promoRule);
  } else if (activePromoDiscount && activePromoDiscount > 0) {
    allRules.push({
      name: `${activePromoDiscount}% Promotional Discount`,
      type: 'PERCENTAGE',
      value: activePromoDiscount,
      isActive: true
    });
  }

  if (allRules.length === 0) return null;

  const firstRule = allRules[0];
  const extraCount = allRules.length - 1;

  const getRuleLabel = (r: any) => {
    if (r.name && r.name !== 'PERCENTAGE Promotion') {
      return r.name;
    }
    if (r.type === 'BOGO') {
      return `BUY ${r.buyQty || 1} GET ${r.getQtyFree || 1} FREE`;
    }
    if (r.type === 'PERCENTAGE' || r.value) {
      return `${r.value || r.percentage}% OFF`;
    }
    return `${r.type} PROMO`;
  };

  const getRuleBadgeStyle = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'BOGO': return 'bg-indigo-600 text-white shadow-indigo-500/20';
      case 'FIXED_AMOUNT': return 'bg-emerald-600 text-white shadow-emerald-500/20';
      case 'TARGET_PRICE': return 'bg-amber-500 text-slate-950 font-bold shadow-amber-500/20';
      default: return 'bg-rose-500 text-white shadow-rose-500/20';
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 select-none">
      {/* Primary Promo Rule Badge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenModal();
        }}
        className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md shadow-sm inline-flex items-center space-x-1 max-w-[170px] transition hover:opacity-90 cursor-pointer ${getRuleBadgeStyle(firstRule.type)}`}
      >
        <span>{firstRule.type === 'BOGO' ? '🎁' : '🔥'}</span>
        <span className="truncate">{getRuleLabel(firstRule)}</span>
      </button>

      {/* +N More Deals Pill Button */}
      {extraCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal();
          }}
          className="text-[9.5px] bg-teal-600 text-white font-extrabold px-1.5 py-0.5 rounded-md shadow-sm hover:bg-teal-500 transition inline-flex items-center space-x-1 cursor-pointer animate-pulse"
          title={`Click to view all ${allRules.length} active promotional discounts on this item`}
        >
          <Layers className="w-2.5 h-2.5" />
          <span>+{extraCount} Deals</span>
        </button>
      )}
    </div>
  );
};
