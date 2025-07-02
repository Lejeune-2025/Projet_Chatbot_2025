// Configuration d'optimisation des performances

const performanceConfig = {
    // Configuration du cache
    cache: {
        // TTL par défaut pour différents types de données (en secondes)
        ttl: {
            contextValidation: 3600,    // 1 heure
            knowledgeSearch: 1800,      // 30 minutes
            partnerSearch: 600,         // 10 minutes
            conversation: 86400,        // 24 heures
            user: 604800               // 7 jours
        },
        
        // Taille maximale du cache
        maxSize: {
            contextValidation: 1000,
            knowledgeSearch: 500,
            partnerSearch: 200
        }
    },
    
    // Configuration des logs
    logging: {
        // Niveaux: DEBUG, INFO, WARN, ERROR
        level: process.env.LOG_LEVEL || 'INFO',
        
        // Activer les logs détaillés seulement en développement
        verbose: process.env.NODE_ENV === 'development',
        
        // Logs spécifiques à désactiver en production
        disableInProduction: [
            'contextValidation',
            'knowledgeSearchDetails',
            'partnerSearchDetails'
        ]
    },
    
    // Configuration du monitoring
    monitoring: {
        // Activer les métriques Prometheus
        enabled: process.env.ENABLE_METRICS === 'true',
        
        // Seuils pour enregistrer les métriques
        thresholds: {
            httpRequestDuration: 1,     // Enregistrer si > 1 seconde
            knowledgeSearchDuration: 2, // Enregistrer si > 2 secondes
            contextValidationDuration: 1 // Enregistrer si > 1 seconde
        }
    },
    
    // Configuration de la validation de contexte
    contextValidation: {
        // Limiter le nombre de comparaisons pour optimiser
        maxComparisons: {
            coreConcepts: 3,
            relevantQuestions: 5,
            irrelevantQuestions: 3
        },
        
        // Seuils de confiance
        thresholds: {
            inContext: 0.3,
            irrelevant: 0.4
        }
    },
    
    // Configuration des recherches
    search: {
        // Limites de résultats
        maxResults: {
            knowledge: 3,
            partners: 5
        },
        
        // Timeout pour les recherches (en ms)
        timeout: {
            knowledge: 5000,
            partners: 3000,
            contextValidation: 2000
        }
    },
    
    // Configuration de la base de données
    database: {
        // Pool de connexions
        pool: {
            min: 2,
            max: 10,
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 100
        },
        
        // Optimisations des requêtes
        query: {
            timeout: 10000,
            maxRetries: 3
        }
    },
    
    // Configuration Redis
    redis: {
        // Timeout de connexion
        connectTimeout: 10000,
        
        // Timeout des commandes
        commandTimeout: 5000,
        
        // Retry strategy
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
    }
};

// Fonction pour obtenir la configuration optimisée selon l'environnement
function getOptimizedConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
        return {
            ...performanceConfig,
            logging: {
                ...performanceConfig.logging,
                level: 'WARN',
                verbose: false
            },
            monitoring: {
                ...performanceConfig.monitoring,
                enabled: true
            }
        };
    }
    
    return performanceConfig;
}

// Fonction pour vérifier si un log doit être affiché
function shouldLog(logType, level = 'INFO') {
    const config = getOptimizedConfig();
    const env = process.env.NODE_ENV || 'development';
    
    // En production, désactiver certains logs
    if (env === 'production' && config.logging.disableInProduction.includes(logType)) {
        return false;
    }
    
    // Vérifier le niveau de log
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    const currentLevel = levels[config.logging.level] || 1;
    const requestedLevel = levels[level] || 1;
    
    return requestedLevel >= currentLevel;
}

// Fonction pour vérifier si une métrique doit être enregistrée
function shouldRecordMetric(metricType, value) {
    const config = getOptimizedConfig();
    
    if (!config.monitoring.enabled) {
        return false;
    }
    
    const threshold = config.monitoring.thresholds[metricType];
    return threshold ? value > threshold : true;
}

export {
    performanceConfig,
    getOptimizedConfig,
    shouldLog,
    shouldRecordMetric
};

export default performanceConfig;