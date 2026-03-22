import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef       = useRef(null);
  const retryRef    = useRef(null);
  const retryCount  = useRef(0);
  const MAX_RETRIES = 10;

  function connect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        retryCount.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pipeline.event') {
            // Invalidate relevant queries so UI refreshes
            queryClient.invalidateQueries({ queryKey: ['pipeline-runs'] });
            queryClient.invalidateQueries({ queryKey: ['product-summary'] });
          }
        } catch (_) {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.warn('[WS] Error', err);
        ws.close();
      };
    } catch (err) {
      console.warn('[WS] Cannot create WebSocket:', err.message);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (retryCount.current >= MAX_RETRIES) {
      console.warn('[WS] Max retries reached, giving up');
      return;
    }
    const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
    retryCount.current++;
    retryRef.current = setTimeout(connect, delay);
  }

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;  // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
