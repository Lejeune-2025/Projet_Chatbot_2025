import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

// Configuration du cache
const cache = new NodeCache({
    stdTTL: 300, // 5 minutes par défaut
    checkperiod: 60, // Vérifie les entrées expirées toutes les minutes
    useClones: false // Pour de meilleures performances
});

// Gestionnaire de cache
export const cacheManager = {
    // Récupérer une valeur du cache
    get: (key) => {
        try {
            return cache.get(key);
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    },

    // Mettre une valeur en cache
    set: (key, value, ttl = 300) => {
        try {
            return cache.set(key, value, ttl);
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    },

    // Supprimer une valeur du cache
    del: (key) => {
        try {
            return cache.del(key);
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    },

    // Vider tout le cache
    flush: () => {
        try {
            return cache.flushAll();
        } catch (error) {
            logger.error('Cache flush error:', error);
            return false;
        }
    },

    // Obtenir les statistiques du cache
    getStats: () => {
        return cache.getStats();
    }
};

// Clés de cache pour différentes entités
export const cacheKeys = {
    conversation: (id) => `conv_${id}`,
    knowledgeArticle: (id) => `article_${id}`,
    category: (id) => `category_${id}`,
    searchResults: (query) => `search_${query}`,
    stats: (startDate, endDate) => `stats_${startDate}_${endDate}`
}; 