/**
 * Configuration de l'environnement
 */

const ENV = {
    development: {
        API_URL: process.env.API_URL || 'http://localhost:3000',
        CORS_ORIGINS: [
            'http://localhost:8081',
            'http://localhost:3000'
        ],
        JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
        JWT_EXPIRY: '24h',
        REFRESH_TOKEN_EXPIRY: '7d',
        RATE_LIMIT: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limite chaque IP à 100 requêtes par fenêtre
        }
    },
    production: {
        API_URL: process.env.API_URL || 'https://api.yonetwork.com',
        CORS_ORIGINS: [
            'https://yonetwork.com',
            'https://app.yonetwork.com'
        ],
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRY: '24h',
        REFRESH_TOKEN_EXPIRY: '7d',
        RATE_LIMIT: {
            windowMs: 15 * 60 * 1000,
            max: 50
        }
    }
};

// Sélectionner l'environnement
const getEnvVars = () => {
    const env = process.env.NODE_ENV || 'development';
    return ENV[env];
};

// Vérification des variables d'environnement requises
const validateEnv = () => {
    const env = getEnvVars();
    const requiredVars = ['JWT_SECRET', 'API_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error('Variables d\'environnement manquantes:', missingVars);
        return false;
    }

    return true;
};

export default {
    ...getEnvVars(),
    validateEnv
}; 