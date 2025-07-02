import { supabase } from './index.js';
import { logger } from '../utils/logger.js';
import { validateMessage, validateSearchQuery, validateId, validateDate } from './validation.js';

// Requêtes pour les conversations
export const conversationQueries = {
    // Créer une nouvelle conversation
    create: async (userId) => {
        try {
            const validUserId = validateId(userId);
            const { data, error } = await supabase
                .from('conversations')
                .insert([
                    { user_id: validUserId, status: 'active' }
                ])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error creating conversation:', error);
            throw error;
        }
    },

    // Ajouter un message
    addMessage: async (conversationId, content, senderType) => {
        try {
            const validConversationId = validateId(conversationId);
            const validContent = validateMessage(content, senderType);

            const { data, error } = await supabase
                .from('messages')
                .insert([
                    {
                        conversation_id: validConversationId,
                        content: validContent,
                        sender_type: senderType
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error adding message:', error);
            throw error;
        }
    },

    // Récupérer l'historique d'une conversation
    getHistory: async (conversationId) => {
        try {
            const validConversationId = validateId(conversationId);
            const { data, error } = await supabase
                .from('messages')
                .select('id, content, sender_type, timestamp')
                .eq('conversation_id', validConversationId)
                .order('timestamp', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error getting conversation history:', error);
            throw error;
        }
    }
};

// Requêtes pour la base de connaissances
export const knowledgeQueries = {
    // Rechercher dans la base de connaissances
    search: async (query) => {
        try {
            const validQuery = validateSearchQuery(query);
            return await supabase
                .from('knowledge_articles')
                .select('id, title, content, category_id')
                .textSearch('title', validQuery)
                .or('tags->>', validQuery)
                .order('ts_rank', { ascending: false })
                .limit(5);
        } catch (error) {
            logger.error('Error searching knowledge base:', error);
            throw error;
        }
    },

    // Récupérer par catégorie
    getByCategory: async (categoryId) => {
        try {
            const validCategoryId = validateId(categoryId);
            return await supabase
                .from('knowledge_articles')
                .select('id, title, content')
                .eq('category_id', validCategoryId)
                .order('title', { ascending: true });
        } catch (error) {
            logger.error('Error getting knowledge by category:', error);
            throw error;
        }
    }
};

// Requêtes pour les statistiques
export const statsQueries = {
    // Obtenir les statistiques d'utilisation
    getUsageStats: async (startDate, endDate) => {
        try {
            const validStartDate = validateDate(startDate);
            const validEndDate = validateDate(endDate);

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    id,
                    user_id,
                    messages (
                        id
                    )
                `)
                .gte('start_time', validStartDate)
                .lte('start_time', validEndDate);

            if (error) throw error;

            // Calculer les statistiques
            const stats = {
                total_conversations: data.length,
                total_messages: data.reduce((acc, conv) => acc + (conv.messages?.length || 0), 0),
                unique_users: new Set(data.map(conv => conv.user_id)).size
            };

            return stats;
        } catch (error) {
            logger.error('Error getting usage stats:', error);
            throw error;
        }
    }
}; 