import { bookingRepository } from "../repositories/booking.repository";
import { Booking } from "../entities/booking.entity";

export const createBooking = async (slot_id: number, user_id: number): Promise<Booking> => {
  const booking = bookingRepository.create({ slot_id, user_id });
  return await bookingRepository.save(booking);
};

export const getBookings = async (): Promise<Booking[]> => {
  return await bookingRepository.find();
};

export const  updateBooking = async (id: number, slot_id: number, user_id: number): Promise<Booking | null> => {
  const booking = await bookingRepository.findOneBy({id});
  if (!booking) {
    return null;
  }

  booking.slot_id = slot_id;
  booking.user_id = user_id;
  return await bookingRepository.save(booking);
};

export const deleteBooking = async (id: number): Promise<boolean> => {
  const result = await bookingRepository.delete(id);
  return result.affected !== 0;
};