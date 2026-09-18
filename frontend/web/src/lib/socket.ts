import { io, Socket } from 'socket.io-client';

const envUrl = (import.meta as any).env?.VITE_API_URL;
const BACKEND_URL = envUrl 
  ? envUrl.replace('/api/v1', '')
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `http://${window.location.hostname}:4890`
      : window?.location?.origin || 'http://localhost:4890');

let socket: Socket | null = null;

export function getSocketInstance(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('⚡ [Real-Time WebSocket] Connected to Ave Retail Backend.');
    });

    socket.on('disconnect', () => {
      console.log('🔌 [Real-Time WebSocket] Disconnected from server.');
    });
  }
  return socket;
}

export function subscribeToRealtimeEvents(handlers: {
  onSaleCreated?: (data: any) => void;
  onStockUpdated?: (data: any) => void;
  onShiftUpdated?: (data: any) => void;
  onExpenseAdded?: (data: any) => void;
}) {
  const s = getSocketInstance();

  if (handlers.onSaleCreated) {
    s.on('sale:created', handlers.onSaleCreated);
  }
  if (handlers.onStockUpdated) {
    s.on('stock:updated', handlers.onStockUpdated);
  }
  if (handlers.onShiftUpdated) {
    s.on('shift:updated', handlers.onShiftUpdated);
  }
  if (handlers.onExpenseAdded) {
    s.on('expense:added', handlers.onExpenseAdded);
  }

  return () => {
    if (handlers.onSaleCreated) s.off('sale:created', handlers.onSaleCreated);
    if (handlers.onStockUpdated) s.off('stock:updated', handlers.onStockUpdated);
    if (handlers.onShiftUpdated) s.off('shift:updated', handlers.onShiftUpdated);
    if (handlers.onExpenseAdded) s.off('expense:added', handlers.onExpenseAdded);
  };
}
