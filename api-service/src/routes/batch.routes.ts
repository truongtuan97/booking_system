import { Router } from "express";
import { getBatchResult } from "../controllers/batch.controller";

const router = Router();

router.get('/batches/:batchId', getBatchResult);

export default router;