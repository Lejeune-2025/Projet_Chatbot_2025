import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import VoiceWebService from './VoiceWebService';
import { VoiceConfig } from './VoiceConfig';
import { logger } from '../logger';

// Import conditionnel pour éviter les erreurs sur web
let ExpoSpeechRecognition = null;
try {
  ExpoSpeechRecognition = require('expo-speech-recognition').ExpoSpeechRecognition;
} catch (error) {
  // Module non disponible sur cette plateforme
  logger.log('expo-speech-recognition non disponible sur cette plateforme');
}

/**
 * Service principal pour l'assistant vocal
 * Gère la reconnaissance vocale (STT) et la synthèse vocale (TTS)
 */
class VoiceAssistantService {
  constructor() {
    this.isListening = false;
    this.isInitialized = false;
    this.currentLanguage = VoiceConfig.DEFAULT_LANGUAGE;
    this.speechRate = VoiceConfig.DEFAULT_SPEECH_RATE;
    this.pitch = VoiceConfig.DEFAULT_PITCH;
    this.isSpeaking = false;
    this.conversationMode = false;
    this.callbacks = {
      onSpeechStart: null,
      onSpeechEnd: null,
      onSpeechResults: null,
      onSpeechError: null,
      onSpeechPartialResults: null,
      onSpeakStart: null,
      onSpeakDone: null,
      onSpeakError: null
    };

    // Utiliser le service web pour le navigateur
    if (Platform.OS === 'web') {
      this.webService = new VoiceWebService();
    }
  }

  /**
   * Initialise le service vocal
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        logger.log('VoiceAssistant déjà initialisé');
        return;
      }

      if (Platform.OS === 'web') {
        await this.webService.initialize();
        this.setupWebCallbacks();
      } else {
        await this.initializeNative();
      }

      this.isInitialized = true;
      logger.log('VoiceAssistant initialisé avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du VoiceAssistant:', error);
      throw error;
    }
  }

  /**
   * Initialise les services natifs (mobile)
   */
  async initializeNative() {
    try {
      // Essayer d'initialiser la reconnaissance vocale sur mobile
      if (ExpoSpeechRecognition) {
        // Vérifier si la reconnaissance vocale est disponible
        const isAvailable = await ExpoSpeechRecognition.getAvailabilityAsync();
        
        if (isAvailable) {
          // Configurer les événements de reconnaissance vocale
          ExpoSpeechRecognition.setOnSpeechStartCallback(() => {
            this.callbacks.onSpeechStart?.();
          });
          
          ExpoSpeechRecognition.setOnSpeechEndCallback(() => {
            this.callbacks.onSpeechEnd?.();
          });
          
          ExpoSpeechRecognition.setOnSpeechResultCallback((result) => {
            if (result.results && result.results.length > 0) {
              const transcript = result.results[0].transcript;
              if (result.isFinal) {
                this.callbacks.onSpeechResults?.({ value: [transcript] });
              } else {
                this.callbacks.onSpeechPartialResults?.({ value: [transcript] });
              }
            }
          });
          
          ExpoSpeechRecognition.setOnSpeechErrorCallback((error) => {
            this.callbacks.onSpeechError?.({ error: { message: error.message } });
          });
          
          logger.log('Assistant vocal initialisé pour mobile (synthèse + reconnaissance vocale)');
        } else {
          logger.log('Assistant vocal initialisé pour mobile (synthèse vocale uniquement - reconnaissance non disponible)');
        }
      } else {
        logger.log('Assistant vocal initialisé pour mobile (synthèse vocale uniquement)');
      }
      
      return Promise.resolve();
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation mobile:', error);
      logger.log('Assistant vocal initialisé pour mobile (synthèse vocale uniquement)');
      return Promise.resolve();
    }
  }

  /**
   * Configure les callbacks pour le web
   */
  setupWebCallbacks() {
    this.webService.setCallbacks({
      onSpeechStart: (e) => this.callbacks.onSpeechStart?.(e),
      onSpeechEnd: (e) => this.callbacks.onSpeechEnd?.(e),
      onSpeechResults: (e) => this.callbacks.onSpeechResults?.(e),
      onSpeechError: (e) => {
        this.isListening = false;
        this.callbacks.onSpeechError?.(e);
      },
      onSpeechPartialResults: (e) => this.callbacks.onSpeechPartialResults?.(e),
      onSpeakStart: (e) => {
        this.isSpeaking = true;
        this.callbacks.onSpeakStart?.(e);
      },
      onSpeakDone: (e) => {
        this.isSpeaking = false;
        this.callbacks.onSpeakDone?.(e);
        
        // En mode conversation, redémarrer l'écoute après avoir parlé
        if (this.conversationMode && !this.isListening) {
          setTimeout(() => this.startListening(), 500);
        }
      },
      onSpeakError: (e) => {
        this.isSpeaking = false;
        this.callbacks.onSpeakError?.(e);
      }
    });
  }

