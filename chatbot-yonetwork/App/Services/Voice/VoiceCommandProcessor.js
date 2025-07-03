import { VoiceConfig, matchVoiceCommand } from './VoiceConfig';
import { logger } from '../logger';

/**
 * Processeur de commandes vocales
 * Analyse et exécute les commandes vocales
 */
class VoiceCommandProcessor {
  constructor() {
    this.commandHandlers = new Map();
    this.contextStack = [];
    this.lastCommand = null;
    this.setupDefaultHandlers();
  }

  /**
   * Configure les gestionnaires de commandes par défaut
   */
  setupDefaultHandlers() {
    // Commandes de contrôle
    this.registerCommand('STOP_LISTENING', (context) => {
      logger.log('Commande: Arrêt de l\'écoute');
      return {
        action: 'stopListening',
        message: 'Écoute arrêtée'
      };
    });

    this.registerCommand('START_CONVERSATION', (context) => {
      logger.log('Commande: Démarrage du mode conversation');
      return {
        action: 'startConversation',
        message: 'Mode conversation activé. Je vous écoute en continu.'
      };
    });

    this.registerCommand('STOP_CONVERSATION', (context) => {
      logger.log('Commande: Arrêt du mode conversation');
      return {
        action: 'stopConversation',
        message: 'Mode conversation désactivé'
      };
    });

    // Commandes d'action
    this.registerCommand('CLEAR_CHAT', (context) => {
      logger.log('Commande: Effacement du chat');
      return {
        action: 'clearChat',
        message: 'Nouvelle conversation démarrée'
      };
    });

    this.registerCommand('SEND_MESSAGE', (context) => {
      logger.log('Commande: Envoi du message');
      return {
        action: 'sendMessage',
        message: 'Message envoyé'
      };
    });

    this.registerCommand('CANCEL_MESSAGE', (context) => {
      logger.log('Commande: Annulation du message');
      return {
        action: 'cancelMessage',
        message: 'Message annulé'
      };
    });

    // Commandes de navigation
    this.registerCommand('GO_BACK', (context) => {
      logger.log('Commande: Retour');
      return {
        action: 'navigateBack',
        message: 'Retour à l\'écran précédent'
      };
    });

    this.registerCommand('GO_HOME', (context) => {
      logger.log('Commande: Accueil');
      return {
        action: 'navigateHome',
        message: 'Retour à l\'accueil'
      };
    });

    // Commandes de paramètres
    this.registerCommand('INCREASE_SPEED', (context) => {
      logger.log('Commande: Augmentation de la vitesse');
      return {
        action: 'increaseSpeed',
        message: 'Vitesse augmentée'
      };
    });

    this.registerCommand('DECREASE_SPEED', (context) => {
      logger.log('Commande: Diminution de la vitesse');
      return {
        action: 'decreaseSpeed',
        message: 'Vitesse diminuée'
      };
    });

    this.registerCommand('LOUDER', (context) => {
      logger.log('Commande: Augmentation du volume');
      return {
        action: 'increaseVolume',
        message: 'Volume augmenté'
      };
    });

    this.registerCommand('QUIETER', (context) => {
      logger.log('Commande: Diminution du volume');
      return {
        action: 'decreaseVolume',
        message: 'Volume diminué'
      };
    });
  }

  /**
   * Enregistre un gestionnaire de commande personnalisé
   * @param {string} command - Nom de la commande
   * @param {Function} handler - Fonction de traitement
   */
  registerCommand(command, handler) {
    this.commandHandlers.set(command, handler);
  }

  /**
   * Traite le texte et extrait les commandes
   * @param {string} text - Texte à analyser
   * @param {Object} context - Contexte actuel
   * @returns {Object|null} Résultat du traitement
   */
  processText(text, context = {}) {
    try {
      // Normaliser le texte
      const normalizedText = text.toLowerCase().trim();
      
      // Vérifier si c'est une commande
      const command = this.detectCommand(normalizedText);
      
      if (command) {
        // Exécuter la commande
        const result = this.executeCommand(command, { ...context, originalText: text });
        this.lastCommand = command;
        return result;
      }
      
      // Si ce n'est pas une commande, analyser le contexte
      return this.analyzeContext(text, context);
      
    } catch (error) {
      logger.error('Erreur lors du traitement du texte:', error);
      return null;
    }
  }

  /**
   * Détecte une commande dans le texte
   * @param {string} text - Texte normalisé
   * @returns {string|null} Nom de la commande détectée
   */
  detectCommand(text) {
    // Parcourir toutes les commandes configurées
    for (const [commandName] of this.commandHandlers) {
      if (matchVoiceCommand(text, commandName)) {
        return commandName;
      }
    }
    
    return null;
  }

