# Observability Dashboard — Production-Ready Project Prompt

> **Scope:** End-to-end CI/CD pipeline observability platform  
> **Stack:** Jenkins → RabbitMQ → Python → PostgreSQL → Node.js → React.js  
> **Purpose:** Real-time and historical visibility into release pipeline health across products, platforms, and test areas

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

```
Jenkins Pipelines
      │  HTTP POST (payload)
      ▼
┌─────────────────────┐
│  Node.js API Server │  ← REST API, validates & routes
│  /api/v1/pipeline   │
└─────────┬───────────┘
          │ Publish message
          ▼
┌─────────────────────┐
│     RabbitMQ        │  ← Message broker
│  Exchange: ci.events│
│  Queue: pipeline.raw│
└─────────┬───────────┘
          │ Consume
          ▼
┌─────────────────────┐
│  Python Consumer    │  ← Validates, enriches, persists
│  (worker service)   │
└─────────┬───────────┘
          │ SQL writes
          ▼
┌─────────────────────┐
│   PostgreSQL DB     │  ← Normalized schema
│   (primary store)   │
└─────────┬───────────┘
          │ Queries / REST
          ▼
┌─────────────────────┐
│  Node.js API Server │  ← DB queries, aggregation, WebSocket push
└─────────┬───────────┘
          │ HTTP / WS
          ▼
┌─────────────────────┐
│   React.js UI       │  ← Dashboard, filters, dialogs
└─────────────────────┘
```

---

## 2. JENKINS API — INGEST ENDPOINT

### 2.1 Endpoint Definition

```
POST /api/v1/pipeline/event
Host: <observability-host>
Authorization: Bearer <JENKINS_API_TOKEN>
Content-Type: application/json
```

### 2.2 Payload Schema (JSON)

```json
{
  "product": {
    "name": "PaymentGateway",
    "domain": "FinancialServices",
    "business_unit": "Payments"
  },
  "release": {
    "version": "v3.2.1",
    "build_number": "1042",
    "platform": "linux-x64"
  },
  "test": {
    "area": "Integration",
    "type": "API"
  },
  "pipeline": {
    "name": "payment-gateway-release",
    "status": "SUCCESS",
    "jenkins_log_url": "https://jenkins.company.com/job/payment-gateway/1042/console",
    "triggered_by": "scm",
    "started_at": "2025-03-20T08:00:00Z",
    "finished_at": "2025-03-20T08:14:35Z",
    "duration_seconds": 875
  },
  "stages": [
    {
      "name": "Checkout",
      "status": "SUCCESS",
      "started_at": "2025-03-20T08:00:05Z",
      "finished_at": "2025-03-20T08:00:22Z",
      "duration_seconds": 17,
      "log_url": "https://jenkins.company.com/job/payment-gateway/1042/execution/node/3/log"
    },
    {
      "name": "Build",
      "status": "SUCCESS",
      "started_at": "2025-03-20T08:00:23Z",
      "finished_at": "2025-03-20T08:04:10Z",
      "duration_seconds": 227,
      "log_url": "https://jenkins.company.com/job/payment-gateway/1042/execution/node/5/log"
    },
    {
      "name": "Unit Tests",
      "status": "SUCCESS",
      "started_at": "2025-03-20T08:04:11Z",
      "finished_at": "2025-03-20T08:07:55Z",
      "duration_seconds": 224,
      "log_url": "https://jenkins.company.com/job/payment-gateway/1042/execution/node/7/log"
    },
    {
      "name": "Integration Tests",
      "status": "FAILURE",
      "started_at": "2025-03-20T08:07:56Z",
      "finished_at": "2025-03-20T08:14:35Z",
      "duration_seconds": 399,
      "log_url": "https://jenkins.company.com/job/payment-gateway/1042/execution/node/9/log"
    }
  ],
  "metadata": {
    "environment": "staging",
    "tags": ["nightly", "regression"],
    "submitted_at": "2025-03-20T08:14:40Z"
  }
}
```

### 2.3 Pipeline Status Enum

