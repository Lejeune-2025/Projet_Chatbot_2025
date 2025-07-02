import Conversation from '../models/conversation.js';
import Knowledge from '../models/knowledge.js';
import Partner from '../models/partner.js';
import EcommerceService from './ecommerce.js';
import { logger } from '../lib/utils/logger.js';
import cacheManager from '../lib/cache/index.js';
import monitoring from '../lib/monitoring/index.js';
import contextValidator from '../lib/utils/context-validator.js';

class ChatService {
    constructor() {
        this.conversation = null;
        this.ecommerceService = new EcommerceService();
        this.userSession = {}; // Stocker les données de session utilisateur
        
        // Messages pour le chatbot e-commerce
        this.welcomeMessage = "🛍️ Bonjour ! Je suis votre assistant shopping intelligent. Je vais vous aider à trouver les meilleurs partenaires pour vos achats.\n\nPour commencer, j'ai besoin de quelques informations :";
        this.productTypeQuestion = "🏷️ Quel type de produit recherchez-vous ?\n(ex: vêtements, électronique, électroménager, accessoires, etc.)";
        this.budgetQuestion = "💰 Quelle est votre fourchette de budget ?\n(Indiquez un montant minimum et maximum en euros)";
        this.locationQuestion = "📍 Dans quelle ville ou région souhaitez-vous trouver ce produit ?";
        
        // Initialiser le validateur de contexte
        this.initializeContextValidator();
    }
    
    async initializeContextValidator() {
        try {
            await contextValidator.initialize();
            logger.info('Validateur de contexte initialisé avec succès');
        } catch (error) {
            logger.error('Erreur lors de l\'initialisation du validateur de contexte:', error);
        }
    }

    async startConversation(userId) {
        try {
            const startTime = Date.now();
            this.conversation = Conversation.create(userId);
            
            // Enregistrer le début de la conversation
            monitoring.recordConversationStart();
            
            // Mettre en cache les informations de la conversation
            await cacheManager.set('conversation', this.conversation.id, {
                userId,
                startTime,
                messageCount: 0
            });

            // Initialiser la session utilisateur
            this.userSession[userId] = {
                step: 'welcome',
                productType: null,
                budgetMin: null,
                budgetMax: null,
                city: null,
                country: 'Maroc'
            };

            // Ajouter le message de bienvenue e-commerce
            const welcomeWithButtons = `${this.welcomeMessage}\n\n${this.productTypeQuestion}\n\n🔘 Vêtements\n🔘 Électronique\n🔘 Électroménager\n🔘 Accessoires\n🔘 Sport & Loisirs\n🔘 Maison & Jardin\n\n💬 Ou décrivez ce que vous cherchez...`;
            await Conversation.addMessage(this.conversation.id, welcomeWithButtons, 'bot');

            return {
                ...this.conversation,
                initialMessage: welcomeWithButtons
            };
        } catch (error) {
            logger.error('Error starting conversation:', error);
            monitoring.recordError('conversation_start', 'chat_service');
            throw error;
        }
    }

