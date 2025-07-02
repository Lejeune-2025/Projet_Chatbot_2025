/**
 * Script pour initialiser la base de connaissances Yonetwork
 * Ce script exécute le script SQL qui crée les catégories et articles
 * pour la base de connaissances spécifique à Yonetwork
 */

const path = require('path');
const fs = require('fs');
const db = require('../../lib/db/index');
const { logger } = require('../../lib/utils/logger');

async function setupYonetworkKnowledgeBase() {
    try {
        logger.info('Début de l\'initialisation de la base de connaissances Yonetwork');
        
        // Vérifier si la base de connaissances existe déjà
        const existingCategories = await db.any('SELECT * FROM knowledge_categories WHERE name LIKE $1', ['%']);
        
        if (existingCategories.length > 0) {
            logger.info(`Base de connaissances existante trouvée avec ${existingCategories.length} catégories`);
            
            // Vérifier si les catégories Yonetwork existent déjà
            const yonetworkCategory = await db.oneOrNone('SELECT * FROM knowledge_categories WHERE name = $1', ['Présentation']);
            
            if (yonetworkCategory) {
                logger.info('Les catégories Yonetwork existent déjà, vérification des articles');
                
                const articlesCount = await db.one('SELECT COUNT(*) FROM knowledge_articles WHERE category_id IN (SELECT id FROM knowledge_categories WHERE name IN ($1:csv))', [['Présentation', 'Services', 'Contact', 'Horaires', 'Équipe', 'FAQ']]);
                
                if (parseInt(articlesCount.count) > 0) {
                    logger.info(`${articlesCount.count} articles Yonetwork trouvés dans la base de connaissances`);
                    return {
                        success: true,
                        message: 'La base de connaissances Yonetwork est déjà initialisée',
                        articlesCount: parseInt(articlesCount.count)
                    };
                }
            }
        }
        
        // Lire le script SQL
        const sqlFilePath = path.join(__dirname, 'create_knowledge_base.sql');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Exécuter le script SQL
        logger.info('Exécution du script SQL pour initialiser la base de connaissances Yonetwork');
        await db.none(sqlScript);
        
        // Vérifier le résultat
        const categories = await db.any('SELECT * FROM knowledge_categories');
        const articles = await db.any('SELECT * FROM knowledge_articles');
        
        logger.info(`Base de connaissances initialisée avec ${categories.length} catégories et ${articles.length} articles`);
        
        return {
            success: true,
            message: 'Base de connaissances Yonetwork initialisée avec succès',
            categoriesCount: categories.length,
            articlesCount: articles.length
        };
    } catch (error) {
        logger.error('Erreur lors de l\'initialisation de la base de connaissances Yonetwork:', error);
        return {
            success: false,
            message: `Erreur: ${error.message}`,
            error
        };
    }
}

// Configuration pour limiter le chatbot aux questions sur Yonetwork
async function configureYonetworkContext() {
    try {
        logger.info('Configuration du contexte Yonetwork pour le chatbot');
        
        // Créer un fichier de configuration pour le contexte Yonetwork
        const configPath = path.join(__dirname, '../../config/context.json');
        const contextConfig = {
            restrictToContext: true,
            contextName: 'Yonetwork',
            keywords: [
                'yonetwork', 'yo network', 'réseau yo', 'entreprise', 'société', 
                'services', 'produits', 'contact', 'adresse', 'téléphone', 'email',
                'horaires', 'ouverture', 'fermeture', 'localisation', 'équipe', 
                'employés', 'collaborateurs', 'histoire', 'mission', 'vision', 
                'valeurs', 'prix', 'tarifs', 'offres', 'promotions', 'réductions', 'compagnie'
            ],
            outOfScopeResponse: "Je suis désolé, mais je suis spécialisé uniquement dans les informations concernant l'entreprise Yonetwork. Je ne peux pas répondre à cette question qui semble hors contexte. Puis-je vous aider avec quelque chose concernant Yonetwork ?"
        };
        
        fs.writeFileSync(configPath, JSON.stringify(contextConfig, null, 2), 'utf8');
        
        logger.info('Configuration du contexte Yonetwork terminée');
        
        return {
            success: true,
            message: 'Configuration du contexte Yonetwork terminée',
            configPath
        };
    } catch (error) {
        logger.error('Erreur lors de la configuration du contexte Yonetwork:', error);
        return {
            success: false,
            message: `Erreur: ${error.message}`,
            error
        };
    }
}

// Exécuter les fonctions si le script est appelé directement
if (require.main === module) {
    (async () => {
        try {
            // Initialiser la base de connaissances
            const knowledgeBaseResult = await setupYonetworkKnowledgeBase();
            console.log(knowledgeBaseResult);
            
            // Configurer le contexte
            const contextResult = await configureYonetworkContext();
            console.log(contextResult);
            
            process.exit(0);
        } catch (error) {
            console.error('Erreur lors de l\'exécution du script:', error);
            process.exit(1);
        }
    })();
} else {
    // Exporter les fonctions pour une utilisation dans d'autres scripts
    module.exports = {
        setupYonetworkKnowledgeBase,
        configureYonetworkContext
    };
} 