| Value       | Meaning                               |
|-------------|---------------------------------------|
| `RUNNING`   | Pipeline is in-flight                 |
| `SUCCESS`   | All stages passed                     |
| `FAILURE`   | One or more stages failed             |
| `ABORTED`   | Manually cancelled                    |
| `UNSTABLE`  | Tests ran but with failures           |
| `UNKNOWN`   | Status could not be determined        |

### 2.4 Node.js API Implementation Notes

- Validate required fields: `product.name`, `release.version`, `release.build_number`, `pipeline.status`
- Generate a UUID `event_id` for idempotency
- Publish to RabbitMQ exchange `ci.events` with routing key `pipeline.ingest`
- Return `202 Accepted` with `{ "event_id": "<uuid>", "status": "queued" }`
- Return `400 Bad Request` with field-level validation errors on bad payload
- Authenticate via `Authorization: Bearer` header; store tokens in env/secret manager

```javascript
// Example Jenkinsfile step
post {
  always {
    script {
      def payload = [
        product: [name: env.PRODUCT_NAME, domain: env.PRODUCT_DOMAIN, business_unit: env.BU],
        release: [version: env.RELEASE_VERSION, build_number: env.BUILD_NUMBER, platform: env.PLATFORM],
        test: [area: env.TEST_AREA, type: env.TEST_TYPE],
        pipeline: [
          name: env.JOB_NAME,
          status: currentBuild.result ?: 'UNKNOWN',
          jenkins_log_url: env.BUILD_URL + 'console',
          started_at: new Date(currentBuild.startTimeInMillis).format("yyyy-MM-dd'T'HH:mm:ss'Z'"),
          finished_at: new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'"),
          duration_seconds: (currentBuild.duration / 1000).toInteger()
        ],
        stages: pipelineStages  // populated per stage in your Jenkinsfile
      ]
      httpRequest(
        url: "${OBSERVABILITY_API_URL}/api/v1/pipeline/event",
        httpMode: 'POST',
        contentType: 'APPLICATION_JSON',
        requestBody: groovy.json.JsonOutput.toJson(payload),
        customHeaders: [[name: 'Authorization', value: "Bearer ${OBSERVABILITY_TOKEN}"]]
      )
    }
  }
}
```

---

## 3. RABBITMQ CONFIGURATION

### 3.1 Topology

```
Exchange:  ci.events          (type: topic, durable: true)
  ├── Routing Key: pipeline.ingest  → Queue: pipeline.raw
  └── Routing Key: pipeline.dlq     → Queue: pipeline.dead_letter

Queue: pipeline.raw
  - durable: true
  - arguments:
      x-dead-letter-exchange: ci.events
      x-dead-letter-routing-key: pipeline.dlq
      x-message-ttl: 86400000    (24 hours)
      x-max-length: 100000

Queue: pipeline.dead_letter
  - durable: true
  - purpose: failed/unprocessable messages for inspection
```

### 3.2 Message Envelope

```json
{
  "event_id": "uuid-v4",
  "event_type": "pipeline.completed",
  "schema_version": "1.0",
  "published_at": "2025-03-20T08:14:40Z",
  "source": "jenkins",
  "payload": { /* full Jenkins payload as in §2.2 */ }
}
```

---

## 4. PYTHON CONSUMER SERVICE

### 4.1 Responsibilities

1. Connect to RabbitMQ, subscribe to `pipeline.raw` with prefetch=5
2. Deserialize and validate message envelope and payload
3. Upsert reference data (product, domain, BU, test area, test type)
4. Insert pipeline run record with stages as child rows
5. Acknowledge on success; NACK (dead-letter) on unrecoverable errors

### 4.2 Validation Rules

```python
REQUIRED_FIELDS = {
    "product.name": str,
    "release.version": str,
    "release.build_number": str,
    "release.platform": str,
    "pipeline.name": str,
    "pipeline.status": ["RUNNING","SUCCESS","FAILURE","ABORTED","UNSTABLE","UNKNOWN"],
    "pipeline.started_at": "iso8601",
}

# Soft validation (warn, do not reject):
# - stages list may be empty for RUNNING status
# - test.area / test.type default to "General" / "Unspecified" if missing
# - duration_seconds computed from timestamps if not provided
```

