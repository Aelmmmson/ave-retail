import React from 'react';
import {
  Store,
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
  Shield,
  Zap,
  CheckCircle2,
  Lock,
  Globe,
  Printer,
  Sparkles,
  Package,
  Clock,
  Users,
  BarChart3,
  Shirt,
  Utensils,
  Smartphone,
  Pill,
  Wrench,
  BookOpen,
  Boxes,
  Sun,
  Moon,
  LogIn,
  LogOut,
  UserPlus,
  ChevronRight,
  WifiOff,
  Database,
  RefreshCw
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

interface LandingViewProps {
  onEnterApp: (tab?: string) => void;
  onEnterDemo: () => void;
  onOpenAuth: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onEnterApp, onEnterDemo, onOpenAuth }) => {
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, user, logout } = useAuthStore();

  const industries = [
    {
      icon: Shirt,
      title: 'Fashion Boutiques & Apparel',
      desc: 'Barcode scanning, clothing variants, sizes, colors, and custom SKU management.'
    },
    {
      icon: ShoppingCart,
      title: 'Grocery Stores & Supermarkets',
      desc: 'High-speed checkout for packaged foods, provisions, beverages, and retail tax rules.'
    },
    {
      icon: Utensils,
      title: 'Food Vendors & Bakeries',
      desc: 'Quick cashier order entry for snack counters, food stalls, bakeries, and takeaway outlets.'
    },
    {
      icon: Smartphone,
      title: 'Electronics & Mobile Gadget Shops',
      desc: 'Track phones, accessories, spare parts, serials, and warranty sales.'
    },
    {
      icon: Pill,
      title: 'Pharmacies & Cosmetic Outlets',
      desc: 'Over-the-counter medicines, skincare, perfumes, and health products.'
    },
    {
      icon: Wrench,
      title: 'Hardware Stores & Auto Parts',
      desc: 'Building materials, spare parts, electrical supplies, and plumbing tools.'
    },
    {
      icon: BookOpen,
      title: 'Stationery & Bookshops',
      desc: 'School supplies, books, office stationery, and printing accessories.'
    },
    {
      icon: Boxes,
      title: 'Wholesale & General Merchants',
      desc: 'Multi-warehouse stock balances, bulk quantity retail, and store credit debt ledgers.'
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Real-Time WebSockets Engine (Socket.io)',
      desc: 'Instant event broadcasting (sale:created, stock:updated, shift:updated) syncing POS terminals and dashboards without page reloads.'
    },
    {
      icon: ShieldCheck,
      title: 'Preset Role Bundles & Module Switches',
      desc: 'Simplify staff management into OWNER, MANAGER, and CASHIER roles with toggleable Module Override Switches for Expenses, Inventory, and Reports.'
    },
    {
      icon: Globe,
      title: 'Multi-Branch & Warehouse Isolation',
      desc: 'Manage multiple retail store locations and stock warehouses under one business enterprise with an instant header switcher.'
    },
    {
      icon: Lock,
      title: 'Shift Drawer Reconciliation',
      desc: 'Opening float controls, cash movements (CASH_IN / CASH_OUT), and automated drawer variance calculations.'
    },
    {
      icon: Printer,
      title: 'Dual Thermal Printing & Drawer Trigger',
      desc: 'Native browser printing + direct ESC/POS binary driver + WebSerial RJ12 cash drawer pulse.'
    },
    {
      icon: Sparkles,
      title: 'Ghana Retail Tax & Multi-Currency',
      desc: 'Built-in support for VAT (15%), NHIL (2.5%), GETFund (2.5%), and GHS / USD tenders.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-urbanist transition-colors flex flex-col justify-between select-none">
      {/* 1. STANDALONE MARKETING NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={() => {
              onEnterApp('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-2.5 text-left group focus:outline-none cursor-pointer"
            title="Go to Home"
          >
            <div className="w-9 h-9 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/30 group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                Ave
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Retail Management
              </span>
            </div>
          </button>

          {/* Quick Nav Links */}
          <div className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#industries" className="hover:text-teal-600 dark:hover:text-teal-400 transition">Retail Industries</a>
            <a href="#features" className="hover:text-teal-600 dark:hover:text-teal-400 transition">Core Capabilities</a>
            <a href="#offline" className="hover:text-teal-600 dark:hover:text-teal-400 transition">Offline Resilience</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title={`Switch to ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="hidden sm:flex items-center space-x-2 text-left">
                  <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs uppercase">
                    {user.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-none">{user.name}</p>
                    <p className="text-[9px] text-teal-600 dark:text-teal-400 font-semibold">{user.organizationName || 'Ave Retail'}</p>
                  </div>
                </div>

                <button
                  onClick={() => onEnterApp('pos')}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition flex items-center space-x-1.5"
                >
                  <span>Enter POS Terminal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => logout()}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition flex items-center justify-center shadow-sm"
                  title="Sign Out of Account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onOpenAuth}
                  className="hidden sm:flex items-center space-x-1 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Business</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1">
        {/* Glow Effects */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-teal-500/10 dark:bg-teal-500/20 blur-3xl rounded-full pointer-events-none" />

        <div className="relative text-center space-y-6 max-w-3xl mx-auto">
          {/* Release Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Cash-First Retail Platform v1.4</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
            Modern Retail POS & Inventory Built for <span className="text-teal-600 dark:text-teal-400">Speed & Accuracy</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Empower cashiers, manage multi-branch stock, reconcile cash drawers, grant authorized discounts, and print thermal receipts with complete offline resilience.
          </p>

          {/* Hero CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => onEnterApp('pos')}
                  className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-teal-600/30 transition transform hover:-translate-y-0.5 flex items-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Launch POS Register</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onEnterApp('admin')}
                  className="px-6 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl border border-slate-300 dark:border-slate-700 shadow-md transition flex items-center space-x-1.5"
                >
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>Manage Business Admin</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-teal-600/30 transition transform hover:-translate-y-0.5 flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Your Business</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onEnterDemo}
                  className="px-6 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl border border-slate-300 dark:border-slate-700 shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-teal-600" />
                  <span>Try Demo Register</span>
                </button>
              </>
            )}

            <button
              onClick={() => onEnterApp('inventory')}
              className="px-5 py-3.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-sm transition flex items-center space-x-1.5"
            >
              <Package className="w-4 h-4" />
              <span>Explore Product Catalog</span>
            </button>
          </div>
        </div>

        {/* Hero Feature Badges Bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-center">
          <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
            <div className="text-xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">&lt; 50ms</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Barcode Keystroke Speed</div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">100%</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Sub-Unit Decimal Precision</div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">Multi-Branch</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Enterprise Branch Switcher</div>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900/80 border border-teal-500/30 rounded-2xl shadow-sm space-y-1">
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">Offline Sync</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">IndexedDB Idempotent Queue</div>
          </div>
        </div>
      </section>

      {/* 3. TARGET RETAIL BUSINESSES SHOWCASE */}
      <section id="industries" className="py-16 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Designed for All Retail Businesses
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Whether you operate a boutique, supermarket, quick-service food kiosk, or multi-location store chain, Ave adapts to your workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {industries.map((ind, idx) => {
              const Icon = ind.icon;
              return (
                <div
                  key={idx}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 hover:border-teal-500/50 transition group shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-600/10 dark:bg-teal-600/20 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition">
                    {ind.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {ind.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. KEY SYSTEM CAPABILITIES GRID */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Core Retail Architecture Features
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Engineered from the ground up for financial correctness, inventory control, and cashier shift reconciliation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600/10 dark:bg-teal-600/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{feat.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4.5 DEDICATED OFFLINE RESILIENCE SECTION */}
      <section id="offline" className="py-16 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <WifiOff className="w-4 h-4" />
              <span>100% Offline-First Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Zero Internet Interruption to Sales
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Power cuts or network drops will never stop your cashiers from checking out carts, issuing receipts, or opening cash drawers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">IndexedDB Local Persistence</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Product catalogs, customer ledgers, and local sales queues are stored directly in browser IndexedDB database for sub-millisecond retrieval.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Automatic Background Sync</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                When network connection returns, Ave automatically flushes queued offline sales to the central API idempotently without duplicate receipt numbers.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Hardware Independence</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Barcode scanners and thermal receipt printers communicate over local USB and serial drivers, requiring zero external server handshakes to operate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER CTA BANNER */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-3 max-w-2xl mx-auto">
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Upgrade Your Retail Operations?
            </h3>
            <p className="text-xs sm:text-sm text-teal-100 font-medium">
              Start processing fast cash sales, managing store credit, and printing thermal receipts immediately.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onEnterApp('pos')}
                className="px-6 py-3.5 bg-white text-teal-800 font-extrabold text-sm rounded-2xl hover:bg-teal-50 transition shadow-lg flex items-center space-x-2"
              >
                <ShoppingCart className="w-4 h-4 text-teal-700" />
                <span>Open POS Checkout Terminal</span>
              </button>

              {isAuthenticated ? (
                <button
                  onClick={() => onEnterApp('admin')}
                  className="px-6 py-3.5 bg-teal-900/60 hover:bg-teal-900 text-white font-bold text-sm rounded-2xl border border-teal-400/30 transition flex items-center space-x-1.5"
                >
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>Staff & Business Admin</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-3.5 bg-teal-900/60 hover:bg-teal-900 text-white font-bold text-sm rounded-2xl border border-teal-400/30 transition"
                >
                  Sign Up / Login
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. STANDALONE MARKETING FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-8 bg-white dark:bg-slate-900 transition-colors text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => {
              onEnterApp('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-2 text-left hover:opacity-80 transition cursor-pointer"
            title="Go to Home"
          >
            <div className="w-6 h-6 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <Store className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-200">Ave Retail Management</span>
            <span>— Cash-First POS Engine</span>
          </button>

          <div className="flex items-center space-x-6 text-[11px]">
            <span>Version 1.4.1</span>
            <button onClick={() => onEnterApp('pos')} className="hover:text-teal-600 dark:hover:text-teal-400 font-semibold">
              POS Terminal
            </button>
            <button onClick={() => onEnterApp('inventory')} className="hover:text-teal-600 dark:hover:text-teal-400 font-semibold">
              Inventory
            </button>
            <button onClick={onOpenAuth} className="hover:text-teal-600 dark:hover:text-teal-400 font-semibold">
              Account Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
