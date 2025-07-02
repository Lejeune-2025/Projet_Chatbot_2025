import { API_CONFIG, API_TIMEOUT, ERROR_MESSAGES, API_RETRY_COUNT, API_RETRY_DELAY } from './constants';
import { logger } from './logger';
import { validateMessage } from './validation';
import { conversationHistory } from './ConversationHistory';
import { APIError, NetworkError, ValidationError, TimeoutError, ServerError } from './errors';
import { ENV_CONFIG, validateEnv } from '../config/env';
import { CircuitBreaker } from './CircuitBreaker';
import { FallbackService } from './FallbackService';
import { CacheService } from './CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalApiAuth from './GlobalApiAuth';
import AuthStorage from './AuthStorage';
import { Platform } from 'react-native';

const circuitBreaker = new CircuitBreaker();

// Constantes pour la gestion des timeouts et retries
const PROGRESSIVE_RETRY_DELAY = true; // Activer le délai progressif entre les tentatives
const BASE_RETRY_DELAY = API_RETRY_DELAY || 2000; // 2 secondes par défaut
const MAX_RETRY_DELAY = 10000; // 10 secondes maximum

/**
 * @description Envoie un message à l'API Bard et récupère la réponse
 * @param {string} message - Le message à envoyer
 * @param {string} [specificConversationId] - ID de conversation spécifique (optionnel)
 * @param {AbortSignal} [signal] - Signal d'annulation pour interrompre la requête
 * @returns {Promise<{reply: string, conversationId: string}>} La réponse du chatbot
 * @throws {APIError|NetworkError|ValidationError|TimeoutError|ServerError} En cas d'erreur
 */