### 4.3 Processing Flow

```python
def process_message(msg):
    envelope = json.loads(msg.body)
    payload  = envelope["payload"]

    validate_schema(payload)                  # raises ValidationError → NACK
    product  = upsert_product(payload)        # returns product_id
    release  = upsert_release(payload, product.id)
    test_cfg = upsert_test_config(payload)
    run      = insert_pipeline_run(payload, product.id, release.id, test_cfg.id)
    for stage in payload.get("stages", []):
        insert_stage(stage, run.id)

    msg.ack()
```

---

## 5. POSTGRESQL SCHEMA

```sql
-- ─────────────────────────────────────────────
-- REFERENCE / LOOKUP TABLES
-- ─────────────────────────────────────────────

CREATE TABLE business_unit (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    is_active     BOOLEAN DEFAULT TRUE,
    created_by    VARCHAR(100),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    modified_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE domain (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    business_unit_id INT REFERENCES business_unit(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    modified_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    domain_id   INT REFERENCES domain(id),
    is_active   BOOLEAN DEFAULT TRUE,
    owner_email VARCHAR(255),
    created_by  VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_area (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,    -- e.g., "Integration", "E2E", "Unit"
    is_active   BOOLEAN DEFAULT TRUE,
    created_by  VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE test_type (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,           -- e.g., "API", "UI", "Performance"
    test_area_id INT REFERENCES test_area(id),
    is_active    BOOLEAN DEFAULT TRUE,
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    modified_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name, test_area_id)
);

-- ─────────────────────────────────────────────
-- RELEASE / BUILD TABLES
-- ─────────────────────────────────────────────

CREATE TABLE release (
    id           SERIAL PRIMARY KEY,
    product_id   INT NOT NULL REFERENCES product(id),
    version      VARCHAR(50)  NOT NULL,
    platform     VARCHAR(100) NOT NULL,
    is_active    BOOLEAN DEFAULT TRUE,
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    modified_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_id, version, platform)
);

-- ─────────────────────────────────────────────
-- PIPELINE RUN TABLE (core fact table)
-- ─────────────────────────────────────────────

CREATE TYPE pipeline_status_enum AS ENUM (
    'RUNNING', 'SUCCESS', 'FAILURE', 'ABORTED', 'UNSTABLE', 'UNKNOWN'
);

CREATE TABLE pipeline_run (
    id               BIGSERIAL PRIMARY KEY,
    event_id         UUID NOT NULL UNIQUE,         -- idempotency key from message envelope
    product_id       INT  NOT NULL REFERENCES product(id),
    release_id       INT  NOT NULL REFERENCES release(id),
    test_area_id     INT  REFERENCES test_area(id),
    test_type_id     INT  REFERENCES test_type(id),
    build_number     VARCHAR(50)  NOT NULL,
    pipeline_name    VARCHAR(255) NOT NULL,
    status           pipeline_status_enum NOT NULL DEFAULT 'UNKNOWN',
    jenkins_log_url  TEXT,
    triggered_by     VARCHAR(100),
    environment      VARCHAR(50),
    tags             TEXT[],
    started_at       TIMESTAMPTZ,
    finished_at      TIMESTAMPTZ,
    duration_seconds INT,
    raw_payload      JSONB,                        -- full original payload for forensics
    is_active        BOOLEAN DEFAULT TRUE,
    created_by       VARCHAR(100),
    email            VARCHAR(255),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    modified_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PIPELINE STAGE TABLE
-- ─────────────────────────────────────────────

CREATE TABLE pipeline_stage (
    id               BIGSERIAL PRIMARY KEY,
    pipeline_run_id  BIGINT NOT NULL REFERENCES pipeline_run(id) ON DELETE CASCADE,
    stage_name       VARCHAR(255) NOT NULL,
    status           pipeline_status_enum NOT NULL DEFAULT 'UNKNOWN',
    started_at       TIMESTAMPTZ,
    finished_at      TIMESTAMPTZ,
    duration_seconds INT,
    log_url          TEXT,
    stage_order      SMALLINT,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    modified_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AUDIT / USER TABLE
-- ─────────────────────────────────────────────

CREATE TABLE app_user (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    role        VARCHAR(50) DEFAULT 'viewer',   -- viewer | editor | admin
    is_active   BOOLEAN DEFAULT TRUE,
    last_login  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX idx_pipeline_run_product  ON pipeline_run(product_id);
CREATE INDEX idx_pipeline_run_release  ON pipeline_run(release_id);
CREATE INDEX idx_pipeline_run_status   ON pipeline_run(status);
CREATE INDEX idx_pipeline_run_started  ON pipeline_run(started_at DESC);
CREATE INDEX idx_pipeline_run_event_id ON pipeline_run(event_id);
CREATE INDEX idx_pipeline_stage_run    ON pipeline_stage(pipeline_run_id);

-- ─────────────────────────────────────────────
-- AUTO-UPDATE modified_at TRIGGER
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_modified_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.modified_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply trigger to all tables with modified_at
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['business_unit','domain','product','test_area','test_type',
                               'release','pipeline_run','pipeline_stage','app_user']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_modified BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_modified_at()', tbl, tbl);
  END LOOP;
END $$;
```

