import { Router } from 'express';
import { query } from '../services/database.js';

const router = Router();

/**
 * GET /api/v1/products
 * List all active products with domain and business-unit info.
 */
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        p.id,
        p.name,
        p.code,
        p.is_active,
        d.id   AS domain_id,
        d.name AS domain_name,
        d.code AS domain_code,
        bu.id   AS business_unit_id,
        bu.name AS business_unit_name,
        bu.code AS business_unit_code
      FROM product p
      JOIN domain d        ON d.id  = p.domain_id
      JOIN business_unit bu ON bu.id = d.business_unit_id
      WHERE p.is_active = TRUE
      ORDER BY bu.name, d.name, p.name
    `;
    const { rows } = await query(sql);
    return res.json({ products: rows });
  } catch (err) {
    console.error('[Products] list error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v1/products/:id/summary
 * Aggregated status counts, latest release, and recent timeline for one product.
 * Query params: from, to (ISO strings, default last 30 days)
 */
router.get('/:id/summary', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const toDate   = req.query.to   ? new Date(req.query.to)   : new Date();
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(toDate - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Status counts
    const countsSql = `
      SELECT
        pr.status,
        COUNT(*) AS count
      FROM pipeline_run pr
      JOIN release r ON r.id = pr.release_id
      WHERE r.product_id = $1
        AND pr.started_at BETWEEN $2 AND $3
      GROUP BY pr.status
    `;
    const countsResult = await query(countsSql, [productId, fromDate, toDate]);

    const statusCounts = { SUCCESS: 0, FAILURE: 0, RUNNING: 0, ABORTED: 0, UNSTABLE: 0 };
    for (const row of countsResult.rows) {
      statusCounts[row.status] = parseInt(row.count, 10);
    }

    // Latest release
    const releaseSql = `
      SELECT r.id, r.version, r.platform, r.is_active, r.created_at
      FROM release r
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    const releaseResult = await query(releaseSql, [productId]);
    const latestRelease = releaseResult.rows[0] || null;

    // Latest run
    const lastRunSql = `
      SELECT
        pr.id,
        pr.event_id,
        pr.status,
        pr.branch,
        pr.started_at,
        pr.finished_at,
        pr.duration_ms,
        r.version,
        r.platform
      FROM pipeline_run pr
      JOIN release r ON r.id = pr.release_id
      WHERE r.product_id = $1
      ORDER BY pr.started_at DESC
      LIMIT 1
    `;
    const lastRunResult = await query(lastRunSql, [productId]);
    const lastRun = lastRunResult.rows[0] || null;

    // Daily timeline (last 14 days bucketed)
    const timelineSql = `
      SELECT
        DATE_TRUNC('day', pr.started_at) AS day,
        pr.status,
        COUNT(*) AS count
      FROM pipeline_run pr
      JOIN release r ON r.id = pr.release_id
      WHERE r.product_id = $1
        AND pr.started_at BETWEEN $2 AND $3
      GROUP BY day, pr.status
      ORDER BY day
    `;
    const timelineResult = await query(timelineSql, [productId, fromDate, toDate]);

    return res.json({
      product_id:     productId,
      from:           fromDate.toISOString(),
      to:             toDate.toISOString(),
      status_counts:  statusCounts,
      latest_release: latestRelease,
      last_run:       lastRun,
      timeline:       timelineResult.rows,
    });
  } catch (err) {
    console.error('[Products] summary error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch product summary' });
  }
});

export default router;
