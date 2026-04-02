import { Request, Response, Router } from "express";
import { register } from "../metrics/metrics";

const router = Router();

router.get("/metrics", async (req: Request, res: Response) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

export default router;