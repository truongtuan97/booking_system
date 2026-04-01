import { Worker } from 'bullmq';
import { redisClient, redisQueue } from "./../config/redis";
import * as bookingService from "../services/booking.service";

import { AppDataSource } from "../config/database";
import { getIO } from '../socket';
import { pubClient } from '../config/redis.pub.sub';
import { initRedisPubSub } from '../config/redis.pub.sub';
import { setResult } from '../services/idempotency.service';
import { incrementFail, incrementSuccess, incrementTotal } from '../utils/batchMetrics';

type BufferItem = {
  slot_id: number;
  user_id: number;
  socketId?: string;
  idemKey: string;
  batchId: string;
};

let buffer: BufferItem[] = [];
const BATCH_SIZE = 50;
let isFlushing = false;

(async () => {
  await AppDataSource.initialize();
  console.log("✅ DB connected in worker");

  await initRedisPubSub(); // 🔥 THÊM DÒNG NÀY
  console.log("✅ Redis Pub/Sub connected in worker");

  new Worker(
    "booking",
    async job => {
      console.log("🔥 Job received:", job.name, job.data);

      if (job.name === "book-slot") {
        const { user_id, slot_id, socketId, idemKey, batchId } = job.data;

        if (batchId) {
          await incrementTotal(batchId);
        }
        
        try {
          console.log("👉 Before calling service");

          const booking = await bookingService.prepareBooking(slot_id, user_id);

          // push into buffer instead save DB
          buffer.push({
            ...booking,
            socketId,
            idemKey,
            batchId
          });

          if (buffer.length >= BATCH_SIZE) {
            await flushBuffer();
          }

          console.log("✅ Booking success:", booking);

          if (idemKey) {
            await setResult(idemKey, booking);
          }

          // 🔥 publish event
          if (socketId) {
            await pubClient.publish(
              "booking-events",
              JSON.stringify({
                socketId,
                event: "booking-success",
                data: booking
              })
            );
          }

          // return booking;
          return { queue: true };
        } catch (err: any) {
          console.error("❌ Worker error FULL:", err);
         
          if (idemKey) {
            await setResult(idemKey, {
              error: err.message
            });
          }

          if (socketId) {
            await pubClient.publish(
              "booking-events",
              JSON.stringify({
                socketId,
                event: "booking-failed",
                data: { message: err.message },
              })
            );
          }

          if (err.code === "23505") {
            console.log("Slot already booked:", slot_id);
            throw new Error("Slot already book");
          }

          throw err;
        } finally {

        }
      }
    },
    {
      connection: redisQueue,
      concurrency: 200, // KEY POINT TO INCREASE CONCURRENCY
    }
  );

  const flushBuffer = async () => {
    if (isFlushing) return;
    if (buffer.length === 0) return;

    isFlushing = true;

    const items = buffer.splice(0, BATCH_SIZE);

    try {
      await processBatch(items);
    } catch (error) {
      console.error(" Flush error:", error);
    } finally {
      isFlushing = false;
    }
  };

  const processBatch = async (items: BufferItem[]) => {

    const keys = items.map(i => `slot:${i.slot_id}`);
    const pipeline = redisClient.multi();
    keys.forEach(k => pipeline.get(k));
    const results = await pipeline.exec();

    if (!results) return;
    
    const filteredItems = items.filter((item, idx) => {
      const value = results[idx][1];
      return !value;
    });
    
    // INSERT DB BULK
    const insertResult = await AppDataSource
      .createQueryBuilder()
      .insert()
      .into("bookings")
      .values(filteredItems.map(i => ({
        slot_id: i.slot_id,
        user_id: i.user_id
      })))
      .orIgnore()
      .returning("*")
      .execute();

    const successRows = insertResult.raw || [];
    const successSet = new Set(
      successRows.map((r: any) => `${r.slot_id}-${r.user_id}`)
    );

    // Group by batchID
    const grouped = new Map<string, typeof items>();

    for (const item of items) {
      if (!item.batchId) continue;

      if (!grouped.has(item.batchId)) {
        grouped.set(item.batchId, []);
      }

      grouped.get(item.batchId)!.push(item);
    }

    // UPDATE Metrics
    for (const [batchId, batchItems] of grouped.entries()) {
      let successCount = 0;

      for (const item of batchItems) {
        if (successSet.has(`${item.slot_id}-${item.user_id}`)) {
          successCount++;
        }
      }

      const failedCount = batchItems.length - successCount;

      await incrementSuccess(batchId, successCount);
      await incrementFail(batchId, failedCount);
    }
    // HANDLE SOCKET + IDEMPOTENCY
    for (const item of items) {
      const key = `${item.slot_id}-${item.user_id}`;
      const success = successSet.has(key);

      if (success) {
        if (item.idemKey) await setResult(item.idemKey, {
          slot_id: item.slot_id,
          user_id: item.user_id
        });

        if (item.socketId) {
          await pubClient.publish(
            "booking-events",
            JSON.stringify({
              socketId: item.socketId,
              event: "booking-success",
              data: { slot_id: item.slot_id, user_id: item.user_id }
            })
          )
        }

        // mark redis
        const pipeline = redisClient.multi();
        successRows.forEach((row: any) => {
          pipeline.set(`slot:${row.slot_id}`, "booked", "EX", 60);
        });
        await pipeline.exec(); 

      } else {
        // DUPLICATE (unique constraint)
        if (item.idemKey) {
          await setResult(item.idemKey, {
            error: "Slot already booked"
          });
        }

        if (item.socketId) {
          await pubClient.publish(
            "booking-events",
            JSON.stringify({
              socketId: item.socketId,
              event: "booking-failed",
              data: { message: "Slot already booked" }
            })
          );
        }
      }
    }
  };

  setInterval(() => {
    setImmediate(() => flushBuffer());
  }, 200);

})();