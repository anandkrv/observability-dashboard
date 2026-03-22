import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { pool } from './services/database.js';
import { connect as connectMQ } from './services/rabbitmq.js';
import { setupWebSocket } from './websocket/pipelineSocket.js';

import ingestRoutes   from './routes/ingest.js';
import productsRoutes from './routes/products.js';
import runsRoutes     from './routes/runs.js';
import metricsRoutes  from './routes/metrics.js';
import chatRoutes     from './routes/chat.js';

const PORT        = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ──────────────────────────────────────────────
// App
// ──────────────────────────────────────────────
const app = express();

// Security
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Jenkins-Token'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'error', error: err.message });
  }
});

app.use('/api/v1/pipeline', ingestRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/pipeline-runs', runsRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/chat', chatRoutes);

// Releases shortcut (also accessible at /api/v1/releases)
app.get('/api/v1/releases', async (req, res) => {
  const { product_id } = req.query;
  try {
    const { query } = await import('./services/database.js');
    const conditions = [];
    const params     = [];
    let   pi         = 1;
    if (product_id) {
      conditions.push(`r.product_id = $${pi++}`);
      params.push(parseInt(product_id, 10));
    }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `
      SELECT r.id, r.version, r.platform, r.is_active, r.created_at,
             p.id AS product_id, p.name AS product_name, p.code AS product_code
      FROM release r
      JOIN product p ON p.id = r.product_id
      ${where}
      ORDER BY p.name, r.version DESC, r.platform
    `;
    const result = await query(sql, params);
    res.json({ releases: result.rows });
  } catch (err) {
    console.error('[Releases] error:', err.message);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ──────────────────────────────────────────────
// HTTP + WebSocket server
// ──────────────────────────────────────────────
const server = http.createServer(app);
setupWebSocket(server);

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
async function start() {
  // Connect to PostgreSQL (fail-fast)
  try {
    await pool.query('SELECT 1');
    console.log('[DB] PostgreSQL connected');
  } catch (err) {
    console.error('[DB] Cannot connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  // Connect to RabbitMQ (soft fail)
  connectMQ().catch((err) => {
    console.warn('[MQ] Initial connect failed (will retry):', err.message);
  });

  server.listen(PORT, () => {
    console.log(`[Server] Observability API listening on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket available at ws://localhost:${PORT}/ws`);
    console.log(`[Server] CORS origin: ${CORS_ORIGIN}`);
  });
}

// ──────────────────────────────────────────────
// Graceful shutdown
// ──────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[Server] ${signal} received, shutting down...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('[Server] PostgreSQL pool closed');
    } catch (_) { /* ignore */ }
    console.log('[Server] Shutdown complete');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start();
