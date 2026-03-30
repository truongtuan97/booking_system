import { Request, Response } from "express";
import * as bookingService from "../services/booking.service";
import { bookingQueue } from "../queues/booking.queue";
import { getItempotency, setProcessing, setResult } from "../services/idempotency.service";

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { slot_id, user_id, socketId } = req.body;
    const idemKey = req.headers['idempotency-key'] as string;

    if (!idemKey) {
      return res.status(400).json({ message: "Idempotency key is required" });
    }

    const existing = await getItempotency(idemKey);

    if (existing) {
      return res.status(200).json({
        message: "Duplicate request",
        data: existing
      });
    }

    // MARK proccsesing
    await setProcessing(idemKey);

    const job = await bookingQueue.add("book-slot", { user_id, slot_id, socketId }, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      }
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