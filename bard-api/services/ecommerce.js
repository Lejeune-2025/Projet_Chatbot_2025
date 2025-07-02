import Partner from '../models/partner.js';
import { logger } from '../lib/utils/logger.js';

class EcommerceService {
    constructor() {
        this.productTypes = [
            'vêtements', 'électronique', 'électroménager', 'accessoires', 'chaussures',
            'informatique', 'smartphones', 'sport', 'loisirs', 'fitness', 'maison',
            'jardin', 'décoration', 'bijoux', 'montres', 'automobile', 'pièces détachées',
            'livres', 'culture', 'multimédia', 'cosmétiques', 'beauté', 'parfums',
            'jouets', 'enfants', 'puériculture'
        ];
    }

    // Analyser une image pour identifier le type de produit
    async analyzeProductImage(imageData) {
        try {
            // Essayer d'abord l'analyse avec Google Vision API si disponible
            if (process.env.GOOGLE_VISION_API_KEY) {
                const realAnalysis = await this.analyzeImageWithGoogleVision(imageData);
                if (realAnalysis.success) {
                    return realAnalysis;
                }
            }
            
            // Fallback vers la simulation si l'API n'est pas disponible
            const simulatedAnalysis = this.simulateImageAnalysis(imageData);
            
            return {
                success: true,
                productType: simulatedAnalysis.productType,
                confidence: simulatedAnalysis.confidence,
                detectedObjects: simulatedAnalysis.detectedObjects,
                method: 'simulation'
            };
        } catch (error) {
            logger.error('Erreur lors de l\'analyse d\'image:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Analyse d'image avec Google Vision API
    async analyzeImageWithGoogleVision(imageData) {
        try {
            const vision = await import('@google-cloud/vision');
            const client = new vision.ImageAnnotatorClient({
                keyFilename: process.env.GOOGLE_VISION_KEY_FILE || undefined,
                apiKey: process.env.GOOGLE_VISION_API_KEY || undefined
            });

            // Convertir imageData en buffer si nécessaire
            let imageBuffer;
            if (typeof imageData === 'string') {
                // Si c'est une base64 string
                imageBuffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            } else if (imageData instanceof Buffer) {
                imageBuffer = imageData;
            } else {
                throw new Error('Format d\'image non supporté');
            }

            // Analyser l'image avec Google Vision
            const [result] = await client.labelDetection({
                image: { content: imageBuffer }
            });

            const labels = result.labelAnnotations || [];
            const productType = this.mapLabelsToProductType(labels);
            
            // Calculer la confiance moyenne
            const confidence = labels.length > 0 
                ? labels.slice(0, 3).reduce((sum, label) => sum + label.score, 0) / Math.min(3, labels.length)
                : 0.5;

            return {
                success: true,
                productType: productType.type,
                confidence: Math.min(confidence * productType.confidence, 1),
                detectedObjects: labels.slice(0, 5).map(label => ({
                    name: label.description,
                    confidence: label.score
                })),
                method: 'google_vision'
            };
        } catch (error) {
            logger.error('Erreur Google Vision API:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mapper les labels Google Vision vers nos types de produits
    mapLabelsToProductType(labels) {
        const labelTexts = labels.map(l => l.description.toLowerCase());
        
        // Mapping des labels vers les types de produits
        const mappings = {
            'vêtements': ['clothing', 'shirt', 'dress', 'pants', 'jacket', 'coat', 'sweater', 'blouse', 'skirt', 'jeans'],
            'chaussures': ['shoe', 'boot', 'sneaker', 'sandal', 'heel', 'footwear'],
            'électronique': ['electronics', 'computer', 'laptop', 'tablet', 'monitor', 'keyboard', 'mouse'],
            'smartphones': ['phone', 'smartphone', 'mobile', 'iphone', 'android'],
            'électroménager': ['appliance', 'refrigerator', 'washing machine', 'microwave', 'oven', 'dishwasher'],
            'accessoires': ['bag', 'purse', 'wallet', 'belt', 'hat', 'cap', 'scarf', 'gloves'],
            'bijoux': ['jewelry', 'ring', 'necklace', 'bracelet', 'earring', 'watch'],
            'montres': ['watch', 'clock', 'timepiece'],
            'cosmétiques': ['cosmetics', 'makeup', 'lipstick', 'foundation', 'mascara'],
            'parfums': ['perfume', 'fragrance', 'cologne'],
            'sport': ['sports', 'ball', 'equipment', 'fitness', 'gym', 'exercise'],
            'jouets': ['toy', 'doll', 'game', 'puzzle', 'lego', 'action figure'],
            'livres': ['book', 'novel', 'magazine', 'publication'],
            'automobile': ['car', 'vehicle', 'automotive', 'tire', 'wheel'],
            'maison': ['furniture', 'chair', 'table', 'sofa', 'bed', 'lamp'],
            'jardin': ['plant', 'flower', 'garden', 'pot', 'watering can'],
            'décoration': ['decoration', 'vase', 'picture', 'frame', 'candle']
        };

        let bestMatch = { type: 'accessoires', confidence: 0.3 }; // Valeur par défaut
        
        for (const [productType, keywords] of Object.entries(mappings)) {
            for (const keyword of keywords) {
                for (const labelText of labelTexts) {
                    if (labelText.includes(keyword)) {
                        const label = labels.find(l => l.description.toLowerCase() === labelText);
                        const confidence = label ? label.score * 0.8 : 0.5; // Réduire un peu la confiance
                        
                        if (confidence > bestMatch.confidence) {
                            bestMatch = { type: productType, confidence };
                        }
                    }
                }
            }
        }
        
        return bestMatch;
    }

    // Simulation d'analyse d'image (fallback)
    simulateImageAnalysis(imageData) {
        // Simulation basée sur des patterns ou métadonnées
        const productTypes = this.productTypes;
        
        // Si imageData contient des métadonnées ou un nom de fichier
        let detectedType = 'accessoires'; // Type par défaut
        let confidence = 0.6;
        
        if (typeof imageData === 'string') {
            const lowerData = imageData.toLowerCase();
            
            // Recherche de mots-clés dans les métadonnées
            for (const type of productTypes) {
                if (lowerData.includes(type)) {
                    detectedType = type;
                    confidence = 0.8;
                    break;
                }
            }
            
            // Patterns spécifiques
            if (lowerData.includes('phone') || lowerData.includes('mobile')) {
                detectedType = 'smartphones';
                confidence = 0.85;
            } else if (lowerData.includes('shoe') || lowerData.includes('boot')) {
                detectedType = 'chaussures';
                confidence = 0.85;
            } else if (lowerData.includes('shirt') || lowerData.includes('dress')) {
                detectedType = 'vêtements';
                confidence = 0.85;
            }
        }
        
        return {
            productType: detectedType,
            confidence: confidence,
            detectedObjects: [
                { name: detectedType, confidence: confidence },
                { name: 'objet', confidence: 0.4 }
            ]
        };
    }

    // OPTIMISATION: Rechercher des partenaires avec cache
    async searchPartners({ productType, budgetMin, budgetMax, city, country = 'France' }) {
        try {
            // Créer une clé de cache basée sur les critères
            const cacheKey = JSON.stringify({
                productType,
                budgetMin,
                budgetMax,
                city,
                country
            });
            
            // OPTIMISATION: Vérifier le cache d'abord
            const cacheManager = (await import('../lib/cache/index.js')).default;
            let cachedResult = await cacheManager.getPartnerSearch(cacheKey);
            
            if (cachedResult) {
                if (process.env.LOG_LEVEL === 'DEBUG') {
                    logger.info(`Partenaires (cache): ${cachedResult.partners.length}`);
                }
                return cachedResult;
            }
            
            // OPTIMISATION: Logs simplifiés
            if (process.env.LOG_LEVEL === 'DEBUG') {
                logger.info('Recherche partenaires:', productType, city);
            }
            
            const partners = await Partner.searchPartners({
                productType,
                budgetMin,
                budgetMax,
                city,
                country
            });
            
            const result = {
                success: true,
                partners: partners,
                count: partners.length
            };
            
            // Mettre en cache le résultat
            await cacheManager.setPartnerSearch(cacheKey, result);
            
            if (process.env.LOG_LEVEL === 'DEBUG') {
                logger.info(`Partenaires trouvés: ${partners.length}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Erreur recherche partenaires:', error.message);
            return {
                success: false,
                partners: [],
                count: 0,
                error: error.message
            };
        }
    }

    // Formater les résultats pour l'affichage
    formatPartnersForDisplay(partners) {
        return partners.map(partner => {
            const googleMapsUrl = `https://www.google.com/maps?q=${partner.latitude},${partner.longitude}`;
            
            return {
                id: partner.id,
                name: partner.name,
                description: partner.description,
                website: partner.website,
                location: `${partner.city}, ${partner.country}`,
                priceRange: `${partner.price_range_min}€ - ${partner.price_range_max}€`,
                productTypes: partner.product_types,
                googleMapsUrl,
                displayText: `🏪 **${partner.name}**\n📍 ${partner.city}, ${partner.country}\n💰 ${partner.price_range_min}€ - ${partner.price_range_max}€\n📝 ${partner.description}\n🌐 [Visiter le site](${partner.website})\n🗺️ [Voir sur Google Maps](${googleMapsUrl})`
            };
        });
    }

    // Générer des suggestions d'élargissement de recherche
    generateSearchSuggestions(originalCriteria, foundPartnersCount) {
        const suggestions = [];

        if (foundPartnersCount === 0) {
            // Aucun résultat trouvé
            if (originalCriteria.budgetMax) {
                suggestions.push({
                    type: 'budget',
                    text: '💰 Élargir votre budget',
                    action: 'expand_budget',
                    newBudgetMax: Math.round(originalCriteria.budgetMax * 1.5)
                });
            }

            if (originalCriteria.city) {
                suggestions.push({
                    type: 'location',
                    text: '📍 Chercher dans d\'autres villes',
                    action: 'expand_location'
                });
            }

            if (originalCriteria.productType) {
                suggestions.push({
                    type: 'product',
                    text: '🔄 Explorer des produits similaires',
                    action: 'similar_products'
                });
            }
        } else if (foundPartnersCount < 3) {
            // Peu de résultats
            suggestions.push({
                type: 'more_options',
                text: '🔍 Voir plus d\'options',
                action: 'expand_search'
            });
        }

        return suggestions;
    }

    // Obtenir des types de produits similaires
    getSimilarProductTypes(productType) {
        const similarProducts = {
            'vêtements': ['accessoires', 'chaussures'],
            'électronique': ['informatique', 'smartphones'],
            'électroménager': ['maison', 'électronique'],
            'sport': ['loisirs', 'fitness'],
            'cosmétiques': ['beauté', 'parfums'],
            'jouets': ['enfants', 'puériculture'],
            'automobile': ['pièces détachées'],
            'livres': ['culture', 'multimédia'],
            'maison': ['jardin', 'décoration']
        };

        return similarProducts[productType] || [];
    }

    // Obtenir la liste des villes disponibles
    async getAvailableCities() {
        try {
            return await Partner.getCities();
        } catch (error) {
            logger.error('Erreur lors de la récupération des villes:', error);
            return [];
        }
    }

    // Obtenir la liste des types de produits disponibles
    async getAvailableProductTypes() {
        try {
            return await Partner.getProductTypes();
        } catch (error) {
            logger.error('Erreur lors de la récupération des types de produits:', error);
            return this.productTypes;
        }
    }

    // Valider les critères de recherche
    validateSearchCriteria({ productType, budgetMin, budgetMax, city }) {
        const errors = [];

        if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
            errors.push('Le budget minimum ne peut pas être supérieur au budget maximum');
        }

        if (budgetMin !== undefined && budgetMin < 0) {
            errors.push('Le budget minimum ne peut pas être négatif');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export default EcommerceService;