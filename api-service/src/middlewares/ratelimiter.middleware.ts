import rateLimit from "express-rate-limit";

export const bookingLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 5, // max 5 requests per second    
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many requests, please try again later.",
        status: 429,
        error: "Too many requests"
    },
});