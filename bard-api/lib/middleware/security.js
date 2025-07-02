import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import environment from '../config/environment';

/**
 * Middleware de sécurité pour l'API
 */
export const securityMiddleware = [
    // Protection contre les attaques courantes
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://api.openai.com"],
            },
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        dnsPrefetchControl: true,
        frameguard: { action: "deny" },
        hidePoweredBy: true,
        hsts: true,
        ieNoOpen: true,
        noSniff: true,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        xssFilter: true,
    }),

    // Configuration CORS
    cors({
        origin: (origin, callback) => {
            const allowedOrigins = environment.CORS_ORIGINS;
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    }),

    // Rate limiting
    rateLimit({
        windowMs: environment.RATE_LIMIT.windowMs,
        max: environment.RATE_LIMIT.max,
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        standardHeaders: true,
        legacyHeaders: false,
    }),
];

/**
 * Middleware d'authentification
 */
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Token d\'authentification manquant' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Format de token invalide' });
        }

        // Vérification du token JWT
        const decoded = jwt.verify(token, environment.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

/**
 * Middleware de validation des entrées
 */
export const validateInput = (schema) => {
    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            next();
        } catch (error) {
            return res.status(500).json({ error: 'Erreur de validation' });
        }
    };
}; 