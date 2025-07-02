import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

// Limiteur pour les conversations
export const conversationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requêtes par minute
    message: {
        status: 'error',
        message: 'Trop de requêtes. Veuillez patienter un moment.'
    },
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit dépassé pour l'IP: ${req.ip}`);
        res.status(429).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Limiteur pour les messages dans une conversation
export const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 messages par minute
    message: {
        status: 'error',
        message: 'Trop de messages. Veuillez ralentir votre rythme.'
    },
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit de messages dépassé pour l'IP: ${req.ip}`);
        res.status(429).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Limiteur pour les recherches dans la base de connaissances
export const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // 15 recherches par minute
    message: {
        status: 'error',
        message: 'Trop de recherches. Veuillez patienter un moment.'
    },
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit de recherche dépassé pour l'IP: ${req.ip}`);
        res.status(429).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false
}); 