---

## 6. NODE.JS API SERVER

### 6.1 Route Map

| Method | Path                                    | Description                                      |
|--------|-----------------------------------------|--------------------------------------------------|
| POST   | `/api/v1/pipeline/event`                | Ingest from Jenkins → publish to RabbitMQ        |
| GET    | `/api/v1/products`                      | List all active products with domains & BUs      |
| GET    | `/api/v1/products/:id/summary`          | Aggregated status counts for a product + timeline|
| GET    | `/api/v1/releases`                      | Releases filtered by product, platform           |
| GET    | `/api/v1/pipeline-runs`                 | Paginated runs (filters: product, release, platform, status, from, to) |
| GET    | `/api/v1/pipeline-runs/:id`             | Full run details including stages                |
| GET    | `/api/v1/metrics/timeline`              | Aggregated success/failure counts by day         |
| WS     | `/ws/pipeline-events`                   | Real-time push for RUNNING → terminal status     |

### 6.2 Query: Product Tile Summary

```sql
-- Returns status counts per product for given timeline
SELECT
    p.id,
    p.name AS product_name,
    d.name AS domain,
    bu.name AS business_unit,
    r.version,
    r.platform,
    COUNT(*) FILTER (WHERE pr.status = 'SUCCESS')  AS success_count,
    COUNT(*) FILTER (WHERE pr.status = 'FAILURE')  AS failure_count,
    COUNT(*) FILTER (WHERE pr.status = 'RUNNING')  AS running_count,
    COUNT(*) FILTER (WHERE pr.status = 'ABORTED')  AS aborted_count,
    COUNT(*) FILTER (WHERE pr.status = 'UNSTABLE') AS unstable_count,
    COUNT(*) FILTER (WHERE pr.status = 'UNKNOWN')  AS unknown_count,
    COUNT(*) AS total_runs,
    MAX(pr.started_at) AS last_run_at
FROM pipeline_run pr
JOIN product p   ON pr.product_id  = p.id
JOIN release r   ON pr.release_id  = r.id
JOIN domain  d   ON p.domain_id    = d.id
JOIN business_unit bu ON d.business_unit_id = bu.id
WHERE pr.started_at BETWEEN :from AND :to
  AND (:product_id IS NULL OR p.id = :product_id)
  AND (:platform   IS NULL OR r.platform = :platform)
  AND p.is_active = TRUE
GROUP BY p.id, p.name, d.name, bu.name, r.version, r.platform
ORDER BY p.name, r.version DESC;
```

### 6.3 Query: Pipeline Runs for Dialog