export const getBard = async (message, specificConversationId = null, signal = null) => {
    console.log('[getBard] Début de la fonction avec message:', message);
    console.log('[getBard] ID de conversation spécifique:', specificConversationId);

    // Vérification de la connexion au serveur
    try {
        console.log('[getBard] Vérification de la connexion au serveur:', API_CONFIG.BASE_URL);
        const serverCheck = await fetch(API_CONFIG.BASE_URL, {
            method: 'OPTIONS',
            headers: {
                ...API_CONFIG.HEADERS,
                'Origin': Platform.OS === 'web' ? window.location.origin : 'http://localhost:8081'
            },
            signal // Utiliser le signal d'annulation si fourni
        });
        console.log('[getBard] Statut de la vérification du serveur:', {
            status: serverCheck.status,
            ok: serverCheck.ok,
            statusText: serverCheck.statusText,
            headers: Object.fromEntries(serverCheck.headers.entries())
        });

        if (!serverCheck.ok) {
            throw new NetworkError(`Serveur inaccessible (${serverCheck.status}): ${serverCheck.statusText}`);
        }
    } catch (error) {
        // Si l'erreur est due à l'annulation, la propager
        if (error.name === 'AbortError') {
            throw error;
        }
        
        console.error('[getBard] Erreur de connexion au serveur:', {
            error: error.message,
            url: API_CONFIG.BASE_URL,
            type: error.name,
            stack: error.stack
        });

        // Vérifier si c'est une erreur CORS
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new NetworkError('Erreur CORS: Impossible d\'accéder au serveur. Vérifiez que le serveur autorise les requêtes depuis votre domaine.');
        }

        throw new NetworkError('Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.');
    }

    // Vérification du cache
    const cacheKey = `message_${message}`;
    const cachedResponse = await CacheService.getCache(cacheKey);
    if (cachedResponse) {
        console.log('[getBard] Cache hit pour le message');
        return cachedResponse;
    }

    // Vérification de la configuration
    if (!validateEnv()) {
        console.error('[getBard] Configuration invalide');
        throw new ValidationError('Configuration invalide: Variables d\'environnement manquantes');
    }

    console.log('[getBard] === Début de la communication avec l\'API ===');
    console.log('[getBard] URL de l\'API:', API_CONFIG.BASE_URL);
    console.log('[getBard] Message à envoyer:', message);
    console.log('[getBard] Environnement:', ENV_CONFIG.ENV);
    console.log('[getBard] Timeout configuré:', API_TIMEOUT, 'ms');

    try {
        // Récupération du token d'authentification
        const token = await AuthStorage.getToken();
        
        const headers = {
            ...API_CONFIG.HEADERS,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': 'http://localhost:8081'
        };

        // Ajout du token d'authentification si disponible
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        validateMessage(message);
        await conversationHistory.addMessage('user', message);

        const response = await circuitBreaker.execute(async () => {
            // Utiliser l'ID de conversation spécifique s'il est fourni, sinon utiliser celui de l'historique
            let conversationId = specificConversationId;
            if (!conversationId) {
                conversationId = await conversationHistory.getConversationId();
            }

            // Format de la requête pour notre API
            const requestBody = {
                message,
                history: conversationHistory.getFormattedHistory(),
                userId: await getUserId(),
                conversationId: conversationId
            };

            console.log('[getBard] Body de la requête:', requestBody);

            let retryCount = 0;
            let lastError = null;

            while (retryCount < API_RETRY_COUNT) {
                try {
                    console.log(`[getBard] Tentative ${retryCount + 1}/${API_RETRY_COUNT}`);
                    
                    // Créer un nouveau contrôleur d'abandon pour chaque tentative si aucun n'est fourni
                    const controller = signal ? null : new AbortController();
                    
                    // Utiliser le signal fourni ou celui du contrôleur créé
                    const requestSignal = signal || controller?.signal;
                    
                    // Augmenter progressivement le timeout pour les tentatives suivantes
                    const currentTimeout = API_TIMEOUT * (1 + (retryCount * 0.5)); // +50% par tentative
                    console.log(`[getBard] Timeout pour cette tentative: ${currentTimeout}ms`);
                    
                    // Configurer le timeout seulement si on a créé un contrôleur
                    let timeoutId;
                    if (controller) {
                        timeoutId = setTimeout(() => {
                            controller.abort();
                            console.error('[getBard] Timeout de la requête après', currentTimeout, 'ms');
                        }, currentTimeout);
                    }

                    console.log('[getBard] Configuration de la requête:', {
                        url: API_CONFIG.BASE_URL,
                        method: 'POST',
                        headers,
                        credentials: 'omit',
                        mode: 'cors'
                    });

                    const response = await fetch(API_CONFIG.BASE_URL, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(requestBody),
                        signal: requestSignal,
                        credentials: 'omit',
                        mode: 'cors'
                    });

                    // Nettoyer le timeout dès que la réponse est reçue
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }

                    console.log('[getBard] Réponse reçue:', {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries())
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('[getBard] Erreur API:', {
                            status: response.status,
                            statusText: response.statusText,
                            error: errorData,
                            headers: Object.fromEntries(response.headers.entries())
                        });

                        throw new ServerError(
                            errorData.error || ERROR_MESSAGES.SERVER_ERROR,
                            response.status
                        );
                    }

                    const data = await response.json();
                    console.log('[getBard] Données de réponse:', data);

                    if (!data.reply) {
                        console.error('[getBard] Réponse invalide: pas de reply dans la réponse');
                        throw new ServerError('Réponse invalide du serveur');
                    }

                    // Vérifier si l'ID de conversation a changé et le mettre à jour si nécessaire
                    if (data.conversationId && data.conversationId !== conversationId) {
                        console.log('[getBard] L\'ID de conversation a changé:', {
                            ancien: conversationId,
                            nouveau: data.conversationId
                        });
                        
                        // Mettre à jour l'ID dans l'historique des conversations
                        await conversationHistory.updateConversationIdIfNeeded(data.conversationId);
                    }

                    return {
                        reply: data.reply,
                        conversationId: data.conversationId || conversationId
                    };
                } catch (error) {
                    // Si l'erreur est due à l'annulation par le signal externe, la propager immédiatement
                    if (error.name === 'AbortError' && signal && signal.aborted) {
                        throw error;
                    }
                    
                    lastError = error;
                    console.error(`[getBard] Erreur lors de la tentative ${retryCount + 1}:`, {
                        error: error.message,
                        type: error.name
                    });
                    
                    if (error.name === 'AbortError') {
                        console.warn('[getBard] La requête a été abandonnée en raison du timeout');
                        // Ne pas lever d'exception immédiatement, permettre les retries pour les timeouts
                        if (retryCount >= API_RETRY_COUNT - 1) {
                            throw new TimeoutError('La requête a expiré après plusieurs tentatives');
                        }
                    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                        // Erreur réseau, probablement CORS ou serveur inaccessible
                        throw new NetworkError('Erreur de connexion au serveur');
                    }
                    
                    if (retryCount < API_RETRY_COUNT - 1) {
                        // Calculer le délai avant la prochaine tentative (délai progressif)
                        let retryDelay = BASE_RETRY_DELAY;
                        
                        if (PROGRESSIVE_RETRY_DELAY) {
                            // Augmenter exponentiellement le délai entre les tentatives
                            retryDelay = Math.min(
                                BASE_RETRY_DELAY * Math.pow(2, retryCount),
                                MAX_RETRY_DELAY
                            );
                        }
                        
                        console.log(`[getBard] Nouvelle tentative dans ${retryDelay}ms`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                    retryCount++;
                }
            }

            throw lastError || new Error('Échec après toutes les tentatives');
        });

        // Mise en cache de la réponse
        await CacheService.setCache(cacheKey, response);
        console.log('[getBard] Réponse mise en cache');

        // Ajout de la réponse à l'historique
        await conversationHistory.addMessage('assistant', response.reply);
        console.log('[getBard] Réponse ajoutée à l\'historique');

        return response;
    } catch (error) {
        // Si l'erreur est due à l'annulation, la propager
        if (error.name === 'AbortError') {
            throw error;
        }
        
        console.error('[getBard] Erreur détaillée:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // En cas d'erreur, utiliser le fallback
        const fallbackResponse = await FallbackService.getResponse(message, error.name);
        console.log('[getBard] Utilisation de la réponse de fallback:', fallbackResponse);
        return fallbackResponse;
    }
};

