// Importation du module AsyncStorage pour le stockage local asynchrone
import AsyncStorage from '@react-native-async-storage/async-storage';

// Préfixe utilisé pour identifier les clés de cache
const CACHE_PREFIX = 'chat_cache_';

// Durée de vie (TTL) par défaut pour chaque élément du cache (en millisecondes) : 1 heure
const DEFAULT_TTL = 3600000;

// Service de gestion du cache avec des méthodes utilitaires
export const CacheService = {

    // Méthode pour ajouter un élément au cache
    async setCache(key, data, ttl = DEFAULT_TTL) {
        const item = {
            data,                 // Les données à stocker
            timestamp: Date.now(), // Horodatage au moment du stockage
            ttl                   // Durée de validité des données
        };
        try {
            // Stockage de l'élément sous forme de chaîne JSON avec une clé unique
            await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
        } catch (error) {
            console.error('Erreur lors de la mise en cache:', error);
        }
    },

    // Méthode pour récupérer un élément du cache
    async getCache(key) {
        try {
            // Lecture de l'élément depuis le stockage
            const item = await AsyncStorage.getItem(CACHE_PREFIX + key);
            if (!item) return null; // Retourne null si l'élément n'existe pas

            const { data, timestamp, ttl } = JSON.parse(item);

            // Vérifie si l'élément a expiré
            if (Date.now() - timestamp > ttl) {
                // Supprime l'élément expiré
                await this.removeCache(key);
                return null;
            }

            // Retourne les données si elles sont encore valides
            return data;
        } catch (error) {
            console.error('Erreur lors de la récupération du cache:', error);
            return null;
        }
    },

    // Méthode pour supprimer un élément spécifique du cache
    async removeCache(key) {
        try {
            await AsyncStorage.removeItem(CACHE_PREFIX + key);
        } catch (error) {
            console.error('Erreur lors de la suppression du cache:', error);
        }
    },

    // Méthode pour vider complètement le cache (toutes les clés avec le préfixe)
    async clearAllCache() {
        try {
            // Récupère toutes les clés du stockage
            const keys = await AsyncStorage.getAllKeys();
            
            // Filtre celles qui commencent par le préfixe du cache
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            
            // Supprime toutes les clés du cache en une seule opération
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (error) {
            console.error('Erreur lors du nettoyage du cache:', error);
        }
    }
};
