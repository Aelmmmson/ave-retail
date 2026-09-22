import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Key,
  Edit3,
  Check,
  ShoppingBag,
  ShoppingCart,
  Clock,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Store,
  Lock,
  Eye,
  EyeOff,
  Coins,
  Percent,
  Plus,
  Trash2,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { useCartStore } from '../../store/cartStore';
import { ApiClient } from '../../lib/api';

export const ProfileView: React.FC = () => {
  const { user, currentBranch, login, branches } = useAuthStore();
  const { showToast } = useAlertStore();
  const { taxPayer, setTaxPayer, setTaxRates: setGlobalTaxRates } = useCartStore();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tax Rates & Multi-Currency Management State (CRUD Option 5)
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxRates, setTaxRates] = useState([
    { id: 't1', code: 'VAT', name: 'Value Added Tax (VAT)', ratePercent: 15.0, isActive: true },
    { id: 't2', code: 'NHIL', name: 'National Health Insurance Levy', ratePercent: 2.5, isActive: true },
    { id: 't3', code: 'GETFUND', name: 'GETFund Levy', ratePercent: 2.5, isActive: true }
  ]);
  const [newTaxCode, setNewTaxCode] = useState('');
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState(0);

  const [currencies, setCurrencies] = useState([
    { code: 'GHS', symbol: 'GH₵', name: 'Ghana Cedi', exchangeRateToBase: 1.0, isBaseCurrency: true },
    { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRateToBase: 15.8, isBaseCurrency: false },
    { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToBase: 17.2, isBaseCurrency: false }
  ]);
  const [newCurrCode, setNewCurrCode] = useState('');
  const [newCurrSymbol, setNewCurrSymbol] = useState('');
  const [newCurrName, setNewCurrName] = useState('');
  const [newCurrRate, setNewCurrRate] = useState(1.0);

  // Inline Edit Tax state
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [editTaxName, setEditTaxName] = useState('');
  const [editTaxRate, setEditTaxRate] = useState<number>(0);

  // Inline Edit Currency state
  const [editingCurrCode, setEditingCurrCode] = useState<string | null>(null);
  const [editCurrName, setEditCurrName] = useState('');
  const [editCurrSymbol, setEditCurrSymbol] = useState('');
  const [editCurrRate, setEditCurrRate] = useState<number>(1.0);

  // Extract roles array with role hierarchy prioritization
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
  const userPermissions = (user?.permissions || []).map(p => String(p).toLowerCase().trim());

  // Helper check if module is accessible
  const hasAccess = (moduleId: string): boolean => {
    if (userRoles.includes('OWNER') || userRoles.includes('ADMIN')) return true;
    if (userPermissions.includes(moduleId.toLowerCase())) return true;
    if (moduleId === 'pos' || moduleId === 'shifts') return true;
    return false;
  };

  const modules = [
    {
      id: 'pos',
      label: 'POS Register Checkout',
      icon: ShoppingCart,
      desc: 'Process customer cash/Momo sales, scan barcodes, issue receipts & open till drawer.'
    },
    {
      id: 'shifts',
      label: 'Cashier Shifts & Floats',
      icon: Clock,
      desc: 'Open float drawers, track cash movements (CASH_IN/OUT), and reconcile drawer shifts.'
    },
    {
      id: 'inventory',
      label: 'Product Catalog & Stock',
      icon: Package,
      desc: 'Manage products, SKUs, prices, stock-in adjustments, and warehouse stock balances.'
    },
    {
      id: 'customers',
      label: 'Customer Credit Ledger',
      icon: Users,
      desc: 'Track customer debt accounts, issue store credit sales, and log debt repayments.'
    },
    {
      id: 'expenses',
      label: 'Store Operating Expenses',
      icon: DollarSign,
      desc: 'Log store rent, utility bills, salaries, transport, and petty cash operational costs.'
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      desc: 'View sales revenue reports, profit margins, inventory valuation, and till summaries.'
    },
    {
      id: 'admin',
      label: 'Staff & Branch Admin',
      icon: Shield,
      desc: 'Manage staff accounts, assign preset roles, toggle module switches, and add store branches.'
    }
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      showToast('error', 'Password Mismatch', 'New password and confirm password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          phone,
          ...(newPassword ? { password: newPassword } : {})
        })
      });

      if (res.success) {
        // Update user state in authStore
        const token = localStorage.getItem('ave_token') || '';
        login({ ...user, ...res.data }, token, branches);
        showToast('success', 'Profile Updated', 'Your personal account details have been updated successfully.');
        setEditModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 select-none">
      {/* 1. TOP HERO PROFILE HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Avatar Badge */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center font-extrabold text-2xl sm:text-3xl text-white shadow-xl shadow-teal-600/30 border-2 border-white/20 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">{user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {primaryRole}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-teal-300/80 font-semibold">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>{user?.organizationName || 'Ave Retail Enterprise'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Store className="w-3.5 h-3.5 text-teal-400" />
                  <span>{currentBranch?.name || 'Main Branch'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTaxModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center space-x-2 border border-teal-500/30 cursor-pointer"
            >
              <Percent className="w-4 h-4 text-teal-400" />
              <span>Tax & Multi-Currency</span>
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-teal-600/30 transition flex items-center space-x-2 border border-teal-400/30 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile Info</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. GRID INFO SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Account Information */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Personal Account Details</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active Account
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{user?.name}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{user?.email}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{user?.phone || 'Not provided'}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Store Branch</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentBranch?.name || 'Main Branch'}</span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Security Credential</span>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-mono font-semibold">Protected Password</span>
            </div>
          </div>
        </div>

        {/* Assigned System Roles & Business Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Assigned Roles & Enterprise</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">RBAC Security</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium block mb-1.5">Assigned System Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {userRoles.map((r, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Enterprise Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{user?.organizationName || 'Ave Retail Enterprise'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tax ID / TIN</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{user?.taxNumber || 'TIN-GH-998877'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Store Physical Address</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">{user?.address || 'Main Commercial District'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AUTHORIZED SYSTEM MODULES & PERMISSIONS GRID */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Key className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>My Authorized System Modules & Permissions</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Permissions are assigned by business owners and admins via staff role presets and module override switches.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 shrink-0">
            {userRoles.includes('OWNER') || userRoles.includes('ADMIN') ? 'Full System Access' : 'Granular Access'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const allowed = hasAccess(mod.id);
            return (
              <div
                key={mod.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-2 ${
                  allowed
                    ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl ${
                      allowed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{mod.label}</h4>
                  </div>

                  {allowed ? (
                    <span className="flex items-center space-x-1 text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Allowed</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[10px] font-extrabold uppercase text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>Restricted</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {mod.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. EDIT PROFILE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-teal-600" />
                <span>Edit Personal Profile Information</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-rose-500 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+233 24 111 2233"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
                <span className="block font-bold text-slate-900 dark:text-white text-xs">Change Account Password (Optional)</span>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Leave blank to keep current password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {newPassword && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow"
                >
                  {submitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 5. TAX RATES & MULTI-CURRENCY CRUD MANAGEMENT MODAL */}
      {taxModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Percent className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Tax Rates & Multi-Currency Management</span>
              </h3>
              <button onClick={() => setTaxModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer font-bold">✕</button>
            </div>

            {/* SECTION 0: Tax Payment Responsibility (Who Pays Taxes: Customer vs Business) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">Tax Payment Responsibility (Who Pays Taxes)</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono ${
                  taxPayer === 'BUSINESS'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                }`}>
                  {taxPayer === 'BUSINESS' ? 'BUSINESS COVERS TAX' : 'CUSTOMER PAYS TAX'}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose who pays for system tax levies. Regardless of selection, statutory tax breakdowns (VAT, NHIL, GETFund) will always be printed on checkout receipts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTaxPayer('CUSTOMER');
                    showToast('info', 'Tax Responsibility Set', 'Customer Pays Tax: Taxes are added on top of cart subtotal at checkout.');
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start space-x-3 ${
                    taxPayer === 'CUSTOMER'
                      ? 'bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-100 shadow-md ring-1 ring-teal-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${taxPayer === 'CUSTOMER' ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center space-x-1">
                      <span>Customer Pays Tax</span>
                      <span className="text-[10px] font-mono opacity-80">(Exclusive)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Taxes are added onto cart subtotal. Total = Subtotal + Taxes.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaxPayer('BUSINESS');
                    showToast('info', 'Tax Responsibility Set', 'Business Covers Tax: Taxes are absorbed by store; customer pays item price only.');
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start space-x-3 ${
                    taxPayer === 'BUSINESS'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-100 shadow-md ring-1 ring-amber-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${taxPayer === 'BUSINESS' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center space-x-1">
                      <span>Business Covers Tax</span>
                      <span className="text-[10px] font-mono opacity-80">(Inclusive)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Taxes are absorbed from item selling price. Tax breakdown appears on receipts.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* SECTION A: Tax Rates CRUD */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center space-x-1.5">
                <Percent className="w-3.5 h-3.5" />
                <span>Configured System Tax Rates</span>
              </h4>

              {/* Quick Preset Pickers for Common Tax Rates */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Quick Presets:</span>
                {[
                  { code: 'VAT', name: 'Value Added Tax', rate: 15.0 },
                  { code: 'NHIL', name: 'National Health Insurance Levy', rate: 2.5 },
                  { code: 'GETFUND', name: 'GETFund Levy', rate: 2.5 },
                  { code: 'WHT', name: 'Withholding Tax', rate: 7.5 }
                ].map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => {
                      setNewTaxCode(p.code);
                      setNewTaxName(p.name);
                      setNewTaxRate(p.rate);
                    }}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-500/20 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                  >
                    + {p.code} ({p.rate}%)
                  </button>
                ))}
              </div>

              {/* Add Tax Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaxCode || !newTaxName) return;
                  setTaxRates([...taxRates, { id: `t-${Date.now()}`, code: newTaxCode.toUpperCase(), name: newTaxName, ratePercent: Number(newTaxRate), isActive: true }]);
                  showToast('success', 'Tax Rate Created', `Tax '${newTaxCode}' (${newTaxRate}%) added.`);
                  setNewTaxCode('');
                  setNewTaxName('');
                  setNewTaxRate(0);
                }}
                className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs"
              >
                <input
                  type="text"
                  required
                  placeholder="Code (e.g. VAT)"
                  value={newTaxCode}
                  onChange={(e) => setNewTaxCode(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                />
                <input
                  type="text"
                  required
                  placeholder="Tax Name (e.g. Value Added Tax)"
                  value={newTaxName}
                  onChange={(e) => setNewTaxName(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px]"
                />
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Rate (15)"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(Number(e.target.value))}
                    className="w-full pl-2.5 pr-6 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                  />
                  <span className="absolute right-2 text-slate-400 font-bold text-xs">%</span>
                </div>
                <button type="submit" className="py-1.5 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-500 transition cursor-pointer">
                  + Add Tax Rate
                </button>
              </form>

              {/* Tax Rates List Table */}
              <div className="space-y-1.5">
                {taxRates.map((t) => (
                  <div key={t.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    {editingTaxId === t.id ? (
                      <div className="flex-1 flex items-center space-x-2 mr-2">
                        <span className="font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-1 rounded text-[10px]">{t.code}</span>
                        <input
                          type="text"
                          value={editTaxName}
                          onChange={(e) => setEditTaxName(e.target.value)}
                          className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs flex-1"
                          placeholder="Tax Name"
                        />
                        <div className="relative flex items-center w-24">
                          <input
                            type="number"
                            step="0.01"
                            value={editTaxRate}
                            onChange={(e) => setEditTaxRate(Number(e.target.value))}
                            className="w-full pl-2 pr-5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                            placeholder="Rate %"
                          />
                          <span className="absolute right-1.5 text-slate-400 font-bold text-xs">%</span>
                        </div>
                        <button
                          onClick={() => {
                            setTaxRates(taxRates.map(x => x.id === t.id ? { ...x, name: editTaxName, ratePercent: editTaxRate } : x));
                            setEditingTaxId(null);
                            showToast('success', 'Tax Updated', `Updated '${t.code}' tax settings.`);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTaxId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded text-[10px]">{t.code}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{t.name}</span>
                          <span className="font-mono text-slate-500">({t.ratePercent}%)</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingTaxId(t.id);
                              setEditTaxName(t.name);
                              setEditTaxRate(t.ratePercent);
                            }}
                            className="p-1 text-teal-600 hover:bg-teal-500/10 rounded cursor-pointer"
                            title="Edit Tax Rate"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setTaxRates(taxRates.map(x => x.id === t.id ? { ...x, isActive: !x.isActive } : x));
                              showToast('info', 'Tax Status Switched', `'${t.name}' is now ${!t.isActive ? 'Active' : 'Inactive'}.`);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                              t.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            {t.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                          <button
                            onClick={() => {
                              setTaxRates(taxRates.filter(x => x.id !== t.id));
                              showToast('info', 'Tax Deleted', `Deleted '${t.name}'.`);
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION B: Multi-Currency CRUD */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center space-x-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Multi-Currency Exchange Rates</span>
              </h4>

              {/* Quick Preset Pickers for Common Currencies */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Quick Presets:</span>
                {[
                  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 15.8 },
                  { code: 'EUR', symbol: '€', name: 'Euro', rate: 17.2 },
                  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 20.5 },
                  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rate: 0.01 },
                  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rate: 0.12 },
                  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rate: 4.30 },
                  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (RMB)', rate: 2.22 },
                  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 11.5 }
                ].map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => {
                      setNewCurrCode(p.code);
                      setNewCurrSymbol(p.symbol);
                      setNewCurrName(p.name);
                      setNewCurrRate(p.rate);
                    }}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-500/20 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                  >
                    + {p.code} ({p.symbol})
                  </button>
                ))}
              </div>

              {/* Add Currency Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCurrCode || !newCurrSymbol) return;
                  setCurrencies([...currencies, { code: newCurrCode.toUpperCase(), symbol: newCurrSymbol, name: newCurrName || newCurrCode, exchangeRateToBase: Number(newCurrRate) || 1.0, isBaseCurrency: false }]);
                  showToast('success', 'Currency Added', `Currency ${newCurrCode} (${newCurrSymbol}) added.`);
                  setNewCurrCode('');
                  setNewCurrSymbol('');
                  setNewCurrName('');
                  setNewCurrRate(1.0);
                }}
                className="grid grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs"
              >
                <input
                  type="text"
                  required
                  placeholder="Code (USD)"
                  value={newCurrCode}
                  onChange={(e) => setNewCurrCode(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                />
                <input
                  type="text"
                  required
                  placeholder="Symbol ($)"
                  value={newCurrSymbol}
                  onChange={(e) => setNewCurrSymbol(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                />
                <input
                  type="text"
                  placeholder="Name (US Dollar)"
                  value={newCurrName}
                  onChange={(e) => setNewCurrName(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px]"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Rate to GHS"
                  value={newCurrRate}
                  onChange={(e) => setNewCurrRate(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                />
                <button type="submit" className="py-1.5 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-500 transition cursor-pointer">
                  + Add Currency
                </button>
              </form>

              {/* Currency List Table */}
              <div className="space-y-1.5">
                {currencies.map((c) => (
                  <div key={c.code} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    {editingCurrCode === c.code ? (
                      <div className="flex-1 flex items-center space-x-2 mr-2">
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{c.code}</span>
                        <input
                          type="text"
                          value={editCurrSymbol}
                          onChange={(e) => setEditCurrSymbol(e.target.value)}
                          className="w-12 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-center"
                          placeholder="Symbol"
                        />
                        <input
                          type="text"
                          value={editCurrName}
                          onChange={(e) => setEditCurrName(e.target.value)}
                          className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs flex-1"
                          placeholder="Currency Name"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={editCurrRate}
                          onChange={(e) => setEditCurrRate(Number(e.target.value))}
                          className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                          placeholder="Exchange Rate"
                        />
                        <button
                          onClick={() => {
                            setCurrencies(currencies.map(x => x.code === c.code ? { ...x, symbol: editCurrSymbol, name: editCurrName, exchangeRateToBase: editCurrRate } : x));
                            setEditingCurrCode(null);
                            showToast('success', 'Currency Updated', `Updated '${c.code}' exchange rate.`);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCurrCode(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="font-bold text-teal-600 dark:text-teal-400">{c.symbol}</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{c.code}</span>
                          <span className="text-[11px] text-slate-500">({c.name})</span>
                          {c.isBaseCurrency && <span className="bg-emerald-500/20 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded font-bold">BASE</span>}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mr-1">1 {c.code} = {c.exchangeRateToBase} GHS</span>
                          <button
                            onClick={() => {
                              setEditingCurrCode(c.code);
                              setEditCurrSymbol(c.symbol);
                              setEditCurrName(c.name);
                              setEditCurrRate(c.exchangeRateToBase);
                            }}
                            className="p-1 text-teal-600 hover:bg-teal-500/10 rounded cursor-pointer"
                            title="Edit Exchange Rate"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!c.isBaseCurrency && (
                            <button
                              onClick={() => {
                                setCurrencies(currencies.filter(x => x.code !== c.code));
                                showToast('info', 'Currency Deleted', `Deleted '${c.code}'.`);
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTaxModalOpen(false)}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
