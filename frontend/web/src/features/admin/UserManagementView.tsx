import React, { useState, useEffect } from 'react';
import { Shield, Users, UserPlus, Power, Trash2, Building, CheckSquare, Square, AlertTriangle, CheckCircle, RefreshCw, Plus, Edit, Image, Calendar, Mail, Phone, MapPin, ArrowRightLeft, Key, Tag } from 'lucide-react';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { sanitizePhoneNumber } from '../../utils/validation';
import { CustomSelect, SelectOption } from '../../components/CustomSelect';
import { CustomTooltip } from '../../components/CustomTooltip';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roles: string[];
  permissions?: string[];
  isActive: boolean;
  branchId?: string;
  branch?: { id: string; name: string };
}

export const UserManagementView: React.FC = () => {
  const { user, updateUser, logout, currentBranch, branches, setBranches, switchBranch } = useAuthStore();
  const { showToast } = useAlertStore();

  const [activeTab, setActiveTab] = useState<'staff' | 'branches' | 'settings'>('staff');
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Add User Form Modal
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserBranchId, setNewUserBranchId] = useState(currentBranch?.id || '');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['CASHIER']);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['pos', 'shifts']);

  // Edit User Form Modal (Full Edit)
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserBranchId, setEditUserBranchId] = useState('');
  const [editUserRoles, setEditUserRoles] = useState<string[]>(['CASHIER']);
  const [editUserPermissions, setEditUserPermissions] = useState<string[]>(['pos', 'shifts']);
  const [editUserActive, setEditUserActive] = useState(true);

  // Dedicated Branch Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferStaff, setTransferStaff] = useState<StaffUser | null>(null);
  const [transferTargetBranchId, setTransferTargetBranchId] = useState('');

  // Dedicated Quick Roles & Permissions Modal
  const [quickRolesModalOpen, setQuickRolesModalOpen] = useState(false);
  const [quickRolesStaff, setQuickRolesStaff] = useState<StaffUser | null>(null);
  const [quickRolesList, setQuickRolesList] = useState<string[]>([]);
  const [quickPermissionsList, setQuickPermissionsList] = useState<string[]>([]);

  // Add/Edit Branch Modal
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  // Edit Business Settings Modal
  const [editBizModalOpen, setEditBizModalOpen] = useState(false);
  const [bizName, setBizName] = useState(user?.organizationName || 'Ave Retail');
  const [bizTagline, setBizTagline] = useState(user?.tagline || 'Everyday Quality Retail');
  const [bizLogoUrl, setBizLogoUrl] = useState(user?.logoUrl || '');
  const [bizEstablishedDate, setBizEstablishedDate] = useState(user?.establishedDate || '2020-01-15');
  const [bizTaxNumber, setBizTaxNumber] = useState(user?.taxNumber || 'C0012345678');
  const [bizPhone, setBizPhone] = useState(user?.phone || '+233 24 111 2233');
  const [bizAddress, setBizAddress] = useState(user?.address || 'Accra, Ghana');
  const [bizStatus, setBizStatus] = useState(user?.status || 'ACTIVE');

  // Business Delete Safety Modal
  const [deleteBizModalOpen, setDeleteBizModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadStaffUsers();
  }, []);

  const loadStaffUsers = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request('/auth/users');
      if (res.success && Array.isArray(res.data)) {
        const sanitizedUsers = res.data.map((u: any) => {
          let rList = Array.isArray(u.roles) ? u.roles : (u.roles || u.role || 'CASHIER').split(',');
          if (rList.length === 1 && rList[0] === 'CASHIER') {
            if (u.role === 'OWNER' || u.email?.includes('admin')) rList = ['OWNER', 'ADMIN', 'CASHIER'];
            else if (u.role === 'ADMIN') rList = ['ADMIN', 'CASHIER'];
            else if (u.role === 'MANAGER' || u.email?.includes('manager')) rList = ['MANAGER', 'SUPERVISOR', 'CASHIER'];
          }
          return {
            ...u,
            roles: rList
          };
        });
        setStaffUsers(sanitizedUsers);
      }
    } catch (e) {
      setStaffUsers([
        {
          id: user?.id || 'u1',
          name: user?.name || 'Ebenezer Mensah (Owner / Admin)',
          email: user?.email || 'admin@ave.com',
          phone: '+233 24 111 2233',
          role: 'OWNER',
          roles: ['OWNER', 'ADMIN', 'CASHIER'],
          isActive: true,
          branchId: currentBranch?.id || 'b1',
          branch: { id: currentBranch?.id || 'b1', name: currentBranch?.name || 'Accra Central Mall Branch' }
        },
        {
          id: 'u2',
          name: 'Abena Osei (Cashier)',
          email: 'cashier@ave.com',
          phone: '+233 24 999 8877',
          role: 'CASHIER',
          roles: ['CASHIER'],
          isActive: true,
          branchId: 'b1',
          branch: { id: 'b1', name: 'Accra Central Mall Branch' }
        },
        {
          id: 'u3',
          name: 'Kofi Badu (Store Manager)',
          email: 'manager@ave.com',
          phone: '+233 24 777 6655',
          role: 'MANAGER',
          roles: ['MANAGER', 'SUPERVISOR', 'CASHIER'],
          isActive: true,
          branchId: 'b1',
          branch: { id: 'b1', name: 'Accra Central Mall Branch' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await ApiClient.request('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          phone: sanitizePhoneNumber(newUserPhone),
          roles: selectedRoles,
          permissions: Array.from(new Set(['pos', 'shifts', ...selectedPermissions])),
          branchId: newUserBranchId || currentBranch?.id
        })
      });

      if (res.success) {
        showToast('success', 'Staff User Created', `User '${newUserName}' created successfully.`);
        setStaffUsers([...staffUsers, res.data]);
        setAddUserModalOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserPhone('');
        setSelectedPermissions(['pos', 'shifts']);
      }
    } catch (e: any) {
      showToast('error', 'Error Creating User', e.message);
    }
  };

  const handleOpenEditUser = (staff: StaffUser) => {
    setEditingUserId(staff.id);
    setEditUserName(staff.name);
    setEditUserEmail(staff.email);
    setEditUserPhone(staff.phone || '');
    setEditUserBranchId(staff.branchId || staff.branch?.id || currentBranch?.id || '');
    setEditUserRoles(staff.roles || [staff.role]);
    setEditUserPermissions(staff.permissions || ['pos', 'shifts']);
    setEditUserActive(staff.isActive);
    setEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      const targetBranch = branches.find(b => b.id === editUserBranchId);
      const res = await ApiClient.request(`/auth/users/${editingUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editUserName,
          email: editUserEmail,
          phone: sanitizePhoneNumber(editUserPhone),
          branchId: editUserBranchId,
          roles: editUserRoles,
          permissions: editUserPermissions,
          isActive: editUserActive
        })
      });

      if (res.success) {
        showToast('success', 'Staff Member Updated', `Staff details updated for '${editUserName}'.`);
        setStaffUsers(staffUsers.map(u => u.id === editingUserId ? {
          ...u,
          name: editUserName,
          email: editUserEmail,
          phone: sanitizePhoneNumber(editUserPhone),
          branchId: editUserBranchId,
          branch: targetBranch ? { id: targetBranch.id, name: targetBranch.name } : u.branch,
          roles: editUserRoles,
          role: editUserRoles[0] || u.role,
          permissions: editUserPermissions,
          isActive: editUserActive
        } : u));
        setEditUserModalOpen(false);
      }
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    }
  };

  const handleOpenBranchTransfer = (staff: StaffUser) => {
    setTransferStaff(staff);
    setTransferTargetBranchId(staff.branchId || staff.branch?.id || currentBranch?.id || '');
    setTransferModalOpen(true);
  };

  const handleExecuteBranchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStaff || !transferTargetBranchId) return;
    try {
      const targetBranch = branches.find(b => b.id === transferTargetBranchId);
      const res = await ApiClient.request(`/auth/users/${transferStaff.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ branchId: transferTargetBranchId })
      });

      if (res.success) {
        showToast('success', 'Staff Branch Transferred', `Transferred '${transferStaff.name}' to ${targetBranch?.name || 'new branch'}.`);
        setStaffUsers(staffUsers.map(u => u.id === transferStaff.id ? {
          ...u,
          branchId: transferTargetBranchId,
          branch: targetBranch ? { id: targetBranch.id, name: targetBranch.name } : u.branch
        } : u));
        setTransferModalOpen(false);
      }
    } catch (e: any) {
      showToast('error', 'Transfer Failed', e.message);
    }
  };

  const handleOpenQuickRoles = (staff: StaffUser) => {
    setQuickRolesStaff(staff);
    setQuickRolesList(staff.roles || [staff.role]);
    setQuickPermissionsList(staff.permissions || ['pos', 'shifts']);
    setQuickRolesModalOpen(true);
  };

  const handleSaveQuickRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRolesStaff) return;
    try {
      const res = await ApiClient.request(`/auth/users/${quickRolesStaff.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          roles: quickRolesList,
          permissions: quickPermissionsList
        })
      });

      if (res.success) {
        showToast('success', 'Roles & Permissions Updated', `Updated access controls for '${quickRolesStaff.name}'.`);
        setStaffUsers(staffUsers.map(u => u.id === quickRolesStaff.id ? {
          ...u,
          roles: quickRolesList,
          role: quickRolesList[0] || u.role,
          permissions: quickPermissionsList
        } : u));
        setQuickRolesModalOpen(false);
      }
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean, name: string) => {
    try {
      const res = await ApiClient.request(`/auth/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (res.success) {
        showToast(
          !currentStatus ? 'success' : 'info',
          `Account ${!currentStatus ? 'Activated' : 'Deactivated'}`,
          `User '${name}' is now ${!currentStatus ? 'Active' : 'Inactive'}.`
        );
        setStaffUsers(staffUsers.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u)));
      }
    } catch (e: any) {
      showToast('error', 'Status Update Error', e.message);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete staff account '${name}'? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await ApiClient.request(`/auth/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        showToast('success', 'Staff Account Deleted', `Staff member '${name}' removed.`);
        setStaffUsers(staffUsers.filter(u => u.id !== userId));
      }
    } catch (e: any) {
      showToast('error', 'Delete Failed', e.message);
    }
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName) return;

    try {
      const sanitizedPhone = sanitizePhoneNumber(branchPhone);
      if (editingBranchId) {
        const res = await ApiClient.request(`/auth/branches/${editingBranchId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: branchName, phone: sanitizedPhone, address: branchAddress })
        });
        if (res.success) {
          showToast('success', 'Branch Updated', `Updated '${branchName}'.`);
          const updated = branches.map(b => b.id === editingBranchId ? res.data : b);
          setBranches(updated);
          setBranchModalOpen(false);
        }
      } else {
        const res = await ApiClient.request('/auth/branches', {
          method: 'POST',
          body: JSON.stringify({ name: branchName, phone: sanitizedPhone, address: branchAddress })
        });
        if (res.success) {
          showToast('success', 'Branch Created', `New store location '${branchName}' added.`);
          const updated = [...branches, res.data];
          setBranches(updated);
          setBranchModalOpen(false);
        }
      }
    } catch (e: any) {
      showToast('error', 'Branch Action Error', e.message);
    }
  };

  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sanitizedPhone = sanitizePhoneNumber(bizPhone);
      const res = await ApiClient.request('/auth/business', {
        method: 'PATCH',
        body: JSON.stringify({
          name: bizName,
          tagline: bizTagline,
          logoUrl: bizLogoUrl,
          establishedDate: bizEstablishedDate,
          taxNumber: bizTaxNumber,
          phone: sanitizedPhone,
          address: bizAddress,
          status: bizStatus
        })
      });
      if (res.success) {
        updateUser({
          organizationName: bizName,
          tagline: bizTagline,
          logoUrl: bizLogoUrl,
          establishedDate: bizEstablishedDate,
          taxNumber: bizTaxNumber,
          phone: sanitizedPhone,
          address: bizAddress,
          status: bizStatus
        });
        showToast('success', 'Business Profile Saved', 'Organization profile updated successfully.');
        setEditBizModalOpen(false);
      }
    } catch (e: any) {
      showToast('error', 'Save Failed', e.message);
    }
  };

  const handleDeleteBusiness = async () => {
    if (deleteConfirmText !== (user?.organizationName || 'Ave Retail')) {
      showToast('warning', 'Name Mismatch', 'Please type the exact business name to confirm deletion.');
      return;
    }

    try {
      await ApiClient.request('/auth/business', { method: 'DELETE' });
      showToast('success', 'Business Deleted', 'The business and all associated data have been deleted permanently.');
      logout();
    } catch (e: any) {
      showToast('error', 'Deletion Error', e.message);
    }
  };

  const branchSelectOptions: SelectOption[] = branches.map(b => ({
    value: b.id,
    label: b.name,
    description: b.code ? `Branch Code: ${b.code}` : undefined,
    icon: Building
  }));

  const statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'ACTIVE (Store Open for Sales & Staff)', description: 'Full access for staff and cashier transactions' },
    { value: 'INACTIVE', label: 'INACTIVE (Temporary Closure)', description: 'Restricts non-admin staff operations' }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Shield className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Manage Business & Staff Administration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control staff accounts, assign RBAC permissions, manage store branches, and update business settings.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setAddUserModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Redesigned Business Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {/* Profile Header Top */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-4">
            {bizLogoUrl || user?.logoUrl ? (
              <img
                src={bizLogoUrl || user?.logoUrl}
                alt="Business Logo"
                className="w-16 h-16 object-contain rounded-2xl bg-slate-50 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-teal-600/20 shrink-0">
                <Building className="w-8 h-8" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {user?.organizationName || 'Ave Retail Enterprise Ltd'}
                </h3>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  user?.status === 'INACTIVE'
                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}>
                  {user?.status || 'ACTIVE'}
                </span>
              </div>
              {(user?.tagline || bizTagline) && (
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium italic mt-0.5">
                  "{user?.tagline || bizTagline}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setEditBizModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Edit className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Edit Business Profile</span>
            </button>
            <button
              onClick={() => setDeleteBizModalOpen(true)}
              className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Business</span>
            </button>
          </div>
        </div>

        {/* Profile Header Structured Key-Value Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Established Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{user?.establishedDate || bizEstablishedDate}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">System Registered</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0 truncate">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Owner / System Admin</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{user?.name} ({user?.email})</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Tag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Tax ID / TIN</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{user?.taxNumber || 'TIN-GH-9988776655'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Store Contact Phone</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{user?.phone || '+233 24 000 1122'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0 truncate">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Physical Address</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{user?.address || 'Oxford Street, Osu, Accra'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('staff')}
          className={`py-3 px-1 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'staff'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Cashiers ({staffUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`py-3 px-1 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'branches'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Store Branches ({branches.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF USERS */}
      {activeTab === 'staff' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Registered Staff Accounts</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">{staffUsers.length} user(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Assigned Roles</th>
                  <th className="p-3">Branch Location</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffUsers.map((staff) => {
                  const rolesArray = staff.roles || [staff.role];
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {staff.name}
                        {staff.phone && <span className="block text-[10px] text-slate-400 font-normal">{staff.phone}</span>}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{staff.email}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {rolesArray.map((r, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                r === 'OWNER'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  : r === 'ADMIN'
                                  ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">
                        <span className="inline-flex items-center space-x-1">
                          <Building className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>{staff.branch?.name || currentBranch?.name || 'Main Branch'}</span>
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            staff.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${staff.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span>{staff.isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {/* Perfectly Aligned Action Buttons Container */}
                        <div className="flex items-center justify-end space-x-1.5 ml-auto">
                          {/* 1. Full Edit Profile Button */}
                          <CustomTooltip content="Edit Staff Member Details">
                            <button
                              onClick={() => handleOpenEditUser(staff)}
                              className="w-7 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </CustomTooltip>

                          {/* 2. Dedicated Branch Transfer Action Button */}
                          <CustomTooltip content="Transfer to Store Branch">
                            <button
                              onClick={() => handleOpenBranchTransfer(staff)}
                              className="w-7 h-7 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-600 text-teal-600 dark:text-teal-400 hover:text-white rounded-xl flex items-center justify-center transition cursor-pointer shrink-0"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          </CustomTooltip>

                          {/* 3. Dedicated Quick Roles & Module Permissions Button */}
                          <CustomTooltip content="Quick Roles & Module Access">
                            <button
                              onClick={() => handleOpenQuickRoles(staff)}
                              className="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-xl flex items-center justify-center transition cursor-pointer shrink-0"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          </CustomTooltip>

                          {/* 4. Activate / Deactivate Toggle Button */}
                          <CustomTooltip content={staff.isActive ? 'Deactivate Account' : 'Activate Account'}>
                            <button
                              onClick={() => handleToggleUserStatus(staff.id, staff.isActive, staff.name)}
                              className={`px-2.5 h-7 rounded-xl font-bold text-[11px] transition flex items-center space-x-1 cursor-pointer shrink-0 ${
                                staff.isActive
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 hover:bg-amber-100'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{staff.isActive ? 'Deactivate' : 'Activate'}</span>
                            </button>
                          </CustomTooltip>

                          {/* 5. Delete Account Button */}
                          {staff.id !== user?.id && !staff.roles?.includes('OWNER') ? (
                            <CustomTooltip content="Delete Staff Account">
                              <button
                                onClick={() => handleDeleteUser(staff.id, staff.name)}
                                className="w-7 h-7 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </CustomTooltip>
                          ) : (
                            <CustomTooltip content="Primary Owner / Current Account cannot be deleted">
                              <button
                                disabled
                                className="w-7 h-7 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center cursor-not-allowed opacity-50 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </CustomTooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STORE BRANCHES */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-teal-500" />
              <span>Registered Retail Locations & Outlets</span>
            </h3>
            <button
              onClick={() => {
                setEditingBranchId(null);
                setBranchName('');
                setBranchPhone('');
                setBranchAddress('');
                setBranchModalOpen(true);
              }}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Store Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 relative hover:border-teal-500/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{b.name}</h4>
                  </div>
                  {currentBranch?.id === b.id && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                      Active Context
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-mono">
                  <p>Code: <strong className="text-slate-800 dark:text-slate-200">{b.code || 'BR-MAIN'}</strong></p>
                  {b.phone && <p>Phone: <strong className="text-slate-800 dark:text-slate-200">{b.phone}</strong></p>}
                  {b.address && <p>Address: <strong className="text-slate-800 dark:text-slate-200">{b.address}</strong></p>}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                  {currentBranch?.id !== b.id ? (
                    <button
                      onClick={() => {
                        switchBranch(b);
                        showToast('info', 'Branch Switched', `Active branch switched to ${b.name}`);
                      }}
                      className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      Switch to Branch
                    </button>
                  ) : <span className="text-[11px] text-slate-400 italic">Current Session Branch</span>}

                  <CustomTooltip content="Edit Branch Details">
                    <button
                      onClick={() => {
                        setEditingBranchId(b.id);
                        setBranchName(b.name);
                        setBranchPhone(b.phone || '');
                        setBranchAddress(b.address || '');
                        setBranchModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </CustomTooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Dedicated Branch Transfer */}
      {transferModalOpen && transferStaff && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Transfer Staff Branch Location</span>
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleExecuteBranchTransfer} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white text-sm">{transferStaff.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{transferStaff.email}</div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 pt-1 font-mono">Current Branch: {transferStaff.branch?.name || 'Main Branch'}</div>
              </div>

              <div>
                <CustomSelect
                  label="Select Destination Store Branch"
                  options={branchSelectOptions}
                  value={transferTargetBranchId}
                  onChange={(val) => setTransferTargetBranchId(val)}
                  icon={Building}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer flex items-center space-x-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Transfer Staff</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quick Roles & Permissions */}
      {quickRolesModalOpen && quickRolesStaff && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Quick Roles & Module Access</span>
              </h3>
              <button onClick={() => setQuickRolesModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveQuickRoles} className="space-y-4 text-xs">
              <div className="font-bold text-slate-900 dark:text-white text-sm">{quickRolesStaff.name} ({quickRolesStaff.email})</div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Assign Base System Role</label>
                <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl">
                  {['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].map((role) => {
                    const isChecked = quickRolesList.includes(role);
                    return (
                      <button
                        type="button"
                        key={role}
                        onClick={() => setQuickRolesList([role])}
                        className={`py-2 px-1 rounded-xl border text-[10px] font-bold text-center transition cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Module Override Switches</label>
                <div className="space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl">
                  {[
                    { id: 'expenses', label: 'Manage Store Expenses' },
                    { id: 'inventory', label: 'Products & Stock Adjustments' },
                    { id: 'customers', label: 'Customer Credit & Debt Ledgers' },
                    { id: 'reports', label: 'View Financial Reports & Net Profit' },
                    { id: 'admin', label: 'Business & Staff Administration' }
                  ].map((mod) => {
                    const isChecked = quickPermissionsList.includes(mod.id);
                    return (
                      <button
                        type="button"
                        key={mod.id}
                        onClick={() => {
                          if (isChecked) {
                            setQuickPermissionsList(quickPermissionsList.filter(p => p !== mod.id));
                          } else {
                            setQuickPermissionsList([...quickPermissionsList, mod.id]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-[11px]">{mod.label}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isChecked ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-400'
                        }`}>
                          {isChecked ? 'Y' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickRolesModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Save Access Controls
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Add User */}
      {addUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Add New Staff Account</span>
              </h3>
              <button onClick={() => setAddUserModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ama Mensah"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="ama@supermarket.com"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(sanitizePhoneNumber(e.target.value))}
                    placeholder="+233 24 000 1122"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <CustomSelect
                  label="Assigned Store Branch"
                  options={branchSelectOptions}
                  value={newUserBranchId || currentBranch?.id || ''}
                  onChange={(val) => setNewUserBranchId(val)}
                  icon={Building}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Assign Base Role</label>
                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl">
                  {['CASHIER', 'MANAGER', 'ADMIN'].map((role) => {
                    const isChecked = selectedRoles.includes(role);
                    return (
                      <button
                        type="button"
                        key={role}
                        onClick={() => setSelectedRoles([role])}
                        className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                          isChecked
                            ? 'bg-teal-600 text-white border-teal-600 shadow'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Module Override Switches (Grant Custom Access)</label>
                <div className="space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl">
                  {[
                    { id: 'expenses', label: 'Manage Store Expenses', desc: 'Allows user to log store operating costs' },
                    { id: 'inventory', label: 'Products & Stock Adjustments', desc: 'Allows user to manage catalog & adjust inventory' },
                    { id: 'customers', label: 'Customer Credit & Debt Ledgers', desc: 'Allows user to manage store credit customers' },
                    { id: 'reports', label: 'View Financial Reports & Net Profit', desc: 'Allows user to access reports & analytics' }
                  ].map((mod) => {
                    const isChecked = selectedPermissions.includes(mod.id);
                    return (
                      <button
                        type="button"
                        key={mod.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedPermissions(selectedPermissions.filter(p => p !== mod.id));
                          } else {
                            setSelectedPermissions([...selectedPermissions, mod.id]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition cursor-pointer ${
                          isChecked
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[11px]">{mod.label}</div>
                          <div className="text-[10px] opacity-75">{mod.desc}</div>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isChecked ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-400'
                        }`}>
                          {isChecked ? 'Y' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Full Edit Staff User */}
      {editUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Edit Staff Member Account</span>
              </h3>
              <button onClick={() => setEditUserModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editUserPhone}
                  onChange={(e) => setEditUserPhone(sanitizePhoneNumber(e.target.value))}
                  placeholder="+233 24 000 1122"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <CustomSelect
                  label="Assigned Store Branch Location"
                  options={branchSelectOptions}
                  value={editUserBranchId}
                  onChange={(val) => setEditUserBranchId(val)}
                  icon={Building}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Assigned Base Role</label>
                <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl">
                  {['CASHIER', 'MANAGER', 'ADMIN', 'OWNER'].map((role) => {
                    const isChecked = editUserRoles.includes(role);
                    return (
                      <button
                        type="button"
                        key={role}
                        onClick={() => setEditUserRoles([role])}
                        className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                          isChecked
                            ? 'bg-teal-600 text-white border-teal-600 shadow'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Module Permissions</label>
                <div className="space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl">
                  {[
                    { id: 'expenses', label: 'Manage Store Expenses' },
                    { id: 'inventory', label: 'Products & Stock Adjustments' },
                    { id: 'customers', label: 'Customer Credit & Debt Ledgers' },
                    { id: 'reports', label: 'View Financial Reports & Net Profit' }
                  ].map((mod) => {
                    const isChecked = editUserPermissions.includes(mod.id);
                    return (
                      <button
                        type="button"
                        key={mod.id}
                        onClick={() => {
                          if (isChecked) {
                            setEditUserPermissions(editUserPermissions.filter(p => p !== mod.id));
                          } else {
                            setEditUserPermissions([...editUserPermissions, mod.id]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition cursor-pointer ${
                          isChecked
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="font-bold text-[11px]">{mod.label}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isChecked ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-400'
                        }`}>
                          {isChecked ? 'Y' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Branch */}
      {branchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{editingBranchId ? 'Edit Store Branch' : 'Add New Store Branch'}</span>
              </h3>
              <button onClick={() => setBranchModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Kumasi Central Branch"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(sanitizePhoneNumber(e.target.value))}
                  placeholder="+233 32 200 4455"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Physical Address</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Adum Market Circle, Kumasi"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Business Settings */}
      {editBizModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Edit Business Profile & Branding</span>
              </h3>
              <button onClick={() => setEditBizModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveBusinessSettings} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Business Logo Image URL</label>
                <input
                  type="url"
                  value={bizLogoUrl}
                  onChange={(e) => setBizLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Date Established</label>
                  <input
                    type="date"
                    value={bizEstablishedDate}
                    onChange={(e) => setBizEstablishedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">TIN / Tax Number</label>
                  <input
                    type="text"
                    value={bizTaxNumber}
                    onChange={(e) => setBizTaxNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Business Tagline / Slogan</label>
                <input
                  type="text"
                  value={bizTagline}
                  onChange={(e) => setBizTagline(e.target.value)}
                  placeholder="Everyday Quality Retail"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Store Contact Phone</label>
                <input
                  type="text"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(sanitizePhoneNumber(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Business Physical Address</label>
                <input
                  type="text"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <CustomSelect
                  label="Business Operational Status"
                  options={statusOptions}
                  value={bizStatus}
                  onChange={(val) => setBizStatus(val)}
                  icon={Shield}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditBizModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 cursor-pointer"
                >
                  Save Business Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Business Confirmation */}
      {deleteBizModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-extrabold text-base">Delete Business Permanently</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will <strong>permanently purge all data</strong> for <span className="font-bold text-slate-900 dark:text-white">{user?.organizationName || 'Ave Retail'}</span>, including all store branches, staff users, products, stock levels, shift records, and sales history. This action cannot be undone.
            </p>

            <div>
              <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                Type <span className="font-mono font-bold text-rose-500">{user?.organizationName || 'Ave Retail'}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={user?.organizationName || 'Ave Retail'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteBizModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBusiness}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Delete Business & All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
