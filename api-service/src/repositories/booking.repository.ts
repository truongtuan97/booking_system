import { AppDataSource } from "../config/database";
import { Booking } from "../entities/booking.entity";

export const bookingRepository = AppDataSource.getRepository(Booking);
