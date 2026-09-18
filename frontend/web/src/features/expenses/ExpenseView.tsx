import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Calendar, FileText, Filter, Tag, Building } from 'lucide-react';
import { ApiClient } from '../../lib/api';
import { useAlertStore } from '../../store/alertStore';
import { useAuthStore } from '../../store/authStore';
import { formatMoney } from '@ave/shared';
import { CustomSelect } from '../../components/CustomSelect';

interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  notes?: string;
  date: string;
  branch?: { id: string; name: string };
  createdBy?: { id: string; name: string };
}

export const ExpenseView: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // New Expense form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('UTILITIES');
  const [notes, setNotes] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const { showToast } = useAlertStore();
  const { currentBranch, branches } = useAuthStore();

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request('/expenses');
      if (res.success) setExpenses(res.data);
    } catch (err: any) {
      showToast('error', 'Failed to load expenses', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      showToast('error', 'Validation Error', 'Please provide an expense title and amount.');
      return;
    }

    try {
      const res = await ApiClient.request('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category,
          notes,
          branchId: selectedBranchId || currentBranch?.id
        })
      });

      if (res.success) {
        showToast('success', 'Expense Recorded', `GH₵ ${parseFloat(amount).toFixed(2)} recorded for ${title}.`);
        setExpenses([res.data, ...expenses]);
        setAddModalOpen(false);
        setTitle('');
        setAmount('');
        setNotes('');
      }
    } catch (err: any) {
      showToast('error', 'Error Recording Expense', err.message);
    }
  };

  const handleDeleteExpense = async (id: string, expenseTitle: string) => {
    try {
      const res = await ApiClient.request(`/expenses/${id}`, { method: 'DELETE' });
      if (res.success) {
        showToast('info', 'Expense Entry Deleted', `Deleted '${expenseTitle}'.`);
        setExpenses(expenses.filter(e => e.id !== id));
      }
    } catch (err: any) {
      showToast('error', 'Error Deleting Expense', err.message);
    }
  };

  const categories = ['ALL', 'RENT', 'UTILITIES', 'SALARIES', 'TRANSPORT', 'FREIGHT', 'PACKAGING', 'MISC'];

  const filteredExpenses = expenses.filter(exp => {
    if (filterCategory !== 'ALL' && exp.category !== filterCategory) return false;
    return true;
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <DollarSign className="w-7 h-7 text-amber-500" />
            <span>Store Expenses & Operating Costs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track overhead costs, utilities, rent, and inventory freight for accurate Net Operating Profit calculations.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition flex items-center space-x-1.5 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Recorded Expenses</span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {formatMoney(totalExpenseAmount, 'GH₵')}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Across {filteredExpenses.length} entries</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Branch Context</span>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Building className="w-4 h-4 text-teal-500" />
            <span>{currentBranch?.name || 'All Branches'}</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Operational expense allocation</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Filter</span>
          <div className="flex flex-wrap gap-1 pt-1">
            {categories.slice(0, 5).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  filterCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Expense Ledger Log</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">{filteredExpenses.length} record(s)</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading expense entries...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No expenses recorded yet. Click 'Record New Expense' to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Title & Notes</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Logged By</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{exp.title}</p>
                      {exp.notes && <p className="text-[10px] text-slate-400 italic">{exp.notes}</p>}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {exp.branch?.name || 'Main Branch'}
                    </td>
                    <td className="p-3 font-extrabold font-mono text-slate-900 dark:text-white">
                      {formatMoney(exp.amount, 'GH₵')}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {exp.createdBy?.name || 'Admin'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete expense entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                <span>Record Store Expense</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Expense Title / Description *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Electricity Bill"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Amount (GH₵) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Category"
                    options={[
                      { value: 'UTILITIES', label: 'UTILITIES' },
                      { value: 'RENT', label: 'RENT' },
                      { value: 'SALARIES', label: 'SALARIES' },
                      { value: 'TRANSPORT', label: 'TRANSPORT' },
                      { value: 'FREIGHT', label: 'FREIGHT' },
                      { value: 'PACKAGING', label: 'PACKAGING' },
                      { value: 'MISC', label: 'MISC' }
                    ]}
                    value={category}
                    onChange={(val) => setCategory(val)}
                    icon={Tag}
                  />
                </div>
              </div>

              <div>
                <CustomSelect
                  label="Store Branch Allocation"
                  options={[
                    { value: '', label: `Default (${currentBranch?.name || 'Main Branch'})` },
                    ...branches.map(b => ({ value: b.id, label: b.name, icon: Building }))
                  ]}
                  value={selectedBranchId}
                  onChange={(val) => setSelectedBranchId(val)}
                  icon={Building}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Notes / Receipt Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Receipt #4412 from ECG"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 text-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
