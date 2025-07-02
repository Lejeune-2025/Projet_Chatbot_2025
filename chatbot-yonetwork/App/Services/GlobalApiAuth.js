import env from '../config/GlobalApiAuth/env';
import { API_CONFIG, API_ENDPOINTS } from '../config/GlobalApiAuth/api';
import { logger } from './logger';
import { Alert } from 'react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { AUTH_API_CONFIG } from '../config/GlobalApiAuth/authApi';
import { validateEmail, validatePassword } from './validation';
import { AuthStorage } from './AuthStorage';

class GlobalApiAuth {
    constructor() {
        this.baseUrl = AUTH_API_CONFIG.BASE_URL;
        this.endpoints = AUTH_API_CONFIG.AUTH.ENDPOINTS;
        this.timeout = AUTH_API_CONFIG.TIMEOUT;
        this.maxRetries = AUTH_API_CONFIG.MAX_RETRIES;
        this.retryDelay = 1000;
        this.debug = AUTH_API_CONFIG.DEBUG;
        this.rateLimiter = new Map(); // Pour le rate limiting
        this.tokenCache = new Map(); // Pour le cache des tokens
        this.verificationAttempts = new Map(); // Pour la protection contre le force brute
    }

    // Validation des entrées
    validateEmail(email) {
        console.log('Validation de l\'email:', email);
        
        // Vérifier si email est un objet et extraire la valeur
        if (typeof email === 'object' && email !== null) {
            email = email.email;
        }
        
        if (!email || typeof email !== 'string') {
            throw new Error('L\'email est requis et doit être une chaîne de caractères');
        }
        
        // Nettoyage de l'email
        const cleanEmail = email.trim().toLowerCase();
        
        // Expression régulière plus permissive pour la validation d'email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!emailRegex.test(cleanEmail)) {
            console.error('Email invalide:', cleanEmail);
            throw new Error('Format d\'email invalide. Exemple: utilisateur@domaine.com');
        }
        
