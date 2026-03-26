import { Queue } from 'bullmq';
import { redisQueue } from '../config/redis';

export const bookingQueue = new Queue("booking", {
  connection: redisQueue,
});