/**
 * @description Crée une nouvelle session
 * @returns {Promise<string|null>} L'ID de la nouvelle session ou null en cas d'échec
 */
async function createNewSession() {
    const requestId = Math.random().toString(36).substring(7);
    logger.debug(`[createNewSession:${requestId}] Début de la création de session`);
    
    try {
        // Vérifier si l'utilisateur est authentifié
        const isAuthenticated = await AuthStorage.isAuthenticated();
        let userId = 'anonymous';
        
        if (isAuthenticated) {
            const user = await AuthStorage.getUser();
            if (user && user.id) {
                userId = user.id;
                logger.debug(`[createNewSession:${requestId}] Utilisateur authentifié: ${userId}`);
            }
        } else {
            logger.debug(`[createNewSession:${requestId}] Utilisateur non authentifié, pas de création de session`);
            return null; // Ne pas créer de session pour les utilisateurs non authentifiés
        }
        
        const sessionUrl = `${API_CONFIG.BASE_URL.replace('/api/bard', '/api')}/auth/session`;
        logger.debug(`[createNewSession:${requestId}] URL de création de session:`, sessionUrl);

        const response = await fetch(sessionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                userId,
                deviceInfo: {
                    platform: Platform.OS,
                    version: Platform.Version
                }
            })
        });

        logger.debug(`[createNewSession:${requestId}] Réponse reçue:`, {
            status: response.status,
            statusText: response.statusText
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            logger.error(`[createNewSession:${requestId}] Échec de la création de session:`, {
                status: response.status,
                error: errorData
            });
            throw new Error('Échec de la création de session');
        }

        const data = await response.json();
        logger.debug(`[createNewSession:${requestId}] Données de session:`, data);

        if (!data.sessionId) {
            logger.error(`[createNewSession:${requestId}] Session ID manquant dans la réponse`);
            throw new Error('Session ID manquant dans la réponse');
        }

        // Utiliser la constante CONVERSATION_SESSION_KEY pour stocker l'ID de session
        await AsyncStorage.setItem('conversationSessionId', data.sessionId);
        logger.info(`[createNewSession:${requestId}] Nouvelle session créée et stockée:`, data.sessionId);
        
        return data.sessionId;
    } catch (error) {
        logger.error(`[createNewSession:${requestId}] Erreur lors de la création de session:`, {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return null;
    }
}

/**
 * Récupère l'ID de l'utilisateur connecté ou 'anonymous' si aucun utilisateur n'est connecté
 * @returns {Promise<string>} ID de l'utilisateur
 */
async function getUserId() {
    try {
        const user = await AuthStorage.getUser();
        if (user && user.id) {
            console.log('[getBard] Utilisateur identifié:', user.id);
            return user.id;
        }
    } catch (error) {
        console.error('[getBard] Erreur lors de la récupération de l\'utilisateur:', error);
    }
    
    console.log('[getBard] Aucun utilisateur identifié, utilisation de l\'ID anonyme');
    return 'anonymous';
}