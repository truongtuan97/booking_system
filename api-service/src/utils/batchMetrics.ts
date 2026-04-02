import { redisClient  } from "../config/redis";
import { redisLatencyHistogram } from "../metrics/metrics";

export const incrementSuccess = async (batchId: string, successCount: number) => {
    const start = Date.now();

    await redisClient.incrby(`batch:${batchId}:success`, successCount);

    redisLatencyHistogram.observe(Date.now() - start);
};

export const incrementFail = async (batchId: string, failedCount: number) => {
    const start = Date.now();
    await redisClient.incrby(`batch:${batchId}:fail`, failedCount);
    redisLatencyHistogram.observe(Date.now() - start);
};

export const incrementTotal = async (batchId: string) => {
    await redisClient.incr(`batch:${batchId}:total`);
};

export const getBatchStat = async (batchId: string) => {
    const start = Date.now();

    const [success, total, fail] = await Promise.all([
        redisClient.get(`batch:${batchId}:success`),
        redisClient.get(`batch:${batchId}:total`),
        redisClient.get(`batch:${batchId}:fail`)
    ]);
    
    redisLatencyHistogram.observe(Date.now() - start);
    return {
        success: Number(success || 0),
        fail: Number(fail || 0),
        total: Number(total || 0),
        processing: Number(total || 0) - Number(success || 0) - Number(fail || 0)
    };
}