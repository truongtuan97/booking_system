import { Request, Response, Router } from "express";
import { bookingQueue } from "../queues/booking.queue";

const router = Router();

router.get("/metrics", async (req: Request, res: Response) => {
    const [waiting, active, completed, failed] = await Promise.all([
        bookingQueue.getWaitingCount(),
        bookingQueue.getActiveCount(),
        bookingQueue.getCompletedCount(),
        bookingQueue.getFailed(),
    ]);

    res.json({
        queue: {
            waiting,
            active,
            completed,
            failed
        },timestamp: Date.now()
    });
});

export default router;