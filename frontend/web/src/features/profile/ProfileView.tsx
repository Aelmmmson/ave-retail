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
  Lock
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { ApiClient } from '../../lib/api';

export const ProfileView: React.FC = () => {
  const { user, currentBranch, login, branches } = useAuthStore();
  const { showToast } = useAlertStore();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

          <button
            onClick={() => setEditModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-teal-600/30 transition flex items-center space-x-2 border border-teal-400/30"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile Info</span>
          </button>
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
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {newPassword && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
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
    </div>
  );
};
