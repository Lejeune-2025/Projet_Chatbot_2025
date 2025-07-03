/**
 * Exports principaux pour l'assistant vocal
 */

// Services
export { default as VoiceAssistantService } from './VoiceAssistantService';
export { default as VoiceCommandProcessor } from './VoiceCommandProcessor';
export { default as AudioCache } from './AudioCache';

// Configuration
export { VoiceConfig, getSystemMessage, matchVoiceCommand } from './VoiceConfig';

// Réexporter pour faciliter l'utilisation
export const VoiceAssistant = {
    // Service principal
    service: VoiceAssistantService,
    
    // Processeur de commandes
    commands: VoiceCommandProcessor,
    
    // Cache audio
    cache: AudioCache,
    
    // Configuration
    config: VoiceConfig,
    
    // Méthodes utilitaires rapides
    start: () => VoiceAssistantService.startListening(),
    stop: () => VoiceAssistantService.stopListening(),
    speak: (text, options) => VoiceAssistantService.speak(text, options),
    
    // État
    isListening: () => VoiceAssistantService.getIsListening(),
    isSpeaking: () => VoiceAssistantService.getIsSpeaking(),
}; 