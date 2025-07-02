import { NextResponse } from 'next/server';
import contextValidator from '../../../lib/utils/context-validator.js';
import Knowledge from '../../../models/knowledge.js';
import { logger } from '../../../lib/utils/logger.js';
import cacheManager from '../../../lib/cache/index.js';

/**
 * Endpoint d'initialisation et de vérification du système
 * Cet endpoint est appelé au démarrage du serveur pour s'assurer que
 * toutes les configurations sont correctement chargées
 */
export async function GET() {
    try {
        // Temps de début pour mesurer la durée totale d'initialisation
        const startTime = Date.now();
        
        // Journaliser le début de l'initialisation
        logger.info("Démarrage de l'initialisation du système...");
        
        // 1. Initialiser le validateur de contexte
        const contextInitResult = await contextValidator.initialize();
        logger.info(`Initialisation du validateur de contexte: ${contextInitResult ? 'OK' : 'ÉCHEC'}`);
        
        // 2. Vérifier l'accès à la base de connaissances
        let knowledgeStatus = 'ERREUR';
        let categoriesCount = 0;
        let articlesCount = 0;
        
        try {
            // Charger les catégories pour vérifier l'accès
            const categories = await Knowledge.getCategories();
            categoriesCount = categories.length;
            
            // Tester la recherche avec une requête simple sur Yonetwork
            const testSearchResult = await Knowledge.search("Yonetwork services");
            articlesCount = testSearchResult.length;
            
            knowledgeStatus = 'OK';
            logger.info(`Base de connaissances accessible: ${categoriesCount} catégories, articles trouvés: ${articlesCount}`);
        } catch (error) {
            logger.error('Erreur lors de la vérification de la base de connaissances:', error);
            knowledgeStatus = `ERREUR: ${error.message}`;
        }
        
        // 3. Vérifier le système de cache
        let cacheStatus = 'ERREUR';
        try {
            const testKey = 'startup_test';
            await cacheManager.set('system', testKey, { timestamp: Date.now() }, 60);
            const cachedValue = await cacheManager.get('system', testKey);
            
            cacheStatus = cachedValue ? 'OK' : 'ÉCHEC - La valeur n\'a pas été récupérée';
            logger.info(`Système de cache: ${cacheStatus}`);
        } catch (error) {
            logger.error('Erreur lors de la vérification du cache:', error);
            cacheStatus = `ERREUR: ${error.message}`;
        }
        
        // 4. Précharger quelques exemples dans le cache pour accélérer les premières requêtes
        try {
            const commonQueries = [
                "Qui est Yonetwork?",
                "Quels sont les services de Yonetwork?",
                "Comment contacter Yonetwork?",
                "Horaires d'ouverture Yonetwork"
            ];
            
            for (const query of commonQueries) {
                const result = await Knowledge.search(query);
                if (result && result.length > 0) {
                    logger.info(`Requête précachée: "${query}" (${result.length} résultats)`);
                }
            }
        } catch (error) {
            logger.warn('Erreur lors du précachage des requêtes communes:', error);
        }
        
        // 5. Récupérer et tester les valeurs de configuration du contexte
        const contextConfig = contextValidator.getConfig ? 
            await contextValidator.getConfig() : 
            { status: 'Méthode getConfig non disponible' };
        
        // 6. Tester le fonctionnement de la validation avec un exemple
        let testQueries = [
            { query: "Quels sont les services de Yonetwork?", expected: true },
            { query: "Quelle est la capitale du Tchad?", expected: false }
        ];
        
        const testResults = [];
        for (const test of testQueries) {
            try {
                const result = await contextValidator.validateContext(test.query);
                const passed = result.isInContext === test.expected;
                
                testResults.push({
                    query: test.query,
                    expected: test.expected,
                    actual: result.isInContext,
                    passed,
                    confidence: result.confidence,
                    details: result
                });
                
                logger.info(`Test validation "${test.query}": ${passed ? 'RÉUSSI' : 'ÉCHEC'} (Attendu: ${test.expected}, Obtenu: ${result.isInContext}, Confiance: ${result.confidence}%)`);
            } catch (error) {
                logger.error(`Erreur lors du test de la requête "${test.query}":`, error);
                testResults.push({
                    query: test.query,
                    error: error.message
                });
            }
        }
        
        // Calculer la durée totale
        const totalDuration = Date.now() - startTime;
        
        // Préparer la réponse
        const status = {
            system: {
                startup: 'OK',
                timestamp: new Date().toISOString(),
                duration: `${totalDuration}ms`
            },
            components: {
                contextValidator: {
                    status: contextInitResult ? 'OK' : 'ÉCHEC',
                    config: contextConfig
                },
                knowledgeBase: {
                    status: knowledgeStatus,
                    stats: {
                        categories: categoriesCount,
                        testArticlesFound: articlesCount
                    }
                },
                cache: {
                    status: cacheStatus
                }
            },
            tests: {
                contextValidation: testResults
            }
        };
        
        logger.info(`Initialisation du système terminée en ${totalDuration}ms`);
        
        // Stocker le statut dans le cache pour référence future
        await cacheManager.set('system', 'startup_status', status, 86400); // 24h
        
        return NextResponse.json(status);
    } catch (error) {
        logger.error('Erreur critique lors de l\'initialisation du système:', error);
        
        return NextResponse.json({
            system: {
                startup: 'ÉCHEC',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        }, { status: 500 });
    }
} 