```sql
-- Returns runs and their stages for a specific product + release + status
SELECT
    pr.id,
    pr.build_number,
    pr.pipeline_name,
    pr.status,
    pr.started_at,
    pr.finished_at,
    pr.duration_seconds,
    pr.jenkins_log_url,
    r.version,
    r.platform,
    ta.name  AS test_area,
    tt.name  AS test_type,
    json_agg(
      json_build_object(
        'stage_name',       ps.stage_name,
        'status',           ps.status,
        'started_at',       ps.started_at,
        'finished_at',      ps.finished_at,
        'duration_seconds', ps.duration_seconds,
        'log_url',          ps.log_url,
        'stage_order',      ps.stage_order
      ) ORDER BY ps.stage_order
    ) AS stages
FROM pipeline_run pr
JOIN release r  ON pr.release_id  = r.id
LEFT JOIN test_area ta  ON pr.test_area_id = ta.id
LEFT JOIN test_type tt  ON pr.test_type_id = tt.id
LEFT JOIN pipeline_stage ps ON ps.pipeline_run_id = pr.id
WHERE pr.product_id = :product_id
  AND pr.release_id = :release_id
  AND (:status IS NULL OR pr.status = :status)
  AND pr.started_at BETWEEN :from AND :to
GROUP BY pr.id, r.version, r.platform, ta.name, tt.name
ORDER BY pr.started_at DESC
LIMIT 50;
```

---

## 7. REACT.JS UI — DESIGN SPECIFICATION

### 7.1 Design Direction

**Aesthetic:** Industrial-precision dark theme. Dense information, zero fluff. Color as signal, not decoration. Monospaced metrics, sharp grid lines. Inspired by mission control dashboards and terminal interfaces with a modern polish layer.

**Palette:**
- Background: `#0A0C10` (near-black)
- Surface:     `#111318`
- Border:      `#1E2330`
- Accent blue: `#2D8CF0`
- Success:     `#18C964`
- Failure:     `#F31260`
- Running:     `#F5A623`
- Aborted:     `#7B7E8C`
- Unstable:    `#E07B39`
- Unknown:     `#4A5568`
- Text primary:   `#E2E8F0`
- Text secondary: `#8892A4`

**Typography:**
- Display/numbers: `JetBrains Mono` (monospace — metrics feel live)
- UI labels:       `IBM Plex Sans`

### 7.2 Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | "Pipeline Observatory" | User avatar | Settings │
├──────────────────┬──────────────────────────────────────────────┤
│  FILTER BAR      │                                              │
│  Product ▼       │  Timeline: [1W] [1M] [6M] [Custom📅]        │
│  Release ▼       │                                              │
│  Platform ▼      │  Last updated: 14s ago  ● LIVE              │
├──────────────────┴──────────────────────────────────────────────┤
│  PRODUCT TILES GRID (responsive, 3–4 cols)                      │
│  ┌────────────────────┐  ┌────────────────────┐  ...            │
│  │ PaymentGateway     │  │ AuthService        │                 │
│  │ FinSvc / Payments  │  │ Platform / Core    │                 │
│  │ v3.2.1 · linux-x64 │  │ v1.8.0 · win-x64  │                 │
│  │                    │  │                    │                 │
│  │ ●18 ●4 ◉2 ●0 ●1   │  │ ●31 ●0 ◉1 ●0 ●0   │                 │
│  │ S  F  R  A  U      │  │ S  F  R  A  U      │                 │
│  │                    │  │                    │                 │
│  │ [Sparkline chart]  │  │ [Sparkline chart]  │                 │
│  │ Last: 2m ago ✓     │  │ Last: 8m ago ✓     │                 │
│  └────────────────────┘  └────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Product Tile — Component Spec

Each tile displays:
- Product name (bold)
- Domain / Business Unit (secondary text)
- Release version · Platform
- Status pill row: colored counts for S / F / R / A / U / ❓ (each is **clickable**)
- Sparkline: daily success vs failure for the selected timeline
- Footer: last run timestamp + last run status indicator

On **status pill click** → open Pipeline Runs Dialog (§7.4)

### 7.4 Pipeline Runs Dialog

