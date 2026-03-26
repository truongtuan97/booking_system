import express from "express";
import bookingRoutes from "./routes/booking.routes";

const app = express();

app.use(express.json());

app.use("/bookings", bookingRoutes);

export default app;
