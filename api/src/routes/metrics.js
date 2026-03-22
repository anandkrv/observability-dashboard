import { Router } from 'express';
import { query } from '../services/database.js';

const router = Router();

/**
 * GET /api/v1/metrics/timeline
 * Daily success/failure counts, optionally filtered by product_id and date range.
 * Query params: product_id, from, to
 */
router.get('/timeline', async (req, res) => {
  try {
    const { product_id, from: fromRaw, to: toRaw } = req.query;

    const toDate   = toRaw   ? new Date(toRaw)   : new Date();
    const fromDate = fromRaw ? new Date(fromRaw)  : new Date(toDate - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const conditions = ['pr.started_at BETWEEN $1 AND $2'];
    const params     = [fromDate, toDate];
    let   pi         = 3;

    if (product_id) {
      conditions.push(`r.product_id = $${pi++}`);
      params.push(parseInt(product_id, 10));
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const sql = `
      SELECT
        DATE_TRUNC('day', pr.started_at) AS day,
        pr.status,
        COUNT(*) AS count
      FROM pipeline_run pr
      JOIN release r ON r.id = pr.release_id
      ${where}
      GROUP BY day, pr.status
      ORDER BY day
    `;

    const result = await query(sql, params);

    // Pivot into day -> { SUCCESS, FAILURE, ... }
    const byDay = {};
    for (const row of result.rows) {
      const d = row.day.toISOString().slice(0, 10);
      if (!byDay[d]) {
        byDay[d] = { day: d, SUCCESS: 0, FAILURE: 0, RUNNING: 0, ABORTED: 0, UNSTABLE: 0 };
      }
      byDay[d][row.status] = parseInt(row.count, 10);
    }

    const timeline = Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));

    return res.json({ from: fromDate.toISOString(), to: toDate.toISOString(), timeline });
  } catch (err) {
    console.error('[Metrics] timeline error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch timeline metrics' });
  }
});

/**
 * GET /api/v1/releases
 * Releases filtered by product_id (required) or all releases.
 */
router.get('/releases', async (req, res) => {
  try {
    const { product_id } = req.query;

    const conditions = [];
    const params     = [];
    let   pi         = 1;

    if (product_id) {
      conditions.push(`r.product_id = $${pi++}`);
      params.push(parseInt(product_id, 10));
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
      SELECT
        r.id,
        r.version,
        r.platform,
        r.is_active,
        r.created_at,
        p.id   AS product_id,
        p.name AS product_name,
        p.code AS product_code
      FROM release r
      JOIN product p ON p.id = r.product_id
      ${where}
      ORDER BY p.name, r.version DESC, r.platform
    `;

    const result = await query(sql, params);
    return res.json({ releases: result.rows });
  } catch (err) {
    console.error('[Metrics] releases error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

export default router;
