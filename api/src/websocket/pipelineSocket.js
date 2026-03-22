import { WebSocketServer } from 'ws';

let wss = null;

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS] Client connected from ${ip}. Total: ${wss.clients.size}`);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      } catch (_) {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Client disconnected. Remaining: ${wss.clients.size}`);
    });

    ws.on('error', (err) => {
      console.warn('[WS] Client error:', err.message);
    });

    // Send welcome / connection ack
    ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
  });

  // Heartbeat to detect stale connections
  const heartbeat = setInterval(() => {
    if (!wss) { clearInterval(heartbeat); return; }
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('[WS] WebSocket server ready at /ws');
  return wss;
}

export function broadcast(event, data) {
  if (!wss) return;
  const payload = JSON.stringify({ type: event, data, ts: Date.now() });
  let count = 0;
  wss.clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
      count++;
    }
  });
  if (count > 0) {
    console.log(`[WS] Broadcast '${event}' to ${count} client(s)`);
  }
}
