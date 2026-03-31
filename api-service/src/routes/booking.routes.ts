import { Router } from "express";
import { createBooking, deleteBooking, getBookings, updateBooking } from "../controllers/booking.controller";
import { bookingLimiter } from "../middlewares/ratelimiter.middleware";

const router = Router();

if (process.env.NODE_ENV !== "test") {
    router.post("/", bookingLimiter, createBooking);
} else {
    router.post("/", createBooking);
}

router.get("/", getBookings);
router.delete("/:id", deleteBooking);
router.put('/:id', updateBooking);
router.patch('/:id', updateBooking);

export default router;
