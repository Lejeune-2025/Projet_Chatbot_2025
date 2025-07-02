/**
 * Configuration des variables d'environnement
 * Ce fichier sert de passerelle vers notre configuration environment.js centralisée
 */

import environment from './environment';

export const ENV_CONFIG = {
    API_URL: environment.API_URL,
    ENV: __DEV__ ? 'dev' : 'prod',
    TIMEOUT: environment.TIMEOUT,
    MAX_RETRIES: environment.MAX_RETRIES,
    HEADERS: environment.HEADERS,
    CHAT: environment.CHAT
};

// Vérification des variables d'environnement requises
export const validateEnv = () => {
    // Vérifier que nous avons au moins une URL d'API valide
    if (!environment.API_URL || !environment.API_URL.BARD) {
        console.warn('URLs d\'API manquantes dans la configuration');
        return false;
    }

    return true;
};

// Log des variables d'environnement (en dev uniquement)
if (__DEV__) {
    console.log('Configuration environnement:', {
        API_URL: ENV_CONFIG.API_URL,
        ENV: ENV_CONFIG.ENV,
        TIMEOUT: ENV_CONFIG.TIMEOUT,
        MAX_RETRIES: ENV_CONFIG.MAX_RETRIES
    });
} 