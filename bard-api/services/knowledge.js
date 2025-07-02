import Knowledge from '../models/knowledge';
import { logger } from '../lib/utils/logger';

class KnowledgeService {
    async createArticle(articleData) {
        try {
            return await Knowledge.createArticle(articleData);
        } catch (error) {
            logger.error('Error creating knowledge article:', error);
            throw error;
        }
    }

    async updateArticle(id, articleData) {
        try {
            const article = await Knowledge.findById(id);
            if (!article) {
                throw new Error('Article not found');
            }
            return await Knowledge.updateArticle(id, articleData);
        } catch (error) {
            logger.error('Error updating knowledge article:', error);
            throw error;
        }
    }

    async deleteArticle(id) {
        try {
            const article = await Knowledge.findById(id);
            if (!article) {
                throw new Error('Article not found');
            }
            return await Knowledge.deleteArticle(id);
        } catch (error) {
            logger.error('Error deleting knowledge article:', error);
            throw error;
        }
    }

    async getArticle(id) {
        try {
            const article = await Knowledge.findById(id);
            if (!article) {
                throw new Error('Article not found');
            }
            return article;
        } catch (error) {
            logger.error('Error getting knowledge article:', error);
            throw error;
        }
    }

    async searchArticles(query) {
        try {
            return await Knowledge.search(query);
        } catch (error) {
            logger.error('Error searching knowledge base:', error);
            throw error;
        }
    }

    async getArticlesByCategory(categoryId) {
        try {
            return await Knowledge.getByCategory(categoryId);
        } catch (error) {
            logger.error('Error getting articles by category:', error);
            throw error;
        }
    }

    async createCategory(categoryData) {
        try {
            return await Knowledge.createCategory(categoryData);
        } catch (error) {
            logger.error('Error creating knowledge category:', error);
            throw error;
        }
    }

    async getCategories() {
        try {
            return await Knowledge.getCategories();
        } catch (error) {
            logger.error('Error getting knowledge categories:', error);
            throw error;
        }
    }

    async getCategoryWithArticles(categoryId) {
        try {
            const [category, articles] = await Promise.all([
                Knowledge.getCategories().then(cats => cats.find(c => c.id === categoryId)),
                Knowledge.getByCategory(categoryId)
            ]);

            if (!category) {
                throw new Error('Category not found');
            }

            return {
                ...category,
                articles
            };
        } catch (error) {
            logger.error('Error getting category with articles:', error);
            throw error;
        }
    }
}

export default new KnowledgeService(); 