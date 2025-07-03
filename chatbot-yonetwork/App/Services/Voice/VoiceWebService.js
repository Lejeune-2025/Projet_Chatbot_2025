import { logger } from '../logger';

/**
 * Service pour gérer l'API Web Speech dans le navigateur
 * Fournit la reconnaissance vocale (STT) et la synthèse vocale (TTS)
 */
class VoiceWebService {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.speechSynthesis = null;
    this.callbacks = {};
    this.currentLang = 'fr-FR';
    this.currentVoice = null;
    this.voiceSettings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: null
    };
    this.autoRestart = true;
    this.conversationMode = false;
    this.silenceTimer = null;
    this.interimResults = true;
    this.continuous = true;
    this.maxAlternatives = 3;
  }

  /**
   * Initialise le service Web Speech
   */
  async initialize() {
    try {
      await this.initializeSpeechRecognition();
      await this.initializeSpeechSynthesis();
      this.loadVoiceSettings();
      logger.log('🎤 Service vocal web initialisé avec succès');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation du service vocal:', error);
      throw error;
    }
  }

  /**
   * Initialise la reconnaissance vocale optimisée
   */
  async initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Reconnaissance vocale non supportée par ce navigateur');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configuration optimisée pour la fluidité
    this.recognition.continuous = this.continuous;
    this.recognition.interimResults = this.interimResults;
    this.recognition.maxAlternatives = this.maxAlternatives;
    this.recognition.lang = this.currentLang;
    
    // Paramètres avancés pour une meilleure performance
    if (this.recognition.grammars) {
      const grammar = '#JSGF V1.0; grammar colors; public <color> = aqua | azure | beige | bisque | black | blue | brown | chocolate | coral | crimson | cyan | fuchsia | ghostwhite | gold | goldenrod | gray | green | indigo | ivory | khaki | lavender | lime | linen | magenta | maroon | mistyrose | navy | olive | orange | orchid | pink | plum | purple | red | salmon | sienna | silver | snow | tan | teal | thistle | tomato | turquoise | violet | white | yellow ;';
      const speechRecognitionList = new window.webkitSpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      this.recognition.grammars = speechRecognitionList;
    }

    this.setupRecognitionCallbacks();
    logger.log('🎤 Reconnaissance vocale initialisée');
  }

  /**
   * Configure les événements de reconnaissance vocale
   */
  setupRecognitionCallbacks() {
    this.recognition.onstart = () => {
      logger.log('🎤 Reconnaissance vocale démarrée');
      this.isListening = true;
      if (this.callbacks.onSpeechStart) {
        this.callbacks.onSpeechStart();
      }
    };

    this.recognition.onend = () => {
      logger.log('🎤 Reconnaissance vocale terminée');
      this.isListening = false;
      if (this.callbacks.onSpeechEnd) {
        this.callbacks.onSpeechEnd();
      }
      
      // Redémarrage automatique pour conversation fluide
      if (this.autoRestart && this.conversationMode && !this.isSpeaking) {
        setTimeout(() => {
          this.startListening();
        }, 500);
      }
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          logger.log(`🎤 Transcription finale: "${transcript}" (confiance: ${confidence})`);
        } else {
          interimTranscript += transcript;
        }
      }

      // Résultats partiels pour feedback temps réel
      if (interimTranscript && this.callbacks.onSpeechPartialResults) {
        this.callbacks.onSpeechPartialResults({
          value: [interimTranscript],
          confidence: event.results[0][0].confidence
        });
      }

      // Résultats finaux
      if (finalTranscript && this.callbacks.onSpeechResults) {
        this.callbacks.onSpeechResults({
          value: [finalTranscript],
          confidence: event.results[0][0].confidence
        });
      }
    };

    this.recognition.onerror = (event) => {
      logger.error('🎤 Erreur de reconnaissance:', event.error);
      this.isListening = false;
      
      if (this.callbacks.onSpeechError) {
        this.callbacks.onSpeechError({
          error: {
            message: event.error,
            code: event.error
          }
        });
      }
    };

    this.recognition.onnomatch = () => {
      logger.log('🎤 Aucune correspondance trouvée');
    };
  }

  /**
   * Initialise la synthèse vocale avec APIs gratuites
   */
  async initializeSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      throw new Error('Synthèse vocale non supportée par ce navigateur');
    }

    this.speechSynthesis = window.speechSynthesis;
    
    // Attendre le chargement des voix
    await this.waitForVoices();
    
    // Sélectionner la meilleure voix française
    this.selectBestVoice();
    
    logger.log('🔊 Synthèse vocale initialisée');
  }

  /**
   * Attendre le chargement des voix
   */
  waitForVoices() {
    return new Promise((resolve) => {
      const voices = this.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        this.speechSynthesis.onvoiceschanged = () => {
          resolve(this.speechSynthesis.getVoices());
        };
      }
    });
  }

  /**
   * Sélectionner la meilleure voix pour la langue
   */
  selectBestVoice() {
    const voices = this.speechSynthesis.getVoices();
    const langCode = this.currentLang.split('-')[0];
    
    // Priorité aux voix natives puis aux voix de qualité
    const preferredVoices = voices.filter(voice => {
      const voiceLang = voice.lang.split('-')[0];
      return voiceLang === langCode;
    });

    if (preferredVoices.length > 0) {
      // Préférer les voix natives (local) puis les voix premium
      const nativeVoices = preferredVoices.filter(voice => voice.localService);
      const premiumVoices = preferredVoices.filter(voice => 
        voice.name.includes('Premium') || 
        voice.name.includes('Enhanced') ||
        voice.name.includes('Neural')
      );

      if (nativeVoices.length > 0) {
        this.currentVoice = nativeVoices[0];
      } else if (premiumVoices.length > 0) {
        this.currentVoice = premiumVoices[0];
      } else {
        this.currentVoice = preferredVoices[0];
      }
    } else {
      // Fallback sur la première voix disponible
      this.currentVoice = voices[0];
    }

    logger.log(`🔊 Voix sélectionnée: ${this.currentVoice?.name} (${this.currentVoice?.lang})`);
  }

  /**
   * Démarre l'écoute vocale
   */
  async startListening() {
    try {
      if (this.isListening) {
        logger.log('🎤 Écoute déjà en cours');
        return;
      }

      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      this.recognition.start();
      logger.log('🎤 Démarrage de l\'écoute');
    } catch (error) {
      logger.error('❌ Erreur lors du démarrage de l\'écoute:', error);
      if (this.callbacks.onSpeechError) {
        this.callbacks.onSpeechError({
          error: {
            message: error.message,
            code: 'start_error'
          }
        });
      }
    }
  }

  /**
   * Arrête l'écoute vocale
   */
  async stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      logger.log('🎤 Écoute arrêtée');
    }
  }

  /**
   * Synthétise le texte en parole
   * @param {string} text - Texte à synthétiser
   * @param {Object} options - Options de synthèse
   */
  async speak(text, options = {}) {
    try {
      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configuration de la voix
      if (this.currentVoice) {
        utterance.voice = this.currentVoice;
      }
      
      // Application des paramètres
      utterance.rate = options.rate || this.voiceSettings.rate;
      utterance.pitch = options.pitch || this.voiceSettings.pitch;
      utterance.volume = options.volume || this.voiceSettings.volume;
      utterance.lang = options.lang || this.currentLang;

      // Callbacks pour suivi
      utterance.onstart = () => {
        this.isSpeaking = true;
        logger.log('🔊 Début de la synthèse vocale');
        if (this.callbacks.onSpeakStart) {
          this.callbacks.onSpeakStart();
        }
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        logger.log('🔊 Fin de la synthèse vocale');
        if (this.callbacks.onSpeakDone) {
          this.callbacks.onSpeakDone();
        }
      };

      utterance.onerror = (error) => {
        this.isSpeaking = false;
        logger.error('🔊 Erreur de synthèse vocale:', error);
        if (this.callbacks.onSpeakError) {
          this.callbacks.onSpeakError(error);
        }
      };

      // Diviser le texte en segments plus courts pour éviter les coupures
      const segments = this.splitTextIntoSegments(text);
      
      for (const segment of segments) {
        if (segment.trim()) {
          const segmentUtterance = utterance.cloneNode ? utterance.cloneNode() : new SpeechSynthesisUtterance(segment);
          segmentUtterance.text = segment;
          this.speechSynthesis.speak(segmentUtterance);
        }
      }

      logger.log('🔊 Synthèse vocale démarrée');
    } catch (error) {
      logger.error('❌ Erreur lors de la synthèse vocale:', error);
      this.isSpeaking = false;
      throw error;
    }
  }

  /**
   * Arrête la synthèse vocale
   */
  async stopSpeaking() {
    try {
      if (this.speechSynthesis) {
        // Arrêter toute synthèse en cours
        this.speechSynthesis.cancel();
        logger.log('🔊 Synthèse vocale annulée via speechSynthesis.cancel()');
      }
      
      // Forcer l'arrêt de l'état et déclencher les callbacks
      if (this.isSpeaking) {
        this.isSpeaking = false;
        
        // Déclencher le callback onSpeakDone pour mettre à jour l'interface
        if (this.callbacks.onSpeakDone) {
          this.callbacks.onSpeakDone();
        }
        
        logger.log('🔊 Synthèse vocale arrêtée et état mis à jour');
      }
    } catch (error) {
      logger.error('❌ Erreur lors de l\'arrêt de la synthèse:', error);
      // Forcer la mise à jour même en cas d'erreur
      this.isSpeaking = false;
      if (this.callbacks.onSpeakDone) {
        this.callbacks.onSpeakDone();
      }
    }
  }

  /**
   * Configure les callbacks
   * @param {Object} callbacks - Callbacks à configurer
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Change la langue
   * @param {string} lang - Code de langue
   */
  async setLanguage(lang) {
    this.currentLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    await this.selectBestVoice();
    logger.log(`🌍 Langue changée pour: ${lang}`);
  }

  /**
   * Modes de conversation
   * @param {boolean} enabled - Activer ou désactiver le mode conversation
   */
  setConversationMode(enabled) {
    this.conversationMode = enabled;
    this.autoRestart = enabled;
    logger.log(`💬 Mode conversation ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Paramètres de voix
   * @param {Object} settings - Paramètres de voix à configurer
   */
  setVoiceSettings(settings) {
    this.voiceSettings = { ...this.voiceSettings, ...settings };
    this.saveVoiceSettings();
  }

  /**
   * Sauvegarder les paramètres
   */
  saveVoiceSettings() {
    try {
      localStorage.setItem('voice_settings', JSON.stringify(this.voiceSettings));
    } catch (error) {
      logger.error('❌ Erreur lors de la sauvegarde des paramètres:', error);
    }
  }

  /**
   * Charger les paramètres
   */
  loadVoiceSettings() {
    try {
      const saved = localStorage.getItem('voice_settings');
      if (saved) {
        this.voiceSettings = { ...this.voiceSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      logger.error('❌ Erreur lors du chargement des paramètres:', error);
    }
  }

  /**
   * Nettoie les ressources
   */
  async cleanup() {
    await this.stopListening();
    await this.stopSpeaking();
    this.callbacks = {};
    logger.log('🧹 Service vocal nettoyé');
  }

  /**
   * Diviser le texte en segments pour éviter les coupures
   * @param {string} text - Texte à diviser
   * @param {number} maxLength - Longueur maximale d'un segment
   * @returns {Array} - Tableau de segments
   */
  splitTextIntoSegments(text, maxLength = 200) {
    const segments = [];
    const sentences = text.split(/[.!?]+/);
    let currentSegment = '';

    for (const sentence of sentences) {
      if (currentSegment.length + sentence.length > maxLength) {
        if (currentSegment.trim()) {
          segments.push(currentSegment.trim());
        }
        currentSegment = sentence;
      } else {
        currentSegment += sentence + '.';
      }
    }

    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }

    return segments.length > 0 ? segments : [text];
  }

  /**
   * Getters
   */
  get availableVoices() {
    return this.speechSynthesis ? this.speechSynthesis.getVoices() : [];
  }

  get currentLanguage() {
    return this.currentLang;
  }
}

export default VoiceWebService; 