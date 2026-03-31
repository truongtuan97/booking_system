import { redisClient  } from "../config/redis";

export const incrementSuccess = async (batchId: string) => {
    await redisClient.incr(`batch:${batchId}:success`);
};

export const incrementFail = async (batchId: string) => {
    await redisClient.incr(`batch:${batchId}:fail`);
};

export const incrementTotal = async (batchId: string) => {
    await redisClient.incr(`batch:${batchId}:total`);
};

export const getBatchStat = async (batchId: string) => {
    const total = await redisClient.get(`batch:${batchId}:total`);
    const success = await redisClient.get(`batch:${batchId}:success`);
    const fail = await redisClient.get(`batch:${batchId}:fail`);

    return {
        success: Number(success || 0),
        fail: Number(fail || 0),
        total: Number(total || 0),
        processing: Number(total || 0) - Number(success || 0) - Number(fail || 0)
    };
}