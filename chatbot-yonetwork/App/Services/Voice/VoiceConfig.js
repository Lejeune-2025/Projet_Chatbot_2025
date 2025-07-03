/**
 * Configuration pour l'assistant vocal
 */
export const VoiceConfig = {
  // Langue par défaut
  DEFAULT_LANGUAGE: 'fr-FR',
  
  // Paramètres de synthèse vocale
  DEFAULT_SPEECH_RATE: 1.0, // Vitesse normale (0.1 - 10)
  DEFAULT_PITCH: 1.0, // Ton normal (0 - 2)
  DEFAULT_VOLUME: 1.0, // Volume maximum (0 - 1)
  
  // Langues supportées
  SUPPORTED_LANGUAGES: [
    { code: 'fr-FR', name: 'Français (France)', flag: '🇫🇷' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt-PT', name: 'Português', flag: '🇵🇹' },
    { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
    { code: 'zh-CN', name: '中文 (简体)', flag: '🇨🇳' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' }
  ],
  
  // Paramètres de reconnaissance vocale
  RECOGNITION: {
    // Timeout de silence avant arrêt automatique (ms)
    SILENCE_TIMEOUT: 2000,
    
    // Durée maximale d'enregistrement (ms)
    MAX_RECORDING_TIME: 60000, // 1 minute
    
    // Sensibilité du détecteur de silence
    SILENCE_THRESHOLD: -50, // dB
    
    // Activation du mode continu
    CONTINUOUS_MODE: true,
    
    // Résultats intermédiaires
    INTERIM_RESULTS: true
  },
  
  // Commandes vocales
  VOICE_COMMANDS: {
    // Commandes de contrôle
    STOP_LISTENING: ['stop', 'arrête', 'arrêter', 'stop écoute'],
    START_CONVERSATION: ['conversation', 'discuter', 'parler', 'mode conversation'],
    STOP_CONVERSATION: ['stop conversation', 'arrêter conversation', 'fin'],
    
    // Commandes d'action
    CLEAR_CHAT: ['effacer', 'nettoyer', 'nouveau chat', 'nouvelle conversation'],
    SEND_MESSAGE: ['envoyer', 'envoie', 'valider'],
    CANCEL_MESSAGE: ['annuler', 'cancel', 'non'],
    
    // Commandes de navigation
    GO_BACK: ['retour', 'précédent', 'back'],
    GO_HOME: ['accueil', 'home', 'début'],
    
    // Commandes de paramètres
    INCREASE_SPEED: ['plus vite', 'accélérer', 'faster'],
    DECREASE_SPEED: ['plus lent', 'ralentir', 'slower'],
    LOUDER: ['plus fort', 'augmenter volume', 'louder'],
    QUIETER: ['moins fort', 'baisser volume', 'quieter']
  },
  
  // Messages système
  SYSTEM_MESSAGES: {
    LISTENING_STARTED: 'Je vous écoute...',
    LISTENING_STOPPED: 'Écoute terminée',
    PROCESSING: 'Je réfléchis...',
    ERROR_MICROPHONE: 'Impossible d\'accéder au microphone',
    ERROR_PERMISSION: 'Permission du microphone refusée',
    ERROR_NETWORK: 'Erreur réseau, vérifiez votre connexion',
    ERROR_NO_SPEECH: 'Je n\'ai rien entendu',
    CONVERSATION_MODE_ON: 'Mode conversation activé',
    CONVERSATION_MODE_OFF: 'Mode conversation désactivé'
  },
  
  // Effets sonores (optionnel)
  SOUND_EFFECTS: {
    ENABLED: true,
    START_LISTENING: 'start_listening.mp3',
    STOP_LISTENING: 'stop_listening.mp3',
    ERROR: 'error.mp3',
    SUCCESS: 'success.mp3'
  },
  
  // Paramètres d'interface
  UI: {
    // Afficher l'onde sonore pendant l'écoute
    SHOW_WAVEFORM: true,
    
    // Afficher les résultats partiels
    SHOW_PARTIAL_RESULTS: true,
    
    // Animation du bouton vocal
    ANIMATE_BUTTON: true,
    
    // Couleurs
    COLORS: {
      LISTENING: '#4CAF50',
      SPEAKING: '#2196F3',
      ERROR: '#F44336',
      IDLE: '#9E9E9E'
    }
  },
  
  // Paramètres de performance
  PERFORMANCE: {
    // Utiliser le Web Worker pour le traitement audio (web uniquement)
    USE_WEB_WORKER: true,
    
    // Compression audio pour réduire la bande passante
    COMPRESS_AUDIO: true,
    
    // Cache des synthèses vocales récentes
    CACHE_TTS: true,
    CACHE_SIZE: 50, // Nombre maximum d'entrées en cache
    
    // Délai avant de commencer à parler (ms)
    SPEAK_DELAY: 200
  }
};

/**
 * Obtient un message système dans la langue actuelle
 * @param {string} key - Clé du message
 * @param {string} language - Code de langue
 * @returns {string} Message traduit
 */
export function getSystemMessage(key, language = 'fr-FR') {
  // Pour l'instant, on retourne juste les messages en français
  // On pourrait ajouter des traductions plus tard
  return VoiceConfig.SYSTEM_MESSAGES[key] || '';
}

/**
 * Vérifie si une commande vocale correspond
 * @param {string} text - Texte à vérifier
 * @param {string} command - Nom de la commande
 * @returns {boolean}
 */
export function matchVoiceCommand(text, command) {
  const commands = VoiceConfig.VOICE_COMMANDS[command];
  if (!commands) return false;
  
  const normalizedText = text.toLowerCase().trim();
  return commands.some(cmd => normalizedText.includes(cmd.toLowerCase()));
} 