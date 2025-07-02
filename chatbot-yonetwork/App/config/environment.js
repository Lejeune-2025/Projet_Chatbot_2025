/**
 * Configuration par environnement
 */

import { Platform } from 'react-native';

// Définir la base de l'URL en fonction de la plateforme
const getBaseUrl = () => {
    // D'abord, essayer d'utiliser la variable d'environnement
    if (process.env.EXPO_PUBLIC_API_URL_BASE) {
        return process.env.EXPO_PUBLIC_API_URL_BASE;
    }
    
    // Fallback selon la plateforme
    if (Platform.OS === 'web') {
        return 'http://localhost:3000';
    } else if (Platform.OS === 'android') {
        // Sur Android, 'localhost' fait référence à l'émulateur lui-même, pas à l'hôte
        return 'http://10.0.2.2:3000';
    } else {
        // iOS ou autre
        return 'http://localhost:3000';
    }
};

const BASE_URL = getBaseUrl();

const ENV = {
    dev: {
        API_URL: {
            BARD: `${BASE_URL}/api/bard`,
            CONVERSATIONS: `${BASE_URL}/api/conversations`,
            AUTH: `${BASE_URL}/api/auth`,
            TEST: `${BASE_URL}/api/test`
        },
        TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '60000'),
        MAX_RETRIES: parseInt(process.env.EXPO_PUBLIC_MAX_RETRIES || '5'),
        HEADERS: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        CHAT: {
            MAX_MESSAGE_LENGTH: parseInt(process.env.EXPO_PUBLIC_MAX_MESSAGE_LENGTH || '1000'),
            MIN_MESSAGE_LENGTH: parseInt(process.env.EXPO_PUBLIC_MIN_MESSAGE_LENGTH || '1'),
            MESSAGE_VALIDATION_REGEX: /^[\s\S]{1,1000}$/
        }
    },
    prod: {
        API_URL: {
            BARD: `${BASE_URL}/api/bard`,
            CONVERSATIONS: `${BASE_URL}/api/conversations`,
            AUTH: `${BASE_URL}/api/auth`,
            TEST: `${BASE_URL}/api/test`
        },
        TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '60000'),
        MAX_RETRIES: parseInt(process.env.EXPO_PUBLIC_MAX_RETRIES || '5'),
        HEADERS: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        CHAT: {
            MAX_MESSAGE_LENGTH: parseInt(process.env.EXPO_PUBLIC_MAX_MESSAGE_LENGTH || '1000'),
            MIN_MESSAGE_LENGTH: parseInt(process.env.EXPO_PUBLIC_MIN_MESSAGE_LENGTH || '1'),
            MESSAGE_VALIDATION_REGEX: /^[\s\S]{1,1000}$/
        }
    }
};

// Sélectionner l'environnement en fonction de la plateforme
const getEnvVars = () => {
    if (__DEV__) {
        return ENV.dev;
    }
    return ENV.prod;
};

export default getEnvVars(); 