**Trigger:** Click any status count on a tile

**Dialog content:**
- Header: `ProductName > v3.2.1 > linux-x64 > FAILURE (4 runs)`
- Sub-filters: All Platforms | All Test Areas | date range (inherited from global)
- Pipeline run list — each run is a **Pipeline Block:**

```
┌────────────────────────────────────────────────────────┐
│ #1042  payment-gateway-release                         │
│ 2025-03-20 08:00 UTC  ·  14m 35s  ·  ● FAILURE        │
│                                                        │
│ Stages:                                                │
│ ✓ Checkout (17s)  ✓ Build (3m47s)  ✓ Unit Tests (3m44s)│
│ ✗ Integration Tests (6m39s)                            │
│                                                        │
│                                        [Details →]     │
└────────────────────────────────────────────────────────┘
```

Stages displayed as horizontal pill-chips: green = SUCCESS, red = FAILURE, orange = RUNNING, grey = SKIPPED/ABORTED.

### 7.5 Pipeline Details Dialog (nested)

**Trigger:** Click `[Details →]` button on a Pipeline Block

**Content:**
- Full pipeline metadata header: name, build #, triggered by, environment, tags
- Log URL link: `🔗 Open Jenkins Log`
- Stage table:

| Stage Name           | Status  | Started            | Duration | Log        |
|----------------------|---------|--------------------|----------|------------|
| Checkout             | ✓ SUCCESS | 08:00:05           | 17s      | 🔗 View    |
| Build                | ✓ SUCCESS | 08:00:23           | 3m 47s   | 🔗 View    |
| Unit Tests           | ✓ SUCCESS | 08:04:11           | 3m 44s   | 🔗 View    |
| Integration Tests    | ✗ FAILURE | 08:07:56           | 6m 39s   | 🔗 View    |

- Duration bar visualization per stage (proportional width)
- Close button

### 7.6 Filter Behaviour

| Filter       | Scope                                                      |
|--------------|------------------------------------------------------------|
| Product      | Show only matching product tiles                           |
| Release      | Within product tiles, highlight matching release           |
| Platform     | Filter pipeline runs within tiles                          |
| Timeline     | 1 Week / 1 Month / 6 Months / Custom date range picker     |

Filters are reflected in the URL as query params for shareability: `?product=PaymentGateway&release=v3.2.1&platform=linux-x64&timeline=1m`

### 7.7 Real-time Updates

- WebSocket connection to `/ws/pipeline-events`
- On `pipeline.status_change` event: update tile count badge with animated flash
- `RUNNING` status badge pulses (CSS animation)
- Toast notification on new FAILURE event

---

## 8. PRODUCTION READINESS REQUIREMENTS

### 8.1 API Server (Node.js)

- [ ] Helmet.js for security headers
- [ ] Rate limiting: 100 req/min per IP on ingest endpoint
- [ ] Request body size limit: 512KB
- [ ] Structured JSON logging (Winston / Pino)
- [ ] Health check: `GET /health` → `{ status: "ok", db: "ok", mq: "ok" }`
- [ ] Graceful shutdown (drain in-flight requests)
- [ ] OpenAPI 3.0 spec at `/api/docs`
- [ ] CORS configured for UI domain only

### 8.2 Python Consumer

- [ ] Retry with exponential backoff (max 3 attempts before dead-letter)
- [ ] Structured logging with `structlog`
- [ ] Prometheus metrics: messages processed, failed, processing time histogram
- [ ] Environment-based config via `python-dotenv` / environment variables
- [ ] Connection recovery on RabbitMQ disconnect (`pika` heartbeat)
- [ ] Idempotency: skip insert if `event_id` already exists

### 8.3 PostgreSQL

- [ ] Connection pooling via `pgBouncer` (min: 5, max: 20)
- [ ] Partitioning on `pipeline_run.started_at` (monthly) for retention management
- [ ] Backup: daily `pg_dump` to object storage
- [ ] `pg_stat_statements` enabled for query performance monitoring
- [ ] Read replica for dashboard query traffic

