import { Request, Response } from 'express';
import { bookingQueue } from '../queues/booking.queue';

export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    const jobId = Array.isArray(idParam) ? idParam[0] : (idParam ?? "");

    const job = await bookingQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    const state = await job.getState();

    res.json({
      jobId,
      state,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
    });
  } catch (error) {
    res.status(500).json({
      message: (error as Error).message,
    });
  }
};