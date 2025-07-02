import db from '../db/index.js';
import { logger } from './logger.js';

export const cleanupOldConversations = async (daysToKeep = 30) => {
    try {
        const result = await db.result(
            `DELETE FROM messages 
             WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'`
        );

        logger.info(`Cleaned up ${result.rowCount} old messages`);

        // Supprimer les conversations vides
        await db.result(
            `DELETE FROM conversations 
             WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages)`
        );

        return result.rowCount;
    } catch (error) {
        logger.error('Error cleaning up old conversations:', error);
        throw error;
    }
}; 