        return cleanEmail;
    }

    validatePassword(password) {
        console.log('Validation du mot de passe:', { length: password?.length });
        const minLength = 8;
        
        if (!password) {
            throw new Error('Le mot de passe est requis');
        }
        
        if (password.length < minLength) {
            throw new Error(`Le mot de passe doit contenir au moins ${minLength} caractères (actuellement: ${password.length})`);
        }
        
        console.log('Mot de passe validé avec succès');
        return true;
    }

    // Gestion des erreurs avec alertes
    handleError(error, context) {
        console.error(`Erreur ${context}:`, error);
        
        // Messages d'erreur spécifiques pour l'utilisateur
        const userFriendlyMessages = {
            'Cet email est déjà utilisé': 'Cet email est déjà utilisé. Veuillez utiliser une autre adresse email ou vous connecter.',
            'Email ou mot de passe incorrect': 'Email ou mot de passe incorrect et/ou compte non vérifié.',
            'Email non vérifié': 'Email ou mot de passe incorrect et/ou compte non vérifié.',
            'Mot de passe trop court': 'Le mot de passe doit contenir au moins 8 caractères.',
            'Format d\'email invalide': 'Veuillez entrer une adresse email valide.',
            'Compte inactif': 'Votre compte est inactif. Veuillez contacter le support.',
            'Trop de tentatives': 'Trop de tentatives de connexion. Veuillez réessayer plus tard.'
        };

        // Message d'erreur par défaut
        let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
        let errorData = {};

        // Si l'erreur a un message spécifique, l'utiliser
        if (error.message && typeof error.message === 'string') {
            if (userFriendlyMessages[error.message]) {
                errorMessage = userFriendlyMessages[error.message];
            } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
                errorMessage = 'Le serveur met trop de temps à répondre. Veuillez réessayer.';
            }
        }

        // Si l'erreur a un statut 409 (conflit), c'est probablement un email déjà utilisé
        if (error.status === 409) {
            errorMessage = userFriendlyMessages['Cet email est déjà utilisé'];
        }
        // Si l'erreur a un statut 401 (non autorisé) ou 403 (interdit)
        else if (error.status === 401 || error.status === 403) {
            errorMessage = userFriendlyMessages['Email ou mot de passe incorrect'];
            if (error.data?.needsVerification) {
                errorData = { needsVerification: true };
            }
        }

        return {
            message: errorMessage,
            ...errorData
        };
    }

    // Méthode sécurisée pour les requêtes
    async makeRequest(endpoint, options = {}) {
        const maxRetries = 3;
        const baseTimeout = 5000; // 5 secondes au lieu de 15
        const maxTimeout = 10000; // 10 secondes maximum

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            let timeoutId;
            try {
                console.log(`Tentative ${attempt}/${maxRetries}`);
                
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), baseTimeout * attempt);

                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                        ...options,
                        signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }

                const data = await response.json();
                    return data;
            } catch (error) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                if (error.name === 'AbortError') {
                    console.log(`Timeout de la requête après ${baseTimeout * attempt} ms`);
                    if (attempt === maxRetries) {
                        throw new Error('Le serveur met trop de temps à répondre. Veuillez réessayer dans quelques instants.');
                    }
                } else {
                    console.error(`Erreur lors de la tentative ${attempt}:`, error);
                    if (attempt === maxRetries) {
                        throw error;
                    }
                }

                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
                    console.log(`Nouvelle tentative dans ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }

    // Méthodes d'authentification sécurisées
    async register(email, password) {
        try {
            console.log('=== Début de l\'inscription ===');
            console.log('Email reçu:', email);
            
            // Vérifier si email est un objet et extraire la valeur
            if (typeof email === 'object' && email !== null) {
                const credentials = email;
                email = credentials.email;
                password = credentials.password;
            }
            
            // Validation de l'email
            const cleanEmail = this.validateEmail(email);
            console.log('Email validé:', cleanEmail);
            
            // Validation du mot de passe
            this.validatePassword(password);
            console.log('Mot de passe validé');
            
            console.log('Préparation de la requête d\'inscription');
            
            const deviceInfo = {
                platform: Platform.OS,
                version: Platform.Version
            };
            
            console.log('Informations de l\'appareil:', deviceInfo);
            
            const response = await this.makeRequest(this.endpoints.REGISTER, {
                method: 'POST',
                body: JSON.stringify({ 
                    email: cleanEmail, 
                    password,
                    deviceInfo
                })
            });

            console.log('Réponse du serveur:', response);
            console.log('=== Fin de l\'inscription ===');
            
            // Vérifier si la réponse indique qu'une vérification est nécessaire
            const needsVerification = response.status === 'pending' || response.verificationRequired || response.needsVerification;
            
            // S'assurer que la réponse contient les informations nécessaires
            return {
                ...response,
                needsVerification,
                message: needsVerification 
                    ? 'Veuillez vérifier votre email pour activer votre compte.'
                    : 'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.'
            };
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', {
                message: error.message,
                stack: error.stack,
                response: error.response
            });
            
            // Amélioration de la gestion des erreurs
            let errorMessage = error.message;
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            throw error;
        }
    }

    // Nouvelle méthode pour vérifier l'email
    async verifyEmail(token) {
        try {
            const response = await this.makeRequest('/auth/verify-email', {
                method: 'POST',
                body: JSON.stringify({ token })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // S'assurer que la réponse contient les informations nécessaires
            if (!response.success && !response.message) {
                throw new Error('Réponse invalide du serveur');
            }

            return {
                success: true,
                message: response.message || 'Votre email a été vérifié avec succès',
                user: response.user
            };
        } catch (error) {
            this.handleError(error, 'verifyEmail');
            throw error;
        }
    }

    // Nouvelle méthode pour renvoyer l'email de vérification
    async resendVerificationEmail(email) {
        try {
            // Valider l'email
            if (!this.validateEmail(email)) {
                throw new Error('Format d\'email invalide');
            }

            const response = await this.makeRequest(
                '/resend-verification',
                {
                    method: 'POST',
                    body: JSON.stringify({ email })
                }
            );

            if (response.success) {
                return response;
            } else {
                throw new Error(response.message || 'Erreur lors du réenvoi de l\'email de vérification');
            }
        } catch (error) {
            console.error('Erreur lors du réenvoi de l\'email:', error);
            throw error; // Propager l'erreur pour qu'elle soit gérée par le composant
        }
    }

    // Nouvelle méthode pour vérifier le rate limiting
    checkRateLimit(email) {
        const now = Date.now();
        const lastAttempt = this.rateLimiter.get(email) || 0;
        const minDelay = 60000; // 1 minute entre chaque tentative

        if (now - lastAttempt < minDelay) {
            throw new Error(`Veuillez attendre ${Math.ceil((minDelay - (now - lastAttempt)) / 1000)} secondes avant de réessayer`);
        }

        this.rateLimiter.set(email, now);
        return true;
    }

    // Nouvelle méthode pour vérifier les tentatives de vérification
    checkVerificationAttempts(email) {
        const attempts = this.verificationAttempts.get(email) || { count: 0, timestamp: Date.now() };
        const maxAttempts = 5;
        const lockoutDuration = 3600000; // 1 heure

        if (attempts.count >= maxAttempts) {
            const timeLeft = lockoutDuration - (Date.now() - attempts.timestamp);
            if (timeLeft > 0) {
                throw new Error(`Trop de tentatives. Réessayez dans ${Math.ceil(timeLeft / 60000)} minutes`);
            }
            // Réinitialiser les tentatives après la période de verrouillage
            this.verificationAttempts.set(email, { count: 0, timestamp: Date.now() });
        }

        attempts.count++;
        this.verificationAttempts.set(email, attempts);
        return true;
    }

    // Nouvelle méthode pour vérifier la validité du token
    isTokenValid(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }

    // Méthode pour naviguer vers l'écran de connexion
    navigateToLogin() {
        // Cette méthode sera implémentée dans le composant qui utilise GlobalApiAuth
        if (this.onNavigateToLogin) {
            this.onNavigateToLogin();
        }
    }

    async login(email, password) {
        try {
            this.validateEmail(email);
            
            logger.info('Tentative de connexion:', { email });
            
            const response = await this.makeRequest(this.endpoints.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ 
                    email, 
                    password,
                    deviceInfo: {
                        platform: Platform.OS,
                        version: Platform.Version
                    }
                })
            });

            if (response.token) {
                await this.storeTokens(response.token, response.refreshToken);
            }

            logger.info('Connexion réussie:', { email });
            return response;
        } catch (error) {
            // Retourner un objet d'erreur structuré pour l'appelant
            const errorMessage = this.handleError(error, 'lors de la connexion');
            return { error: true, message: errorMessage, raw: error };
        }
    }

    async logout() {
        try {
            const token = await this.getToken();
            if (!token) return;

            await this.makeRequest(this.endpoints.LOGOUT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            await this.clearTokens();
            logger.info('Déconnexion réussie');
        } catch (error) {
            this.handleError(error, 'lors de la déconnexion');
        }
    }

    // Méthodes de gestion des tokens sécurisées
    async storeTokens(token, refreshToken) {
        try {
            const encryptedToken = await this.encryptData(token);
            const encryptedRefreshToken = await this.encryptData(refreshToken);
            
            await AsyncStorage.multiSet([
                ['auth_token', encryptedToken],
                ['refresh_token', encryptedRefreshToken],
                ['token_timestamp', Date.now().toString()]
            ]);
        } catch (error) {
            logger.error('Erreur lors du stockage des tokens:', error);
            throw error;
        }
    }

    async getToken() {
        try {
            const encryptedToken = await AsyncStorage.getItem('auth_token');
            if (!encryptedToken) return null;
            
            return await this.decryptData(encryptedToken);
        } catch (error) {
            logger.error('Erreur lors de la récupération du token:', error);
            return null;
        }
    }

    async clearTokens() {
        try {
            await AsyncStorage.multiRemove([
                'auth_token',
                'refresh_token',
                'token_timestamp'
            ]);
        } catch (error) {
            logger.error('Erreur lors de la suppression des tokens:', error);
            throw error;
        }
    }

    // Méthodes de chiffrement
    async encryptData(data) {
        try {
            const key = await this.getEncryptionKey();
            return await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                data + key
            );
        } catch (error) {
            logger.error('Erreur lors du chiffrement:', error);
            throw error;
        }
    }

    async decryptData(encryptedData) {
        try {
            const key = await this.getEncryptionKey();
            // Implémentez votre logique de déchiffrement ici
            return encryptedData;
        } catch (error) {
            logger.error('Erreur lors du déchiffrement:', error);
            throw error;
        }
    }

    async getEncryptionKey() {
        try {
            let key = await AsyncStorage.getItem('encryption_key');
            if (!key) {
                key = await Crypto.randomUUID();
                await AsyncStorage.setItem('encryption_key', key);
            }
            return key;
        } catch (error) {
            logger.error('Erreur lors de la récupération de la clé de chiffrement:', error);
            throw error;
        }
    }
}

export default new GlobalApiAuth(); 