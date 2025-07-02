import cron from 'node-cron';
import { cleanupOldConversations } from './utils/cleanup.js';
import { logger } from './utils/logger.js';

export const initScheduler = () => {
    // Exécuter le nettoyage tous les jours à 3h du matin
    cron.schedule('0 3 * * *', async () => {
        try {
            logger.info('Starting scheduled cleanup of old conversations...');
            const cleanedCount = await cleanupOldConversations();
            logger.info(`Scheduled cleanup completed. Cleaned ${cleanedCount} messages.`);
        } catch (error) {
            logger.error('Error in scheduled cleanup:', error);
        }
    });

    logger.info('Scheduler initialized');
}; 