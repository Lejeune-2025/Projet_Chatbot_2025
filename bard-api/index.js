import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './lib/utils/logger.js';
import compression from 'compression';
import { initScheduler } from './lib/scheduler.js';
import os from 'os';
import cors from 'cors';
import next from 'next';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Configuration CORS
const corsOptions = {
    origin: ['http://localhost:8081', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Authorization',
        'X-Platform',
        'X-App-Version',
        'X-Nonce'
    ],
    credentials: true,
    maxAge: 86400 // 24 heures
};

// Fonction pour obtenir l'URL du serveur
const getServerUrl = () => {
    const interfaces = os.networkInterfaces();
    const urls = [];

    Object.keys(interfaces).forEach((interfaceName) => {
        interfaces[interfaceName].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                urls.push(`http://${iface.address}:${process.env.PORT || 3000}`);
            }
        });
    });

    return urls;
};

// Initialiser Next.js
app.prepare().then(() => {
    const server = express();

    // Initialiser le scheduler
    initScheduler();

    // Middleware de sécurité
    server.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "unsafe-none" }
    }));

    // Middleware CORS
    server.use(cors(corsOptions));

    // Middleware de logging (avant le parsing du body)
    server.use((req, res, next) => {
        logger.info('=== Nouvelle requête ===');
        logger.info(`Méthode: ${req.method}`);
        logger.info(`URL: ${req.url}`);
        logger.info(`Headers: ${JSON.stringify(req.headers)}`);
        next();
    });

    // Middleware pour parser le JSON uniquement pour les routes non-Next.js
    server.use((req, res, next) => {
        if (!req.url.startsWith('/api/')) {
            express.json()(req, res, next);
        } else {
            next();
        }
    });

    // Ajouter la compression
    server.use(compression());

    // Gestion des erreurs
    server.use((err, req, res, next) => {
        logger.error('=== Erreur serveur ===');
        logger.error(`Message: ${err.message}`);
        logger.error(`Stack: ${err.stack}`);
        logger.error(`URL: ${req.url}`);
        logger.error(`Méthode: ${req.method}`);
        logger.error(`Headers: ${JSON.stringify(req.headers)}`);
        
        res.status(500).json({
            status: 'error',
            message: 'Une erreur est survenue sur le serveur',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });

    // Gérer toutes les autres routes avec Next.js
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    // Démarrer le serveur
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        const serverUrls = getServerUrl();
        logger.info('=== URLs du serveur ===');
        serverUrls.forEach(url => {
            logger.info(`API URL: ${url}/api/bard`);
        });
        logger.info('=====================');
        logger.info(`Serveur démarré sur le port ${PORT}`);
        logger.info('Configuration CORS:', corsOptions);
    });
}); 