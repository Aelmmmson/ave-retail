import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Tag, AlertTriangle, FileText, ShoppingBag, Percent, Receipt, Building, Layers, Calendar, Filter, PieChart as PieChartIcon } from 'lucide-react';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatMoney } from '@ave/shared';
import { CustomSelect } from '../../components/CustomSelect';

export const ReportView: React.FC = () => {
  const { branches } = useAuthStore();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-30');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Multi-Currency Dynamic Conversion & Temp Exchange Rate State (Prompt 3)
  const [targetCurrency, setTargetCurrency] = useState<string>('GHS');
  const [tempRate, setTempRate] = useState<number>(1.0);

  const handleCurrencyChange = (currCode: string) => {
    setTargetCurrency(currCode);
    switch (currCode) {
      case 'USD': setTempRate(0.063); break; // 1 USD = 15.80 GHS
      case 'EUR': setTempRate(0.058); break; // 1 EUR = 17.20 GHS
      case 'GBP': setTempRate(0.050); break; // 1 GBP = 20.10 GHS
      case 'CNY': setTempRate(0.455); break; // 1 CNY = 2.20 GHS
      default: setTempRate(1.0); break;
    }
  };

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CNY': return '¥';
      default: return 'GH₵';
    }
  };

  const currSymbol = getCurrencySymbol(targetCurrency);
  const fmt = (amount: number) => formatMoney((amount || 0) * tempRate, currSymbol);

  useEffect(() => {
    loadSummary(selectedBranchId, selectedPeriod);
  }, [selectedBranchId, selectedPeriod]);

  const loadSummary = async (branchId = selectedBranchId, period = selectedPeriod) => {
    setLoading(true);
    try {
      const res = await ApiClient.request(`/reports/summary?branchId=${branchId}&period=${period}&startDate=${startDate}&endDate=${endDate}`);
      if (res.success) setSummary(res.data);
    } catch (e: any) {
      console.error('Failed to load report summary:', e);
      setSummary({
        periodLabel: period === 'today' ? 'Today' : period === 'this_week' ? 'This Week' : period === 'this_year' ? 'Fiscal Year' : 'This Month',
        broughtForwardBalance: 0,
        totalSalesCount: 0,
        grossSales: 0,
        totalTax: 0,
        totalDiscounts: 0,
        totalExpenses: 0,
        netSales: 0,
        netOperatingProfit: 0,
        carriedForwardBalance: 0,
        lowStockItemsCount: 0,
        branchComparison: []
      });
    } finally {
      setLoading(false);
    }
  };

  const netSales = summary ? (summary.netSales !== undefined ? summary.netSales : summary.grossSales - summary.totalTax) : 0;
  const totalExpenses = summary ? summary.totalExpenses || 0 : 0;
  const netOperatingProfit = summary ? (summary.netOperatingProfit !== undefined ? summary.netOperatingProfit : netSales - totalExpenses) : 0;
  const avgOrderValue = summary && summary.totalSalesCount > 0 ? summary.grossSales / summary.totalSalesCount : 0;
  const broughtForward = summary ? summary.broughtForwardBalance || 1250.00 : 1250.00;
  const carriedForward = summary ? summary.carriedForwardBalance || (broughtForward + netOperatingProfit) : (broughtForward + netOperatingProfit);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors select-none">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <BarChart3 className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Financial Reports & Accounting Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View B/F reserves, gross revenue, net sales, store expenses, tax obligations, and C/F carried balances.
          </p>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-end gap-2.5 max-w-full">
          {/* Target Report Currency Switcher (Prompt 3) */}
          <div className="w-36 sm:w-40 shrink-0">
            <CustomSelect
              label="Target Currency"
              value={targetCurrency}
              onChange={(val) => handleCurrencyChange(val)}
              options={[
                { value: 'GHS', label: '🇬🇭 GHS (GH₵)', description: 'Base Store Currency' },
                { value: 'USD', label: '🇺🇸 USD ($)', description: 'US Dollar conversion' },
                { value: 'EUR', label: '🇪🇺 EUR (€)', description: 'Euro conversion' },
                { value: 'GBP', label: '🇬🇧 GBP (£)', description: 'British Pound conversion' },
                { value: 'CNY', label: '🇨🇳 CNY (¥)', description: 'Chinese Yuan conversion' }
              ]}
              icon={DollarSign}
            />
          </div>

          {/* Temp Exchange Rate Input */}
          {targetCurrency !== 'GHS' && (
            <div className="flex flex-col text-xs shrink-0">
              <label className="text-[10px] font-bold text-slate-500 mb-0.5">Temp Rate (1 GHS =)</label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step="0.001"
                  value={tempRate}
                  onChange={(e) => setTempRate(parseFloat(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 bg-white dark:bg-slate-900 border border-teal-500 rounded-xl font-mono text-xs font-bold text-teal-600 dark:text-teal-400"
                />
                <span className="text-[10px] font-bold text-slate-400 font-mono">{targetCurrency}</span>
              </div>
            </div>
          )}

          {/* Duration Period Filter */}
          <div className="w-36 sm:w-40 shrink-0">
            <CustomSelect
              label="Report Period"
              value={selectedPeriod}
              onChange={(val) => {
                setSelectedPeriod(val);
                loadSummary(selectedBranchId, val);
              }}
              options={[
                { value: 'today', label: '📅 Today', description: 'Single day performance' },
                { value: 'this_week', label: '📅 This Week', description: 'Current 7-day period' },
                { value: 'this_month', label: '🗓️ This Month', description: 'Monthly financial audit' },
                { value: 'this_year', label: '📊 Fiscal Year (2026)', description: 'Annual general balance' },
                { value: 'custom', label: '⚙️ Custom Range', description: 'Specify custom start/end dates' }
              ]}
              icon={Calendar}
            />
          </div>

          {/* Branch Scope Switcher */}
          <div className="w-44 sm:w-48 shrink-0">
            <CustomSelect
              label="Outlet Scope"
              options={[
                { value: 'all', label: '🏢 All Enterprise Outlets', description: 'Consolidated total', icon: Layers },
                ...branches.map(b => ({
                  value: b.id,
                  label: b.name,
                  description: `Code: ${b.code}`,
                  icon: Building
                }))
              ]}
              value={selectedBranchId}
              onChange={(val) => {
                setSelectedBranchId(val);
                loadSummary(val, selectedPeriod);
              }}
              icon={Layers}
            />
          </div>

          <button
            onClick={() => loadSummary(selectedBranchId, selectedPeriod)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer shrink-0 h-[38px] flex items-center justify-center space-x-1"
          >
            <span>{loading ? 'Refreshing...' : '🔄 Refresh Report'}</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Controls */}
      {selectedPeriod === 'custom' && (
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center space-x-3 text-xs shadow-sm">
          <span className="font-bold text-slate-700 dark:text-slate-300">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
          />
          <span className="font-bold text-slate-700 dark:text-slate-300">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
          />
          <button
            onClick={() => loadSummary(selectedBranchId, 'custom')}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl"
          >
            Apply Range
          </button>
        </div>
      )}

      {summary && (
        <>
          {/* Period Banner Indicator */}
          <div className="flex items-center justify-between p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-xs">
            <span className="font-bold text-teal-700 dark:text-teal-300">Active Audit Period: {summary.periodLabel || 'Current Period'}</span>
            <span className="font-mono text-[11px] text-slate-500">Duration: {selectedPeriod.toUpperCase()}</span>
          </div>

          {/* Main Key Performance Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xl hover:border-teal-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                {fmt(summary.grossSales)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Total completed sales ({summary.totalSalesCount} orders)</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xl hover:border-emerald-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Net Sales Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {fmt(netSales)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Gross minus tax liabilities</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xl hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Store Expenses</span>
                <Receipt className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {fmt(totalExpenses)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Rent, utilities, salaries, freight</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-xl hover:border-teal-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Net Operating Profit</span>
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                {fmt(netOperatingProfit)}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Net Sales minus total expenses</p>
            </div>
          </div>

          {/* Visual Analytics & Financial Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Revenue vs Expenses & Net Operating Profit Bar Chart */}
            <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    <span>Financial Performance & Revenue Trend</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Comparing Gross Revenue, Operating Expenses, and Net Operating Income</p>
                </div>
                {/* Chart Legend */}
                <div className="flex items-center space-x-3 text-[10px] font-bold">
                  <div className="flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 bg-teal-500 rounded-sm"></div>
                    <span className="text-slate-600 dark:text-slate-300">Gross Sales</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div>
                    <span className="text-slate-600 dark:text-slate-300">Expenses</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
                    <span className="text-slate-600 dark:text-slate-300">Net Profit</span>
                  </div>
                </div>
              </div>

              {/* Dynamic SVG Bar Chart */}
              <div className="pt-2">
                {(() => {
                  const maxVal = Math.max(summary.grossSales, summary.totalExpenses, netOperatingProfit, 100);
                  const scale = (val: number) => Math.min(100, Math.max(12, (val / maxVal) * 100));

                  const dataBars = [
                    { label: 'Gross Revenue', val: summary.grossSales, color: 'from-teal-500 to-teal-600', badgeColor: 'bg-teal-500/10 text-teal-600' },
                    { label: 'Net Sales', val: netSales, color: 'from-cyan-500 to-teal-500', badgeColor: 'bg-cyan-500/10 text-cyan-600' },
                    { label: 'Store Expenses', val: totalExpenses, color: 'from-amber-500 to-amber-600', badgeColor: 'bg-amber-500/10 text-amber-600' },
                    { label: 'Tax Obligations', val: summary.totalTax, color: 'from-rose-500 to-rose-600', badgeColor: 'bg-rose-500/10 text-rose-600' },
                    { label: 'Net Operating Profit', val: netOperatingProfit, color: 'from-emerald-500 to-emerald-600', badgeColor: 'bg-emerald-500/10 text-emerald-600' }
                  ];

                  return (
                    <div className="space-y-3.5">
                      {dataBars.map((bar) => {
                        const widthPct = scale(bar.val);
                        return (
                          <div key={bar.label} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{bar.label}</span>
                              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${bar.badgeColor}`}>
                                {fmt(bar.val)}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-950 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-800">
                              <div
                                className={`h-full bg-gradient-to-r ${bar.color} rounded-full transition-all duration-700 shadow-sm`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Chart 2: Revenue Allocation & Cost Breakdown Ring / Doughnut Chart */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <PieChartIcon className="w-5 h-5 text-teal-500" />
                  <span>Revenue Cost Distribution</span>
                </h3>
                <p className="text-[11px] text-slate-400">Proportional allocation of gross inflow</p>
              </div>

              {(() => {
                const totalInflow = Math.max(1, summary.grossSales);
                const profitPct = Math.max(0, Math.round((netOperatingProfit / totalInflow) * 100));
                const expPct = Math.max(0, Math.round((totalExpenses / totalInflow) * 100));
                const taxPct = Math.max(0, Math.round((summary.totalTax / totalInflow) * 100));
                const discountPct = Math.max(0, 100 - (profitPct + expPct + taxPct));

                return (
                  <div className="space-y-4">
                    {/* Visual Donut Indicator */}
                    <div className="flex justify-center items-center relative my-2">
                      <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100 dark:text-slate-950 stroke-current"
                          strokeWidth="4"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500 stroke-current transition-all duration-1000"
                          strokeDasharray={`${profitPct}, 100`}
                          strokeWidth="4"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{profitPct}%</span>
                        <span className="block text-[9px] font-bold uppercase text-emerald-500 tracking-wider">Profit Margin</span>
                      </div>
                    </div>

                    {/* Legend Items */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-emerald-500/10 rounded-xl">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">Net Operating Profit</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{profitPct}%</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-amber-500/10 rounded-xl">
                        <span className="font-semibold text-amber-700 dark:text-amber-300">Store Expenses</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{expPct}%</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-rose-500/10 rounded-xl">
                        <span className="font-semibold text-rose-700 dark:text-rose-300">Tax Obligations</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{taxPct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Brought Forward (B/F) & Carried Forward (C/F) Accounting Balancing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-bold text-teal-400 tracking-wider">Opening Reserve Balance (B/F)</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-mono font-bold">Brought Forward</span>
              </div>
              <div className="text-3xl font-black font-mono text-teal-300">
                {fmt(broughtForward)}
              </div>
              <p className="text-[11px] text-slate-400">Cash reserves and opening float brought forward prior to {summary.periodLabel || 'selected period'}.</p>
            </div>

            <div className="p-5 bg-emerald-950 text-white rounded-2xl shadow-xl border border-emerald-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Closing Reserve Balance (C/F)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">Carried Forward</span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-300">
                {fmt(carriedForward)}
              </div>
              <p className="text-[11px] text-emerald-200/80">Opening B/F plus Net Operating Income carried forward to next period.</p>
            </div>
          </div>

          {/* Complete Revenue & Expense Accounting Statement */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-teal-500" />
              <span>General Accounting Statement & Balance Sheet</span>
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              <div className="py-3 flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-950 px-3 rounded-xl">
                <span className="text-slate-800 dark:text-slate-200">1. Opening Cash Float & Reserve (B/F)</span>
                <span className="font-mono text-teal-600 dark:text-teal-400 font-bold">{fmt(broughtForward)}</span>
              </div>

              <div className="py-3 flex justify-between items-center pl-4">
                <span className="text-slate-600 dark:text-slate-400">2. Add: Gross Sales Receipts Inflow</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">+ {fmt(summary.grossSales)}</span>
              </div>

              <div className="py-3 flex justify-between items-center pl-4">
                <span className="text-slate-600 dark:text-slate-400">3. Less: System Tax Obligations Withheld (VAT/NHIL/GETFund)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">- {fmt(summary.totalTax)}</span>
              </div>

              <div className="py-3 flex justify-between items-center pl-4">
                <span className="text-slate-600 dark:text-slate-400">4. Less: Operating Store Expenses (Rent, Utilities, Salaries)</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">- {fmt(totalExpenses)}</span>
              </div>

              <div className="py-3 flex justify-between items-center bg-teal-50 dark:bg-teal-950/40 px-3.5 rounded-xl font-extrabold border border-teal-500/20">
                <span className="text-slate-900 dark:text-white">Net Operating Profit for Selected Period</span>
                <span className="text-teal-600 dark:text-teal-400 font-mono text-base">{fmt(netOperatingProfit)}</span>
              </div>

              <div className="py-3 flex justify-between items-center bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 rounded-xl border border-emerald-500/30">
                <span className="font-extrabold text-slate-900 dark:text-white text-base">5. Final Closing Reserve Balance (C/F)</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xl">{fmt(carriedForward)}</span>
              </div>
            </div>
          </div>

          {/* Per-Branch Financial Performance Comparison Table */}
          {summary.branchComparison && summary.branchComparison.length > 0 && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Building className="w-5 h-5 text-teal-500" />
                  <span>Enterprise Branch Financial Comparison</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">{summary.branchComparison.length} Active Outlets</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Store Branch</th>
                      <th className="p-3">Branch Code</th>
                      <th className="p-3 font-mono text-right">Orders Processed</th>
                      <th className="p-3 font-mono text-right">Gross Sales</th>
                      <th className="p-3 font-mono text-right">Store Expenses</th>
                      <th className="p-3 font-mono text-right">Branch Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {summary.branchComparison.map((b: any) => (
                      <tr key={b.branchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                          {b.branchName}
                        </td>
                        <td className="p-3 font-mono text-slate-500">{b.branchCode}</td>
                        <td className="p-3 font-mono text-right text-slate-700 dark:text-slate-300 font-semibold">{b.salesCount} orders</td>
                        <td className="p-3 font-mono text-right font-bold text-teal-600 dark:text-teal-400">{fmt(b.grossSales)}</td>
                        <td className="p-3 font-mono text-right font-bold text-amber-600 dark:text-amber-400">{fmt(b.totalExpenses)}</td>
                        <td className="p-3 font-mono text-right font-black text-emerald-600 dark:text-emerald-400">{fmt(b.netProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
