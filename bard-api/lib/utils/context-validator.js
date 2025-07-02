/**
 * Module de validation de contexte pour le chatbot Yonetwork
 * Ce module vérifie si une requête est liée au contexte de l'entreprise Yonetwork
 * en utilisant une approche sémantique plutôt que des règles rigides
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from './logger.js';

// Obtenir le chemin du répertoire actuel (nécessaire en ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ContextValidator {
    constructor() {
        this.contextConfig = null;
        this.initialized = false;
        
        // Concepts de base liés à l'entreprise (utilisés pour la comparaison sémantique)
        this.coreConcepts = [
            "Yonetwork est une entreprise spécialisée en services numériques.",
            "Notre entreprise propose des solutions web et mobiles.",
            "Contactez Yonetwork pour vos projets informatiques.",
            "Nos horaires d'ouverture et informations de contact."
        ];
        
        // Exemples de questions pertinentes pour entraîner le modèle
        this.relevantQuestions = [
            "Quels sont les services de Yonetwork?",
            "Comment contacter votre entreprise?",
            "Où se trouvent vos bureaux?",
            "Quels sont vos horaires d'ouverture?",
            "Quels types de solutions proposez-vous?",
            "Quel est votre domaine d'expertise?",
            "Pouvez-vous me donner des informations sur vos tarifs?",
            "Comment fonctionne votre service client?",
            "Quelle est l'histoire de Yonetwork?"
        ];
        
        // Exemples de questions non pertinentes pour entraîner le modèle
        this.irrelevantQuestions = [
            "Quelle est la capitale de la France?",
            "Comment faire une tarte aux pommes?",
            "Qui a gagné la Coupe du Monde 2018?",
            "Quand a été construite la Tour Eiffel?",
            "Quel est le plus grand océan du monde?",
            "Comment résoudre une équation du second degré?",
            "Quels sont les symptômes du rhume?",
            "Qui a écrit Hamlet?",
            "Quelle est la population du Japon?",
            "Quelle est la capitale du Tchad?"
        ];
        
        // Liste de mots-clés généraux qui indiquent souvent des questions hors contexte
        this.generalKeywords = [
            "capitale", "pays", "monde", "planète", "histoire", "géographie", 
            "mathématiques", "science", "politique", "sport", "météo", "cuisine", 
            "film", "musique", "livre", "santé", "maladie", "médecine", "animal",
            "Tchad", "France", "Japon", "États-Unis", "Europe", "Afrique", "Asie"
        ];
    }

    /**
     * Initialise le validateur de contexte
     */
    async initialize() {
        try {
            // Tenter de charger la configuration depuis le fichier
            const configPath = path.join(__dirname, '../../config/context.json');
            
            if (fs.existsSync(configPath)) {
                this.contextConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                logger.info('Configuration de contexte chargée avec succès');
                
                // Enrichir les concepts de base avec des données de la configuration
                if (this.contextConfig.coreConcepts) {
                    this.coreConcepts = [...this.coreConcepts, ...this.contextConfig.coreConcepts];
                }
                
                if (this.contextConfig.relevantQuestions) {
                    this.relevantQuestions = [...this.relevantQuestions, ...this.contextConfig.relevantQuestions];
                }
                
                if (this.contextConfig.irrelevantQuestions) {
                    this.irrelevantQuestions = [...this.irrelevantQuestions, ...this.contextConfig.irrelevantQuestions];
                }
            } else {
                // Créer une configuration par défaut
                this.contextConfig = {
                    contextName: 'Yonetwork',
                    outOfScopeResponse: "Je suis désolé, mais je suis spécialisé uniquement dans les informations concernant l'entreprise Yonetwork. Je ne peux pas répondre à cette question qui semble hors contexte. Puis-je vous aider avec quelque chose concernant Yonetwork ?",
                    confidenceThreshold: 35  // Augmenté de 25 à 35 pour être plus strict
                };
                
                // Créer le fichier de configuration
                const configDir = path.dirname(configPath);
                if (!fs.existsSync(configDir)) {
                    fs.mkdirSync(configDir, { recursive: true });
                }
                
                fs.writeFileSync(configPath, JSON.stringify(this.contextConfig, null, 2), 'utf8');
                logger.info('Configuration de contexte par défaut créée');
            }
            
            this.initialized = true;
            return true;
        } catch (error) {
            logger.error('Erreur lors de l\'initialisation du validateur de contexte:', error);
            return false;
        }
    }

    /**
     * Calcule la similarité sémantique entre deux textes (version améliorée)
     * Cette fonction est toujours simplifiée mais plus stricte
     * 
     * @param {string} text1 - Premier texte
     * @param {string} text2 - Deuxième texte
     * @returns {number} - Score de similarité entre 0 et 1
     */
    calculateSemanticSimilarity(text1, text2) {
        // Normaliser et extraire les mots
        const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
        const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
        
        // Vérifier si le texte contient des mots-clés généraux (hors contexte)
        const containsGeneralKeywords = this.checkForGeneralKeywords(text1);
        
        // Si la requête contient des mots-clés généraux, pénaliser le score
        if (containsGeneralKeywords && words1.size < 8) {
            return 0.05; // Score très bas pour les questions courtes avec mots-clés généraux
        }
        
        // Calculer l'intersection et l'union des ensembles de mots
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        // Si pas de mots communs, retourner 0
        if (intersection.size === 0) {
            return 0;
        }
        
        // Vérifier si les mots communs sont pertinents à Yonetwork
        const yonetworkTerms = new Set(['yonetwork', 'contact', 'service', 'horaire', 'tarif', 'adresse', 'entreprise']);
        const hasYonetworkTerms = [...intersection].some(word => yonetworkTerms.has(word));
        
        // Coefficient de Jaccard amélioré avec un bonus pour les termes Yonetwork
        let score = intersection.size / union.size;
        
        // Bonus si des termes spécifiques à Yonetwork sont présents
        if (hasYonetworkTerms) {
            score *= 1.5;
        }
        
        // Plafonner à 1.0
        return Math.min(score, 1.0);
    }
    
    /**
     * Vérifie si un texte contient des mots-clés généraux (hors contexte)
     * @param {string} text - Le texte à analyser
     * @returns {boolean} - True si des mots-clés généraux sont détectés
     */
    checkForGeneralKeywords(text) {
        const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
        return this.generalKeywords.some(keyword => words.includes(keyword.toLowerCase()));
    }

    /**
     * Vérifie si une requête est liée au contexte de l'entreprise (VERSION OPTIMISÉE)
     * @param {string} query - La requête à vérifier
     * @returns {Object} - Résultat de la validation avec score de confiance
     */
    async validateContext(query) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        // Normaliser la requête
        const normalizedQuery = this.normalizeText(query);
        
        // OPTIMISATION 1: Vérification rapide des mots-clés généraux en premier
        const containsGeneralKeywords = this.checkForGeneralKeywords(normalizedQuery);
        if (containsGeneralKeywords) {
            // Retour immédiat si mots-clés généraux détectés
            return {
                isInContext: false,
                confidence: 5,
                threshold: 30,
                bestMatch: null,
                bestSimilarity: 0,
                containsGeneralKeywords: true,
                irrelevantSimilarity: 0.8,
                irrelevantWeight: 1.0,
                topIrrelevantMatches: []
            };
        }
        
        // OPTIMISATION 2: Réduire le nombre de comparaisons - seulement les 3 premiers concepts
        let maxSimilarity = 0;
        let bestMatch = null;
        
        // Comparer avec seulement les 3 premiers concepts de base (au lieu de tous)
        for (let i = 0; i < Math.min(3, this.coreConcepts.length); i++) {
            const similarity = this.calculateSemanticSimilarity(normalizedQuery, this.coreConcepts[i]);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMatch = { concept: this.coreConcepts[i], similarity };
            }
        }
        
        // OPTIMISATION 3: Comparer avec seulement les 5 premières questions pertinentes
        for (let i = 0; i < Math.min(5, this.relevantQuestions.length); i++) {
            const similarity = this.calculateSemanticSimilarity(normalizedQuery, this.relevantQuestions[i]);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMatch = { concept: `Question: ${this.relevantQuestions[i]}`, similarity };
            }
        }
        
        // OPTIMISATION 4: Vérification simplifiée des questions non pertinentes (seulement 3)
        let maxIrrelevantSimilarity = 0;
        for (let i = 0; i < Math.min(3, this.irrelevantQuestions.length); i++) {
            const similarity = this.calculateSemanticSimilarity(normalizedQuery, this.irrelevantQuestions[i]);
            maxIrrelevantSimilarity = Math.max(maxIrrelevantSimilarity, similarity);
        }
        
        // OPTIMISATION 5: Calcul simplifié du score de confiance
        const confidence = Math.round(maxSimilarity * 100);
        const threshold = 30;
        
        // Décision simplifiée
        const isIrrelevant = 
            maxIrrelevantSimilarity > maxSimilarity || 
            maxSimilarity < 0.2;
        
        
        return {
            isInContext: isInContext,
            confidence: confidence,
            threshold: threshold,
            bestMatch: bestMatch ? bestMatch.concept : null,
            bestSimilarity: maxSimilarity,
            containsGeneralKeywords: false,
            irrelevantSimilarity: maxIrrelevantSimilarity,
            irrelevantWeight: 1.0,
            topIrrelevantMatches: []
        };
    }

    /**
     * Normalise le texte pour la recherche
     * @param {string} text - Le texte à normaliser
     * @returns {string} - Le texte normalisé
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
            .replace(/[^\w\s]/g, ' ')                        // Remplacer la ponctuation par des espaces
            .replace(/\s+/g, ' ')                            // Normaliser les espaces
            .trim();
    }

    /**
     * Obtient la réponse pour les requêtes hors contexte
     * @param {string} query - La requête originale (optionnelle)
     * @returns {string} - Message de réponse pour les requêtes hors contexte
     */
    getOutOfScopeResponse(query = '') {
        if (!this.initialized) {
            this.initialize();
        }
        
        // Si pas de message personnalisé dans la config, utiliser un message par défaut
        let responseTemplate = this.contextConfig.outOfScopeResponse || 
            "Je suis désolé, mais je suis spécialisé uniquement dans les informations concernant l'entreprise Yonetwork. Je ne peux pas répondre à cette question qui semble hors contexte.";
        
        // Si la requête est fournie, essayer d'extraire des mots-clés pour personnaliser la réponse
        if (query && responseTemplate.includes('{keywords}')) {
            // Normaliser la requête
            const normalizedQuery = this.normalizeText(query);
            
            // Liste de mots-clés généraux à rechercher dans la requête
            const generalTopics = [
                'sport', 'cuisine', 'recette', 'politique', 'film', 'musique',
                'santé', 'voyage', 'histoire', 'science', 'technologie', 'animal',
                'plante', 'livre', 'météo', 'mathématiques', 'géographie', 'pays',
                'capitale', 'religion', 'philosophie', 'art', 'culture', 'économie',
                'finance', 'médecine', 'droit', 'éducation', 'mode', 'beauté'
            ];
            
            // Trouver les mots-clés présents dans la requête
            const foundKeywords = generalTopics.filter(keyword => 
                normalizedQuery.includes(keyword)
            );
            
            // Si des mots-clés sont trouvés, les utiliser dans la réponse
            if (foundKeywords.length > 0) {
                // Limiter à 3 mots-clés maximum pour éviter des réponses trop longues
                const keywordsToUse = foundKeywords.slice(0, 3).join(', ');
                responseTemplate = responseTemplate.replace('{keywords}', keywordsToUse);
            } else {
                // Si aucun mot-clé spécifique n'est trouvé, utiliser une formulation plus générique
                responseTemplate = responseTemplate.replace('Votre question sur "{keywords}"', 'Votre question');
            }
        } else {
            // Si le template contient {keywords} mais qu'aucune requête n'est fournie, supprimer cette partie
            responseTemplate = responseTemplate.replace('Votre question sur "{keywords}"', 'Votre question');
        }
        
        return responseTemplate;
    }

    /**
     * Teste une requête spécifique et retourne un diagnostic détaillé
     * @param {string} query - La requête à tester
     * @returns {Object} - Résultat détaillé de l'analyse
     */
    async testQuery(query) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        // Normaliser la requête
        const normalizedQuery = this.normalizeText(query);
        
        // Obtenir les résultats de validation
        const result = await this.validateContext(query);
        
        // Préparer un rapport détaillé
        return {
            query: query,
            normalizedQuery: normalizedQuery,
            result
        };
    }

    /**
     * Retourne la configuration actuelle du validateur
     * @returns {Object} - Configuration actuelle
     */
    getConfig() {
        return {
            initialized: this.initialized,
            contextConfig: this.contextConfig,
            coreConcepts: this.coreConcepts?.length || 0,
            relevantQuestions: this.relevantQuestions?.length || 0,
            irrelevantQuestions: this.irrelevantQuestions?.length || 0,
            configPath: path.join(__dirname, '../../config/context.json')
        };
    }

    /**
     * Ajoute des exemples de questions pertinentes au modèle
     * @param {Array<string>} questions - Nouvelles questions pertinentes à ajouter
     * @returns {boolean} - True si l'ajout est réussi
     */
    addRelevantQuestions(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            return false;
        }
        
        try {
            // Filtrer les questions valides (non vides)
            const validQuestions = questions.filter(q => typeof q === 'string' && q.trim().length > 0);
            
            if (validQuestions.length === 0) {
                return false;
            }
            
            // Ajouter les nouvelles questions
            this.relevantQuestions = [...new Set([...this.relevantQuestions, ...validQuestions])];
            
            // Si nous avons un fichier de configuration, le mettre à jour
            if (this.initialized && this.contextConfig) {
                const configPath = path.join(__dirname, '../../config/context.json');
                
                // Mettre à jour la configuration
                this.contextConfig.relevantQuestions = this.relevantQuestions;
                
                // Sauvegarder la configuration
                fs.writeFileSync(configPath, JSON.stringify(this.contextConfig, null, 2), 'utf8');
                
                logger.info(`Configuration mise à jour avec ${validQuestions.length} nouvelles questions pertinentes`);
            }
            
            return true;
        } catch (error) {
            logger.error('Erreur lors de l\'ajout d\'exemples de questions:', error);
            return false;
        }
    }
    
    /**
     * Ajoute des exemples de questions non pertinentes au modèle
     * @param {Array<string>} questions - Nouvelles questions non pertinentes à ajouter
     * @returns {boolean} - True si l'ajout est réussi
     */
    addIrrelevantQuestions(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            return false;
        }
        
        try {
            // Filtrer les questions valides (non vides)
            const validQuestions = questions.filter(q => typeof q === 'string' && q.trim().length > 0);
            
            if (validQuestions.length === 0) {
                return false;
            }
            
            // Ajouter les nouvelles questions
            this.irrelevantQuestions = [...new Set([...this.irrelevantQuestions, ...validQuestions])];
            
            // Si nous avons un fichier de configuration, le mettre à jour
            if (this.initialized && this.contextConfig) {
                const configPath = path.join(__dirname, '../../config/context.json');
                
                // Mettre à jour la configuration
                this.contextConfig.irrelevantQuestions = this.irrelevantQuestions;
                
                // Sauvegarder la configuration
                fs.writeFileSync(configPath, JSON.stringify(this.contextConfig, null, 2), 'utf8');
                
                logger.info(`Configuration mise à jour avec ${validQuestions.length} nouvelles questions non pertinentes`);
            }
            
            return true;
        } catch (error) {
            logger.error('Erreur lors de l\'ajout d\'exemples de questions non pertinentes:', error);
            return false;
        }
    }
    
    /**
     * Permet d'ajouter une question et sa réponse à la base d'apprentissage
     * @param {string} question - La question posée
     * @param {boolean} wasRelevant - Si la question était considérée comme pertinente
     * @param {Object} details - Détails supplémentaires (réponse, score, etc.)
     * @returns {boolean} - True si l'ajout est réussi
     */
    learnFromQuery(question, wasRelevant, details = {}) {
        try {
            if (!question || typeof question !== 'string' || question.trim().length === 0) {
                return false;
            }
            
            // Normaliser la question
            const normalizedQuestion = this.normalizeText(question);
            
            // Ajouter à la liste appropriée
            if (wasRelevant) {
                if (!this.relevantQuestions.includes(normalizedQuestion)) {
                    this.relevantQuestions.push(normalizedQuestion);
                    logger.info(`Question ajoutée aux exemples pertinents: "${normalizedQuestion}"`);
                }
            } else {
                if (!this.irrelevantQuestions.includes(normalizedQuestion)) {
                    this.irrelevantQuestions.push(normalizedQuestion);
                    logger.info(`Question ajoutée aux exemples non pertinents: "${normalizedQuestion}"`);
                }
            }
            
            // Persister les modifications si nous avons un fichier de configuration
            if (this.initialized && this.contextConfig) {
                const configPath = path.join(__dirname, '../../config/context.json');
                
                // Mettre à jour la configuration
                this.contextConfig.relevantQuestions = this.relevantQuestions;
                this.contextConfig.irrelevantQuestions = this.irrelevantQuestions;
                
                // Ajouter un historique d'apprentissage si ce n'est pas déjà le cas
                if (!this.contextConfig.learningHistory) {
                    this.contextConfig.learningHistory = [];
                }
                
                // Ajouter cette requête à l'historique
                this.contextConfig.learningHistory.push({
                    question,
                    wasRelevant,
                    timestamp: new Date().toISOString(),
                    ...details
                });
                
                // Limiter l'historique à 100 entrées
                if (this.contextConfig.learningHistory.length > 100) {
                    this.contextConfig.learningHistory = this.contextConfig.learningHistory.slice(-100);
                }
                
                // Sauvegarder la configuration
                fs.writeFileSync(configPath, JSON.stringify(this.contextConfig, null, 2), 'utf8');
            }
            
            return true;
        } catch (error) {
            logger.error('Erreur lors de l\'apprentissage depuis une requête:', error);
            return false;
        }
    }

    /**
     * Ajoute des concepts de base au modèle
     * @param {Array<string>} concepts - Nouveaux concepts à ajouter
     * @returns {boolean} - True si l'ajout est réussi
     */
    addCoreConcepts(concepts) {
        if (!Array.isArray(concepts) || concepts.length === 0) {
            return false;
        }
        
        try {
            // Filtrer les concepts valides (non vides)
            const validConcepts = concepts.filter(c => typeof c === 'string' && c.trim().length > 0);
            
            if (validConcepts.length === 0) {
                return false;
            }
            
            // Ajouter les nouveaux concepts
            this.coreConcepts = [...new Set([...this.coreConcepts, ...validConcepts])];
            
            // Si nous avons un fichier de configuration, le mettre à jour
            if (this.initialized && this.contextConfig) {
                const configPath = path.join(__dirname, '../../config/context.json');
                
                // Mettre à jour la configuration
                this.contextConfig.coreConcepts = this.coreConcepts;
                
                // Sauvegarder la configuration
                fs.writeFileSync(configPath, JSON.stringify(this.contextConfig, null, 2), 'utf8');
                
                logger.info(`Configuration mise à jour avec ${validConcepts.length} nouveaux concepts de base`);
            }
            
            return true;
        } catch (error) {
            logger.error('Erreur lors de l\'ajout de concepts de base:', error);
            return false;
        }
    }
}

// Exporter une instance unique du validateur de contexte
const contextValidator = new ContextValidator();

// Utiliser l'exportation ESM
export default contextValidator;