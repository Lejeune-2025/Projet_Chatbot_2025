/**
 * Ce fichier est désormais obsolète et est remplacé par ../environment.js
 * Il est conservé pour maintenir la compatibilité avec les anciens imports.
 */

import environment from '../environment';

// Créer un objet compatible avec l'ancien format
const env = {
    API_URL: environment.API_URL.BARD,
    AUTH_URL: environment.API_URL.AUTH,
    TIMEOUT: environment.TIMEOUT,
    MAX_RETRIES: environment.MAX_RETRIES,
    DEBUG: __DEV__,
        ENDPOINTS: {
            REGISTER: '/register',
            LOGIN: '/login',
            LOGOUT: '/logout',
            REFRESH: '/refresh',
            SESSION: '/session',
        PROFILE: '/profile',
        VERIFY_EMAIL: '/verify-email',
        RESEND_VERIFICATION: '/resend-verification',
        FORGOT_PASSWORD: '/forgot-password',
        RESET_PASSWORD: '/reset-password'
    }
};

export default env; 