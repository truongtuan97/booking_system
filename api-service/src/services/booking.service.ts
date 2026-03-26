import {bookingRepository} from "../repositories/booking.repository";
import {Booking} from "../entities/booking.entity";
import {QueryFailedError} from "typeorm";
import {redisClient} from "../config/redis";

const releaseLock = async (lockKey: string, lockValue: string) => {
  const luaScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  return await redisClient.eval(luaScript, 1, lockKey, lockValue);
};

export const createBooking = async (slot_id: number, user_id: number): Promise<Booking> => {
  const lockKey = `lock:slot:${slot_id}`;
  const lockValue = `${user_id}-${Date.now()}`;

  const lock = await redisClient.set(lockKey, lockValue, "EX", 10, "NX");

  if (!lock) {
    throw new Error("Slot is being booked");
  }

  try {
    const booking = bookingRepository.create({ slot_id, user_id });
    return await bookingRepository.save(booking);
  } catch (error) {
    if (error instanceof QueryFailedError && (error as any).code === '23505') {
      throw new Error('Slot already booked');
    }
    throw error;
  } finally {
    await releaseLock(lockKey, lockValue); // ✅ Atomic get + del
  }
};

export const getBookings = async () : Promise < Booking[] > => {
    return await bookingRepository.find();
};

export const updateBooking = async (id : number, slot_id : number, user_id : number) : Promise < Booking | null > => {
    const booking = await bookingRepository.findOneBy({id});
    if (! booking) {
        return null;
    }

    booking.slot_id = slot_id;
    booking.user_id = user_id;
    return await bookingRepository.save(booking);
};

export const deleteBooking = async (id : number) : Promise < boolean > => {
    const result = await bookingRepository.delete(id);
    return result.affected !== 0;
};
