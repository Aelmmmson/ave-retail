import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, Building, CheckCircle, Clock, Truck, XCircle, FileText, Check, Trash2, Package } from 'lucide-react';
import { WarehouseTransferDTO } from '@ave/types';
import { ApiClient } from '../../lib/api';
import { useAlertStore } from '../../store/alertStore';
import { useAuthStore } from '../../store/authStore';
import { CustomSelect } from '../../components/CustomSelect';

export const WarehouseTransferView: React.FC = () => {
  const [transfers, setTransfers] = useState<WarehouseTransferDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedTransferDetail, setSelectedTransferDetail] = useState<WarehouseTransferDTO | null>(null);

  // Available Catalog Products for selection
  const [availableProducts, setAvailableProducts] = useState<any[]>([
    { id: 'v1', name: 'Ideal Milk 160g Tin (MILK-160G)', stock: 150 },
    { id: 'v2', name: 'Coca-Cola Soft Drink 500ml (COKE-500ML)', stock: 85 },
    { id: 'v3', name: 'Milo Malted Chocolate 400g (MILO-400G)', stock: 40 },
    { id: 'v4', name: 'Indomie Chicken Noodle 70g (INDO-70G)', stock: 200 }
  ]);

  // New Transfer Form State
  const [sourceWarehouseId, setSourceWarehouseId] = useState('WH-ACC-01');
  const [destWarehouseId, setDestWarehouseId] = useState('WH-KMS-02');
  const [transferNotes, setTransferNotes] = useState('');

  // Transfer Items Line Item Builder
  const [selectedVariantId, setSelectedVariantId] = useState('v1');
  const [itemQuantity, setItemQuantity] = useState(10);
  const [transferItems, setTransferItems] = useState<Array<{ variantId: string; variantName: string; quantity: number }>>([
    { variantId: 'v1', variantName: 'Ideal Milk 160g Tin (MILK-160G)', quantity: 20 }
  ]);

  const { showToast } = useAlertStore();

  useEffect(() => {
    loadTransfers();
    loadCatalogProducts();
  }, []);

  const loadCatalogProducts = async () => {
    try {
      const res = await ApiClient.request('/catalog/products');
      if (res.success && res.data.length > 0) {
        setAvailableProducts(res.data.map((p: any) => ({
          id: p.id,
          name: `${p.productName} (${p.sku})`,
          stock: p.quantityOnHand
        })));
        if (res.data[0]) setSelectedVariantId(res.data[0].id);
      }
    } catch (e) {
      // Keep defaults
    }
  };

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.request('/transfers');
      if (res.success) setTransfers(res.data);
    } catch (e) {
      setTransfers([
        {
          id: 't1',
          transferNumber: 'TR-1001',
          sourceWarehouseId: 'WH-ACC-01',
          sourceWarehouseName: 'Accra Central Main Warehouse',
          destinationWarehouseId: 'WH-KMS-02',
          destinationWarehouseName: 'Kumasi Mall Outlet Warehouse',
          status: 'REQUESTED',
          requestedBy: 'Ebenezer Mensah',
          notes: 'Inter-branch stock re-balancing for beverage inventory',
          createdAt: new Date().toISOString(),
          items: [
            { id: 'ti1', variantId: 'v2', variantName: 'Coca-Cola Soft Drink 500ml', sku: 'COKE-500ML', quantity: 50 }
          ]
        },
        {
          id: 't2',
          transferNumber: 'TR-1002',
          sourceWarehouseId: 'WH-ACC-01',
          sourceWarehouseName: 'Accra Central Main Warehouse',
          destinationWarehouseId: 'WH-KMS-02',
          destinationWarehouseName: 'Kumasi Mall Outlet Warehouse',
          status: 'RECEIVED',
          requestedBy: 'Abena Osei',
          approvedBy: 'Ebenezer Mensah',
          notes: 'Emergency stock supply of milk tins',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          items: [
            { id: 'ti2', variantId: 'v1', variantName: 'Ideal Milk 160g Tin', sku: 'MILK-160G', quantity: 100 }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const prod = availableProducts.find(p => p.id === selectedVariantId);
    if (!prod) return;

    if (transferItems.some(i => i.variantId === selectedVariantId)) {
      showToast('warning', 'Item Already Added', 'This product is already in the transfer list. You can update its quantity.');
      return;
    }

    setTransferItems([
      ...transferItems,
      { variantId: prod.id, variantName: prod.name, quantity: itemQuantity }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(transferItems.filter((_, idx) => idx !== index));
  };

  const handleCreateTransfer = async () => {
    if (transferItems.length === 0) {
      showToast('warning', 'No Items Selected', 'Please add at least one item to state what you want to transfer.');
      return;
    }

    try {
      const res = await ApiClient.request('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          sourceWarehouseId,
          destinationWarehouseId: destWarehouseId,
          notes: transferNotes,
          items: transferItems.map(i => ({ variantId: i.variantId, quantity: i.quantity }))
        })
      });

      showToast('success', 'Transfer Requested', 'Inter-warehouse stock transfer requested successfully.');
      setCreateModalOpen(false);
      setTransferNotes('');
      loadTransfers();
    } catch (e: any) {
      showToast('error', 'Transfer Creation Failed', e.message);
    }
  };

  const handleUpdateStatus = async (transferId: string, transferNum: string, newStatus: WarehouseTransferDTO['status']) => {
    try {
      await ApiClient.request(`/transfers/${transferId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      showToast('success', `Transfer ${newStatus}`, `Transfer '${transferNum}' updated to ${newStatus}.`);
      setTransfers(transfers.map(t => t.id === transferId ? { ...t, status: newStatus } : t));
    } catch (e: any) {
      showToast('error', 'Status Update Failed', e.message);
    }
  };

  const getStatusBadge = (status: WarehouseTransferDTO['status']) => {
    switch (status) {
      case 'DRAFT': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">DRAFT</span>;
      case 'REQUESTED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">PENDING APPROVAL</span>;
      case 'APPROVED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">APPROVED</span>;
      case 'DISPATCHED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">IN TRANSIT</span>;
      case 'RECEIVED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">RECEIVED & RESTOCKED</span>;
      case 'CANCELLED': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">CANCELLED</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <ArrowRightLeft className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Inter-Warehouse Stock Transfer Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage multi-branch stock transfers, approve requests, dispatch shipments, and acknowledge received stock.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Request New Transfer</span>
        </button>
      </div>

      {/* Transfers Table with Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-teal-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Active Transfer Orders ({transfers.filter(t => t.status !== 'RECEIVED' && t.status !== 'CANCELLED').length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-teal-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Transfer History & Audit Log ({transfers.filter(t => t.status === 'RECEIVED' || t.status === 'CANCELLED').length})
            </button>
          </div>
          <span className="text-xs text-slate-500 font-mono">Showing {activeTab === 'active' ? 'pending/in-transit' : 'completed/archived'} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Transfer #</th>
                <th className="p-3">Source Warehouse</th>
                <th className="p-3">Destination Warehouse</th>
                <th className="p-3">Batch Stock Items</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transfers
                .filter(t => activeTab === 'active' ? (t.status !== 'RECEIVED' && t.status !== 'CANCELLED') : (t.status === 'RECEIVED' || t.status === 'CANCELLED'))
                .map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {t.transferNumber}
                    <span className="block text-[10px] text-slate-400 font-normal">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{t.sourceWarehouseName}</td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{t.destinationWarehouseName}</td>
                  <td className="p-3">
                    <div className="space-y-0.5">
                      {t.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.variantName} x<span className="font-mono text-teal-600 dark:text-teal-400">{item.quantity}</span>
                        </div>
                      ))}
                      {t.items.length > 2 && (
                        <span className="text-[10px] text-slate-400 italic">+{t.items.length - 2} more item(s)...</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">{getStatusBadge(t.status)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => setSelectedTransferDetail(t)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                        title="View Complete Batch Manifest"
                      >
                        View Manifest
                      </button>
                      {t.status === 'REQUESTED' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, t.transferNumber, 'APPROVED')}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow cursor-pointer"
                        >
                          Approve Transfer
                        </button>
                      )}
                      {t.status === 'APPROVED' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, t.transferNumber, 'DISPATCHED')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold shadow cursor-pointer flex items-center space-x-1"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Dispatch</span>
                        </button>
                      )}
                      {t.status === 'DISPATCHED' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, t.transferNumber, 'RECEIVED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow cursor-pointer flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Acknowledge Receive</span>
                        </button>
                      )}
                      {t.status === 'RECEIVED' && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Transfer Modal with Product Line Items Selector */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Request Inter-Warehouse Transfer</span>
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Source Warehouse</label>
                  <input
                    type="text"
                    disabled
                    value="Accra Main (WH-ACC-01)"
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Destination Warehouse"
                    value={destWarehouseId}
                    onChange={(val) => setDestWarehouseId(val)}
                    options={[
                      { value: 'WH-KMS-02', label: 'Kumasi Mall Outlet (WH-KMS-02)' },
                      { value: 'WH-TAK-03', label: 'Takoradi Port Store (WH-TAK-03)' }
                    ]}
                  />
                </div>
              </div>

              {/* Items to Transfer Section (Line Item Builder) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center space-x-1.5">
                  <Package className="w-4 h-4" />
                  <span>Items to Transfer (Stock Manifest)</span>
                </h4>

                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7">
                    <CustomSelect
                      label="Select Product / SKU"
                      value={selectedVariantId}
                      onChange={(val) => setSelectedVariantId(val)}
                      options={availableProducts.map(p => ({
                        value: p.id,
                        label: `${p.name} (Stock: ${p.stock})`
                      }))}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center transition cursor-pointer"
                      title="Add item to transfer list"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Transfer Items List */}
                <div className="space-y-1.5 pt-1">
                  {transferItems.length === 0 ? (
                    <div className="text-center py-3 text-slate-400 text-[11px]">No items added to this transfer yet. Select a product above.</div>
                  ) : (
                    transferItems.map((item, idx) => (
                      <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">{item.variantName}</span>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-extrabold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">x{item.quantity}</span>
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-600 p-1 rounded hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Transfer Notes / Reason</label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Stock replenishment for weekend promo sale"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-bold cursor-pointer">Cancel</button>
              <button onClick={handleCreateTransfer} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer">Submit Transfer Request</button>
            </div>
          </div>
        </div>
      )}

      {/* View Batch Manifest Detail Modal */}
      {selectedTransferDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 font-mono">{selectedTransferDetail.transferNumber}</span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Stock Transfer Batch Manifest</h3>
              </div>
              <button onClick={() => setSelectedTransferDetail(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Source Warehouse</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedTransferDetail.sourceWarehouseName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Destination Warehouse</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedTransferDetail.destinationWarehouseName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Requested By</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTransferDetail.requestedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Status</span>
                  <div>{getStatusBadge(selectedTransferDetail.status)}</div>
                </div>
              </div>

              {selectedTransferDetail.notes && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-600 dark:text-slate-400 italic">
                  "{selectedTransferDetail.notes}"
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-teal-600 dark:text-teal-400 flex items-center justify-between">
                  <span>Manifest Items ({selectedTransferDetail.items.length})</span>
                  <span className="font-mono text-slate-400">Total Units: {selectedTransferDetail.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedTransferDetail.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.variantName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || 'N/A'}</div>
                      </div>
                      <span className="font-mono font-extrabold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-1 rounded">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedTransferDetail(null)}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
