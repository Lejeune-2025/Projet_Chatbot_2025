import Redis from 'ioredis';
import { logger } from '../utils/logger';

class CacheManager {
    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.redis.on('error', (error) => {
            logger.error('Redis connection error:', error);
        });

        this.redis.on('connect', () => {
            logger.info('Redis connected successfully');
        });

        // Préfixes pour différents types de données
        this.prefixes = {
            knowledge: 'knowledge:',
            conversation: 'conv:',
            user: 'user:'
        };

        // Durées de cache par défaut (en secondes)
        this.ttl = {
            knowledge: 3600, // 1 heure
            conversation: 1800, // 30 minutes
            user: 7200 // 2 heures
        };
    }

    // Générer une clé de cache
    _generateKey(prefix, id) {
        return `${this.prefixes[prefix]}${id}`;
    }

    // Récupérer des données du cache
    async get(prefix, id) {
        try {
            const key = this._generateKey(prefix, id);
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error(`Cache get error for ${prefix}:${id}:`, error);
            return null;
        }
    }

    // Stocker des données dans le cache
    async set(prefix, id, value, customTtl = null) {
        try {
            const key = this._generateKey(prefix, id);
            const ttl = customTtl || this.ttl[prefix];
            await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
            return true;
        } catch (error) {
            logger.error(`Cache set error for ${prefix}:${id}:`, error);
            return false;
        }
    }

    // Supprimer des données du cache
    async delete(prefix, id) {
        try {
            const key = this._generateKey(prefix, id);
            await this.redis.del(key);
            return true;
        } catch (error) {
            logger.error(`Cache delete error for ${prefix}:${id}:`, error);
            return false;
        }
    }

    // Vider le cache pour un préfixe
    async clearPrefix(prefix) {
        try {
            const keys = await this.redis.keys(`${this.prefixes[prefix]}*`);
            if (keys.length > 0) {
                await this.redis.del(keys);
            }
            return true;
        } catch (error) {
            logger.error(`Cache clear error for prefix ${prefix}:`, error);
            return false;
        }
    }

    // Vérifier si une clé existe
    async exists(prefix, id) {
        try {
            const key = this._generateKey(prefix, id);
            return await this.redis.exists(key);
        } catch (error) {
            logger.error(`Cache exists error for ${prefix}:${id}:`, error);
            return false;
        }
    }

    // Mettre à jour le TTL d'une clé
    async updateTTL(prefix, id, ttl) {
        try {
            const key = this._generateKey(prefix, id);
            await this.redis.expire(key, ttl);
            return true;
        } catch (error) {
            logger.error(`Cache TTL update error for ${prefix}:${id}:`, error);
            return false;
        }
    }

    // OPTIMISATION: Cache pour validation de contexte
    async getContextValidation(query) {
        const normalizedQuery = query.toLowerCase().trim();
        return await this.get('context', normalizedQuery);
    }

    async setContextValidation(query, validation) {
        const normalizedQuery = query.toLowerCase().trim();
        // Cache pour 1 heure (3600 secondes)
        return await this.set('context', normalizedQuery, validation, 3600);
    }

    // OPTIMISATION: Cache pour recherches de connaissances
    async getKnowledgeSearch(query) {
        const normalizedQuery = query.toLowerCase().trim();
        return await this.get('knowledge', normalizedQuery);
    }

    async setKnowledgeSearch(query, results) {
        const normalizedQuery = query.toLowerCase().trim();
        // Cache pour 30 minutes (1800 secondes)
        return await this.set('knowledge', normalizedQuery, results, 1800);
    }

    // OPTIMISATION: Cache pour recherches de partenaires
    async getPartnerSearch(searchKey) {
        return await this.get('partners', searchKey);
    }

    async setPartnerSearch(searchKey, results) {
        // Cache pour 10 minutes (600 secondes) car les données peuvent changer
        return await this.set('partners', searchKey, results, 600);
    }

    // Obtenir les statistiques du cache
    async getStats() {
        try {
            const info = await this.redis.info();
            return {
                connected_clients: info.connected_clients,
                used_memory: info.used_memory,
                total_connections_received: info.total_connections_received,
                total_commands_processed: info.total_commands_processed
            };
        } catch (error) {
            logger.error('Cache stats error:', error);
            return null;
        }
    }
}

// Exporter une instance unique
const cacheManager = new CacheManager();
export default cacheManager;