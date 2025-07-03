import AsyncStorage from '@react-native-async-storage/async-storage';
import { VoiceConfig } from './VoiceConfig';
import { logger } from '../logger';

/**
 * Gestionnaire de cache pour l'audio
 * Optimise les performances en cachant les synthèses vocales fréquentes
 */
class AudioCache {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      saves: 0
    };
    this.maxCacheSize = VoiceConfig.PERFORMANCE.CACHE_SIZE || 50;
  }

  /**
   * Génère une clé de cache unique
   * @param {string} text - Texte à synthétiser
   * @param {Object} options - Options de synthèse
   * @returns {string} Clé de cache
   */
  generateCacheKey(text, options = {}) {
    const normalizedText = text.toLowerCase().trim();
    const optionsKey = `${options.language || 'fr-FR'}_${options.rate || 1}_${options.pitch || 1}`;
    return `tts_${this.hashString(normalizedText)}_${optionsKey}`;
  }

  /**
   * Hash simple pour générer une clé
   * @param {string} str - Chaîne à hasher
   * @returns {string} Hash
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Obtient une entrée du cache
   * @param {string} text - Texte recherché
   * @param {Object} options - Options de synthèse
   * @returns {Promise<Object|null>} Données audio ou null
   */
  async get(text, options = {}) {
    try {
      const key = this.generateCacheKey(text, options);
      
      // Vérifier d'abord le cache mémoire
      if (this.memoryCache.has(key)) {
        this.cacheStats.hits++;
        logger.log(`Cache hit (mémoire): ${key}`);
        return this.memoryCache.get(key);
      }
      
      // Vérifier le cache persistant
      const cachedData = await AsyncStorage.getItem(key);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        
        // Vérifier l'expiration
        if (parsed.expiry > Date.now()) {
          // Mettre en cache mémoire pour un accès plus rapide
          this.memoryCache.set(key, parsed.data);
          this.cacheStats.hits++;
          logger.log(`Cache hit (storage): ${key}`);
          return parsed.data;
        } else {
          // Entrée expirée, la supprimer
          await AsyncStorage.removeItem(key);
        }
      }
      
      this.cacheStats.misses++;
      return null;
      
    } catch (error) {
      logger.error('Erreur lors de la lecture du cache:', error);
      return null;
    }
  }

  /**
   * Sauvegarde une entrée dans le cache
   * @param {string} text - Texte original
   * @param {Object} options - Options de synthèse
   * @param {Object} audioData - Données audio à cacher
   */
  async set(text, options, audioData) {
    try {
      const key = this.generateCacheKey(text, options);
      
      // Sauvegarder en mémoire
      this.memoryCache.set(key, audioData);
      
      // Gérer la taille du cache mémoire
      if (this.memoryCache.size > this.maxCacheSize) {
        const firstKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(firstKey);
      }
      
      // Sauvegarder de manière persistante
      const cacheEntry = {
        data: audioData,
        expiry: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 jours
        text: text.substring(0, 50) // Garder un échantillon pour debug
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
      this.cacheStats.saves++;
      
      logger.log(`Audio mis en cache: ${key}`);
      
      // Nettoyer les anciennes entrées si nécessaire
      await this.cleanup();
      
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde dans le cache:', error);
    }
  }

  /**
   * Précharge des phrases communes
   * @param {Array} phrases - Liste de phrases à précharger
   * @param {Function} synthesizer - Fonction de synthèse
   */
  async preloadCommonPhrases(phrases, synthesizer) {
    const commonPhrases = phrases || [
      'Bonjour, comment puis-je vous aider ?',
      'Je vous écoute',
      'Un instant, je réfléchis',
      'Voici ce que j\'ai trouvé',
      'Y a-t-il autre chose ?',
      'Au revoir et bonne journée',
      'Je n\'ai pas compris, pouvez-vous répéter ?',
      'Erreur de connexion, veuillez réessayer'
    ];

    logger.log(`Préchargement de ${commonPhrases.length} phrases communes...`);

    for (const phrase of commonPhrases) {
      try {
        // Vérifier si déjà en cache
        const cached = await this.get(phrase);
        if (!cached && synthesizer) {
          // Synthétiser et mettre en cache
          const audioData = await synthesizer(phrase);
          if (audioData) {
            await this.set(phrase, {}, audioData);
          }
        }
      } catch (error) {
        logger.error(`Erreur lors du préchargement de "${phrase}":`, error);
      }
    }

    logger.log('Préchargement terminé');
  }

  /**
   * Nettoie les entrées expirées
   */
  async cleanup() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ttsKeys = keys.filter(key => key.startsWith('tts_'));
      
      if (ttsKeys.length > this.maxCacheSize * 2) {
        logger.log(`Nettoyage du cache: ${ttsKeys.length} entrées`);
        
        // Obtenir toutes les entrées avec leur date
        const entries = await Promise.all(
          ttsKeys.map(async (key) => {
            try {
              const data = await AsyncStorage.getItem(key);
              const parsed = JSON.parse(data);
              return { key, expiry: parsed.expiry };
            } catch {
              return { key, expiry: 0 };
            }
          })
        );
        
        // Trier par date d'expiration
        entries.sort((a, b) => a.expiry - b.expiry);
        
        // Supprimer les plus anciennes
        const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
        await Promise.all(
          toDelete.map(entry => AsyncStorage.removeItem(entry.key))
        );
        
        logger.log(`${toDelete.length} entrées supprimées du cache`);
      }
    } catch (error) {
      logger.error('Erreur lors du nettoyage du cache:', error);
    }
  }

  /**
   * Efface tout le cache
   */
  async clear() {
    try {
      // Effacer le cache mémoire
      this.memoryCache.clear();
      
      // Effacer le cache persistant
      const keys = await AsyncStorage.getAllKeys();
      const ttsKeys = keys.filter(key => key.startsWith('tts_'));
      await Promise.all(
        ttsKeys.map(key => AsyncStorage.removeItem(key))
      );
      
      // Réinitialiser les statistiques
      this.cacheStats = {
        hits: 0,
        misses: 0,
        saves: 0
      };
      
      logger.log('Cache audio effacé');
    } catch (error) {
      logger.error('Erreur lors de l\'effacement du cache:', error);
    }
  }

  /**
   * Obtient les statistiques du cache
   * @returns {Object} Statistiques
   */
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;
      
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Optimise le texte pour le cache
   * @param {string} text - Texte à optimiser
   * @returns {string} Texte optimisé
   */
  optimizeTextForCache(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .replace(/[.,!?;:]+$/, '') // Supprimer la ponctuation finale
      .substring(0, 200); // Limiter la longueur
  }
}

// Singleton
export default new AudioCache(); 