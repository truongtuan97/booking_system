import { Request, Response } from "express";
import { getBatchStat } from "../utils/batchMetrics";

export const getBatchResult = async (req: Request, res: Response) => {
    try {
        const { batchId: batchIdParam } = req.params;
        const batchId = Array.isArray(batchIdParam) ? batchIdParam[0] : batchIdParam;
        
        if (!batchId) {
            return res.status(400).json({ message: "Invalid batchId" });
        }
        const stats = await getBatchStat(batchId);

        if (!stats) {
            return res.status(404).json({
                message: "Batch not found"
            });
        }

        res.json(stats);
    } catch (error) {
        console.error("Error at batch controller ", error);
    }
};