    async handleEcommerceFlow(userId, content) {
        try {
            const session = this.userSession[userId] || {
                step: 'welcome',
                productType: null,
                budgetMin: null,
                budgetMax: null,
                city: null,
                country: 'Maroc'
            };

            let response = '';
            let quickButtons = [];

            switch (session.step) {
                case 'welcome':
                case 'product_type':
                    // Étape 1: Déterminer le type de produit
                    const productType = this.extractProductType(content);
                    if (productType) {
                        session.productType = productType;
                        session.step = 'budget';
                        response = `✅ Parfait ! Vous recherchez: **${productType}**\n\n${this.budgetQuestion}\n\n💡 Exemples:\n• "Entre 50 et 200 euros"\n• "Maximum 100 euros"\n• "Pas de limite de budget"`;
                        quickButtons = ['50-200€', '100-500€', '500-1000€', 'Pas de limite'];
                    } else {
                        response = `❓ Je n'ai pas bien compris le type de produit. ${this.productTypeQuestion}\n\n🔘 Vêtements\n🔘 Électronique\n🔘 Électroménager\n🔘 Accessoires\n🔘 Sport & Loisirs\n🔘 Maison & Jardin`;
                    }
                    break;

                case 'budget':
                    // Étape 2: Déterminer le budget
                    const budget = this.extractBudget(content);
                    if (budget.min !== null || budget.max !== null) {
                        session.budgetMin = budget.min || 0;
                        session.budgetMax = budget.max || 999999;
                        session.step = 'location';
                        response = `💰 Budget noté: ${session.budgetMin}€ - ${session.budgetMax}€\n\n${this.locationQuestion}\n\n🏙️ Villes populaires:\n• Paris\n• Lyon\n• Marseille\n• Toulouse\n• Nice`;
                        quickButtons = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Toute la France'];
                    } else {
                        response = `❓ Je n'ai pas bien compris votre budget. ${this.budgetQuestion}\n\n💡 Exemples valides:\n• "Entre 50 et 200 euros"\n• "Maximum 100 euros"\n• "Pas de limite"`;
                    }
                    break;

                case 'location':
                    // Étape 3: Déterminer la localisation
                    const city = this.extractCity(content);
                    if (city) {
                        session.city = city;
                        session.step = 'search';
                        
                        // Effectuer la recherche
                        const searchResult = await this.performPartnerSearch(session);
                        response = searchResult.response;
                        quickButtons = searchResult.quickButtons;
                        
                        // Réinitialiser pour une nouvelle recherche
                        session.step = 'welcome';
                    } else {
                        response = `📍 Veuillez préciser une ville. ${this.locationQuestion}\n\n🏙️ Exemples: Casablanca, Rabat, Meknès, Ougda, Fès...`;
                    }
                    break;

                default:
                    session.step = 'welcome';
                    response = this.welcomeMessage;
                    break;
            }

            this.userSession[userId] = session;
            return { response, quickButtons };

        } catch (error) {
            logger.error('Erreur dans le flux e-commerce:', error);
            return {
                response: "❌ Désolé, une erreur s'est produite. Recommençons votre recherche.",
                quickButtons: ['Nouvelle recherche']
            };
        }
    }

