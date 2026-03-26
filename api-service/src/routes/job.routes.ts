import { Router } from "express";
import { getJobStatus } from "../controllers/job.controller";

const router = Router();

router.get("/jobs/:id", getJobStatus);

export default router;