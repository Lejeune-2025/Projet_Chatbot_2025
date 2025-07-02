import { Platform } from 'react-native';
import environment from '../environment';

export const API_CONFIG = {
    BASE_URL: environment.API_URL.AUTH.replace('/auth', ''), // Enlève le suffixe /auth pour avoir l'URL de base
    TIMEOUT: environment.TIMEOUT,
    MAX_RETRIES: environment.MAX_RETRIES,
    HEADERS: {
        ...environment.HEADERS,
        'Origin': Platform.OS === 'android' ? 'http://10.0.2.2:8081' : 'http://localhost:8081'
    },
    AUTH: {
        TOKEN_EXPIRY: 86400, // 24 heures en secondes
        REFRESH_TOKEN_EXPIRY: 604800, // 7 jours en secondes
        ENDPOINTS: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            LOGOUT: '/auth/logout',
            REFRESH: '/auth/refresh',
            PROFILE: '/auth/profile'
        }
    }
};

export const API_ENDPOINTS = {
    REGISTER: `${environment.API_URL.AUTH}/register`,
    LOGIN: `${environment.API_URL.AUTH}/login`,
    LOGOUT: `${environment.API_URL.AUTH}/logout`,
    VERIFY_EMAIL: `${environment.API_URL.AUTH}/verify-email`,
    RESEND_VERIFICATION: `${environment.API_URL.AUTH}/resend-verification`,
    REFRESH_TOKEN: `${environment.API_URL.AUTH}/refresh-token`,
    FORGOT_PASSWORD: `${environment.API_URL.AUTH}/forgot-password`,
    RESET_PASSWORD: `${environment.API_URL.AUTH}/reset-password`,
    UPDATE_PROFILE: `${environment.API_URL.AUTH}/update-profile`,
    CHANGE_PASSWORD: `${environment.API_URL.AUTH}/change-password`
}; 