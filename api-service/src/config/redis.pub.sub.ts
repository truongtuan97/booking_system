import Redis from "ioredis";

export const pubClient = new Redis();
export const subClient = new Redis();

export const initRedisPubSub = async () => {
  console.log("✅ Redis Pub/Sub ready (ioredis)");
};