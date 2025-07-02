import prometheus from 'prom-client';
import { logger } from '../utils/logger.js';

class MonitoringSystem {
    constructor() {
        // Configuration des métriques par défaut
        collectDefaultMetrics({
            timeout: 5000,
            prefix: 'yonework_'
        });

        // Métriques pour les requêtes HTTP
        this.httpMetrics = {
            requestDuration: new prometheus.Histogram({
                name: 'yonework_http_request_duration_seconds',
                help: 'Duration of HTTP requests in seconds',
                labelNames: ['method', 'route', 'status_code'],
                buckets: [0.1, 0.5, 1, 2, 5]
            }),

            requestTotal: new prometheus.Counter({
                name: 'yonework_http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'route', 'status_code']
            })
        };

        // Métriques pour les conversations
        this.conversationMetrics = {
            activeConversations: new prometheus.Gauge({
                name: 'yonework_active_conversations',
                help: 'Number of active conversations'
            }),

            messagesPerConversation: new prometheus.Histogram({
                name: 'yonework_messages_per_conversation',
                help: 'Number of messages per conversation',
                buckets: [1, 5, 10, 20, 50, 100]
            }),

            conversationDuration: new prometheus.Histogram({
                name: 'yonework_conversation_duration_seconds',
                help: 'Duration of conversations in seconds',
                buckets: [60, 300, 900, 1800, 3600]
            })
        };

        // Métriques pour la base de connaissances
        this.knowledgeMetrics = {
            searchLatency: new prometheus.Histogram({
                name: 'yonework_knowledge_search_seconds',
                help: 'Knowledge base search latency in seconds',
                buckets: [0.1, 0.5, 1, 2, 5]
            }),

            searchResults: new prometheus.Histogram({
                name: 'yonework_knowledge_search_results',
                help: 'Number of results per knowledge base search',
                buckets: [0, 1, 3, 5, 10, 20]
            }),

            cacheHitRatio: new prometheus.Gauge({
                name: 'yonework_knowledge_cache_hit_ratio',
                help: 'Cache hit ratio for knowledge base queries'
            })
        };

        // Métriques pour les erreurs
        this.errorMetrics = {
            errorTotal: new prometheus.Counter({
                name: 'yonework_errors_total',
                help: 'Total number of errors',
                labelNames: ['type', 'source']
            })
        };
    }

    // OPTIMISATION: Middleware HTTP simplifié
    httpMiddleware() {
        return (req, res, next) => {
            // OPTIMISATION: Seulement mesurer en mode DEBUG ou pour les erreurs
            if (process.env.LOG_LEVEL === 'DEBUG' || process.env.ENABLE_METRICS === 'true') {
                const start = Date.now();
                
                res.on('finish', () => {
                    const duration = (Date.now() - start) / 1000;
                    
                    // OPTIMISATION: Seulement pour les requêtes importantes
                    if (duration > 1 || res.statusCode >= 400) {
                        this.httpMetrics.requestDuration
                            .labels(req.method, req.route?.path || 'unknown', res.statusCode.toString())
                            .observe(duration);

                        this.httpMetrics.requestTotal
                            .labels(req.method, req.route?.path || 'unknown', res.statusCode.toString())
                            .inc();
                    }
                });
            }

            next();
        };
    }

    // Enregistrer une nouvelle conversation
    recordConversationStart() {
        this.conversationMetrics.activeConversations.inc();
    }

    // Enregistrer la fin d'une conversation
    recordConversationEnd(duration, messageCount) {
        this.conversationMetrics.activeConversations.dec();
        this.conversationMetrics.conversationDuration.observe(duration);
        this.conversationMetrics.messagesPerConversation.observe(messageCount);
    }

    // OPTIMISATION: Enregistrer les recherches seulement si nécessaire
    recordKnowledgeSearch(duration, resultCount, cacheHit) {
        // OPTIMISATION: Seulement enregistrer les métriques importantes
         if (process.env.ENABLE_METRICS === 'true' || duration > 2) {
             this.knowledgeMetrics.searchLatency.observe(duration);
             this.knowledgeMetrics.searchResults.observe(resultCount);
             
             // OPTIMISATION: Calcul simplifié du ratio de cache
             if (cacheHit) {
                 this.knowledgeMetrics.cacheHitRatio.set(1);
             } else {
                 this.knowledgeMetrics.cacheHitRatio.set(0);
             }
         }
     }

    // Enregistrer une erreur
    recordError(type, source) {
        this.errorMetrics.errorTotal.labels(type, source).inc();
    }

    // Obtenir les métriques au format Prometheus
    async getMetrics() {
        try {
            return await prometheus.register.metrics();
        } catch (error) {
            logger.error('Error getting metrics:', error);
            return '';
        }
    }

    // Réinitialiser les métriques
    resetMetrics() {
        prometheus.register.clear();
    }
}

// Exporter une instance unique
const monitoring = new MonitoringSystem();
export default monitoring;