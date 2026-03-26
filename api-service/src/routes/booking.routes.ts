import { Router } from "express";
import { createBooking, deleteBooking, getBookings, updateBooking } from "../controllers/booking.controller";

const router = Router();

router.post("/", createBooking);
router.get("/", getBookings);
router.delete("/:id", deleteBooking);
router.put('/:id', updateBooking);
router.patch('/:id', updateBooking);

export default router;
