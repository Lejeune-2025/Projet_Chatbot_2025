import { logger } from '../logger';

/**
 * Service pour optimiser la fluidité des conversations vocales
 * Gère les interruptions, les temps de réponse et les transitions
 */
class VoiceFlowService {
    constructor() {
        this.isConversationActive = false;
        this.lastUserInput = null;
        this.lastBotResponse = null;
        this.conversationHistory = [];
        this.silenceTimer = null;
        this.interruptionThreshold = 2000; // 2 secondes
        this.maxSilenceTime = 10000; // 10 secondes
        this.responseDelay = 500; // 500ms avant de répondre
        this.autoRestartDelay = 1000; // 1 seconde avant de redémarrer l'écoute
        this.callbacks = {};
        this.settings = {
            enableAutoRestart: true,
            enableInterruption: true,
            enableSilenceDetection: true,
            responseSpeed: 'normal', // 'fast', 'normal', 'slow'
            conversationStyle: 'natural' // 'natural', 'formal', 'casual'
        };
    }

    /**
     * Initialise le service de fluidité
     */
    async initialize() {
        try {
            this.loadSettings();
            logger.log('🎯 Service de fluidité vocale initialisé');
            return true;
        } catch (error) {
            logger.error('❌ Erreur lors de l\'initialisation du service de fluidité:', error);
            throw error;
        }
    }

    /**
     * Démarre une conversation vocale
     */
    startConversation() {
        this.isConversationActive = true;
        this.conversationHistory = [];
        this.startSilenceTimer();
        
        if (this.callbacks.onConversationStart) {
            this.callbacks.onConversationStart();
        }
        
        logger.log('🗣️ Conversation vocale démarrée');
    }

    /**
     * Arrête la conversation vocale
     */
    stopConversation() {
        this.isConversationActive = false;
        this.stopSilenceTimer();
        
        if (this.callbacks.onConversationEnd) {
            this.callbacks.onConversationEnd();
        }
        
        logger.log('🛑 Conversation vocale arrêtée');
    }

    /**
     * Traite un nouvel input utilisateur
     * @param {string} transcript - Transcription de l'utilisateur
     * @param {number} confidence - Niveau de confiance
     */
    async processUserInput(transcript, confidence = 1.0) {
        try {
            const cleanTranscript = this.preprocessText(transcript);
            
            // Vérifier si c'est une commande d'arrêt
            if (this.isStopCommand(cleanTranscript)) {
                this.stopConversation();
                return null;
            }

            // Vérifier si c'est suffisamment confiant
            if (confidence < 0.6) {
                logger.log('🤔 Confiance trop faible, demande de répétition');
                return this.generateClarificationRequest();
            }

            // Ajouter à l'historique
            this.lastUserInput = {
                text: cleanTranscript,
                timestamp: Date.now(),
                confidence: confidence
            };

            this.conversationHistory.push({
                type: 'user',
                text: cleanTranscript,
                timestamp: Date.now(),
                confidence: confidence
            });

            // Réinitialiser le timer de silence
            this.resetSilenceTimer();

            // Délai avant traitement (plus naturel)
            await this.delay(this.getResponseDelay());

            return cleanTranscript;
        } catch (error) {
            logger.error('❌ Erreur lors du traitement de l\'input utilisateur:', error);
            throw error;
        }
    }

    /**
     * Traite une réponse du bot
     * @param {string} response - Réponse du bot
     */
    async processBotResponse(response) {
        try {
            const optimizedResponse = this.optimizeResponseForSpeech(response);
            
            this.lastBotResponse = {
                text: optimizedResponse,
                timestamp: Date.now()
            };

            this.conversationHistory.push({
                type: 'bot',
                text: optimizedResponse,
                timestamp: Date.now()
            });

            // Nettoyer l'historique si trop long
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-15);
            }

