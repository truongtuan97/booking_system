import express from "express";
import bookingRoutes from "./routes/booking.routes";
import jobRoutes from "./routes/job.routes";
import batchRoutes from './routes/batch.routes';
import metricRoutes from './routes/metrics.routes';

const app = express();

app.use(express.json());

app.use("/bookings", bookingRoutes);

app.use("/", jobRoutes);

app.use("/", batchRoutes);

app.use("/", metricRoutes);

export default app;
