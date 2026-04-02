import Redis from 'ioredis';
import { redisLatencyHistogram } from '../metrics/metrics';

export const redisClient = new Redis({
  host: "localhost",
  port: 6379,
});

export const redisQueue = new Redis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

export const measureRedis = async (fn: Function) => {
  const start = Date.now();

  const result = await fn();

  const duration = Date.now() - start;

  redisLatencyHistogram.observe(duration);
  return result;
}