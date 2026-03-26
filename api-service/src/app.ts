import express from "express";
import bookingRoutes from "./routes/booking.routes";
import jobRoutes from "./routes/job.routes";

const app = express();

app.use(express.json());

app.use("/bookings", bookingRoutes);

app.use("/", jobRoutes);

export default app;
