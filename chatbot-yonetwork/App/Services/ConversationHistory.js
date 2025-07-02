import { CHAT_CONFIG } from './constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const STORAGE_KEY = '@chat_history';
const CONVERSATION_ID_KEY = '@conversation_id';

/**
 * Génère un UUID v4
 * @returns {string} Un UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Gestionnaire d'historique de conversation avec persistance
 */
class ConversationHistory {
    constructor(maxHistory = 15) {
        this.maxHistory = maxHistory;
        this.history = [];
        this.initialized = false;
        this.conversationId = null;
        this.initialize().catch(error => {
            logger.error('Erreur lors de l\'initialisation de ConversationHistory', { error });
        });
    }

    /**
     * Initialise l'historique depuis le stockage
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Charger l'historique
            const storedHistory = await AsyncStorage.getItem(STORAGE_KEY);
            if (storedHistory) {
                this.history = JSON.parse(storedHistory);
                logger.info('Historique chargé depuis le stockage', { 
                    messageCount: this.history.length 
                });
            }

            // Charger l'ID de conversation
            const storedConversationId = await AsyncStorage.getItem(CONVERSATION_ID_KEY);
            if (storedConversationId) {
                this.conversationId = storedConversationId;
                logger.info('ID de conversation chargé depuis le stockage', { 
                    conversationId: this.conversationId 
                });
            }
        } catch (error) {
            logger.error('Erreur lors du chargement des données', { error });
            this.history = [];
            this.conversationId = null;
        }

        this.initialized = true;
    }

    /**
     * Sauvegarde l'historique dans le stockage
     */
    async saveToStorage() {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
            logger.info('Historique sauvegardé avec succès', { 
                messageCount: this.history.length 
            });
        } catch (error) {
            logger.error('Erreur lors de la sauvegarde de l\'historique', { error });
        }
    }

    /**
     * Ajoute un message à l'historique
     * @param {string} role - 'user' ou 'assistant'
     * @param {string} content - Le contenu du message
     */
    async addMessage(role, content) {
        if (!this.initialized) {
            await this.initialize();
        }

        this.history.push({ 
            role, 
            content,
            timestamp: new Date().toISOString()
        });
        
        // Garde uniquement les derniers messages
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }

        await this.saveToStorage();
    }

    /**
     * Récupère l'historique formaté pour l'API
     * @returns {Array} L'historique des messages
     */
    getFormattedHistory() {
        return this.history.map(({ role, content }) => ({ role, content }));
    }

    /**
     * Récupère l'historique complet avec les timestamps
     * @returns {Array} L'historique complet des messages
     */
    getFullHistory() {
        return [...this.history];
    }

    /**
     * Définit un ID de conversation spécifique
     * @param {string} id - L'ID de conversation à utiliser
     * @returns {Promise<void>}
     */
    async setConversationId(id) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (id && typeof id === 'string') {
            this.conversationId = id;
            // Sauvegarder l'ID dans le stockage
            try {
                await AsyncStorage.setItem(CONVERSATION_ID_KEY, id);
                logger.info('ID de conversation défini et sauvegardé', { 
                    conversationId: id 
                });
            } catch (error) {
                logger.error('Erreur lors de la sauvegarde de l\'ID de conversation', { error });
            }
        } else {
            logger.warn('Tentative de définir un ID de conversation invalide', { id });
        }
    }

    /**
     * Met à jour l'ID de conversation si nécessaire après une réponse du serveur
     * @param {string} serverConversationId - ID de conversation renvoyé par le serveur
     * @returns {Promise<boolean>} true si l'ID a été mis à jour, false sinon
     */
    async updateConversationIdIfNeeded(serverConversationId) {
        if (!this.initialized) {
            await this.initialize();
        }

        // Si le serveur renvoie un ID différent de celui que nous avons actuellement
        if (serverConversationId && 
            typeof serverConversationId === 'string' && 
            this.conversationId !== serverConversationId) {
            
            logger.info('Mise à jour de l\'ID de conversation', {
                oldId: this.conversationId,
                newId: serverConversationId
            });
            
            // Mettre à jour l'ID de conversation
            await this.setConversationId(serverConversationId);
            return true;
        }
        
        return false;
    }

    /**
     * Génère ou récupère l'ID de conversation
     * @returns {Promise<string>} L'ID de conversation (UUID)
     */
    async getConversationId() {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.conversationId) {
            // Générer un UUID v4
            this.conversationId = generateUUID();
            // Sauvegarder l'ID dans le stockage
            try {
                await AsyncStorage.setItem(CONVERSATION_ID_KEY, this.conversationId);
                logger.info('Nouvel ID de conversation généré et sauvegardé', { 
                    conversationId: this.conversationId 
                });
            } catch (error) {
                logger.error('Erreur lors de la sauvegarde de l\'ID de conversation', { error });
            }
        }
        return this.conversationId;
    }

    /**
     * Réinitialise l'historique et optionnellement l'ID de conversation
     * @param {boolean} resetId - Si true, réinitialise également l'ID de conversation
     */
    async clear(resetId = true) {
        this.history = [];
        
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            
            if (resetId) {
                this.conversationId = null;
                await AsyncStorage.removeItem(CONVERSATION_ID_KEY);
                logger.info('Historique et ID de conversation réinitialisés avec succès');
            } else {
                logger.info('Historique réinitialisé, ID de conversation conservé:', this.conversationId);
            }
        } catch (error) {
            logger.error('Erreur lors de la réinitialisation des données', { error });
        }
    }
    
    /**
     * Réinitialise uniquement l'historique sans effacer l'ID de conversation
     */
    async clearHistoryOnly() {
        await this.clear(false);
    }
}

// Créer une instance unique de ConversationHistory
const conversationHistory = new ConversationHistory();

// Exporter l'instance
export { conversationHistory }; 