            return optimizedResponse;
        } catch (error) {
            logger.error('❌ Erreur lors du traitement de la réponse du bot:', error);
            throw error;
        }
    }

    /**
     * Prétraite le texte pour améliorer la reconnaissance
     * @param {string} text - Texte à prétraiter
     * @returns {string} - Texte prétraité
     */
    preprocessText(text) {
        if (!text) return '';

        return text
            .trim()
            .replace(/\s+/g, ' ') // Normaliser les espaces
            .replace(/[^\w\s'àáâäçéèêëïîôöùûüÿ\-]/gi, '') // Garder lettres, espaces, apostrophes et tirets
            .toLowerCase()
            .replace(/^(euh|heu|hmm|ben|eh|ah)\s+/gi, '') // Supprimer les hésitations
            .replace(/\s+(euh|heu|hmm|ben|eh|ah)\s+/gi, ' ') // Supprimer les hésitations en milieu
            .replace(/\s+(euh|heu|hmm|ben|eh|ah)$/gi, '') // Supprimer les hésitations en fin
            .trim();
    }

    /**
     * Optimise la réponse pour la synthèse vocale
     * @param {string} response - Réponse à optimiser
     * @returns {string} - Réponse optimisée
     */
    optimizeResponseForSpeech(response) {
        if (!response) return '';

        return response
            .replace(/\*\*(.+?)\*\*/g, '$1') // Supprimer le gras markdown
            .replace(/\*(.+?)\*/g, '$1') // Supprimer l'italique markdown
            .replace(/`(.+?)`/g, '$1') // Supprimer le code inline
            .replace(/```[\s\S]*?```/g, 'code') // Remplacer les blocs de code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Supprimer les liens markdown
            .replace(/#{1,6}\s+/g, '') // Supprimer les titres markdown
            .replace(/\n\s*\n/g, '. ') // Remplacer les sauts de ligne multiples
            .replace(/\n/g, ', ') // Remplacer les sauts de ligne simples
            .replace(/\s+/g, ' ') // Normaliser les espaces
            .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ajouter espace après ponctuation
            .replace(/\s*([.!?])\s*/g, '$1 ') // Normaliser la ponctuation
            .trim();
    }

    /**
     * Vérifie si c'est une commande d'arrêt
     * @param {string} text - Texte à vérifier
     * @returns {boolean} - True si c'est une commande d'arrêt
     */
    isStopCommand(text) {
        const stopCommands = [
            'arrête', 'stop', 'fin', 'terminé', 'fini', 'au revoir', 'salut',
            'merci', 'c\'est bon', 'ça suffit', 'assez', 'silence'
        ];

        return stopCommands.some(cmd => text.includes(cmd));
    }

    /**
     * Génère une demande de clarification
     * @returns {string} - Demande de clarification
     */
    generateClarificationRequest() {
        const clarifications = [
            'Pouvez-vous répéter s\'il vous plaît ?',
            'Je n\'ai pas bien compris, pouvez-vous reformuler ?',
            'Excusez-moi, pouvez-vous répéter plus clairement ?',
            'Je n\'ai pas saisi, pouvez-vous dire cela autrement ?',
            'Pardon, pouvez-vous répéter ?'
        ];

        return clarifications[Math.floor(Math.random() * clarifications.length)];
    }

    /**
     * Calcule le délai de réponse selon les paramètres
     * @returns {number} - Délai en millisecondes
     */
    getResponseDelay() {
        switch (this.settings.responseSpeed) {
            case 'fast':
                return 200;
            case 'normal':
                return 500;
            case 'slow':
                return 1000;
            default:
                return 500;
        }
    }

    /**
     * Démarre le timer de silence
     */
    startSilenceTimer() {
        this.stopSilenceTimer();
        
        if (this.settings.enableSilenceDetection) {
            this.silenceTimer = setTimeout(() => {
                if (this.isConversationActive) {
                    logger.log('🔇 Silence détecté, pause conversation');
                    if (this.callbacks.onSilenceDetected) {
                        this.callbacks.onSilenceDetected();
                    }
                }
            }, this.maxSilenceTime);
        }
    }

    /**
     * Réinitialise le timer de silence
     */
    resetSilenceTimer() {
        if (this.settings.enableSilenceDetection && this.isConversationActive) {
            this.startSilenceTimer();
        }
    }

    /**
     * Arrête le timer de silence
     */
    stopSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    /**
     * Vérifie si une interruption est autorisée
     * @returns {boolean} - True si interruption autorisée
     */
    canInterrupt() {
        if (!this.settings.enableInterruption) return false;
        
        const timeSinceLastResponse = Date.now() - (this.lastBotResponse?.timestamp || 0);
        return timeSinceLastResponse > this.interruptionThreshold;
    }

    /**
     * Gère une interruption utilisateur
     */
    handleInterruption() {
        if (this.canInterrupt()) {
            logger.log('✋ Interruption détectée et autorisée');
            if (this.callbacks.onInterruption) {
                this.callbacks.onInterruption();
            }
        } else {
            logger.log('🚫 Interruption détectée mais non autorisée');
        }
    }

    /**
     * Obtient le contexte de conversation pour l'IA
     * @returns {string} - Contexte de conversation
     */
    getConversationContext() {
        const recentHistory = this.conversationHistory.slice(-6); // 6 derniers échanges
        
        return recentHistory.map(item => {
            const role = item.type === 'user' ? 'Utilisateur' : 'Assistant';
            return `${role}: ${item.text}`;
        }).join('\n');
    }

    /**
     * Calcule les statistiques de conversation
     * @returns {Object} - Statistiques
     */
    getConversationStats() {
        const userMessages = this.conversationHistory.filter(item => item.type === 'user');
        const botMessages = this.conversationHistory.filter(item => item.type === 'bot');
        
        return {
            totalMessages: this.conversationHistory.length,
            userMessages: userMessages.length,
            botMessages: botMessages.length,
            averageConfidence: userMessages.length > 0 
                ? userMessages.reduce((sum, msg) => sum + (msg.confidence || 0), 0) / userMessages.length
                : 0,
            conversationDuration: this.conversationHistory.length > 0
                ? Date.now() - this.conversationHistory[0].timestamp
                : 0
        };
    }

    /**
     * Définit les callbacks
     * @param {Object} callbacks - Callbacks à définir
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Configure les paramètres
     * @param {Object} newSettings - Nouveaux paramètres
     */
    setSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    /**
     * Sauvegarde les paramètres
     */
    saveSettings() {
        try {
            localStorage.setItem('voice_flow_settings', JSON.stringify(this.settings));
        } catch (error) {
            logger.error('❌ Erreur lors de la sauvegarde des paramètres:', error);
        }
    }

    /**
     * Charge les paramètres
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('voice_flow_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            logger.error('❌ Erreur lors du chargement des paramètres:', error);
        }
    }

    /**
     * Délai asynchrone
     * @param {number} ms - Millisecondes
     * @returns {Promise} - Promise résolue après le délai
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Nettoie les ressources
     */
    cleanup() {
        this.stopConversation();
        this.stopSilenceTimer();
        this.callbacks = {};
        this.conversationHistory = [];
        logger.log('🧹 Service de fluidité nettoyé');
    }

    /**
     * Getters
     */
    get isActive() {
        return this.isConversationActive;
    }

    get historyLength() {
        return this.conversationHistory.length;
    }

    get lastUserMessage() {
        return this.lastUserInput?.text || '';
    }

    get lastBotMessage() {
        return this.lastBotResponse?.text || '';
    }
}

export default VoiceFlowService; 