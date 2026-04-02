import client from "prom-client";

const register = new client.Registry();

// collect default metrics (CPU, memory, event loop)
client.collectDefaultMetrics({ register });

// ===== CUSTOM METRICS =====

// Queue backlog
export const queueBacklogGauge = new client.Gauge({
  name: "queue_backlog",
  help: "Number of jobs waiting in queue",
  registers: [register],
});

// Redis latency
export const redisLatencyHistogram = new client.Histogram({
  name: "redis_latency_ms",
  help: "Redis latency in ms",
  buckets: [1, 5, 10, 20, 50, 100],
  registers: [register],
});

// DB latency
export const dbLatencyHistogram = new client.Histogram({
  name: "db_latency_ms",
  help: "DB query latency in ms",
  buckets: [1, 5, 10, 20, 50, 100, 200],
  registers: [register],
});

export { register };