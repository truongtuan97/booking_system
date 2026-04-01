import { Request, Response } from "express";
import * as bookingService from "../services/booking.service";
import { bookingQueue } from "../queues/booking.queue";
import { addSocketToKey, getItempotency, setProcessing, setResult } from "../services/idempotency.service";
import { pubClient } from "../config/redis.pub.sub";
import { redisClient } from "../config/redis";
import { localCache } from "../caches/local.cache";

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { slot_id, user_id, socketId, batchId } = req.body;
    const idemKey = req.headers['idempotency-key'] as string;

    if (!idemKey) {
      return res.status(400).json({ message: "Missing Idempotency-Key" });
    }

    // Check idem
    const existingIdem = await getItempotency(idemKey);

    if (existingIdem) {
      const { socketId} = req.body;

      if (socketId) {
        await addSocketToKey(idemKey, socketId);
      }

      // Case 1 da co ket qua emit lai
      if (existingIdem.status === 'done' && socketId) {
        await pubClient.publish(
          "booking-events", 
          JSON.stringify({
            socketId,
            event: existingIdem.result?.error ? "booking-failed" : "booking-success",
            data: existingIdem.result
          })
        );
      }
      
      // Case 2: dang prcessing -> Khong Emit (chow worker)      
      return res.status(200).json({
        message: "Duplicate request",
        data: existingIdem
      });
    }

    // Check slot
    const start = Date.now();
    const slotKey = `slot:${slot_id}`;
    if (localCache.get(slotKey)) {
      return res.status(400).json({
        message: "Slot already booked (local cache)"
      });
    }
    const isBooked = await redisClient.get(slotKey);
    const duration = Date.now() - start;

    if (duration > 5) {
      console.log(`Redis slow: ${duration}`);
    }

    if (isBooked) {
      // update local cache
      localCache.set(slotKey, true);

      return res.status(400).json({
        message: "Slot already booked (fast reject)"
      });
    }

    // MARK proccsesing
    await setProcessing(idemKey);

    const job = await bookingQueue.add('book-slot', {
      user_id,
      slot_id,
      socketId,
      idemKey,
      batchId
    });
    
    res.status(202).json({ message: "Booking is being processed", jobId: job.id });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await bookingService.getBookings();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = parseInt(
      Array.isArray(idParam) ? idParam[0] : (idParam ?? ""),
      10
    );
    const { slot_id, user_id } = req.body;
    const booking = await bookingService.updateBooking(id, slot_id, user_id);

    if (!booking) {
      return res.status(404).json({message: "Booking not found"});
    }
    res.status(200).json(booking);
  } catch (error) {
    console.error("Error when update booking at bookingController ", error);
    res.status(500).json({message: (error as Error).message});
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = parseInt(
      Array.isArray(idParam) ? idParam[0] : (idParam ?? ""), 10
    )
    const success = await bookingService.deleteBooking(id);
    if (!success) {
      return res.status(404).json({message: "Booking not found"});
    }
    return res.status(200).json({message: "Booking delete sucessfully."})
  } catch (error) {
    console.error("Error when delete booking at bookingController ", error);
    return res.status(500).json({message: (error as Error).message});
  }
}