### 8.4 RabbitMQ

- [ ] Durable queues and exchanges
- [ ] Publisher confirms on ingest
- [ ] Dead-letter queue with alerting on message spike
- [ ] Management plugin enabled for ops visibility
- [ ] TLS enabled for inter-service comms

### 8.5 React UI

- [ ] Code splitting per route
- [ ] React Query for data fetching with stale-while-revalidate
- [ ] Error boundaries per tile
- [ ] Skeleton loaders during data fetch
- [ ] Accessible: ARIA labels on all interactive elements, keyboard navigation
- [ ] Mobile-responsive (tiles stack to single column below 768px)
- [ ] Environment-aware API base URL via `VITE_API_URL`

### 8.6 Infrastructure

- [ ] Docker Compose for local dev (`postgres`, `rabbitmq`, `api`, `consumer`, `ui`)
- [ ] Kubernetes manifests: Deployment, Service, ConfigMap, Secret, HPA for consumer
- [ ] CI/CD: GitHub Actions pipeline to build, test, and push images
- [ ] Secrets management: Vault or K8s Secrets (never commit credentials)
- [ ] Monitoring: Grafana + Prometheus dashboards for queue depth, DB connections, API latency
- [ ] Alerting: PagerDuty / Slack webhook on dead-letter queue spike or consumer lag

---

## 9. ENVIRONMENT VARIABLES

```env
# Node.js API
DATABASE_URL=postgres://user:pass@localhost:5432/observability
RABBITMQ_URL=amqp://user:pass@localhost:5672
RABBITMQ_EXCHANGE=ci.events
RABBITMQ_ROUTING_KEY=pipeline.ingest
JWT_SECRET=<strong-secret>
CORS_ORIGIN=https://dashboard.company.com
PORT=3000

# Python Consumer
DATABASE_URL=postgres://user:pass@localhost:5432/observability
RABBITMQ_URL=amqp://user:pass@localhost:5672
RABBITMQ_QUEUE=pipeline.raw
RABBITMQ_PREFETCH=5
LOG_LEVEL=INFO
PROMETHEUS_PORT=8001

# React UI
VITE_API_URL=https://api.observability.company.com
VITE_WS_URL=wss://api.observability.company.com
```

---

## 10. DIRECTORY STRUCTURE

```
observability-dashboard/
├── api/                        # Node.js API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── ingest.js       # POST /api/v1/pipeline/event
│   │   │   ├── products.js
│   │   │   ├── runs.js
│   │   │   └── metrics.js
│   │   ├── services/
│   │   │   ├── rabbitmq.js
│   │   │   └── database.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validate.js
│   │   │   └── rateLimit.js
│   │   └── websocket/
│   │       └── pipelineSocket.js
│   ├── package.json
│   └── Dockerfile
│
├── consumer/                   # Python RabbitMQ consumer
│   ├── consumer.py             # Entry point
│   ├── processor.py            # Validation + DB writes
│   ├── models.py               # SQLAlchemy models
│   ├── validators.py           # Pydantic schemas
│   ├── db.py                   # DB connection pool
│   ├── requirements.txt
│   └── Dockerfile
│
├── ui/                         # React.js dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProductTile/
│   │   │   ├── PipelineRunsDialog/
│   │   │   ├── PipelineDetailsDialog/
│   │   │   ├── FilterBar/
│   │   │   ├── Sparkline/
│   │   │   └── StatusBadge/
│   │   ├── hooks/
│   │   │   ├── usePipelineRuns.js
│   │   │   ├── useProducts.js
│   │   │   └── useWebSocket.js
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── store/
│   │   │   └── filterStore.js  # Zustand
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
│
├── infra/
│   ├── docker-compose.yml
│   ├── k8s/
│   │   ├── api-deployment.yaml
│   │   ├── consumer-deployment.yaml
│   │   └── ui-deployment.yaml
│   └── migrations/
│       └── 001_initial_schema.sql
│
└── README.md
```

---

*Document version: 1.0 | Generated for production project bootstrap*
