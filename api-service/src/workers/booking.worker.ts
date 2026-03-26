import { Worker } from 'bullmq';
import {redisQueue} from "./../config/redis";
import * as bookingService from "../services/booking.service";

import { AppDataSource } from "../config/database";

(async () => {
  await AppDataSource.initialize();
  console.log("✅ DB connected in worker");

  new Worker(
    "booking",
    async job => {
      console.log("🔥 Job received:", job.name, job.data);

      if (job.name === "book-slot") {
        const { user_id, slot_id } = job.data;

        try {
          console.log("👉 Before calling service");

          const booking = await bookingService.createBooking(slot_id, user_id);

          console.log("✅ Booking success:", booking);
        } catch (err: any) {
          console.error("❌ Worker error FULL:", err);

          if (err.code === "23505") {
            console.log("Slot already booked:", slot_id);
            return;
          }

          throw err;
        }
      }
    },
    { connection: redisQueue }
  );
})();