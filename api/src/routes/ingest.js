import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { publish, mqAvailable } from '../services/rabbitmq.js';
import { broadcast } from '../websocket/pipelineSocket.js';

const router = Router();

const REQUIRED_FIELDS = ['product_code', 'version', 'platform', 'status'];
const VALID_STATUSES  = ['SUCCESS', 'FAILURE', 'ABORTED', 'UNSTABLE', 'RUNNING'];

/**
 * POST /api/v1/pipeline/event
 * Ingest a pipeline event from CI systems.
 */
router.post('/event', async (req, res) => {
  try {
    const body = req.body;

    // Validate required fields
    const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
      });
    }

    if (!VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: VALID_STATUSES,
        received: body.status,
      });
    }

    const eventId = body.event_id || uuidv4();
    const message = {
      event_id:     eventId,
      product_code: body.product_code,
      version:      body.version,
      platform:     body.platform,
      status:       body.status,
      branch:       body.branch       || null,
      commit_sha:   body.commit_sha   || null,
      triggered_by: body.triggered_by || null,
      started_at:   body.started_at   || new Date().toISOString(),
      finished_at:  body.finished_at  || null,
      duration_ms:  body.duration_ms  || null,
      stages:       body.stages       || [],
      received_at:  new Date().toISOString(),
    };

    let queued = false;
    if (mqAvailable) {
      queued = await publish(process.env.RABBITMQ_ROUTING_KEY || 'pipeline.ingest', message);
    } else {
      console.warn('[Ingest] RabbitMQ unavailable, event not queued:', eventId);
    }

    // Broadcast over WebSocket so UI gets real-time update hint
    broadcast('pipeline.event', {
      event_id:     message.event_id,
      product_code: message.product_code,
      status:       message.status,
    });

    return res.status(202).json({
      accepted:  true,
      event_id:  eventId,
      queued,
      mq_available: mqAvailable,
    });
  } catch (err) {
    console.error('[Ingest] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
