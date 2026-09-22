import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { router as apiRouter } from './routes/api';
import { initSocketServer } from './services/socket';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4890;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Ave Retail Backend API', port: PORT, timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', apiRouter);

// Global Error Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const server = http.createServer(app);

// Initialize Socket.io WebSockets Engine
initSocketServer(server);

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is occupied by another running instance.`);
    console.error(`👉 Close previous terminal windows or run: npx kill-port ${PORT}\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Ave Retail API Server running at http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Server listening on ws://localhost:${PORT}`);
});