  /**
   * Démarre l'écoute vocale
   */
  async startListening() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isListening) {
        logger.log('Déjà en train d\'écouter');
        return;
      }

      // Arrêter la synthèse vocale si elle est en cours
      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      this.isListening = true;

      if (Platform.OS === 'web') {
        await this.webService.startListening(this.currentLanguage);
      } else {
        // Essayer d'utiliser expo-speech-recognition sur mobile
        if (ExpoSpeechRecognition) {
          const isAvailable = await ExpoSpeechRecognition.getAvailabilityAsync();
          if (isAvailable) {
            await ExpoSpeechRecognition.start({
              lang: this.currentLanguage,
              interimResults: true,
              maxAlternatives: 1,
              continuous: false
            });
          } else {
            throw new Error('Reconnaissance vocale non disponible sur cet appareil');
          }
        } else {
          throw new Error('Module de reconnaissance vocale non disponible');
        }
      }

      logger.log('Écoute vocale démarrée');
    } catch (error) {
      this.isListening = false;
      logger.error('Erreur lors du démarrage de l\'écoute:', error);
      throw error;
    }
  }

  /**
   * Arrête l'écoute vocale
   */
  async stopListening() {
    try {
      if (!this.isListening) {
        return;
      }

      this.isListening = false;

      if (Platform.OS === 'web') {
        await this.webService.stopListening();
      } else {
        // Arrêter expo-speech-recognition sur mobile
        if (ExpoSpeechRecognition) {
          await ExpoSpeechRecognition.stop();
        }
      }

      logger.log('Écoute vocale arrêtée');
    } catch (error) {
      logger.error('Erreur lors de l\'arrêt de l\'écoute:', error);
      throw error;
    }
  }

  /**
   * Fait parler l'assistant
   * @param {string} text - Le texte à dire
   * @param {Object} options - Options de synthèse vocale
   */
  async speak(text, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!text || text.trim() === '') {
        return;
      }

      // Arrêter l'écoute si elle est en cours
      if (this.isListening) {
        await this.stopListening();
      }

      // Nettoyer le texte des balises markdown et autres
      const cleanText = this.cleanTextForSpeech(text);

      this.isSpeaking = true;
      this.callbacks.onSpeakStart?.();

      if (Platform.OS === 'web') {
        const speakOptions = {
          language: options.language || this.currentLanguage,
          rate: options.rate || this.speechRate,
          pitch: options.pitch || this.pitch,
          ...options
        };
        await this.webService.speak(cleanText, speakOptions);
      } else {
        // Utiliser Expo Speech sur mobile
        const speakOptions = {
          language: options.language || this.currentLanguage,
          rate: options.rate || this.speechRate,
          pitch: options.pitch || this.pitch,
        };

        await Speech.speak(cleanText, {
          language: speakOptions.language,
          rate: speakOptions.rate,
          pitch: speakOptions.pitch,
          onStart: () => {
            this.isSpeaking = true;
            this.callbacks.onSpeakStart?.();
          },
          onDone: () => {
            this.isSpeaking = false;
            this.callbacks.onSpeakDone?.();
            
            // En mode conversation, redémarrer l'écoute après avoir parlé (seulement sur web)
            if (this.conversationMode && !this.isListening && Platform.OS === 'web') {
              setTimeout(() => this.startListening(), 500);
            }
          },
          onStopped: () => {
            this.isSpeaking = false;
            this.callbacks.onSpeakDone?.();
          },
          onError: (error) => {
            this.isSpeaking = false;
            this.callbacks.onSpeakError?.(error);
          }
        });
      }

      logger.log('Synthèse vocale démarrée:', cleanText.substring(0, 50) + '...');
    } catch (error) {
      this.isSpeaking = false;
      logger.error('Erreur lors de la synthèse vocale:', error);
      throw error;
    }
  }

  /**
   * Arrête la synthèse vocale
   */
  async stopSpeaking() {
    try {
      logger.log('🛑 Tentative d\'arrêt de la synthèse vocale');

      if (Platform.OS === 'web') {
        await this.webService.stopSpeaking();
        // Double sécurité pour le web
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } else {
        // Utiliser Expo Speech pour arrêter la synthèse
        Speech.stop();
      }

      // Forcer la mise à jour de l'état
      if (this.isSpeaking) {
        this.isSpeaking = false;
        // Déclencher manuellement le callback pour s'assurer que l'interface se met à jour
        if (this.callbacks.onSpeakDone) {
          this.callbacks.onSpeakDone();
        }
      }

      logger.log('✅ Synthèse vocale arrêtée avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de l\'arrêt de la synthèse:', error);
      // Forcer l'arrêt même en cas d'erreur
      this.isSpeaking = false;
      if (this.callbacks.onSpeakDone) {
        this.callbacks.onSpeakDone();
      }
    }
  }

  /**
   * Active/désactive le mode conversation
   * @param {boolean} enabled - État du mode conversation
   */
  setConversationMode(enabled) {
    this.conversationMode = enabled;
    logger.log(`Mode conversation ${enabled ? 'activé' : 'désactivé'}`);
    
    if (enabled && !this.isListening && !this.isSpeaking) {
      this.startListening();
    } else if (!enabled && this.isListening) {
      this.stopListening();
    }
  }

  /**
   * Configure les callbacks
   * @param {Object} callbacks - Objet contenant les callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Change la langue
   * @param {string} language - Code de langue (ex: 'fr-FR', 'en-US')
   */
  async setLanguage(language) {
    try {
      this.currentLanguage = language;

      if (Platform.OS === 'web') {
        this.webService.setLanguage(language);
      }
      // Sur mobile avec Expo Speech, la langue est définie lors de chaque appel speak()

      logger.log(`Langue changée en ${language}`);
    } catch (error) {
      logger.error('Erreur lors du changement de langue:', error);
      throw error;
    }
  }

  /**
   * Configure la vitesse de parole
   * @param {number} rate - Vitesse de parole (0.0 - 1.0)
   */
  async setSpeechRate(rate) {
    try {
      this.speechRate = rate;

      if (Platform.OS === 'web') {
        this.webService.setSpeechRate(rate);
      }
      // Sur mobile avec Expo Speech, la vitesse est définie lors de chaque appel speak()

      logger.log(`Vitesse de parole changée: ${rate}`);
    } catch (error) {
      logger.error('Erreur lors du changement de vitesse:', error);
      throw error;
    }
  }

  /**
   * Configure le ton de la voix
   * @param {number} pitch - Ton de la voix (0.0 - 2.0)
   */
  async setPitch(pitch) {
    try {
      this.pitch = pitch;

      if (Platform.OS === 'web') {
        this.webService.setPitch(pitch);
      }
      // Sur mobile avec Expo Speech, le ton est défini lors de chaque appel speak()

      logger.log(`Ton de voix changé: ${pitch}`);
    } catch (error) {
      logger.error('Erreur lors du changement de ton:', error);
      throw error;
    }
  }

  /**
   * Nettoie le texte pour la synthèse vocale
   * @param {string} text - Texte à nettoyer
   * @returns {string} Texte nettoyé
   */
  cleanTextForSpeech(text) {
    return text
      // Supprimer les balises markdown
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // gras
      .replace(/(\*|_)(.*?)\1/g, '$2')   // italique
      .replace(/#+\s?/g, '')             // titres
      .replace(/`+/g, '')                // code
      .replace(/!\[.*?\]\(.*?\)/g, '')   // images
      .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // liens (garder le texte)
      // Supprimer les emojis complexes mais garder les basiques
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // symboles
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport
      .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // alchimie
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // géométrie
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // suppléments
      // Améliorer la ponctuation pour une meilleure synthèse
      .replace(/\.{3,}/g, '...') // normaliser les points de suspension
      .replace(/\s+/g, ' ') // normaliser les espaces
      .trim();
  }

  /**
   * Vérifie si le service est en train d'écouter
   * @returns {boolean}
   */
  getIsListening() {
    return this.isListening;
  }

  /**
   * Vérifie si le service est en train de parler
   * @returns {boolean}
   */
  getIsSpeaking() {
    return this.isSpeaking;
  }

  /**
   * Obtient la langue actuelle
   * @returns {string}
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Obtient les langues disponibles
   * @returns {Promise<Array>}
   */
  async getAvailableLanguages() {
    try {
      if (Platform.OS === 'web') {
        return await this.webService.getAvailableVoices();
      } else {
        // Pour Expo Speech, retourner les langues supportées par défaut
        return VoiceConfig.SUPPORTED_LANGUAGES.map(lang => ({
          id: lang.code,
          name: lang.name,
          language: lang.code,
          quality: 'default'
        }));
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des langues:', error);
      return [];
    }
  }

  /**
   * Nettoie les ressources
   */
  async cleanup() {
    try {
      if (this.isListening) {
        await this.stopListening();
      }

      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      if (Platform.OS === 'web') {
        this.webService.cleanup();
      }
      // Expo Speech se nettoie automatiquement

      this.isInitialized = false;
      logger.log('VoiceAssistant nettoyé');
    } catch (error) {
      logger.error('Erreur lors du nettoyage:', error);
    }
  }
}

// Singleton
export default new VoiceAssistantService(); 