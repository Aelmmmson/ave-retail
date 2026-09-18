import React, { useState } from 'react';
import { ShoppingBag, Lock, DollarSign, Wifi, WifiOff, Sun, Moon, Menu, Store, ChevronDown, Plus, LogOut, LogIn, Home } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  isOnline,
  onToggleMobileMenu,
  onOpenAuthModal
}) => {
  const { currency, currencies, setCurrency, activeShiftId } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout, currentBranch, branches, switchBranch, setBranches } = useAuthStore();
  const { showToast } = useAlertStore();

  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [newBranchModalOpen, setNewBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');

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

          {/* Multi-Branch Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="max-w-[120px] sm:max-w-[180px] truncate">Branch: {currentBranch?.name || 'Main Branch'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {branchDropdownOpen && (
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

          {/* Base Currency Indicator (Default Store Currency: GHS) */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="text-teal-600 dark:text-teal-400 font-mono">GH₵</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Base</span>
          </div>

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
