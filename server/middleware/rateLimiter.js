import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, error: 'Too many requests, please try again after 15 minutes' },
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { success: false, error: 'Too many login attempts, please try again after 15 minutes' },
});