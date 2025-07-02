import config from '../config/environment';

export const API_TIMEOUT = config.TIMEOUT;
export const API_RETRY_COUNT = config.MAX_RETRIES || 5; // Augmenté à 5 tentatives par défaut
export const API_RETRY_DELAY = 2000; // 2 secondes de délai initial entre les tentatives

export const ERROR_MESSAGES = {
    INVALID_MESSAGE: "Message invalide",
    NO_RESPONSE: "Aucune réponse générée",
    SERVER_ERROR: 'Erreur du serveur',
    NETWORK_ERROR: 'Erreur de connexion au serveur',
    TIMEOUT_ERROR: 'Le serveur met trop de temps à répondre',
    MESSAGE_TOO_SHORT: "Message trop court",
    MESSAGE_TOO_LONG: "Message trop long",
    INVALID_TYPE: "Type de message invalide",
    VALIDATION_ERROR: 'Données invalides',
    UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite'
};

// Déterminer l'URL de l'API en fonction de l'environnement
const getApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    // En développement web, utiliser l'IP locale
    if (typeof window !== 'undefined') {
        return 'http://192.168.56.1:3000/api/bard';
    }
    // Fallback pour mobile
    return 'http://192.168.56.1:3000/api/bard';
};

export const API_CONFIG = {
    BASE_URL: config.API_URL.BARD,
    CONVERSATIONS_URL: config.API_URL.CONVERSATIONS,
    AUTH_URL: config.API_URL.AUTH,
    TEST_URL: config.API_URL.TEST,
    HEADERS: {
        ...config.HEADERS,
        'Origin': 'http://localhost:8081'
    }
};

export const CHAT_CONFIG = {
    MAX_MESSAGE_LENGTH: config.CHAT.MAX_MESSAGE_LENGTH,
    MIN_MESSAGE_LENGTH: config.CHAT.MIN_MESSAGE_LENGTH,
    MESSAGE_VALIDATION_REGEX: config.CHAT.MESSAGE_VALIDATION_REGEX
}; 