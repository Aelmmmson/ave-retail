import React, { useState } from 'react';
import { HelpCircle, Search, ShoppingBag, Package, ArrowRightLeft, Clock, Users, Printer, BarChart3, ShieldCheck, Scissors, ChevronRight, BookOpen, Sparkles, CheckCircle, Info, MessageSquare } from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: any;
  category: string;
  summary: string;
  content: Array<{
    heading: string;
    details: string;
    tips?: string[];
  }>;
}

export const HelpView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('pos');

  const helpSections: HelpSection[] = [
    {
      id: 'overview',
      title: 'System Overview & Architecture',
      icon: BookOpen,
      category: 'getting_started',
      summary: 'Learn the foundational concepts of Ave Retail, offline sales queue, and multi-branch setup.',
      content: [
        {
          heading: 'Core Architecture',
          details: 'Ave Retail is a modern, enterprise-grade Retail Management & POS platform built with React, Node.js, Express, and Prisma ORM. It supports multi-branch operations, real-time WebSocket updates, and multi-currency accounting.',
          tips: [
            'All data is automatically synchronized between your local browser register and the central database.',
            'Switch active store branches from the top navigation header bar.'
          ]
        },
        {
          heading: 'Offline Resiliency Queue',
          details: 'If internet connectivity is interrupted, POS checkout transactions are stored in an encrypted offline queue in local browser storage. Once connectivity returns, the queue automatically syncs sales back to the server without losing a single transaction.',
          tips: [
            'Check the green/gray Wifi status indicator in the top header bar to verify online sync state.'
          ]
        }
      ]
    },
    {
      id: 'pos',
      title: 'POS Checkout & Register Operations',
      icon: ShoppingBag,
      category: 'operations',
      summary: 'Barcode scanning, cart quantity limits, order discounts, BOGO promotions, and customer screen.',
      content: [
        {
          heading: 'Adding Items & Barcode Scanning',
          details: 'Search products by SKU, item name, or scan physical 1D/2D barcodes using a USB scanner or device webcam. Items are instantly added to the active checkout cart.',
          tips: [
            'Press Enter in the search bar after scanning a barcode for instant cart addition.',
            'Click the camera Scan icon in the search bar to activate webcam barcode scanning.'
          ]
        },
        {
          heading: 'Inventory Stock Capping & Limits',
          details: 'The POS system strictly validates available inventory stock. If an item has 3 units left in stock, attempting to add a 4th unit will trigger a Stock Threshold Warning toast and cap the cart quantity at available stock.',
          tips: [
            'Non-inventoried services or items with negative/untracked stock will not enforce stock limits.'
          ]
        },
        {
          heading: 'Automated BOGO (Buy One Get One) Promotions',
          details: 'When an item with an active BOGO promotional rule is added to the cart, the system automatically adds the free bonus units into the cart and applies a 100% line discount for the free quantity.',
          tips: [
            'Adding 1 bottle of Coke under a Buy 1 Get 1 Free deal automatically expands the cart to 2 bottles while charging for only 1.'
          ]
        },
        {
          heading: 'Order Discounts & Customer Facing Display',
          details: 'Apply cart-wide fixed or percentage discounts using the Order Discount button. Click "Customer Screen" in POS to open a secondary window designed for customer-facing dual-screen monitors.',
          tips: [
            'Customer Display defaults to Light Theme and dynamically matches your main system theme.'
          ]
        }
      ]
    },
    {
      id: 'catalog',
      title: 'Catalog & Inventory Management',
      icon: Package,
      category: 'operations',
      summary: 'Managing catalog items, multi-currency intake, reorder thresholds, and promo discount engine.',
      content: [
        {
          heading: 'Multi-Currency Product Intake',
          details: 'Products can be purchased in one cost currency (e.g. USD) and sold in another selling currency (e.g. GHS). The intake system logs historical cost rates so financial profit reports remain 100% accurate over time.',
          tips: [
            'Set cost and selling prices independently during product creation.'
          ]
        },
        {
          heading: 'Catalog Promotional Discount Engine',
          details: 'Create Percentage Off, Fixed Amount Off, Target Price, or BOGO deals with day-of-week restrictions (e.g., Tuesday-only BOGO sales) and start/end time schedules.',
          tips: [
            'Every active promotion displays a red flame pill badge on POS cards showing the promo name and percentage off on hover.'
          ]
        }
      ]
    },
    {
      id: 'transfers',
      title: 'Inter-Warehouse Stock Transfers',
      icon: ArrowRightLeft,
      category: 'operations',
      summary: '4-stage stock transfer workflow between central warehouses and branch outlets.',
      content: [
        {
          heading: '4-Stage Transfer Lifecycle',
          details: 'Stock transfers follow a strict 4-stage approval pipeline: REQUESTED ➔ APPROVED ➔ DISPATCHED ➔ RECEIVED (or CANCELLED).',
          tips: [
            'Stock is automatically deducted from the source warehouse upon Dispatch and credited to the destination warehouse upon Receipt acknowledgment.'
          ]
        }
      ]
    },
    {
      id: 'shifts',
      title: 'Cashier Shift Reconciliation & Manager Override',
      icon: Clock,
      category: 'operations',
      summary: 'Opening float, petty cash movements, drawer closing counts, and Manager PIN variance authorization.',
      content: [
        {
          heading: 'Opening Float & Cash Movements',
          details: 'Cashiers must open a shift by registering an opening drawer cash float before initiating sales. Log non-sale cash movements (Petty Cash out, Cash In additions) during the active shift.',
          tips: [
            'All non-sale cash movements update expected drawer cash in real time.'
          ]
        },
        {
          heading: 'Manager PIN Authorization on Cash Variances',
          details: 'When closing a shift, if counted physical cash differs from expected cash, the system blocks shift closure and requires a Manager Authorization PIN.',
          tips: [
            'The variance discrepancy and approving manager name are logged permanently into the Compliance Audit Trail.'
          ]
        }
      ]
    },
    {
      id: 'customers',
      title: 'Customer Directory & Debt Ledger',
      icon: Users,
      category: 'crm',
      summary: 'Customer profiles, loyalty rewards points, VIP tiers, store credit, and debt repayment ledgers.',
      content: [
        {
          heading: 'Loyalty Rewards Points & VIP Tiers',
          details: 'Customers earn loyalty points automatically at your store earn rate (e.g. 1 point per GH₵ 10 spent). Tier levels (BRONZE, SILVER, GOLD, PLATINUM) dynamically upgrade as points accumulate.',
          tips: [
            'Points can be redeemed at POS checkout for partial or full order payment.'
          ]
        },
        {
          heading: 'Store Credit & Debt Settlement',
          details: 'Allow trusted business customers to purchase goods on credit. Record debt repayments, credit notes, or manual balance adjustments in the Customer Ledger.',
          tips: [
            'Outstanding customer debt is displayed on customer cards and POS customer selectors.'
          ]
        }
      ]
    },
    {
      id: 'receipts',
      title: 'Customizable Thermal Receipt Builder',
      icon: Printer,
      category: 'settings',
      summary: 'ESC/POS thermal print settings, header notes, return policy footers, and 58mm/80mm roll width.',
      content: [
        {
          heading: 'Receipt Template Customizer',
          details: 'Customize store brand name, VAT registration number, contact phone numbers, store address, welcome header note, and return policy footer.',
          tips: [
            'Toggle between 80mm Standard thermal paper and 58mm Compact mini thermal paper roll widths.'
          ]
        }
      ]
    },
    {
      id: 'reports',
      title: 'Financial Reports & FX Rate Conversion',
      icon: BarChart3,
      category: 'accounting',
      summary: 'Profit & loss accounting, revenue breakdown, and temporary report exchange rate adjustments.',
      content: [
        {
          heading: 'Dynamic Multi-Currency Financial Reports',
          details: 'View sales revenue, gross margins, expense ledgers, and net profit converted dynamically into any configured currency using current or temporary custom report exchange rates.',
          tips: [
            'Product intake rates remain unchanged while report rates can be adjusted temporarily for financial reporting.'
          ]
        }
      ]
    },
    {
      id: 'services',
      title: 'Service Businesses & Barbershop Usage Guide',
      icon: Scissors,
      category: 'getting_started',
      summary: 'How barbershops, salons, repair shops, spas, and service businesses run Ave Retail.',
      content: [
        {
          heading: 'Running Ave Retail in Service Businesses',
          details: 'Ave Retail is 100% optimized for barbershops, beauty salons, auto repair shops, and consulting practices.',
          tips: [
            'Add services as catalog items (e.g. "Gentleman Haircut & Styling" @ GH₵ 50.00) without inventory stock tracking.',
            'Use the Staff Tip / Gratuity field during POS checkout to log client tips for barbers and stylists.',
            'Regular clients earn loyalty rewards points per haircut or service rendered.',
            'Customer debt ledgers allow regular clients to pay monthly subscription packages or settle bills later.'
          ]
        }
      ]
    }
  ];

  const filteredSections = helpSections.filter((section) => {
    const matchesCategory = activeCategory === 'all' || section.category === activeCategory;
    const matchesSearch =
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.some(
        (c) =>
          c.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.details.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  const activeSection = helpSections.find((s) => s.id === selectedSectionId) || helpSections[1];

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <HelpCircle className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>System Help & Knowledge Base Guide</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comprehensive documentation, feature walkthroughs, and operational guides for Ave Retail Management System.
          </p>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search help topics (e.g. bogo, shift, transfer, barbershop)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-sm"
          />
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Help Topics' },
          { id: 'getting_started', label: '🚀 Getting Started & Setup' },
          { id: 'operations', label: '🛒 POS & Store Operations' },
          { id: 'crm', label: '👥 CRM & Loyalty Rewards' },
          { id: 'accounting', label: '📊 Accounting & Reports' },
          { id: 'settings', label: '⚙️ Thermal Receipts & Config' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Left Nav list + Right Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Topic Selector List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl space-y-1 max-h-[75vh] overflow-y-auto">
          {filteredSections.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No matching help topics found. Try adjusting your search query.
            </div>
          ) : (
            filteredSections.map((sec) => {
              const IconComp = sec.icon;
              const isSelected = sec.id === activeSection.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`w-full text-left p-3 rounded-xl transition flex items-start space-x-3 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white font-bold shadow-lg shadow-teal-600/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-teal-700 text-white' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{sec.title}</div>
                    <div className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                      {sec.summary}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 mt-1 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Right Detailed Section Content */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              {React.createElement(activeSection.icon, { className: 'w-6 h-6' })}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Module Knowledge Guide</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{activeSection.title}</h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {activeSection.summary}
          </p>

          <div className="space-y-5 pt-2">
            {activeSection.content.map((block, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                  <span>{block.heading}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {block.details}
                </p>

                {block.tips && block.tips.length > 0 && (
                  <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl space-y-1.5 text-xs text-teal-800 dark:text-teal-200">
                    <span className="font-bold flex items-center space-x-1.5 text-[11px] uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                      <span>Pro Tips & Best Practices</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      {block.tips.map((tip, tIdx) => (
                        <li key={tIdx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Need further technical support or training assistance?</span>
            <span className="font-mono text-teal-600 dark:text-teal-400 font-bold">Ave Retail Helpdesk v2.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