    extractProductType(content) {
        const text = content.toLowerCase();
        const productMappings = {
            'vêtements': ['vêtement', 'habit', 'robe', 'pantalon', 'chemise', 'pull', 'mode'],
            'électronique': ['électronique', 'électro', 'tv', 'télé', 'ordinateur', 'tablette'],
            'électroménager': ['électroménager', 'frigo', 'lave-linge', 'four', 'micro-onde'],
            'accessoires': ['accessoire', 'sac', 'ceinture', 'écharpe', 'gant'],
            'sport': ['sport', 'fitness', 'musculation', 'course', 'vélo'],
            'maison': ['maison', 'meuble', 'canapé', 'table', 'chaise'],
            'informatique': ['informatique', 'ordinateur', 'pc', 'laptop', 'clavier', 'souris'],
            'smartphones': ['smartphone', 'téléphone', 'mobile', 'iphone', 'android'],
            'cosmétiques': ['cosmétique', 'maquillage', 'crème', 'parfum', 'beauté']
        };

        for (const [type, keywords] of Object.entries(productMappings)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return type;
            }
        }
        return null;
    }

    extractBudget(content) {
        const text = content.toLowerCase();
        let min = null, max = null;

        // Patterns pour extraire le budget
        const patterns = {
            range: /entre\s+(\d+)\s+et\s+(\d+)/,
            max: /maximum?\s+(\d+)|jusqu[''']?à\s+(\d+)|max\s+(\d+)/,
            min: /minimum?\s+(\d+)|à\s+partir\s+de\s+(\d+)|min\s+(\d+)/,
            exact: /(\d+)\s*[-–]\s*(\d+)/,
            noLimit: /pas\s+de\s+limite|sans\s+limite|illimité/
        };

        if (patterns.noLimit.test(text)) {
            return { min: 0, max: 999999 };
        }

        const rangeMatch = text.match(patterns.range);
        if (rangeMatch) {
            return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
        }

        const exactMatch = text.match(patterns.exact);
        if (exactMatch) {
            return { min: parseInt(exactMatch[1]), max: parseInt(exactMatch[2]) };
        }

        const maxMatch = text.match(patterns.max);
        if (maxMatch) {
            const value = parseInt(maxMatch[1] || maxMatch[2] || maxMatch[3]);
            return { min: 0, max: value };
        }

        const minMatch = text.match(patterns.min);
        if (minMatch) {
            const value = parseInt(minMatch[1] || minMatch[2] || minMatch[3]);
            return { min: value, max: 999999 };
        }

        // Boutons rapides
        if (text.includes('50-200')) return { min: 50, max: 200 };
        if (text.includes('100-500')) return { min: 100, max: 500 };
        if (text.includes('500-1000')) return { min: 500, max: 1000 };

        return { min: null, max: null };
    }

    extractCity(content) {
        const text = content.toLowerCase().trim();
        const  cities = ['Casablanca','Rabat', 'Fès', 'Marrakech','Agadir','Tanger','Oujda','Meknès','Tétouan','Kenitra'];

        
        if (text.includes('toute la france') || text.includes('partout')) {
            return null; // Recherche nationale
        }

        for (const city of cities) {
            if (text.includes(city)) {
                return city.charAt(0).toUpperCase() + city.slice(1);
            }
        }

        // Si c'est un mot simple qui pourrait être une ville
        if (text.length > 2 && !text.includes(' ') && /^[a-zA-ZÀ-ÿ-]+$/.test(text)) {
            return text.charAt(0).toUpperCase() + text.slice(1);
        }

        return null;
    }

    async performPartnerSearch(session) {
        try {
            const searchResult = await this.ecommerceService.searchPartners({
                productType: session.productType,
                budgetMin: session.budgetMin,
                budgetMax: session.budgetMax,
                city: session.city,
                country: session.country
            });

            if (!searchResult.success) {
                return {
                    response: "❌ Erreur lors de la recherche. Veuillez réessayer.",
                    quickButtons: ['Nouvelle recherche']
                };
            }

            const partners = searchResult.partners;
            
            if (partners.length === 0) {
                const suggestions = this.ecommerceService.generateSearchSuggestions(session, 0);
                let response = `😔 Aucun partenaire ne correspond exactement à vos critères:\n• **Produit**: ${session.productType}\n• **Budget**: ${session.budgetMin}€ - ${session.budgetMax}€\n• **Ville**: ${session.city || 'Toute la France'}\n\n🔄 **Suggestions pour élargir votre recherche:**`;
                
                const quickButtons = suggestions.map(s => s.text);
                quickButtons.push('Nouvelle recherche');
                
                return { response, quickButtons };
            }

            const formattedPartners = this.ecommerceService.formatPartnersForDisplay(partners);
            let response = `🎉 **${partners.length} partenaire(s) trouvé(s) !**\n\n`;
            
            formattedPartners.slice(0, 3).forEach((partner, index) => {
                response += `${index + 1}. ${partner.displayText}\n\n`;
            });

            if (partners.length > 3) {
                response += `... et ${partners.length - 3} autre(s) partenaire(s)\n\n`;
            }

            response += `✨ **Merci d'avoir utilisé notre service !**\nN'hésitez pas à revenir pour d'autres recherches.`;

            const quickButtons = ['Voir plus d\'options', 'Nouvelle recherche', 'Modifier ma recherche'];
            
            return { response, quickButtons };

        } catch (error) {
            logger.error('Erreur lors de la recherche de partenaires:', error);
            return {
                response: "❌ Erreur lors de la recherche. Veuillez réessayer.",
                quickButtons: ['Nouvelle recherche']
            };
        }
    }

    async handleImageUpload(userId, imageData) {
        try {
            const analysisResult = await this.ecommerceService.analyzeProductImage(imageData);
            
            if (analysisResult.success) {
                // Mettre à jour la session avec le type de produit détecté
                if (!this.userSession[userId]) {
                    this.userSession[userId] = {
                        step: 'budget',
                        productType: analysisResult.productType,
                        budgetMin: null,
                        budgetMax: null,
                        city: null,
                        country: 'Maroc'
                    };
                } else {
                    this.userSession[userId].productType = analysisResult.productType;
                    this.userSession[userId].step = 'budget';
                }

                return `📸 **Image analysée avec succès !**\n🏷️ Produit détecté: **${analysisResult.productType}**\n🎯 Confiance: ${Math.round(analysisResult.confidence * 100)}%\n\n${this.budgetQuestion}`;
            } else {
                return `❌ Impossible d'analyser l'image. ${this.productTypeQuestion}`;
            }
        } catch (error) {
            logger.error('Erreur lors de l\'analyse d\'image:', error);
            return `❌ Erreur lors de l'analyse de l'image. ${this.productTypeQuestion}`;
        }
    }

    async addMessage(conversationId, content, role = 'user', userId = null, imageData = null) {
        try {
            // Ajouter le message à la conversation
            const message = await Conversation.addMessage(conversationId, content, role);
            
            if (role === 'user') {
                let botResponseContent;
                
                // Gérer l'upload d'image si présent
                if (imageData) {
                    botResponseContent = await this.handleImageUpload(userId, imageData);
                } else {
                    // Traiter le message texte avec le flux e-commerce
                    const ecommerceResult = await this.handleEcommerceFlow(userId, content);
                    botResponseContent = ecommerceResult.response;
                }
                
                // Ajouter la réponse du bot
                const botResponse = await Conversation.addMessage(
                    conversationId,
                    botResponseContent,
                    'bot'
                );
                
                return {
                    userMessage: message,
                    botResponse: botResponse,
                    isValidContext: true
                };
            }
            
            return { message };
            
        } catch (error) {
            logger.error('Error adding message:', error);
            monitoring.recordError('message_add', 'chat_service');
            throw error;
        }
    }

    async sendMessage(userId, content) {
        try {
            if (!this.conversation) {
                await this.startConversation(userId);
            }

            const startTime = Date.now();

            // Enregistrer le message de l'utilisateur
            await Conversation.addMessage(this.conversation.id, content, 'user');
            
            // 1. Première étape : analyse sémantique pour vérifier le contexte
            const contextValidation = await contextValidator.validateContext(content);
            logger.info(`Validation de contexte: ${JSON.stringify({
                query: content,
                isInContext: contextValidation.isInContext,
                confidence: contextValidation.confidence,
                threshold: contextValidation.threshold,
                bestMatch: contextValidation.bestMatch,
                bestSimilarity: contextValidation.bestSimilarity,
                containsGeneralKeywords: contextValidation.containsGeneralKeywords || false,
                irrelevantSimilarity: contextValidation.irrelevantSimilarity || 0,
                irrelevantWeight: contextValidation.irrelevantWeight || 0
            })}`);
            
            // 2. Deuxième étape : recherche dans la base de connaissances avec mots-clés spécifiques
            let knowledgeResults = [];
            
            // Liste de mots-clés pertinents à rechercher pour certaines requêtes spécifiques
            const keywordMappings = {
                'contact': ['contact', 'coordonnées', 'adresse', 'téléphone', 'email'],
                'nous contacter': ['contact', 'coordonnées', 'adresse', 'téléphone', 'email'],
                'horaires': ['horaires', 'ouverture', 'fermeture', 'disponibilité'],
                'services': ['services', 'offres', 'solutions', 'prestations'],
                'tarifs': ['tarifs', 'prix', 'coût', 'abonnement'],
                'adresse': ['adresse', 'localisation', 'bureaux', 'siège']
            };
            
            // Normaliser la requête pour la recherche de mots-clés
            const normalizedQuery = content.toLowerCase().trim();
            
            // Vérifier si la requête correspond à l'une des requêtes spécifiques
            const matchedKeyword = Object.keys(keywordMappings).find(key => 
                normalizedQuery.includes(key.toLowerCase())
            );
            
            // Si on a une correspondance directe, utiliser les mots-clés associés pour la recherche
            if (matchedKeyword) {
                logger.info(`Requête spécifique détectée: "${matchedKeyword}", utilisation de mots-clés spécifiques pour la recherche`);
                
                // Effectuer plusieurs recherches avec les mots-clés spécifiques
                for (const keyword of keywordMappings[matchedKeyword]) {
                    const results = await Knowledge.search(keyword);
                    if (results.length > 0) {
                        knowledgeResults = [...knowledgeResults, ...results];
                        // Limiter à 5 résultats maximum
                        if (knowledgeResults.length >= 5) {
                            knowledgeResults = knowledgeResults.slice(0, 5);
                            break;
                        }
                    }
                }
                
                // Tentative supplémentaire avec la catégorie directement
                if (knowledgeResults.length === 0) {
                    const categoryResults = await Knowledge.getByCategory(matchedKeyword.charAt(0).toUpperCase() + matchedKeyword.slice(1));
                    if (categoryResults && categoryResults.length > 0) {
                        knowledgeResults = categoryResults.slice(0, 5);
                    }
                }
            } 
            
            // Si pas de correspondance directe ou pas de résultats, faire une recherche standard
            if (knowledgeResults.length === 0) {
                knowledgeResults = await Knowledge.search(content);
            }
            
            logger.info(`Résultats de la recherche dans la base de connaissances:`, {
                query: content,
                resultCount: knowledgeResults.length,
                topResults: knowledgeResults.slice(0, 2).map(r => r.title)
            });
            
            // 3. Prise de décision intelligente combinant les deux approches
            const hasRelevantKnowledge = knowledgeResults.length > 0 && 
                      !knowledgeResults[0].title.toLowerCase().includes('hors contexte');
            
            // Critères renforcés pour la détection des questions hors contexte          
            const isDefinitelyOutOfContext = 
                !contextValidation.isInContext || 
                contextValidation.containsGeneralKeywords || 
                (contextValidation.confidence < 30 && !hasRelevantKnowledge) ||
                (contextValidation.irrelevantSimilarity * contextValidation.irrelevantWeight > 0.4) ||
                // Vérifier si la requête contient des termes spécifiques à la géographie ou à d'autres sujets hors contexte
                (normalizedQuery.includes('capitale') && !normalizedQuery.includes('SoukBot')) ||
                (normalizedQuery.includes('pays') && !normalizedQuery.includes('SoukBot'));
            
            // Logs détaillés sur la décision
            logger.info(`Analyse de pertinence combinée:`, {
                isDefinitelyOutOfContext,
                hasRelevantKnowledge,
                semanticDecision: contextValidation.isInContext ? 'PERTINENT' : 'NON PERTINENT',
                confidence: contextValidation.confidence,
                threshold: contextValidation.threshold,
                containsGeneralKeywords: contextValidation.containsGeneralKeywords || false,
                irrelevantSimilarity: contextValidation.irrelevantSimilarity,
                irrelevantWeight: contextValidation.irrelevantWeight,
                topIrrelevantMatches: contextValidation.topIrrelevantMatches || []
            });
                
            // Apprendre de cette interaction - stocker la question et sa classification
            const learnAsRelevant = hasRelevantKnowledge && !isDefinitelyOutOfContext;
            
            // Utiliser l'apprentissage pour améliorer le modèle
            contextValidator.learnFromQuery(content, learnAsRelevant, {
                confidence: contextValidation.confidence,
                hasKnowledgeResults: hasRelevantKnowledge,
                knowledgeResultsCount: knowledgeResults.length,
                semanticEvaluation: contextValidation.isInContext,
                containsGeneralKeywords: contextValidation.containsGeneralKeywords || false,
                timestamp: new Date().toISOString()
            });
            
            // Décision finale : répondre ou rejeter la question
            if (isDefinitelyOutOfContext) {
                logger.warn(`Question hors contexte détectée: "${content}" - Score: ${contextValidation.confidence}%, Résultats base de connaissances: ${knowledgeResults.length}, Contient mots-clés généraux: ${contextValidation.containsGeneralKeywords || false}`);
                
                // Passer la requête originale pour personnaliser la réponse
                const outOfScopeResponse = contextValidator.getOutOfScopeResponse(content);
                
                // Enregistrer la réponse "hors contexte"
                await Conversation.addMessage(this.conversation.id, outOfScopeResponse, 'bot');
                
                // Mettre à jour les métriques
                const conversationCache = await cacheManager.get('conversation', this.conversation.id);
                if (conversationCache) {
                    conversationCache.messageCount += 2;
                    await cacheManager.set('conversation', this.conversation.id, conversationCache);
                }
                
                // Enregistrer la métrique de question hors contexte
                monitoring.recordOutOfContextQuery(content);
                
                return {
                    conversationId: this.conversation.id,
                    reply: outOfScopeResponse,
                    isOutOfContext: true,
                    contextValidation
                };
            }

            // Traitement des questions dans le contexte
            // Vérifier le cache pour la réponse
            const cacheKey = `message:${this.conversation.id}:${content}`;
            let botResponse = await cacheManager.get('knowledge', cacheKey);

            if (!botResponse) {
                const searchStart = Date.now();
                const searchDuration = (Date.now() - searchStart) / 1000;

                // Enregistrer les métriques de recherche
                monitoring.recordKnowledgeSearch(
                    searchDuration,
                    knowledgeResults.length,
                    false
                );

                // Générer une réponse basée sur les résultats
                if (knowledgeResults.length > 0) {
                    // Même si la validation sémantique a donné un score faible, 
                    // si nous avons des résultats pertinents, on répond quand même
                    const bestMatch = knowledgeResults[0];
                    
                    // Formater la réponse en fonction du type de contenu
                    if (bestMatch.content.startsWith('mailto:')) {
                        // C'est une adresse email
                        const email = bestMatch.content.replace('mailto:', '');
                        botResponse = `**${bestMatch.title}**\n\nVous pouvez nous contacter par email à l'adresse suivante: ${email}\n\nNotre équipe se fera un plaisir de vous répondre dans les plus brefs délais.`;
                    } else if (bestMatch.content.match(/^\+?[\d\s()-]{7,}$/)) {
                        // C'est un numéro de téléphone
                        botResponse = `**${bestMatch.title}**\n\nVous pouvez nous joindre par téléphone au ${bestMatch.content}\n\nNos conseillers sont disponibles pour répondre à vos questions.`;
                    } else {
                        // Contenu standard
                        botResponse = `**${bestMatch.title}**  \n\n${bestMatch.content}`;
                    }
                    
                    // Ajouter des informations supplémentaires si disponibles
                    if (knowledgeResults.length > 1) {
                        botResponse += '\n\n**Autres informations pertinentes :**';
                        knowledgeResults.slice(1, 3).forEach(result => {
                            botResponse += `\n- ${result.title}`;
                        });
                    }
                } else {
                    // Pas de résultats, mais la question est jugée pertinente sémantiquement
                    botResponse = "Je n'ai pas trouvé d'informations spécifiques sur ce sujet dans notre base de connaissances sur SoukBot. Pourriez-vous reformuler votre question ou me demander autre chose concernant notre entreprise ?";
                }

                // Mettre en cache la réponse
                await cacheManager.set('knowledge', cacheKey, botResponse);
            } else {
                // Enregistrer un hit de cache
                monitoring.recordKnowledgeSearch(0, 1, true);
            }

            // Enregistrer la réponse du bot
            await Conversation.addMessage(this.conversation.id, botResponse, 'bot');

            // Mettre à jour les métriques de la conversation
            const conversationCache = await cacheManager.get('conversation', this.conversation.id);
            if (conversationCache) {
                conversationCache.messageCount += 2; // +2 pour le message utilisateur et la réponse
                await cacheManager.set('conversation', this.conversation.id, conversationCache);
            }

            return {
                conversationId: this.conversation.id,
                reply: botResponse,
                isOutOfContext: false,
                contextValidation: {
                    isInContext: true,
                    confidence: contextValidation.confidence
                }
            };
        } catch (error) {
            logger.error('Error sending message:', error);
            monitoring.recordError('message_send', 'chat_service');
            throw error;
        }
    }

    async getConversationHistory(conversationId) {
        try {
            // Vérifier le cache
            const cachedHistory = await cacheManager.get('conversation', `history:${conversationId}`);
            if (cachedHistory) {
                return cachedHistory;
            }

            const conversation = Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            const messages = await Conversation.getMessages(conversationId);
            const history = {
                conversation,
                messages
            };

            // Mettre en cache l'historique
            await cacheManager.set('conversation', `history:${conversationId}`, history);

            return history;
        } catch (error) {
            logger.error('Error getting conversation history:', error);
            monitoring.recordError('history_get', 'chat_service');
            throw error;
        }
    }

    async endConversation(conversationId) {
        try {
            const conversation = Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            const messages = await Conversation.getMessages(conversationId);
            const duration = (Date.now() - new Date(conversation.start_time).getTime()) / 1000;

            // Enregistrer les métriques de fin de conversation
            monitoring.recordConversationEnd(duration, messages.length);

            // Nettoyer le cache
            await cacheManager.delete('conversation', conversationId);
            await cacheManager.delete('conversation', `history:${conversationId}`);

            return Conversation.updateStatus(conversationId, 'closed');
        } catch (error) {
            logger.error('Error ending conversation:', error);
            monitoring.recordError('conversation_end', 'chat_service');
            throw error;
        }
    }

    async getActiveConversations() {
        try {
            // Vérifier le cache
            const cachedActive = await cacheManager.get('conversation', 'active');
            if (cachedActive) {
                return cachedActive;
            }

            const activeConversations = Conversation.getActiveConversations();
            
            // Mettre en cache les conversations actives
            await cacheManager.set('conversation', 'active', activeConversations, 60); // TTL de 1 minute

            return activeConversations;
        } catch (error) {
            logger.error('Error getting active conversations:', error);
            monitoring.recordError('active_conversations_get', 'chat_service');
            throw error;
        }
    }
}

const chatService = new ChatService();
export default chatService;