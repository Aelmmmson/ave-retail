import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, RefreshCw, Calendar, User, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { ApiClient } from '../../lib/api';
import { useAlertStore } from '../../store/alertStore';
import { CustomSelect } from '../../components/CustomSelect';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { showToast } = useAlertStore();

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, entityFilter, startDate, endDate]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let url = `/audit/logs?limit=100&action=${actionFilter}&entity=${entityFilter}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await ApiClient.request(url);
      if (res.success && res.data?.logs) {
        setLogs(res.data.logs);
      }
    } catch (e: any) {
      showToast('error', 'Error', 'Failed to load compliance audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditLogs();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-teal-500" />
            <span>Compliance Audit Trail Explorer</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable log of system events: Shift Manager Approvals, Manual Stock Adjustments, Price Overrides, Voided Receipts, and Security Actions.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-teal-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      {/* Filter Controls */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 mb-1">Search Action / User</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <CustomSelect
            label="Action Type"
            value={actionFilter}
            onChange={(val) => setActionFilter(val)}
            options={[
              { value: 'ALL', label: 'All Actions' },
              { value: 'SHIFT_VARIANCE_OVERRIDE', label: 'Shift Variance Override' },
              { value: 'TRANSFER_REQUESTED', label: 'Transfer Requested' },
              { value: 'TRANSFER_DISPATCHED', label: 'Transfer Dispatched' },
              { value: 'TRANSFER_RECEIVED', label: 'Transfer Received' },
              { value: 'STOCK_ADJUSTMENT', label: 'Stock Intake / Adjustment' }
            ]}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>
      </form>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User / Authorized By</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Entity / Target</th>
                <th className="px-4 py-3">Details & Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No compliance audit log records found for the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      <div>{log.user?.name || 'System / Auto'}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{log.user?.email || 'N/A'} • {log.user?.role || 'SYSTEM'}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                        log.action.includes('OVERRIDE') || log.action.includes('VARIANCE')
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : log.action.includes('TRANSFER')
                          ? 'bg-teal-500/10 text-teal-600 border-teal-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {log.entity} {log.entityId ? <span className="font-mono text-[10px] text-slate-400">({log.entityId})</span> : ''}
                    </td>

                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
