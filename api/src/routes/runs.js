import { Router } from 'express';
import { query } from '../services/database.js';

const router = Router();

/**
 * GET /api/v1/pipeline-runs
 * Paginated list with filters: product_id, release_id, platform, status, from, to
 */
router.get('/', async (req, res) => {
  try {
    const {
      product_id,
      release_id,
      platform,
      status,
      from: fromRaw,
      to: toRaw,
      page = '1',
      limit: limitRaw = '20',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20));
    const offset   = (pageNum - 1) * pageSize;

    const conditions = [];
    const params     = [];
    let   pi         = 1;

    if (product_id) {
      conditions.push(`r.product_id = $${pi++}`);
      params.push(parseInt(product_id, 10));
    }
    if (release_id) {
      conditions.push(`pr.release_id = $${pi++}`);
      params.push(parseInt(release_id, 10));
    }
    if (platform) {
      conditions.push(`r.platform = $${pi++}`);
      params.push(platform);
    }
    if (status) {
      const statuses = status.split(',').map((s) => s.trim().toUpperCase());
      conditions.push(`pr.status = ANY($${pi++}::pipeline_status_enum[])`);
      params.push(statuses);
    }
    if (fromRaw) {
      conditions.push(`pr.started_at >= $${pi++}`);
      params.push(new Date(fromRaw));
    }
    if (toRaw) {
      conditions.push(`pr.started_at <= $${pi++}`);
      params.push(new Date(toRaw));
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM pipeline_run pr
      JOIN release r ON r.id = pr.release_id
      ${where}
    `;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataSql = `
      SELECT
        pr.id,
        pr.event_id,
        pr.status,
        pr.branch,
        pr.commit_sha,
        pr.triggered_by,
        pr.started_at,
        pr.finished_at,
        pr.duration_ms,
        r.id       AS release_id,
        r.version,
        r.platform,
        p.id       AS product_id,
        p.name     AS product_name,
        p.code     AS product_code,
        d.name     AS domain_name,
        bu.name    AS business_unit_name
      FROM pipeline_run pr
      JOIN release r        ON r.id  = pr.release_id
      JOIN product p        ON p.id  = r.product_id
      JOIN domain d         ON d.id  = p.domain_id
      JOIN business_unit bu ON bu.id = d.business_unit_id
      ${where}
      ORDER BY pr.started_at DESC
      LIMIT $${pi++} OFFSET $${pi++}
    `;
    params.push(pageSize, offset);

    const dataResult = await query(dataSql, params);

    return res.json({
      total,
      page:       pageNum,
      page_size:  pageSize,
      total_pages: Math.ceil(total / pageSize),
      runs:       dataResult.rows,
    });
  } catch (err) {
    console.error('[Runs] list error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch pipeline runs' });
  }
});

/**
 * GET /api/v1/pipeline-runs/:id
 * Full run details including all stages.
 */
router.get('/:id', async (req, res) => {
  try {
    const runId = parseInt(req.params.id, 10);
    if (isNaN(runId)) {
      return res.status(400).json({ error: 'Invalid run id' });
    }

    const runSql = `
      SELECT
        pr.id,
        pr.event_id,
        pr.status,
        pr.branch,
        pr.commit_sha,
        pr.triggered_by,
        pr.started_at,
        pr.finished_at,
        pr.duration_ms,
        pr.created_at,
        r.id       AS release_id,
        r.version,
        r.platform,
        p.id       AS product_id,
        p.name     AS product_name,
        p.code     AS product_code,
        d.name     AS domain_name,
        bu.name    AS business_unit_name,
        tt.name    AS test_type_name,
        ta.name    AS test_area_name
      FROM pipeline_run pr
      JOIN release r        ON r.id   = pr.release_id
      JOIN product p        ON p.id   = r.product_id
      JOIN domain d         ON d.id   = p.domain_id
      JOIN business_unit bu ON bu.id  = d.business_unit_id
      LEFT JOIN test_type tt ON tt.id = pr.test_type_id
      LEFT JOIN test_area ta ON ta.id = tt.test_area_id
      WHERE pr.id = $1
    `;
    const runResult = await query(runSql, [runId]);
    if (runResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline run not found' });
    }
    const run = runResult.rows[0];

    const stagesSql = `
      SELECT
        id,
        name,
        status,
        stage_order,
        started_at,
        finished_at,
        duration_ms,
        error_message
      FROM pipeline_stage
      WHERE pipeline_run_id = $1
      ORDER BY stage_order
    `;
    const stagesResult = await query(stagesSql, [runId]);

    return res.json({ run: { ...run, stages: stagesResult.rows } });
  } catch (err) {
    console.error('[Runs] detail error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch run details' });
  }
});

export default router;
