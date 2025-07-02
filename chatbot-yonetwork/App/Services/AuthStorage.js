import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { API_CONFIG } from './constants';

const AUTH_SESSION_KEY = '@auth_session';
const CONVERSATION_SESSION_KEY = '@conversation_session';
const SERVER_SESSION_ID_KEY = '@server_session_id';

const AUTH_KEYS = {
    TOKEN: '@auth_token',
    USER: '@auth_user',
    REFRESH_TOKEN: '@auth_refresh_token',
    TOKEN_EXPIRY: '@auth_token_expiry'
};

class AuthStorage {
    /**
     * Stocke les informations d'authentification de manière sécurisée
     * @param {Object} authData - Données d'authentification
     * @param {string} authData.token - Token JWT
     * @param {Object} authData.user - Informations utilisateur
     * @param {string} authData.refreshToken - Token de rafraîchissement
     * @param {number} authData.expiresIn - Durée de validité du token
     */
    static async setAuthData(authData) {
        try {
            const { token, user, refreshToken, expiresIn } = authData;
            const expiryTime = Date.now() + (expiresIn * 1000);

            await Promise.all([
                AsyncStorage.setItem(AUTH_KEYS.TOKEN, token),
                AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user)),
                AsyncStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refreshToken),
                AsyncStorage.setItem(AUTH_KEYS.TOKEN_EXPIRY, expiryTime.toString())
            ]);

            logger.info('Données d\'authentification stockées avec succès');
        } catch (error) {
            logger.error('Erreur lors du stockage des données d\'authentification:', error);
            throw new Error('Erreur lors du stockage des données d\'authentification');
        }
    }

    /**
     * Crée une session d'authentification
     * @param {string} token - Token JWT
     * @param {Object} user - Informations utilisateur
     * @param {string} refreshToken - Token de rafraîchissement
     * @param {number} expiresIn - Durée de validité du token en secondes
     * @returns {Promise<boolean>} - True si la session a été créée avec succès
     */
    static async createAuthSession(token, user, refreshToken, expiresIn) {
        try {
            const expiryTime = Date.now() + (expiresIn * 1000);
            
            // Stockage des données de session d'authentification
            await Promise.all([
                AsyncStorage.setItem(AUTH_KEYS.TOKEN, token),
                AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user)),
                AsyncStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refreshToken || ''),
                AsyncStorage.setItem(AUTH_KEYS.TOKEN_EXPIRY, expiryTime.toString())
            ]);
            
            logger.info('Session d\'authentification créée avec succès');
            return true;
        } catch (error) {
            logger.error('Erreur lors de la création de la session d\'authentification:', error);
            return false;
        }
    }

    /**
     * Récupère le token JWT
     * @returns {Promise<string|null>} Token JWT ou null
     */
    static async getToken() {
        try {
            const token = await AsyncStorage.getItem(AUTH_KEYS.TOKEN);
            const expiryTime = await AsyncStorage.getItem(AUTH_KEYS.TOKEN_EXPIRY);

            if (!token || !expiryTime) return null;

            // Vérifier si le token est expiré
            if (Date.now() > parseInt(expiryTime)) {
                await this.clearAuthData();
                return null;
            }

            return token;
        } catch (error) {
            logger.error('Erreur lors de la récupération du token:', error);
            return null;
        }
    }

    /**
     * Récupère les informations de l'utilisateur
     * @returns {Promise<Object|null>} Informations utilisateur ou null
     */
    static async getUser() {
        try {
            const userStr = await AsyncStorage.getItem(AUTH_KEYS.USER);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            logger.error('Erreur lors de la récupération des informations utilisateur:', error);
            return null;
        }
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     * @returns {Promise<boolean>} True si authentifié
     */
    static async isAuthenticated() {
        try {
            const token = await this.getToken();
            return !!token;
        } catch (error) {
            logger.error('Erreur lors de la vérification de l\'authentification:', error);
            return false;
        }
    }

    /**
     * Efface toutes les données d'authentification
     */
    static async clearAuthData() {
        try {
            await Promise.all([
                AsyncStorage.removeItem(AUTH_KEYS.TOKEN),
                AsyncStorage.removeItem(AUTH_KEYS.USER),
                AsyncStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN),
                AsyncStorage.removeItem(AUTH_KEYS.TOKEN_EXPIRY)
            ]);
            logger.info('Données d\'authentification effacées avec succès');
        } catch (error) {
            logger.error('Erreur lors de l\'effacement des données d\'authentification:', error);
            throw new Error('Erreur lors de la déconnexion');
        }
    }

    /**
     * Crée une session sur le serveur
     * @param {string} userId - ID de l'utilisateur
     * @param {Object} deviceInfo - Informations sur l'appareil
     * @returns {Promise<string|null>} - ID de session ou null en cas d'échec
     */
    static async createServerSession(userId, deviceInfo = {}) {
        try {
            const token = await this.getToken();
            if (!token) {
                logger.error('Impossible de créer une session serveur: token manquant');
                return null;
            }

            // Utiliser l'URL complète avec http://
            const sessionUrl = `${API_CONFIG.AUTH_URL}/session`;
            logger.info('Création d\'une session serveur:', { url: sessionUrl });

            const response = await fetch(sessionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Origin': 'http://localhost:8081'
                },
                body: JSON.stringify({ userId, deviceInfo })
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('Erreur serveur lors de la création de session:', { 
                    status: response.status, 
                    error: errorText 
                });
                throw new Error(`Erreur serveur: ${response.status}`);
            }

            const data = await response.json();
            logger.info('Réponse de création de session:', data);
            
            if (data.sessionId) {
                // Stocker l'ID de session serveur
                await AsyncStorage.setItem(SERVER_SESSION_ID_KEY, data.sessionId);
                logger.info('Session serveur créée avec succès', { sessionId: data.sessionId });
                return data.sessionId;
            } else {
                throw new Error('ID de session manquant dans la réponse');
            }
        } catch (error) {
            logger.error('Erreur lors de la création de la session serveur:', error);
            return null;
        }
    }

    /**
     * Vérifie la validité d'une session serveur
     * @returns {Promise<boolean>} - True si la session est valide
     */
    static async validateServerSession() {
        try {
            const sessionId = await AsyncStorage.getItem(SERVER_SESSION_ID_KEY);
            const token = await this.getToken();
            
            if (!sessionId || !token) {
                return false;
            }

            // Utiliser l'URL complète avec http://
            const sessionUrl = `${API_CONFIG.AUTH_URL}/session?id=${sessionId}`;
            logger.info('Vérification de session serveur:', { url: sessionUrl });

            const response = await fetch(sessionUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Origin': 'http://localhost:8081'
                }
            });

            if (!response.ok) {
                logger.warn('Session serveur invalide:', { status: response.status });
                return false;
            }

            const data = await response.json();
            logger.info('Réponse de vérification de session:', data);
            return data.valid === true;
        } catch (error) {
            logger.error('Erreur lors de la validation de la session serveur:', error);
            return false;
        }
    }

    /**
     * Termine une session serveur (déconnexion)
     * @returns {Promise<boolean>} - True si la déconnexion a réussi
     */
    static async endServerSession() {
        try {
            const sessionId = await AsyncStorage.getItem(SERVER_SESSION_ID_KEY);
            const token = await this.getToken();
            
            if (!sessionId || !token) {
                return false;
            }

            // Utiliser l'URL complète avec http://
            const sessionUrl = `${API_CONFIG.AUTH_URL}/session?id=${sessionId}`;
            logger.info('Fin de session serveur:', { url: sessionUrl });

            const response = await fetch(sessionUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Origin': 'http://localhost:8081'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('Erreur serveur lors de la fin de session:', { 
                    status: response.status, 
                    error: errorText 
                });
                throw new Error(`Erreur serveur: ${response.status}`);
            }

            // Supprimer l'ID de session du stockage local
            await AsyncStorage.removeItem(SERVER_SESSION_ID_KEY);
            logger.info('Session serveur terminée avec succès');
            
            return true;
        } catch (error) {
            logger.error('Erreur lors de la fin de la session serveur:', error);
            return false;
        }
    }

    /**
     * Déconnecte complètement l'utilisateur (client et serveur)
     */
    static async logout() {
        try {
            // Terminer la session serveur d'abord
            await this.endServerSession();
            
            // Puis effacer les données d'authentification locales
            await this.clearAuthData();
            
            logger.info('Déconnexion complète réussie');
            return true;
        } catch (error) {
            logger.error('Erreur lors de la déconnexion complète:', error);
            throw error;
        }
    }
}

export default AuthStorage; 