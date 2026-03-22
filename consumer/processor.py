"""
processor.py – validates and persists pipeline events to PostgreSQL.
"""
import logging
from datetime import datetime, timezone

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = {"event_id", "product_code", "version", "platform", "status"}
VALID_STATUSES  = {"SUCCESS", "FAILURE", "ABORTED", "UNSTABLE", "RUNNING"}


def _parse_dt(value):
    """Parse an ISO datetime string or return None."""
    if not value:
        return None
    try:
        # Handle Z suffix
        if isinstance(value, str):
            value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def validate(message: dict) -> list[str]:
    """Return a list of validation error strings (empty = valid)."""
    errors = []
    for field in REQUIRED_FIELDS:
        if not message.get(field):
            errors.append(f"Missing required field: {field}")
    status = message.get("status", "")
    if status and status not in VALID_STATUSES:
        errors.append(f"Invalid status '{status}'. Valid: {VALID_STATUSES}")
    return errors


def process_message(message: dict, conn: psycopg2.extensions.connection) -> bool:
    """
    Validate, upsert product/release, insert pipeline_run + stages.
    Returns True on success, False on failure.
    """
    errors = validate(message)
    if errors:
        logger.warning("Validation failed for event %s: %s", message.get("event_id"), errors)
        return False

    event_id     = message["event_id"]
    product_code = message["product_code"]
    version      = message["version"]
    platform     = message["platform"]
    status       = message["status"]
    branch       = message.get("branch")
    commit_sha   = message.get("commit_sha")
    triggered_by = message.get("triggered_by")
    started_at   = _parse_dt(message.get("started_at")) or datetime.now(timezone.utc)
    finished_at  = _parse_dt(message.get("finished_at"))
    duration_ms  = message.get("duration_ms")
    stages       = message.get("stages") or []

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # ── 1. Get or skip unknown product ──────────────────────────
            cur.execute("SELECT id FROM product WHERE code = %s", (product_code,))
            product_row = cur.fetchone()
            if not product_row:
                logger.warning("Unknown product_code '%s', skipping event %s", product_code, event_id)
                conn.rollback()
                return False
            product_id = product_row["id"]

            # ── 2. Upsert release ────────────────────────────────────────
            cur.execute(
                """
                INSERT INTO release (product_id, version, platform)
                VALUES (%s, %s, %s)
                ON CONFLICT (product_id, version, platform) DO UPDATE
                  SET modified_at = NOW()
                RETURNING id
                """,
                (product_id, version, platform),
            )
            release_id = cur.fetchone()["id"]

            # ── 3. Resolve test_type_id (optional) ──────────────────────
            test_type_name = message.get("test_type")
            test_type_id   = None
            if test_type_name:
                cur.execute("SELECT id FROM test_type WHERE name = %s", (test_type_name,))
                tt = cur.fetchone()
                if tt:
                    test_type_id = tt["id"]

            # ── 4. Insert pipeline_run (idempotent on event_id) ─────────
            cur.execute(
                """
                INSERT INTO pipeline_run
                  (event_id, release_id, test_type_id, status,
                   branch, commit_sha, triggered_by,
                   started_at, finished_at, duration_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (event_id) DO UPDATE
                  SET status      = EXCLUDED.status,
                      finished_at = EXCLUDED.finished_at,
                      duration_ms = EXCLUDED.duration_ms,
                      modified_at = NOW()
                RETURNING id
                """,
                (
                    event_id, release_id, test_type_id,
                    status, branch, commit_sha, triggered_by,
                    started_at, finished_at, duration_ms,
                ),
            )
            run_id = cur.fetchone()["id"]

            # ── 5. Insert / replace stages ───────────────────────────────
            if stages:
                # Remove old stages so we can re-insert fresh ones
                cur.execute("DELETE FROM pipeline_stage WHERE pipeline_run_id = %s", (run_id,))
                for idx, stage in enumerate(stages, start=1):
                    s_name      = stage.get("name", f"Stage {idx}")
                    s_status    = stage.get("status", "RUNNING")
                    if s_status not in VALID_STATUSES:
                        s_status = "RUNNING"
                    s_started   = _parse_dt(stage.get("started_at"))
                    s_finished  = _parse_dt(stage.get("finished_at"))
                    s_dur       = stage.get("duration_ms")
                    s_err       = stage.get("error_message")

                    cur.execute(
                        """
                        INSERT INTO pipeline_stage
                          (pipeline_run_id, name, status, stage_order,
                           started_at, finished_at, duration_ms, error_message)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (run_id, s_name, s_status, idx,
                         s_started, s_finished, s_dur, s_err),
                    )

        conn.commit()
        logger.info("Processed event %s → run_id=%d  status=%s", event_id, run_id, status)
        return True

    except Exception as exc:
        conn.rollback()
        logger.error("Failed to process event %s: %s", event_id, exc, exc_info=True)
        return False
