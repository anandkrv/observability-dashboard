-- ============================================================
-- Observability Dashboard - Initial Schema
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE pipeline_status_enum AS ENUM (
    'SUCCESS', 'FAILURE', 'ABORTED', 'UNSTABLE', 'RUNNING'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS business_unit (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domain (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  code             VARCHAR(20)  NOT NULL UNIQUE,
  business_unit_id INTEGER      NOT NULL REFERENCES business_unit(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modified_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  domain_id   INTEGER      NOT NULL REFERENCES domain(id),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_area (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_type (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  test_area_id INTEGER      NOT NULL REFERENCES test_area(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modified_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER      NOT NULL REFERENCES product(id),
  version     VARCHAR(50)  NOT NULL,
  platform    VARCHAR(50)  NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, version, platform)
);

CREATE TABLE IF NOT EXISTS pipeline_run (
  id           SERIAL PRIMARY KEY,
  event_id     UUID                 NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  release_id   INTEGER              NOT NULL REFERENCES release(id),
  test_type_id INTEGER              REFERENCES test_type(id),
  status       pipeline_status_enum NOT NULL DEFAULT 'RUNNING',
  branch       VARCHAR(200),
  commit_sha   VARCHAR(40),
  triggered_by VARCHAR(100),
  started_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  modified_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_stage (
  id              SERIAL PRIMARY KEY,
  pipeline_run_id INTEGER              NOT NULL REFERENCES pipeline_run(id) ON DELETE CASCADE,
  name            VARCHAR(100)         NOT NULL,
  status          pipeline_status_enum NOT NULL DEFAULT 'RUNNING',
  stage_order     INTEGER              NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  duration_ms     INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  modified_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(100) NOT NULL UNIQUE,
  email       VARCHAR(200) NOT NULL UNIQUE,
  full_name   VARCHAR(200),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  modified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_domain_bu         ON domain(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_product_domain    ON product(domain_id);
CREATE INDEX IF NOT EXISTS idx_product_active    ON product(is_active);
CREATE INDEX IF NOT EXISTS idx_release_product   ON release(product_id);
CREATE INDEX IF NOT EXISTS idx_run_release       ON pipeline_run(release_id);
CREATE INDEX IF NOT EXISTS idx_run_status        ON pipeline_run(status);
CREATE INDEX IF NOT EXISTS idx_run_started       ON pipeline_run(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_event_id      ON pipeline_run(event_id);
CREATE INDEX IF NOT EXISTS idx_stage_run         ON pipeline_stage(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_stage_order       ON pipeline_stage(pipeline_run_id, stage_order);

-- ============================================================
-- modified_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_unit','domain','product','test_area','test_type',
    'release','pipeline_run','pipeline_stage','app_user'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_modified ON %1$s;
       CREATE TRIGGER trg_%1$s_modified
       BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION set_modified_at();', t
    );
  END LOOP;
END $$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Business Units
INSERT INTO business_unit (name, code) VALUES
  ('Payments',  'PAY'),
  ('Platform',  'PLT'),
  ('Commerce',  'COM'),
  ('Security',  'SEC')
ON CONFLICT (code) DO NOTHING;

-- Domains
INSERT INTO domain (name, code, business_unit_id) VALUES
  ('Payment Processing', 'PAY-PROC', (SELECT id FROM business_unit WHERE code='PAY')),
  ('Payment Gateway',    'PAY-GW',   (SELECT id FROM business_unit WHERE code='PAY')),
  ('Core Platform',      'PLT-CORE', (SELECT id FROM business_unit WHERE code='PLT')),
  ('Order Management',   'COM-ORD',  (SELECT id FROM business_unit WHERE code='COM')),
  ('Storefront',         'COM-STORE',(SELECT id FROM business_unit WHERE code='COM')),
  ('Identity & Access',  'SEC-IAM',  (SELECT id FROM business_unit WHERE code='SEC'))
ON CONFLICT (code) DO NOTHING;

-- Products
INSERT INTO product (name, code, domain_id) VALUES
  ('PaymentGateway',  'PAY-GW-SVC',  (SELECT id FROM domain WHERE code='PAY-GW')),
  ('AuthService',     'SEC-AUTH',    (SELECT id FROM domain WHERE code='SEC-IAM')),
  ('OrderService',    'COM-ORD-SVC', (SELECT id FROM domain WHERE code='COM-ORD')),
  ('CartAPI',         'COM-CART',    (SELECT id FROM domain WHERE code='COM-STORE')),
  ('FraudDetector',   'PAY-FRAUD',   (SELECT id FROM domain WHERE code='PAY-PROC')),
  ('UserProfile',     'PLT-USER',    (SELECT id FROM domain WHERE code='PLT-CORE')),
  ('CheckoutFlow',    'COM-CHECKOUT',(SELECT id FROM domain WHERE code='COM-STORE')),
  ('InventorySync',   'PLT-INV',     (SELECT id FROM domain WHERE code='PLT-CORE'))
ON CONFLICT (code) DO NOTHING;

-- Test Areas
INSERT INTO test_area (name) VALUES
  ('Unit'),
  ('Integration'),
  ('E2E'),
  ('Performance')
ON CONFLICT (name) DO NOTHING;

-- Test Types
INSERT INTO test_type (name, test_area_id) VALUES
  ('Unit Tests',            (SELECT id FROM test_area WHERE name='Unit')),
  ('Component Tests',       (SELECT id FROM test_area WHERE name='Unit')),
  ('API Integration Tests', (SELECT id FROM test_area WHERE name='Integration')),
  ('DB Integration Tests',  (SELECT id FROM test_area WHERE name='Integration')),
  ('Smoke Tests',           (SELECT id FROM test_area WHERE name='E2E')),
  ('Regression Tests',      (SELECT id FROM test_area WHERE name='E2E')),
  ('Load Tests',            (SELECT id FROM test_area WHERE name='Performance')),
  ('Stress Tests',          (SELECT id FROM test_area WHERE name='Performance'))
ON CONFLICT DO NOTHING;

-- Releases (2 per product × 2 platforms = 4 per product, but spec says 2 releases 2 platforms)
-- Interpretation: 2 version × 2 platforms = 4 release rows per product
INSERT INTO release (product_id, version, platform) VALUES
  -- PaymentGateway
  ((SELECT id FROM product WHERE code='PAY-GW-SVC'),  '1.4.0', 'linux'),
  ((SELECT id FROM product WHERE code='PAY-GW-SVC'),  '1.4.0', 'windows'),
  ((SELECT id FROM product WHERE code='PAY-GW-SVC'),  '1.5.0', 'linux'),
  ((SELECT id FROM product WHERE code='PAY-GW-SVC'),  '1.5.0', 'windows'),
  -- AuthService
  ((SELECT id FROM product WHERE code='SEC-AUTH'),     '2.1.0', 'linux'),
  ((SELECT id FROM product WHERE code='SEC-AUTH'),     '2.1.0', 'windows'),
  ((SELECT id FROM product WHERE code='SEC-AUTH'),     '2.2.0', 'linux'),
  ((SELECT id FROM product WHERE code='SEC-AUTH'),     '2.2.0', 'windows'),
  -- OrderService
  ((SELECT id FROM product WHERE code='COM-ORD-SVC'), '3.0.1', 'linux'),
  ((SELECT id FROM product WHERE code='COM-ORD-SVC'), '3.0.1', 'windows'),
  ((SELECT id FROM product WHERE code='COM-ORD-SVC'), '3.1.0', 'linux'),
  ((SELECT id FROM product WHERE code='COM-ORD-SVC'), '3.1.0', 'windows'),
  -- CartAPI
  ((SELECT id FROM product WHERE code='COM-CART'),    '0.9.5', 'linux'),
  ((SELECT id FROM product WHERE code='COM-CART'),    '0.9.5', 'windows'),
  ((SELECT id FROM product WHERE code='COM-CART'),    '1.0.0', 'linux'),
  ((SELECT id FROM product WHERE code='COM-CART'),    '1.0.0', 'windows'),
  -- FraudDetector
  ((SELECT id FROM product WHERE code='PAY-FRAUD'),   '4.2.0', 'linux'),
  ((SELECT id FROM product WHERE code='PAY-FRAUD'),   '4.2.0', 'windows'),
  ((SELECT id FROM product WHERE code='PAY-FRAUD'),   '4.3.0', 'linux'),
  ((SELECT id FROM product WHERE code='PAY-FRAUD'),   '4.3.0', 'windows'),
  -- UserProfile
  ((SELECT id FROM product WHERE code='PLT-USER'),    '1.1.0', 'linux'),
  ((SELECT id FROM product WHERE code='PLT-USER'),    '1.1.0', 'windows'),
  ((SELECT id FROM product WHERE code='PLT-USER'),    '1.2.0', 'linux'),
  ((SELECT id FROM product WHERE code='PLT-USER'),    '1.2.0', 'windows'),
  -- CheckoutFlow
  ((SELECT id FROM product WHERE code='COM-CHECKOUT'),'2.0.0', 'linux'),
  ((SELECT id FROM product WHERE code='COM-CHECKOUT'),'2.0.0', 'windows'),
  ((SELECT id FROM product WHERE code='COM-CHECKOUT'),'2.1.0', 'linux'),
  ((SELECT id FROM product WHERE code='COM-CHECKOUT'),'2.1.0', 'windows'),
  -- InventorySync
  ((SELECT id FROM product WHERE code='PLT-INV'),     '1.0.3', 'linux'),
  ((SELECT id FROM product WHERE code='PLT-INV'),     '1.0.3', 'windows'),
  ((SELECT id FROM product WHERE code='PLT-INV'),     '1.1.0', 'linux'),
  ((SELECT id FROM product WHERE code='PLT-INV'),     '1.1.0', 'windows')
ON CONFLICT (product_id, version, platform) DO NOTHING;

-- ============================================================
-- Pipeline Runs (60 rows with varied statuses over 30 days)
-- ============================================================

DO $$
DECLARE
  statuses pipeline_status_enum[] := ARRAY['SUCCESS','SUCCESS','SUCCESS','FAILURE','ABORTED','UNSTABLE','RUNNING']::pipeline_status_enum[];
  stage_names TEXT[] := ARRAY['Checkout','Build','Test','Deploy'];
  release_ids INTEGER[];
  r_id INTEGER;
  run_id INTEGER;
  stat pipeline_status_enum;
  days_ago INTEGER;
  run_dur INTEGER;
  s_name TEXT;
  s_idx INTEGER;
  s_started TIMESTAMPTZ;
  s_dur INTEGER;
  s_status pipeline_status_enum;
  triggered_bys TEXT[] := ARRAY['jenkins','github-actions','manual','scheduler'];
  branches TEXT[] := ARRAY['main','develop','release/1.x','hotfix/urgent','feature/perf'];
  tt_ids INTEGER[];
  tt_id INTEGER;
  i INTEGER;
BEGIN
  -- Collect release ids
  SELECT ARRAY_AGG(id ORDER BY id) INTO release_ids FROM release;
  -- Collect test_type ids
  SELECT ARRAY_AGG(id ORDER BY id) INTO tt_ids FROM test_type;

  FOR i IN 1..60 LOOP
    -- pick a release
    r_id := release_ids[1 + ((i - 1) % array_length(release_ids, 1))];
    -- pick a status (cycle through with some randomness via modulo)
    stat := statuses[1 + ((i * 3 + 2) % array_length(statuses, 1))];
    days_ago := ((i - 1) % 30);
    run_dur  := 60000 + (i * 7919 % 240000);  -- deterministic pseudo-random duration
    tt_id    := tt_ids[1 + (i % array_length(tt_ids, 1))];

    INSERT INTO pipeline_run (
      event_id, release_id, test_type_id, status, branch, commit_sha,
      triggered_by, started_at, finished_at, duration_ms
    ) VALUES (
      gen_random_uuid(),
      r_id,
      tt_id,
      stat,
      branches[1 + (i % array_length(branches, 1))],
      LPAD(TO_HEX(i * 1234567 % 16777216), 7, '0') || LPAD(TO_HEX(i * 9876543 % 16777216), 7, '0'),
      triggered_bys[1 + (i % array_length(triggered_bys, 1))],
      NOW() - (days_ago || ' days')::INTERVAL - ((i % 24) || ' hours')::INTERVAL,
      CASE WHEN stat = 'RUNNING' THEN NULL
           ELSE NOW() - (days_ago || ' days')::INTERVAL - ((i % 24) || ' hours')::INTERVAL + (run_dur || ' milliseconds')::INTERVAL
      END,
      CASE WHEN stat = 'RUNNING' THEN NULL ELSE run_dur END
    ) RETURNING id INTO run_id;

    -- Insert 4 stages per run
    FOR s_idx IN 1..4 LOOP
      s_name    := stage_names[s_idx];
      s_dur     := (run_dur / 4) + (s_idx * 1234 % 15000);
      s_started := NOW() - (days_ago || ' days')::INTERVAL - ((i % 24) || ' hours')::INTERVAL
                   + ((s_idx - 1) * (run_dur / 4) || ' milliseconds')::INTERVAL;

      -- Determine stage status
      IF stat = 'SUCCESS' THEN
        s_status := 'SUCCESS';
      ELSIF stat = 'RUNNING' THEN
        IF s_idx < 3 THEN s_status := 'SUCCESS';
        ELSIF s_idx = 3 THEN s_status := 'RUNNING';
        ELSE s_status := 'RUNNING';
        END IF;
      ELSIF stat = 'FAILURE' THEN
        IF s_idx < 4 THEN s_status := 'SUCCESS';
        ELSE s_status := 'FAILURE';
        END IF;
      ELSIF stat = 'ABORTED' THEN
        IF s_idx < 3 THEN s_status := 'SUCCESS';
        ELSE s_status := 'ABORTED';
        END IF;
      ELSE -- UNSTABLE
        IF s_idx < 4 THEN s_status := 'SUCCESS';
        ELSE s_status := 'UNSTABLE';
        END IF;
      END IF;

      INSERT INTO pipeline_stage (
        pipeline_run_id, name, status, stage_order,
        started_at, finished_at, duration_ms,
        error_message
      ) VALUES (
        run_id,
        s_name,
        s_status,
        s_idx,
        s_started,
        CASE WHEN s_status = 'RUNNING' THEN NULL
             ELSE s_started + (s_dur || ' milliseconds')::INTERVAL
        END,
        CASE WHEN s_status = 'RUNNING' THEN NULL ELSE s_dur END,
        CASE WHEN s_status = 'FAILURE' THEN 'Step failed: exit code 1'
             WHEN s_status = 'ABORTED' THEN 'Build aborted by user'
             WHEN s_status = 'UNSTABLE' THEN 'Test failures detected'
             ELSE NULL
        END
      );
    END LOOP;
  END LOOP;
END $$;

-- App users
INSERT INTO app_user (username, email, full_name) VALUES
  ('admin',    'admin@example.com',   'Admin User'),
  ('alice',    'alice@example.com',   'Alice Smith'),
  ('bob',      'bob@example.com',     'Bob Jones'),
  ('carol',    'carol@example.com',   'Carol White')
ON CONFLICT (username) DO NOTHING;
