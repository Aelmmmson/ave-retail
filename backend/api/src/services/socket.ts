import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 [Socket.io] Terminal Client Connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.io] Terminal Client Disconnected: ${socket.id}`);
    });
  });

  console.log('⚡ Socket.io Real-Time WebSockets Engine Initialized.');
  return io;
}

export function getSocketServer(): Server | null {
  return io;
}

// Event Broadcast Helpers
export function broadcastSaleCreated(saleData: any) {
  if (io) {
    io.emit('sale:created', { timestamp: new Date().toISOString(), sale: saleData });
  }
}

export function broadcastStockUpdated(stockData: any) {
  if (io) {
    io.emit('stock:updated', { timestamp: new Date().toISOString(), stock: stockData });
  }
}

export function broadcastShiftUpdated(shiftData: any) {
  if (io) {
    io.emit('shift:updated', { timestamp: new Date().toISOString(), shift: shiftData });
  }
}

export function broadcastExpenseAdded(expenseData: any) {
  if (io) {
    io.emit('expense:added', { timestamp: new Date().toISOString(), expense: expenseData });
  }
}