  /**
   * Exécute une commande
   * @param {string} command - Nom de la commande
   * @param {Object} context - Contexte d'exécution
   * @returns {Object} Résultat de l'exécution
   */
  executeCommand(command, context) {
    const handler = this.commandHandlers.get(command);
    
    if (!handler) {
      logger.warn(`Aucun gestionnaire pour la commande: ${command}`);
      return null;
    }
    
    try {
      return handler(context);
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de la commande ${command}:`, error);
      return {
        action: 'error',
        message: `Erreur lors de l'exécution de la commande`,
        error: error.message
      };
    }
  }

  /**
   * Analyse le contexte du texte
   * @param {string} text - Texte à analyser
   * @param {Object} context - Contexte actuel
   * @returns {Object} Analyse du contexte
   */
  analyzeContext(text, context) {
    const analysis = {
      isQuestion: this.isQuestion(text),
      sentiment: this.analyzeSentiment(text),
      intent: this.detectIntent(text),
      entities: this.extractEntities(text),
      requiresResponse: true
    };
    
    // Déterminer si une réponse est nécessaire
    if (this.isFeedback(text) || this.isGreeting(text)) {
      analysis.requiresResponse = false;
    }
    
    return {
      action: 'processMessage',
      text: text,
      analysis: analysis
    };
  }

  /**
   * Vérifie si le texte est une question
   * @param {string} text - Texte à vérifier
   * @returns {boolean}
   */
  isQuestion(text) {
    const questionPatterns = [
      /^(qui|que|quoi|où|quand|comment|pourquoi|combien|quel)/i,
      /\?$/,
      /est-ce que/i,
      /(peux-tu|pouvez-vous|sais-tu|savez-vous)/i
    ];
    
    return questionPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Analyse le sentiment du texte
   * @param {string} text - Texte à analyser
   * @returns {string} Sentiment détecté (positive, negative, neutral)
   */
  analyzeSentiment(text) {
    const positiveWords = ['merci', 'super', 'génial', 'parfait', 'excellent', 'bien', 'bravo'];
    const negativeWords = ['problème', 'erreur', 'mal', 'mauvais', 'nul', 'difficile'];
    
    const lowerText = text.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Détecte l'intention du texte
   * @param {string} text - Texte à analyser
   * @returns {string} Intention détectée
   */
  detectIntent(text) {
    const intents = {
      greeting: /^(bonjour|salut|hello|bonsoir|coucou)/i,
      farewell: /(au revoir|bye|à plus|bonne journée|à bientôt)/i,
      help: /(aide|help|comment|expliquer|comprends pas)/i,
      thanks: /(merci|thanks|remercie)/i,
      location: /(où|adresse|localisation|trouver|situé)/i,
      hours: /(heure|horaire|ouvert|fermé|quand)/i,
      contact: /(contact|téléphone|email|appeler|joindre)/i,
      service: /(service|faire|proposez|offrez)/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(text)) {
        return intent;
      }
    }
    
    return 'general';
  }

  /**
   * Extrait les entités du texte
   * @param {string} text - Texte à analyser
   * @returns {Array} Entités extraites
   */
  extractEntities(text) {
    const entities = [];
    
    // Extraction des nombres
    const numbers = text.match(/\d+/g);
    if (numbers) {
      entities.push(...numbers.map(num => ({ type: 'number', value: num })));
    }
    
    // Extraction des heures
    const times = text.match(/\d{1,2}h\d{0,2}|\d{1,2}:\d{2}/g);
    if (times) {
      entities.push(...times.map(time => ({ type: 'time', value: time })));
    }
    
    // Extraction des dates
    const dates = text.match(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g);
    if (dates) {
      entities.push(...dates.map(date => ({ type: 'date', value: date })));
    }
    
    return entities;
  }

  /**
   * Vérifie si le texte est un feedback
   * @param {string} text - Texte à vérifier
   * @returns {boolean}
   */
  isFeedback(text) {
    const feedbackPatterns = [
      /^(ok|okay|d'accord|compris|parfait|bien|super)$/i,
      /^(oui|non|si)$/i
    ];
    
    return feedbackPatterns.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Vérifie si le texte est une salutation
   * @param {string} text - Texte à vérifier
   * @returns {boolean}
   */
  isGreeting(text) {
    return this.detectIntent(text) === 'greeting' || this.detectIntent(text) === 'farewell';
  }

  /**
   * Ajoute un contexte à la pile
   * @param {Object} context - Contexte à ajouter
   */
  pushContext(context) {
    this.contextStack.push(context);
    
    // Limiter la taille de la pile
    if (this.contextStack.length > 10) {
      this.contextStack.shift();
    }
  }

  /**
   * Obtient le contexte actuel
   * @returns {Object} Contexte actuel
   */
  getCurrentContext() {
    return this.contextStack.length > 0 
      ? this.contextStack[this.contextStack.length - 1] 
      : {};
  }

  /**
   * Réinitialise le processeur
   */
  reset() {
    this.contextStack = [];
    this.lastCommand = null;
    logger.log('Processeur de commandes réinitialisé');
  }
}

// Singleton
export default new VoiceCommandProcessor(); 