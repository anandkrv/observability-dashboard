# Observability Dashboard — Setup & Run Guide

## Prerequisites
- PostgreSQL 14+ running on localhost:5432
- Node.js 18+ (for API and UI)
- Python 3.10+ (for consumer)
- RabbitMQ (optional — API and UI work without it)

---

## 1. Create the PostgreSQL database

```bash
# Run as postgres superuser (adjust path to psql if needed)
psql -U postgres -c "CREATE DATABASE observability;"
psql -U postgres -d observability -f infra/migrations/001_initial_schema.sql
```

On Windows (PowerShell / cmd):
```cmd
psql -U postgres -c "CREATE DATABASE observability;"
psql -U postgres -d observability -f infra\migrations\001_initial_schema.sql
```

---

## 2. Start the API server

```bash
cd api
npm install          # already done during setup
npm run dev          # or: npm start
```

The API starts on http://localhost:3001
Health check: http://localhost:3001/health

---

## 3. Start the React UI

Open a **new terminal**:

```bash
cd ui
npm install          # already done during setup
npm run dev
```

The UI opens at http://localhost:5173

---

## 4. Start the Python consumer (optional — requires RabbitMQ)

Open another terminal:

```bash
cd consumer
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python consumer.py
```

---

## Quick-fire test (curl)

```bash
# Ingest a pipeline event
curl -X POST http://localhost:3001/api/v1/pipeline/event \
  -H "Content-Type: application/json" \
  -d '{
    "product_code": "PAY-GW-SVC",
    "version": "1.5.0",
    "platform": "linux",
    "status": "SUCCESS",
    "branch": "main",
    "triggered_by": "manual",
    "duration_ms": 95000,
    "stages": [
      {"name":"Checkout","status":"SUCCESS","duration_ms":5000},
      {"name":"Build",   "status":"SUCCESS","duration_ms":30000},
      {"name":"Test",    "status":"SUCCESS","duration_ms":45000},
      {"name":"Deploy",  "status":"SUCCESS","duration_ms":15000}
    ]
  }'

# List products
curl http://localhost:3001/api/v1/products

# Get product summary (id=1)
curl "http://localhost:3001/api/v1/products/1/summary?from=2026-02-01&to=2026-03-22"

# List pipeline runs
curl "http://localhost:3001/api/v1/pipeline-runs?product_id=1&limit=10"
```

---

## Ports at a glance

| Service        | Port |
|---------------|------|
| PostgreSQL     | 5432 |
| RabbitMQ AMQP  | 5672 |
| API (Express)  | 3001 |
| UI (Vite)      | 5173 |
