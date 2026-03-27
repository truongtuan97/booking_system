import { Worker } from 'bullmq';
import {redisQueue} from "./../config/redis";
import * as bookingService from "../services/booking.service";

import { AppDataSource } from "../config/database";
import { getIO } from '../socket';
import { pubClient } from '../config/redis.pub.sub';
import { initRedisPubSub } from '../config/redis.pub.sub';

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
        const { user_id, slot_id, socketId } = job.data;

        try {
          console.log("👉 Before calling service");

          const booking = await bookingService.createBooking(slot_id, user_id);

          console.log("✅ Booking success:", booking);

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

          return booking;
        } catch (err: any) {
          console.error("❌ Worker error FULL:", err);
          
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
        }
      }
    },
    { connection: redisQueue }
  );
})();