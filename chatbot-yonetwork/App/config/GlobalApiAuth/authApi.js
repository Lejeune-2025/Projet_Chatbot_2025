import { Platform } from 'react-native';
import environment from '../environment';

/**
 * Configuration spécifique pour l'API d'authentification
 * Cette configuration est utilisée uniquement par GlobalApiAuth
 */
export const AUTH_API_CONFIG = {
    // URL de base pour l'authentification
    BASE_URL: environment.API_URL.AUTH,
    
    // Configuration des timeouts
    TIMEOUT: environment.TIMEOUT,
    MAX_RETRIES: environment.MAX_RETRIES,
    
    // Headers par défaut
    HEADERS: {
        ...environment.HEADERS,
        'Origin': Platform.OS === 'web' ? 'http://localhost:8081' : 
                 Platform.OS === 'android' ? 'http://10.0.2.2:8081' : 
                 'http://localhost:8081'
    },
    
    // Configuration de l'authentification
    AUTH: {
        // Durées d'expiration des tokens
        TOKEN_EXPIRY: 86400, // 24 heures en secondes
        REFRESH_TOKEN_EXPIRY: 604800, // 7 jours en secondes
        
        // Endpoints d'authentification alignés avec le backend
        ENDPOINTS: {
            LOGIN: '/login',
            REGISTER: '/register',
            LOGOUT: '/logout',
            REFRESH: '/refresh',
            PROFILE: '/profile',
            SESSION: '/session'
        },
        
        // Configuration de sécurité
        SECURITY: {
            MIN_PASSWORD_LENGTH: 8,
            PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            TOKEN_PREFIX: 'Bearer ',
            REFRESH_TOKEN_PREFIX: 'Refresh ',
            MAX_LOGIN_ATTEMPTS: 5,
            LOCKOUT_DURATION: 900 // 15 minutes en secondes
        },

        // Gestion des erreurs
        ERROR_CODES: {
            INVALID_CREDENTIALS: 'AUTH001',
            ACCOUNT_LOCKED: 'AUTH002',
            TOKEN_EXPIRED: 'AUTH003',
            INVALID_TOKEN: 'AUTH004',
            RATE_LIMIT_EXCEEDED: 'AUTH005',
            VALIDATION_ERROR: 'AUTH006',
            SERVER_ERROR: 'AUTH007'
        },

        // Validation des réponses
        RESPONSE_VALIDATION: {
            LOGIN: {
                required: ['token', 'user'],
                userFields: ['id', 'email', 'role']
            },
            REGISTER: {
                required: ['message', 'user'],
                userFields: ['id', 'email']
            },
            SESSION: {
                required: ['isValid', 'user'],
                userFields: ['id', 'email', 'role']
            }
        },

        // Messages d'erreur
        ERROR_MESSAGES: {
            AUTH001: 'Email ou mot de passe incorrect',
            AUTH002: 'Compte temporairement verrouillé',
            AUTH003: 'Session expirée, veuillez vous reconnecter',
            AUTH004: 'Token invalide',
            AUTH005: 'Trop de tentatives, veuillez réessayer plus tard',
            AUTH006: 'Données invalides',
            AUTH007: 'Erreur serveur, veuillez réessayer plus tard'
        }
    },

    // Endpoints
    ENDPOINTS: environment.ENDPOINTS,
    
    // Configuration du mode debug
    DEBUG: __DEV__
}; 