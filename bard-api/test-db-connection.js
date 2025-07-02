import { supabase } from './lib/db/index.js';
import { logger } from './lib/utils/logger.js';
import { checkAndUpdateUsersTable, checkAndUpdateSessionsTable, executeMigrations } from './lib/db/migrations.js';

async function testDatabaseConnection() {
    try {
        // Exécuter les migrations SQL
        logger.info('Exécution des migrations SQL...');
        await executeMigrations();
        logger.info('Migrations SQL exécutées avec succès');

        // Vérifier la connexion à la base de données
        const { data: healthCheck, error: healthError } = await supabase
            .from('health_check')
            .select('*')
            .limit(1);

        if (healthError) {
            logger.error('Erreur lors de la vérification de la connexion:', healthError);
            throw healthError;
        }

        logger.info('Health check table verified successfully');

        // Vérifier et mettre à jour la table users
        await checkAndUpdateUsersTable();

        // Vérifier et mettre à jour la table sessions
        await checkAndUpdateSessionsTable();

        // Vérifier les tables principales
        const tables = ['users', 'sessions', 'conversations', 'messages'];
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('id')
                .limit(1);

            if (error) {
                logger.error(`Erreur lors de la vérification de la table ${table}:`, error);
                throw error;
            }
            logger.info(`Table ${table} vérifiée avec succès`);
        }

        logger.info('Database connection successful');
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error);
        return false;
    }
}

// Exécuter le test
testDatabaseConnection()
    .then(success => {
        if (success) {
            logger.info('Tous les tests de base de données ont réussi');
            process.exit(0);
        } else {
            logger.error('Les tests de base de données ont échoué');
            process.exit(1);
        }
    })
    .catch(error => {
        logger.error('Erreur inattendue:', error);
        process.exit(1);
    }); 