import { Request, Response } from "express";
import * as bookingService from "../services/booking.service";

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { slot_id, user_id } = req.body;
    const booking = await bookingService.createBooking(slot_id, user_id);
    res.status(201).json(booking);
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