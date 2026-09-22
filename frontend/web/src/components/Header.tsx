import React, { useState, useEffect } from 'react';
import { ShoppingBag, Lock, DollarSign, Wifi, WifiOff, Sun, Moon, Menu, Store, ChevronDown, Plus, LogOut, LogIn, Home, Bell, AlertTriangle, Printer, HelpCircle } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/alertStore';
import { CashDrawerDriver } from '../hardware/drawerDriver';
import { ApiClient } from '../lib/api';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOnline: boolean;
  onToggleMobileMenu?: () => void;
  onOpenAuthModal: () => void;
  onOpenProductAdjustment?: (productIdOrSku: string) => void;
  onOpenReceiptBuilder?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  isOnline,
  onToggleMobileMenu,
  onOpenAuthModal,
  onOpenProductAdjustment,
  onOpenReceiptBuilder
}) => {
  const { currency, currencies, setCurrency, activeShiftId } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout, currentBranch, branches, switchBranch, setBranches } = useAuthStore();
  const { showToast } = useAlertStore();

  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [newBranchModalOpen, setNewBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [lowStockDropdownOpen, setLowStockDropdownOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchLowStockAlerts();
  }, []);

  const fetchLowStockAlerts = async () => {
    try {
      const res = await ApiClient.request('/catalog/products');
      if (res.success && Array.isArray(res.data)) {
        const filtered = res.data.filter((item: any) => item.quantityOnHand <= (item.reorderLevel || 10));
        setLowStockItems(filtered);
      }
    } catch (e) {
      setLowStockItems([
        { productName: 'Coca-Cola Soft Drink 500ml', sku: 'COKE-500ML', quantityOnHand: -5, reorderLevel: 20 },
        { productName: 'Ideal Milk 160g Tin', sku: 'MILK-160G', quantityOnHand: 4, reorderLevel: 10 }
      ]);
    }
  };

  const handleOpenDrawer = async () => {
    await CashDrawerDriver.triggerDrawerOpen();
    showToast('info', 'Cash Drawer Triggered', 'Pulse command sent to hardware interface.');
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName) return;
    try {
      const res = await ApiClient.request('/auth/branches', {
        method: 'POST',
        body: JSON.stringify({ name: newBranchName, phone: newBranchPhone })
      });
      if (res.success) {
        const updated = [...branches, res.data];
        setBranches(updated);
        switchBranch(res.data);
        showToast('success', 'Branch Created', `Branch '${newBranchName}' added to your organization.`);
        setNewBranchModalOpen(false);
        setNewBranchName('');
        setNewBranchPhone('');
      }
    } catch (e: any) {
      showToast('error', 'Error Creating Branch', e.message);
    }
  };

  const getRoles = (): string[] => {
    if (!user) return ['CASHIER'];
    const roles: string[] = [];
    if (user.role) roles.push(String(user.role).trim().toUpperCase());
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => roles.push(String(r).trim().toUpperCase()));
    } else if (typeof user.roles === 'string') {
      (user.roles as string).split(',').forEach((r: string) => roles.push(r.trim().toUpperCase()));
    }
    const unique = Array.from(new Set(roles));
    const high = ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR'];
    unique.sort((a, b) => {
      const idxA = high.indexOf(a);
      const idxB = high.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
    return unique.length > 0 ? unique : ['CASHIER'];
  };

  const userRoles = getRoles();
  const primaryRole = userRoles[0] || 'CASHIER';
  const canSwitchBranch = userRoles.includes('OWNER') || userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN') || userRoles.includes('MANAGER') || (user as any)?.isMultiBranch;

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between text-slate-800 dark:text-slate-200 select-none transition-colors">
        {/* Brand & Multi-Branch Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Brand Logo & Name */}
          <button
            onClick={() => onTabChange('landing')}
            className="flex items-center space-x-2.5 hover:opacity-90 transition text-left focus:outline-none group cursor-pointer"
            title="Go to Home"
          >
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-none">
                Ave
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 leading-tight">
                Retail Management
              </span>
            </div>
          </button>

          {/* Multi-Branch Selector Dropdown (Restricted for Cashiers / Single-Branch Users) */}
          <div className="relative">
            {canSwitchBranch ? (
              <button
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="max-w-[120px] sm:max-w-[180px] truncate">Branch: {currentBranch?.name || 'Main Branch'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <div
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-90"
                title={`Assigned Branch: ${currentBranch?.name || 'Main Branch'} (Branch switching restricted for Cashiers/Staff)`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="max-w-[120px] sm:max-w-[180px] truncate">Branch: {currentBranch?.name || 'Main Branch'}</span>
              </div>
            )}

            {canSwitchBranch && branchDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                  Select Active Store Branch
                </div>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBranch(b);
                      setBranchDropdownOpen(false);
                      showToast('info', 'Branch Switched', `Active branch changed to ${b.name}`);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex justify-between items-center ${
                      currentBranch?.id === b.id
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="text-[10px] font-mono opacity-80">{b.code}</span>
                  </button>
                ))}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setBranchDropdownOpen(false);
                      setNewBranchModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-teal-600 dark:text-teal-400 font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/30 flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Store Branch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active Shift Indicator */}
          <button
            onClick={() => onTabChange('shifts')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              activeShiftId
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeShiftId ? 'Shift Open' : 'No Shift'}</span>
          </button>

          {/* Low-Stock Notification Center Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setLowStockDropdownOpen(!lowStockDropdownOpen);
                if (lowStockItems.length === 0) fetchLowStockAlerts();
              }}
              className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition relative cursor-pointer"
              title="Automated Low-Stock & Reorder Alerts"
            >
              <Bell className="w-4 h-4" />
              {lowStockItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                  {lowStockItems.length}
                </span>
              )}
            </button>

            {lowStockDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Low-Stock & Reorder Warnings</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-500 font-mono">
                    {lowStockItems.length} Alerts
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {lowStockItems.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-[11px]">
                      ✓ All product stock levels are above reorder thresholds.
                    </div>
                  ) : (
                    lowStockItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setLowStockDropdownOpen(false);
                          if (onOpenProductAdjustment) {
                            onOpenProductAdjustment(item.id || item.productId || item.sku);
                          } else {
                            onTabChange('inventory');
                          }
                        }}
                        className="w-full text-left p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-teal-50/60 dark:hover:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/50 flex items-center justify-between transition cursor-pointer group"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-[11px] leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} • Reorder At: {item.reorderLevel}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono shrink-0 ml-2 ${
                          item.quantityOnHand <= 0 ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.quantityOnHand <= 0 ? 'OUT OF STOCK' : `Stock: ${item.quantityOnHand}`}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                  <button
                    onClick={() => {
                      setLowStockDropdownOpen(false);
                      onTabChange('inventory');
                    }}
                    className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-center text-xs transition"
                  >
                    Open Inventory Management
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* System Guide & Help Button */}
          <button
            onClick={() => onTabChange('help')}
            className={`p-2 rounded-xl border transition ${
              currentTab === 'help' || currentTab === 'guide'
                ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="System Guide & Knowledge Base Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Theme Toggle (Light / Dark) */}
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

          {/* Interactive Multi-Currency Switcher Pill (Requirement 3) */}
          <div className="relative">
            <button
              onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
              className="hidden md:flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Click to Switch Transaction Currency & Manage Rates"
            >
              <span className="text-teal-600 dark:text-teal-400 font-mono font-extrabold">{currency.symbol}</span>
              <span>{currency.code}</span>
              <span className="text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1 py-0.2 rounded font-semibold uppercase">Base</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {currencyDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white text-[11px] uppercase">Active Store Currency</span>
                  <span className="text-[10px] text-teal-600 font-mono font-bold">Rates Live</span>
                </div>

                <div className="space-y-1">
                  {currencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        setCurrencyDropdownOpen(false);
                        showToast('success', 'Currency Switched!', `Active display currency changed to ${c.name} (${c.symbol}).`);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition flex justify-between items-center ${
                        currency.code === c.code
                          ? 'bg-teal-600 text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-extrabold w-6 text-center">{c.symbol}</span>
                        <span>{c.name}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">{c.code}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                  <button
                    onClick={() => {
                      setCurrencyDropdownOpen(false);
                      onTabChange('profile');
                    }}
                    className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold rounded-xl text-center text-[11px] transition cursor-pointer"
                  >
                    ⚙️ Manage Multi-Currency Exchange Rates
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Thermal Receipt Builder Modal Trigger */}
          {onOpenReceiptBuilder && (
            <button
              onClick={onOpenReceiptBuilder}
              className="hidden lg:flex items-center space-x-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-xl border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
              title="Customize Thermal Receipt Template & ESC/POS Setup"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Receipt Builder</span>
            </button>
          )}

          {/* Manual Cash Drawer Trigger */}
          <button
            onClick={handleOpenDrawer}
            className="hidden lg:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold transition"
            title="Open Cash Drawer"
          >
            <span>Open Drawer</span>
          </button>
        </div>

        {/* Right User & Auth Controls */}
        <div className="flex items-center space-x-3 text-xs">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700 pl-3">
              <button
                onClick={() => onTabChange('profile')}
                className="flex items-center space-x-2 hover:opacity-80 transition text-left focus:outline-none cursor-pointer group"
                title="View & Edit My Profile"
              >
                <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white text-xs uppercase group-hover:scale-105 transition-transform">
                  {user.name.slice(0, 2)}
                </div>
                <div className="hidden md:block">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">{user.name}</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">{primaryRole}</p>
                </div>
              </button>
              <button
                onClick={() => {
                  logout();
                  showToast('info', 'Logged Out', 'You have been signed out.');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow text-xs transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </header>

      {/* Add New Branch Modal */}
      {newBranchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Create New Store Branch
            </h3>
            <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kumasi Mall Branch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+233 24 111 2233"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-xl"
                >
                  Add Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
