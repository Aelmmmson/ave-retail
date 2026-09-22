import React, { useState, useEffect } from 'react';
import { Users, Plus, CreditCard, History, Phone, Mail, MapPin, Award, Edit, DollarSign, FileText } from 'lucide-react';
import { CustomerDTO } from '@ave/types';
import { ApiClient } from '../../lib/api';
import { formatMoney } from '@ave/shared';
import { useAlertStore } from '../../store/alertStore';
import { CustomSelect } from '../../components/CustomSelect';

export const CustomerView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [addressInput, setAddressInput] = useState('');

  // Edit Customer Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Ledger Adjustment Modal State
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<CustomerDTO | null>(null);
  const [ledgerType, setLedgerType] = useState<'DEBT_PAYMENT' | 'CREDIT_NOTE' | 'ADJUSTMENT'>('DEBT_PAYMENT');
  const [ledgerAmount, setLedgerAmount] = useState(0);
  const [ledgerNotes, setLedgerNotes] = useState('');

  const { showToast } = useAlertStore();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await ApiClient.request('/customers');
      if (res.success) setCustomers(res.data);
    } catch (e) {
      setCustomers([
        {
          id: 'cust-1',
          customerNumber: 'CUST-1001',
          name: 'Kofi Annan Enterprises',
          phone: '+233 20 123 4567',
          email: 'kofi@annan.com',
          address: 'East Legon, Accra',
          outstandingBalance: 150.0,
          loyaltyPoints: 240,
          loyaltyTier: 'GOLD',
          status: 'ACTIVE',
          totalPurchasesCount: 12,
          totalSpent: 2400.0
        },
        {
          id: 'cust-2',
          customerNumber: 'CUST-1002',
          name: 'Abena Mensah Supermarket',
          phone: '+233 24 555 7788',
          email: 'abena@mensah.com',
          address: 'Adabraka, Accra',
          outstandingBalance: 0.0,
          loyaltyPoints: 85,
          loyaltyTier: 'SILVER',
          status: 'ACTIVE',
          totalPurchasesCount: 5,
          totalSpent: 850.0
        }
      ]);
    }
  };

  const handleCreateCustomer = async () => {
    if (!nameInput) return;
    try {
      await ApiClient.request('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: nameInput, phone: phoneInput, email: emailInput, address: addressInput })
      });
      showToast('success', 'Customer Created', `Customer record for ${nameInput} added successfully.`);
      setCreateModalOpen(false);
      setNameInput('');
      setPhoneInput('');
      setEmailInput('');
      setAddressInput('');
      loadCustomers();
    } catch (e: any) {
      showToast('error', 'Customer Creation Failed', e.message);
    }
  };

  const handleOpenEdit = (c: CustomerDTO) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone || '');
    setEditEmail(c.email || '');
    setEditAddress(c.address || '');
    setEditModalOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editName) return;
    try {
      await ApiClient.request(`/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, phone: editPhone, email: editEmail, address: editAddress })
      });
      showToast('success', 'Customer Details Updated', `Record for ${editName} updated successfully.`);
      setEditModalOpen(false);
      loadCustomers();
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    }
  };

  const handleOpenLedgerModal = (c: CustomerDTO) => {
    setLedgerCustomer(c);
    setLedgerType('DEBT_PAYMENT');
    setLedgerAmount(0);
    setLedgerNotes('');
    setLedgerModalOpen(true);
  };

  const handlePostLedgerAdjustment = async () => {
    if (!ledgerCustomer || ledgerAmount <= 0) {
      showToast('warning', 'Invalid Amount', 'Please enter a valid non-zero adjustment amount.');
      return;
    }
    try {
      await ApiClient.request(`/customers/${ledgerCustomer.id}/ledger`, {
        method: 'POST',
        body: JSON.stringify({ type: ledgerType, amount: ledgerAmount, notes: ledgerNotes })
      });
      showToast('success', 'Ledger Adjustment Logged', `${ledgerType.replace('_', ' ')} of GH₵ ${ledgerAmount.toFixed(2)} recorded.`);
      setLedgerModalOpen(false);
      loadCustomers();
    } catch (e: any) {
      showToast('error', 'Ledger Post Failed', e.message);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'PLATINUM': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'GOLD': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'SILVER': return 'bg-slate-300/20 text-slate-300 border-slate-400/30';
      default: return 'bg-amber-700/20 text-amber-600 border-amber-700/30';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Customer Directory, Loyalty & Debt Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track customer profiles, earnable loyalty reward points, credit ledger debt balances, and manual payment entries.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xl relative group">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded font-bold">
                  {c.customerNumber}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">{c.name}</h4>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  c.outstandingBalance > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}>
                  {c.outstandingBalance > 0 ? 'Has Debt' : 'Clear Ledger'}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase ${getTierColor(c.loyaltyTier)}`}>
                  ★ {c.loyaltyTier || 'BRONZE'} TIER
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center space-x-1 text-teal-600 dark:text-teal-400 font-bold">
                  <Award className="w-3.5 h-3.5" />
                  <span>{c.loyaltyPoints || 0} Points</span>
                </div>
              </div>

              {c.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}

              {c.address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{c.address}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 block">Outstanding Debt Balance</span>
                <span className="font-mono font-bold text-sm text-rose-500 dark:text-rose-400">
                  {formatMoney(c.outstandingBalance, 'GH₵')}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenLedgerModal(c)}
                  className="px-2.5 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white rounded-lg text-xs font-bold border border-teal-200 dark:border-teal-800 transition flex items-center space-x-1 cursor-pointer"
                  title="Record Debt Payment or Credit Note"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Ledger</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Edit Customer Profile"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: Create Customer */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add New Customer</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Phone Number</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Physical Address</label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold">Cancel</button>
              <button onClick={handleCreateCustomer} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow">Create Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Customer Details */}
      {editModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Edit Customer Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Physical Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold">Cancel</button>
              <button onClick={handleUpdateCustomer} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Customer Ledger Manual Adjustment */}
      {ledgerModalOpen && ledgerCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Manual Debt Ledger Adjustment</h3>
            <p className="text-xs text-slate-500">Log cash debt repayment, credit note, or manual ledger adjustment for <strong>{ledgerCustomer.name}</strong>.</p>
            
            <div className="space-y-3">
              <CustomSelect
                label="Entry Type"
                value={ledgerType}
                onChange={(val) => setLedgerType(val as any)}
                options={[
                  { value: 'DEBT_PAYMENT', label: 'DEBT PAYMENT (Customer Pays Cash to Clear Debt)', description: 'Reduces outstanding customer balance' },
                  { value: 'CREDIT_NOTE', label: 'CREDIT NOTE (Store Issues Debt Discount / Credit)', description: 'Issues store credit note to customer' },
                  { value: 'ADJUSTMENT', label: 'ADJUSTMENT (Manual Ledger Adjustment)', description: 'Manual balance correction' }
                ]}
              />

              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Amount (GH₵) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ledgerAmount}
                  onChange={(e) => setLedgerAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Reference Notes</label>
                <input
                  type="text"
                  placeholder="Receipt / MoMo transaction reference..."
                  value={ledgerNotes}
                  onChange={(e) => setLedgerNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setLedgerModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold">Cancel</button>
              <button onClick={handlePostLedgerAdjustment} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow">Post Ledger Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
