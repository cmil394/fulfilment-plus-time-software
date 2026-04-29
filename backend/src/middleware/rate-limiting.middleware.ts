import rateLimit from "express-rate-limit";

// Limit for read-only endpoints
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 800, // max 800 requests per IP per window
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  },
});

// Stricter limit for write endpoints (POST, PATCH, DELETE)
export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // max 100 requests per IP per window 
  message: {
    status: "error",
    message: "Too many write requests, please try again in a few minutes.",
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // max 10 uploads per user/admin
  message: {
    status: "error",
    message: "Too many uploads, please try again later.",
  },
});