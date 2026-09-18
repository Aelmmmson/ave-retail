import React, { useState, useEffect } from 'react';
import { Users, Plus, CreditCard, History, Phone, Mail, MapPin } from 'lucide-react';
import { CustomerDTO } from '@ave/types';
import { ApiClient } from '../../lib/api';
import { formatMoney } from '@ave/shared';
import { useAlertStore } from '../../store/alertStore';

export const CustomerView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

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
        { id: 'cust-1', customerNumber: 'CUST-1001', name: 'Kofi Annan Enterprises', phone: '+233 20 123 4567', email: 'kofi@annan.com', address: 'East Legon, Accra', outstandingBalance: 150.0, status: 'ACTIVE', totalPurchasesCount: 12, totalSpent: 2400.0 }
      ]);
    }
  };

  const handleCreateCustomer = async () => {
    if (!nameInput) return;
    try {
      await ApiClient.request('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: nameInput, phone: phoneInput })
      });
      showToast('success', 'Customer Created', `Customer record for ${nameInput} added successfully.`);
      setCreateModalOpen(false);
      setNameInput('');
      setPhoneInput('');
      loadCustomers();
    } catch (e: any) {
      showToast('error', 'Customer Creation Failed', e.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Customer Directory & Credit Debt Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track customer records, store credit ledger balances, and purchase history.</p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-teal-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded font-bold">
                  {c.customerNumber}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">{c.name}</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                c.outstandingBalance > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {c.outstandingBalance > 0 ? 'Has Debt' : 'Clear Ledger'}
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{c.phone || 'No phone'}</span>
              </div>
              {c.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.email}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Outstanding Balance</span>
                <span className="font-mono font-bold text-sm text-rose-500 dark:text-rose-400">
                  {formatMoney(c.outstandingBalance, 'GH₵')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add New Customer</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Customer / Business Name</label>
                <input
                  type="text"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl">Cancel</button>
              <button onClick={handleCreateCustomer} className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl">Create Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
