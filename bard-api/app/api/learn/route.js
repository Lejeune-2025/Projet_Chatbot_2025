import { NextResponse } from 'next/server';
import contextValidator from '../../../lib/utils/context-validator.js';
import { logger } from '../../../lib/utils/logger.js';

/**
 * Endpoint d'apprentissage pour enrichir le modèle de validation de contexte
 * 
 * @param {Request} request - La requête HTTP
 * @returns {NextResponse} - La réponse HTTP
 */
export async function POST(request) {
    try {
        const data = await request.json();
        
        // Vérifier que nous avons les données nécessaires
        if (!data || (!data.relevantQuestions && !data.irrelevantQuestions)) {
            return NextResponse.json({ 
                error: 'Les données doivent contenir au moins "relevantQuestions" ou "irrelevantQuestions"' 
            }, { status: 400 });
        }
        
        let result = {
            relevantQuestions: { added: 0, total: 0 },
            irrelevantQuestions: { added: 0, total: 0 }
        };
        
        // Ajouter les questions pertinentes si elles existent
        if (data.relevantQuestions && Array.isArray(data.relevantQuestions)) {
            const success = contextValidator.addRelevantQuestions(data.relevantQuestions);
            if (success) {
                result.relevantQuestions.added = data.relevantQuestions.length;
                result.relevantQuestions.total = contextValidator.getConfig().relevantQuestions;
                logger.info(`${data.relevantQuestions.length} questions pertinentes ajoutées au modèle`);
            }
        }
        
        // Ajouter les questions non pertinentes si elles existent
        if (data.irrelevantQuestions && Array.isArray(data.irrelevantQuestions)) {
            const success = contextValidator.addIrrelevantQuestions(data.irrelevantQuestions);
            if (success) {
                result.irrelevantQuestions.added = data.irrelevantQuestions.length;
                result.irrelevantQuestions.total = contextValidator.getConfig().irrelevantQuestions;
                logger.info(`${data.irrelevantQuestions.length} questions non pertinentes ajoutées au modèle`);
            }
        }
        
        // Ajouter des concepts de base si fournis
        if (data.coreConcepts && Array.isArray(data.coreConcepts)) {
            if (contextValidator.addCoreConcepts) {
                const success = contextValidator.addCoreConcepts(data.coreConcepts);
                if (success) {
                    result.coreConcepts = {
                        added: data.coreConcepts.length,
                        total: contextValidator.getConfig().coreConcepts
                    };
                    logger.info(`${data.coreConcepts.length} concepts de base ajoutés au modèle`);
                }
            } else {
                logger.warn('La méthode addCoreConcepts n\'est pas disponible');
            }
        }
        
        return NextResponse.json({
            success: true,
            message: 'Apprentissage réussi',
            result
        });
    } catch (error) {
        logger.error('Erreur lors de l\'apprentissage:', error);
        return NextResponse.json({ 
            error: error.message || 'Erreur lors de l\'apprentissage' 
        }, { status: 500 });
    }
}

/**
 * Endpoint pour récupérer les données d'apprentissage actuelles
 */
export async function GET() {
    try {
        // Récupérer la configuration actuelle
        const config = contextValidator.getConfig();
        
        // Préparer la réponse
        const response = {
            stats: {
                relevantQuestions: config.relevantQuestions,
                irrelevantQuestions: config.irrelevantQuestions,
                coreConcepts: config.coreConcepts
            },
            config: {
                contextName: config.contextConfig?.contextName || 'Yonetwork',
                initialized: config.initialized
            }
        };
        
        // Si nous avons un historique d'apprentissage, l'inclure
        if (config.contextConfig?.learningHistory) {
            response.learningHistory = {
                count: config.contextConfig.learningHistory.length,
                recentEntries: config.contextConfig.learningHistory.slice(-10) // Les 10 dernières entrées
            };
        }
        
        return NextResponse.json(response);
    } catch (error) {
        logger.error('Erreur lors de la récupération des données d\'apprentissage:', error);
        return NextResponse.json({ 
            error: error.message || 'Erreur lors de la récupération des données d\'apprentissage' 
        }, { status: 500 });
    }
} 