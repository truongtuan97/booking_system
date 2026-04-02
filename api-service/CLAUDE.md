# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot reload via tsx watch)
npm run dev

# Run background worker (required separately from the API server)
npm run worker

# Run tests
npm test

# Type-check
npx tsc --noEmit

# Compile to dist/
npm run build

# Run compiled output
npm start

# Start PostgreSQL and Redis (from parent directory: ../booking_system/)
docker-compose up -d
```

Copy `.env.example` to `.env` before running locally.

## Architecture

Layered architecture: **server → app → routes → controller → service → repository → database**

The system also has a **background worker process** (`src/workers/booking.worker.ts`) that must be run separately. Booking creation is async: the API enqueues a job and returns HTTP 202; the worker processes it and notifies the client via Socket.IO.

```
src/
├── server.ts               # Entry point: inits DB, Redis Pub/Sub, Socket.IO, HTTP server
├── app.ts                  # Express app setup and route mounting
├── socket.ts               # Socket.IO with Redis adapter for multi-instance scaling
├── config/
│   ├── database.ts         # TypeORM DataSource (PostgreSQL, pool size 10)
│   ├── redis.ts            # Two Redis clients: general use + BullMQ queue
│   └── redis.pub.sub.ts    # Separate Redis pub/sub clients (ioredis)
├── entities/
│   └── booking.entity.ts   # Booking model; slot_id has UNIQUE DB constraint
├── repositories/
│   └── booking.repository.ts
├── services/
│   ├── booking.service.ts  # CRUD + Redis distributed lock (lock:slot:{slot_id}, 10s TTL)
│   └── idempotency.service.ts  # Deduplication via Redis; tracks socket IDs per key
├── controllers/
│   ├── booking.controller.ts   # CRUD endpoints; POST returns 202 with jobId
│   └── job.controller.ts       # GET /jobs/:id — query BullMQ job status
├── routes/
│   ├── booking.routes.ts   # Rate limiter (5 req/s) on POST /bookings
│   └── job.routes.ts
├── queues/
│   └── booking.queue.ts    # BullMQ Queue instance named "booking"
├── workers/
│   └── booking.worker.ts   # Processes "book-slot" jobs (concurrency 10); publishes results
├── middlewares/
│   └── ratelimiter.middleware.ts
└── tests/
    └── booking.test.ts     # Jest + supertest; includes 100-concurrent-request collision test
```

## Key Patterns

**Booking creation flow:**
1. `POST /bookings` with `Idempotency-Key` header and `socketId` body field
2. Controller checks idempotency cache; if new, sets `processing` state and enqueues BullMQ job → returns 202
3. Worker acquires Redis distributed lock (`lock:slot:{slot_id}`), writes to DB, releases lock
4. Worker publishes result to Redis Pub/Sub channel `"booking-events"`
5. Socket.IO receives the event and emits `booking-success` or `booking-failed` to the specific `socketId`

**Concurrency control (two layers):**
- Primary: Redis `SET NX EX` lock per slot prevents simultaneous DB writes; released via atomic Lua script
- Safety net: TypeORM catches DB unique constraint violations (error code `23505`)

**Idempotency key lifecycle:** `processing` (60s TTL) → `done` (300s TTL). Redis set `idem:{key}:sockets` tracks all socket IDs that sent the same key — late duplicates receive the result once it's available.

**Redis usage:** Three separate client instances — general (`redisClient`), BullMQ (`redisQueue` with `maxRetriesPerRequest: null`), and pub/sub (`pubClient`/`subClient`). Redis is hardcoded to `localhost:6379` (no env var).

## Metrics

The system exposes Prometheus metrics from two separate processes:

| Process | Port | Endpoint |
|---------|------|----------|
| API server | 3000 | `GET /metrics` |
| Worker | 9091 | `GET /metrics` |

**Why two endpoints?** The API server and worker are separate Node.js processes with separate in-memory prom-client registries. Worker-side metrics (DB latency, Redis latency, queue backlog) are only visible on port 9091.

### Metrics exposed

| Metric | Type | Where observed |
|--------|------|----------------|
| `queue_backlog` | Gauge | Worker — total waiting + active BullMQ jobs |
| `db_latency_ms` | Histogram | Worker — bulk INSERT duration per batch flush |
| `redis_latency_ms` | Histogram | Worker — Redis INCRBY/GET latency in `batchMetrics` |
| Default Node.js metrics (CPU, memory, event loop) | various | Both processes |

### Start monitoring stack

```bash
# 1. Create the shared Docker network (one-time)
docker network create booking_network

# 2. Start PostgreSQL and Redis (from ../booking_system/)
docker-compose up -d

# 3. Start Prometheus + Grafana (from ../booking_system/)
docker-compose -f docker-compose.monitoring.yml up -d
```

### View metrics

- **Raw metrics (API server):** http://localhost:3000/metrics
- **Raw metrics (worker):** http://localhost:9091/metrics
- **Prometheus UI:** http://localhost:9000 — use the Graph tab to query metrics
- **Grafana:** http://localhost:3001 — default credentials `admin / admin`

### Grafana setup (first time)

1. Open http://localhost:3001 and log in
2. Go to **Connections → Data sources → Add new**
3. Choose **Prometheus**, set URL to `http://prometheus:9090`, click **Save & test**
4. Import a dashboard or create panels with PromQL queries:

```promql
# Queue backlog over time
queue_backlog

# 95th-percentile DB latency
histogram_quantile(0.95, rate(db_latency_ms_bucket[1m]))

# 95th-percentile Redis latency
histogram_quantile(0.95, rate(redis_latency_ms_bucket[1m]))

# DB latency average rate
rate(db_latency_ms_sum[1m]) / rate(db_latency_ms_count[1m])
```

### Testing metrics manually

```bash
# Fire load test (generates bookings that drive metric observations)
node src/tests/load-test.js

# Check raw metric values
curl http://localhost:9091/metrics | grep -E 'db_latency|redis_latency|queue_backlog'
```

### Changing the worker metrics port

Set `WORKER_METRICS_PORT` in `.env`. Also update `monitoring/prometheus.yml` target accordingly.

## Core Constraints

- `server.ts` is the only file that calls `AppDataSource.initialize()` — all other layers import the DataSource and rely on it being already initialized.
- All files use `kebab-case.type.ts` naming.
- DB credentials come from env vars with fallback defaults (see `.env.example`).
- `synchronize: true` only when `NODE_ENV !== "production"`; `logging` only when `NODE_ENV === "development"`.
- TypeORM decorators require `experimentalDecorators`, `emitDecoratorMetadata`, and `useDefineForClassFields: false` in tsconfig — all set.
- Tests use `@swc/jest` for transformation (not `ts-jest`).
- Client -> Controller (HTTP) -> Queue (BullMQ) -> Worker -> Buffer (RAM) -> flushBuffer() -> DB (UNIQUE constraint)