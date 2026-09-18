import Dexie, { Table } from 'dexie';

// Dexie Offline Storage Database
export interface OfflineSaleQueue {
  id?: number;
  idempotencyKey: string;
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface OfflineProduct {
  id: string;
  sku: string;
  barcode: string;
  productName: string;
  variantName: string;
  costPrice: number;
  sellingPrice: number;
  quantityOnHand: number;
  categoryName: string;
}

class AveOfflineDB extends Dexie {
  salesQueue!: Table<OfflineSaleQueue>;
  products!: Table<OfflineProduct>;

  constructor() {
    super('AveRetailDB');
    this.version(1).stores({
      salesQueue: '++id, idempotencyKey, status',
      products: 'id, sku, barcode, productName'
    });
  }
}

export const offlineDb = new AveOfflineDB();

const BACKEND_PORT = 4890;
const API_BASE = (import.meta as any).env?.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:${BACKEND_PORT}/api/v1`
    : '/api/v1'
);

export class ApiClient {
  static async request(path: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      
      const contentType = res.headers.get('content-type') || '';
      let data: any = {};

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: res.ok ? text : `Server returned non-JSON response (${res.status} ${res.statusText})` };
      }

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      return data;
    } catch (err: any) {
      let friendlyMessage = err.message || 'API Request Failed';
      if (err.name === 'TypeError' && String(err.message).toLowerCase().includes('fetch')) {
        friendlyMessage = 'Backend API server is offline or unreachable on Port 4890. Please run `npm run dev`.';
      }
      console.warn(`[API Client Notice] Path: ${path} | Error: ${friendlyMessage}`);
      throw new Error(friendlyMessage);
    }
  }

  // Sync Offline Pending Queue
  static async syncOfflineSales() {
    const pending = await offlineDb.salesQueue.where({ status: 'PENDING' }).toArray();
    console.log(`🔄 Checking offline queue: ${pending.length} unsynced sales found.`);

    for (const item of pending) {
      try {
        const res = await ApiClient.request('/sales', {
          method: 'POST',
          body: JSON.stringify(item.payload)
        });
        if (res.success) {
          await offlineDb.salesQueue.update(item.id!, { status: 'SYNCED' });
          console.log(`✅ Synced sale ${item.idempotencyKey}`);
        }
      } catch (e) {
        console.error(`❌ Failed sync for sale ${item.idempotencyKey}:`, e);
      }
    }
  }
}
