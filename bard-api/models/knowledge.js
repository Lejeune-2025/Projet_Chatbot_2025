import db from '../lib/db/index';
import { logger } from '../lib/utils/logger';
import cacheManager from '../lib/cache';

class Knowledge {
    static async createArticle({ title, content, categoryId, tags = [] }) {
        try {
            return await db.one(
                `INSERT INTO knowledge_articles (title, content, category_id, tags)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, title, content, category_id, tags, created_at`,
                [title, content, categoryId, tags]
            );
        } catch (error) {
            logger.error('Error creating knowledge article:', error);
            throw error;
        }
    }

    static async updateArticle(id, { title, content, categoryId, tags }) {
        try {
            return await db.one(
                `UPDATE knowledge_articles
                 SET title = COALESCE($1, title),
                     content = COALESCE($2, content),
                     category_id = COALESCE($3, category_id),
                     tags = COALESCE($4, tags)
                 WHERE id = $5
                 RETURNING id, title, content, category_id, tags, updated_at`,
                [title, content, categoryId, tags, id]
            );
        } catch (error) {
            logger.error('Error updating knowledge article:', error);
            throw error;
        }
    }

    static async deleteArticle(id) {
        try {
            return await db.result(
                `DELETE FROM knowledge_articles
                 WHERE id = $1`,
                [id]
            );
        } catch (error) {
            logger.error('Error deleting knowledge article:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const cacheKey = `article:${id}`;
            const cachedArticle = await cacheManager.get('knowledge', cacheKey);
            
            if (cachedArticle) {
                return cachedArticle;
            }
            
            const query = `
                SELECT 
                    k.*, 
                    c.name as category_name
                FROM 
                    knowledge_articles k
                JOIN
                    knowledge_categories c ON k.category_id = c.id
                WHERE 
                    k.id = $1
            `;
            
            const results = await db.query(query, [id]);
            
            if (results.length === 0) {
                return null;
            }
            
            const article = results[0];
            await cacheManager.set('knowledge', cacheKey, article, 86400); // 24h
            
            return article;
        } catch (error) {
            logger.error(`Erreur lors de la récupération de l'article ${id}:`, error);
            return null;
        }
    }

    static async search(query, options = {}) {
        try {
            const cacheKey = `search:${query.toLowerCase().trim()}`;
            const cachedResults = await cacheManager.get('knowledge', cacheKey);
            
            if (cachedResults) {
                logger.info(`Cache hit pour la recherche: "${query}"`);
                return cachedResults;
            }
            
            logger.info(`Recherche dans la base de connaissances: "${query}"`);
            
            // Normaliser la requête
            const normalizedQuery = query.toLowerCase().trim();
            
            // Utiliser une recherche full-text avec pondération
            const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
            
            // Si pas assez de termes significatifs, élargir la recherche
            if (queryTerms.length === 0) {
                return [];
            }
            
            // Construire la requête SQL avec analyse sémantique
            // Cette version utilise la fonction de similarité de texte de PostgreSQL
            // Dans un environnement réel, on pourrait utiliser des embeddings vectoriels
            const searchQuery = `
                SELECT 
                    k.id, 
                    k.title, 
                    k.content, 
                    k.category_id,
                    c.name as category_name,
                    GREATEST(
                        similarity(k.title, $1),
                        similarity(k.content, $1) * 0.8,
                        similarity(k.keywords, $1) * 1.2
                    ) as relevance
                FROM 
                    knowledge_articles k
                JOIN
                    knowledge_categories c ON k.category_id = c.id
                WHERE 
                    k.is_active = true
                    AND (
                        similarity(k.title, $1) > 0.2 OR
                        similarity(k.content, $1) > 0.15 OR
                        similarity(k.keywords, $1) > 0.25
                    )
                ORDER BY 
                    relevance DESC
                LIMIT 5;
            `;
            
            const results = await db.query(searchQuery, [normalizedQuery]);
            
            // Si aucun résultat direct, essayer une recherche plus large avec les mots-clés
            if (results.length === 0 && queryTerms.length > 0) {
                const keywordQuery = `
                    SELECT 
                        k.id, 
                        k.title, 
                        k.content, 
                        k.category_id,
                        c.name as category_name,
                        MAX(word_similarity($2, k.keywords)) as relevance
                    FROM 
                        knowledge_articles k,
                        unnest($1::text[]) as term
                    JOIN
                        knowledge_categories c ON k.category_id = c.id
                 WHERE 
                        k.is_active = true
                        AND (
                            k.title ILIKE '%' || term || '%' OR
                            k.content ILIKE '%' || term || '%' OR
                            k.keywords ILIKE '%' || term || '%'
                        )
                    GROUP BY
                        k.id, k.title, k.content, k.category_id, c.name
                    ORDER BY 
                        relevance DESC
                    LIMIT 3;
                `;
                
                const keywordResults = await db.query(keywordQuery, [queryTerms, normalizedQuery]);
                
                if (keywordResults.length > 0) {
                    await cacheManager.set('knowledge', cacheKey, keywordResults, 3600);
                    return keywordResults;
                }
            }
            
            // Mettre en cache les résultats
            if (results.length > 0) {
                await cacheManager.set('knowledge', cacheKey, results, 3600);
            }
            
            return results;
        } catch (error) {
            logger.error(`Erreur lors de la recherche "${query}":`, error);
            return [];
        }
    }
    
    /**
     * Vérifie si une requête est liée à l'entreprise Yonetwork
     * @param {string} query - La requête à vérifier
     * @returns {Promise<boolean>} - True si la requête est liée à Yonetwork
     */
    static async isYonetworkRelatedQuery(query) {
        try {
            // Liste de mots-clés liés à Yonetwork
            const yonetworkKeywords = [
                'yonetwork', 'yo network', 'réseau yo', 'entreprise', 'société', 
                'services', 'produits', 'contact', 'adresse', 'téléphone', 'email',
                'horaires', 'ouverture', 'fermeture', 'localisation', 'équipe', 
                'employés', 'collaborateurs', 'histoire', 'mission', 'vision', 
                'valeurs', 'prix', 'tarifs', 'offres', 'promotions', 'réductions'
            ];
            
            // Convertir la requête en minuscules pour une comparaison insensible à la casse
            const lowerQuery = query.toLowerCase();
            
            // Vérifier si la requête contient un mot-clé lié à Yonetwork
            const containsYonetworkKeyword = yonetworkKeywords.some(keyword => 
                lowerQuery.includes(keyword.toLowerCase())
            );
            
            // Si la requête contient déjà un mot-clé lié à Yonetwork, retourner true
            if (containsYonetworkKeyword) {
                return true;
            }
            
            // Sinon, vérifier si la requête est une question générale qui pourrait être liée à une entreprise
            const generalBusinessQuestions = [
                'où', 'comment', 'quand', 'qui', 'quoi', 'pourquoi', 
                'combien', 'quel', 'quelle', 'quels', 'quelles',
                'contacter', 'trouver', 'joindre', 'appeler', 'visiter',
                'acheter', 'commander', 'prix', 'coût', 'tarif'
            ];
            
            const containsGeneralBusinessQuestion = generalBusinessQuestions.some(keyword => 
                lowerQuery.includes(keyword.toLowerCase())
            );
            
            // Si c'est une question générale, on considère qu'elle pourrait être liée à Yonetwork
            // mais avec un score de confiance plus faible
            return containsGeneralBusinessQuestion;
            
        } catch (error) {
            logger.error('Error checking if query is related to Yonetwork:', error);
            // En cas d'erreur, on suppose que la requête est liée à Yonetwork pour éviter de bloquer les requêtes légitimes
            return true;
        }
    }

    static async getByCategory(categoryId) {
        try {
            const cacheKey = `category:${categoryId}:articles`;
            const cachedArticles = await cacheManager.get('knowledge', cacheKey);
            
            if (cachedArticles) {
                return cachedArticles;
            }
            
            const query = `
                SELECT 
                    k.*, 
                        c.name as category_name
                FROM 
                    knowledge_articles k
                JOIN
                    knowledge_categories c ON k.category_id = c.id
                WHERE 
                    k.category_id = $1
                    AND k.is_active = true
                ORDER BY
                    k.title
            `;
            
            const results = await db.query(query, [categoryId]);
            await cacheManager.set('knowledge', cacheKey, results, 3600);
            
            return results;
        } catch (error) {
            logger.error(`Erreur lors de la récupération des articles de la catégorie ${categoryId}:`, error);
            return [];
        }
    }

    static async createCategory({ name, description, parentId = null }) {
        try {
            return await db.one(
                `INSERT INTO knowledge_categories (name, description, parent_id)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, description, parent_id, created_at`,
                [name, description, parentId]
            );
        } catch (error) {
            logger.error('Error creating knowledge category:', error);
            throw error;
        }
    }

    static async getCategories() {
        try {
            const cacheKey = 'categories';
            const cachedCategories = await cacheManager.get('knowledge', cacheKey);
            
            if (cachedCategories) {
                return cachedCategories;
            }
            
            const query = `
                SELECT 
                    c.*, 
                    COUNT(k.id) as article_count
                FROM 
                    knowledge_categories c
                LEFT JOIN
                    knowledge_articles k ON c.id = k.category_id AND k.is_active = true
                GROUP BY
                    c.id
                ORDER BY
                    c.name
            `;
            
            const results = await db.query(query);
            await cacheManager.set('knowledge', cacheKey, results, 3600);
            
            return results;
        } catch (error) {
            logger.error('Erreur lors de la récupération des catégories:', error);
            return [];
        }
    }

    static async advancedSearch({ 
        query, 
        categoryId = null, 
        tags = null, 
        dateRange = null,
        page = 1,
        limit = 10
    }) {
        try {
            // Vérifier d'abord si la question est liée à Yonetwork
            const isYonetworkRelated = await this.isYonetworkRelatedQuery(query);
            
            if (!isYonetworkRelated) {
                // Si la question n'est pas liée à Yonetwork, retourner une réponse vide avec pagination
                return {
                    results: [{
                        id: 0,
                        title: "Hors contexte",
                        content: "Je suis un assistant spécialisé pour Yonetwork. Je ne peux répondre qu'aux questions concernant cette entreprise. Pourriez-vous reformuler votre question en rapport avec Yonetwork ?",
                        tags: ["hors-contexte"],
                        category_name: "Système",
                        rank: 1
                    }],
                    pagination: {
                        total: 1,
                        page: 1,
                        limit: 1,
                        totalPages: 1
                    }
                };
            }
            
            const offset = (page - 1) * limit;
            
            // Construire la requête de base
            let sql = `
                SELECT a.id, a.title, a.content, a.tags, a.created_at,
                       c.name as category_name,
                       ts_rank(to_tsvector('french', a.title || ' ' || a.content), to_tsquery('french', $1)) as rank
                FROM knowledge_articles a
                LEFT JOIN knowledge_categories c ON a.category_id = c.id
                WHERE to_tsvector('french', a.title || ' ' || a.content) @@ to_tsquery('french', $1)
            `;

            const params = [query];
            let paramIndex = 2;

            // Ajouter les filtres conditionnels
            if (categoryId) {
                sql += ` AND a.category_id = $${paramIndex}`;
                params.push(categoryId);
                paramIndex++;
            }

            if (tags && tags.length > 0) {
                sql += ` AND a.tags && $${paramIndex}`;
                params.push(tags);
                paramIndex++;
            }

            if (dateRange) {
                sql += ` AND a.created_at <@ $${paramIndex}`;
                params.push(dateRange);
                paramIndex++;
            }

            // Ajouter la pagination
            sql += ` ORDER BY rank DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            // Exécuter la requête
            const results = await db.any(sql, params);

            // Récupérer le nombre total de résultats
            const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM')
                               .replace(/ORDER BY.*$/, '');
            const totalCount = await db.one(countSql, params.slice(0, -2));

            return {
                results,
                pagination: {
                    total: parseInt(totalCount.total),
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount.total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in advanced search:', error);
            throw error;
        }
    }
}

export default Knowledge; 