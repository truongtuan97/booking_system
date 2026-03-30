import { redisClient } from "../config/redis";

const PREFIX = "item:";

export const getItempotency = async (key: string) => {
    const data = await redisClient.get(`${PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
};

export const setProcessing = async (key: string) => {
    await redisClient.set(
        PREFIX + key,
        JSON.stringify({
            status: "processing",
        }),
        "EX", 60, // 1 minute
    )
};

export const setResult = async (key: string, result: any) => {
    await redisClient.set(
        PREFIX + key,
        JSON.stringify({status: 'done', result}),
        "EX", 300,
    )
};