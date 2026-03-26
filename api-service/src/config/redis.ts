import Redis from 'ioredis';

export const redisClient = new Redis({
  host: "localhost",
  port: 6379,
});

export const redisQueue = new Redis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});