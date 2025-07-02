import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Table de suivi des migrations
const createMigrationsTable = `
    CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`;

// Fonction pour appliquer une migration
async function applyMigration(name, sql) {
    const client = await db.connect();
    try {
        await client.tx(async t => {
            // Vérifier si la migration a déjà été appliquée
            const exists = await t.oneOrNone(
                'SELECT id FROM migrations WHERE name = $1',
                [name]
            );

            if (!exists) {
                // Appliquer la migration
                await t.none(sql);
                // Enregistrer la migration
                await t.none(
                    'INSERT INTO migrations (name) VALUES ($1)',
                    [name]
                );
                logger.info(`Migration applied: ${name}`);
            }
        });
    } catch (error) {
        logger.error(`Error applying migration ${name}:`, error);
        throw error;
    } finally {
        client.done();
    }
}

// Fonction pour exécuter toutes les migrations
async function runMigrations() {
    try {
        // Créer la table de migrations si elle n'existe pas
        await db.none(createMigrationsTable);

        // Lire le répertoire des migrations
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        // Appliquer chaque migration
        for (const file of files) {
            const name = path.basename(file, '.sql');
            const sql = fs.readFileSync(
                path.join(migrationsDir, file),
                'utf8'
            );
            await applyMigration(name, sql);
        }

        logger.info('All migrations completed successfully');
    } catch (error) {
        logger.error('Error running migrations:', error);
        throw error;
    }
}

// Fonction pour créer une nouvelle migration
function createMigration(name) {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const filename = `${timestamp}_${name}.sql`;
    const migrationsDir = path.join(__dirname, 'migrations');

    // Créer le répertoire des migrations s'il n'existe pas
    if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Créer le fichier de migration
    const filepath = path.join(migrationsDir, filename);
    fs.writeFileSync(filepath, '-- Migration SQL\n\n');

    logger.info(`Created migration file: ${filename}`);
    return filename;
}

// Fonction pour vérifier si une fonction existe
async function functionExists(functionName) {
    try {
        // Essayer d'exécuter la fonction avec une requête simple
        const { error } = await supabase.rpc(functionName, { sql: 'SELECT 1;' });
        // Si nous obtenons une erreur de type "function does not exist", la fonction n'existe pas
        // Si nous obtenons une autre erreur, la fonction existe mais a échoué (ce qui est OK pour notre test)
        return error?.message?.includes('does not exist') ? false : true;
    } catch (error) {
        logger.error(`Erreur lors de la vérification de la fonction ${functionName}:`, error);
        return false;
    }
}

// Fonction pour créer une table si elle n'existe pas
async function createTableIfNotExists(tableName, columns) {
    try {
        // Vérifier si la table existe
        const { data, error } = await supabase
            .from(tableName)
            .select('id')
            .limit(1);

        if (error && error.code === '42P01') { // Table n'existe pas
            logger.info(`Création de la table ${tableName}...`);
            
            // Créer la table avec les colonnes spécifiées
            const { error: createError } = await supabase.rpc('create_table', {
                table_name: tableName,
                columns: columns
            });

            if (createError) {
                throw createError;
            }
            
            logger.info(`Table ${tableName} créée avec succès`);
        } else if (error) {
            throw error;
        } else {
            logger.info(`Table ${tableName} existe déjà`);
        }
    } catch (error) {
        logger.error(`Erreur lors de la création de la table ${tableName}:`, error);
        throw error;
    }
}

// Fonction pour exécuter les migrations
export async function executeMigrations() {
    try {
        // Définition des tables et leurs colonnes
        const tables = {
            users: [
                { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
                { name: 'email', type: 'text', unique: true, not_null: true },
                { name: 'password_hash', type: 'text' },
                { name: 'role', type: 'text', default: "'user'" },
                { name: 'status', type: 'text', default: "'active'" },
                { name: 'created_at', type: 'timestamp with time zone', default: 'now()' },
                { name: 'updated_at', type: 'timestamp with time zone', default: 'now()' },
                { name: 'device_info', type: 'jsonb', default: "'{}'::jsonb" }
            ],
            sessions: [
                { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
                { name: 'user_id', type: 'uuid', references: 'users(id)' },
                { name: 'token', type: 'text', not_null: true },
                { name: 'expires_at', type: 'timestamp with time zone', not_null: true },
                { name: 'created_at', type: 'timestamp with time zone', default: 'now()' },
                { name: 'device_info', type: 'jsonb', default: "'{}'::jsonb" }
            ],
            conversations: [
                { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
                { name: 'user_id', type: 'uuid', references: 'users(id)' },
                { name: 'status', type: 'text', default: "'active'" },
                { name: 'created_at', type: 'timestamp with time zone', default: 'now()' }
            ],
            messages: [
                { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
                { name: 'conversation_id', type: 'uuid', references: 'conversations(id)' },
                { name: 'content', type: 'text', not_null: true },
                { name: 'sender_type', type: 'text', not_null: true },
                { name: 'created_at', type: 'timestamp with time zone', default: 'now()' }
            ],
            rate_limits: [
                { name: 'id', type: 'uuid', primary: true, default: 'uuid_generate_v4()' },
                { name: 'ip', type: 'varchar(45)', not_null: true },
                { name: 'count', type: 'integer', default: 1 },
                { name: 'last_reset', type: 'timestamp with time zone', default: 'now()' },
                { name: 'created_at', type: 'timestamp with time zone', default: 'now()' },
                { name: 'updated_at', type: 'timestamp with time zone', default: 'now()' }
            ]
        };

        // Créer chaque table
        for (const [tableName, columns] of Object.entries(tables)) {
            await createTableIfNotExists(tableName, columns);
        }

        logger.info('Migrations terminées avec succès');
        return true;
    } catch (error) {
        logger.error('Erreur lors des migrations:', error);
        throw error;
    }
}

// Fonction pour vérifier et mettre à jour la table users
export async function checkAndUpdateUsersTable() {
    try {
        logger.info('Début de la vérification de la table users...');
        
        // Vérifier la structure de la table
        const { data: tableInfo, error: tableError } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (tableError) {
            logger.error('Erreur lors de la récupération des informations de la table users:', {
                error: tableError,
                code: tableError.code,
                message: tableError.message,
                details: tableError.details
            });
            throw tableError;
        }

        logger.info('Structure de la table users récupérée:', {
            columns: tableInfo.length > 0 ? Object.keys(tableInfo[0]) : [],
            sample: tableInfo[0]
        });

        if (tableInfo.length === 0) {
            logger.warn('La table users est vide, création d\'un utilisateur de test...');
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        email: 'test@example.com',
                        role: 'user',
                        status: 'active',
                        device_info: '{}'
                    }
                ])
                .select()
                .single();

            if (insertError) {
                logger.error('Erreur lors de la création de l\'utilisateur de test:', {
                    error: insertError,
                    code: insertError.code,
                    message: insertError.message,
                    details: insertError.details
                });
                throw insertError;
            }

            logger.info('Utilisateur de test créé avec succès:', newUser);
            return true;
        }

        const user = tableInfo[0];
        logger.info('Vérification des colonnes requises...', {
            hasDeviceInfo: 'device_info' in user,
            hasPasswordHash: 'password_hash' in user,
            hasRole: 'role' in user,
            hasStatus: 'status' in user
        });

        // Vérifier si les colonnes nécessaires existent
        const hasDeviceInfo = 'device_info' in user;
        const hasPasswordHash = 'password_hash' in user;
        const hasRole = 'role' in user;
        const hasStatus = 'status' in user;

        // Ajouter les colonnes manquantes si nécessaire
        if (!hasDeviceInfo || !hasPasswordHash || !hasRole || !hasStatus) {
            logger.info('Mise à jour des colonnes manquantes...');
            const updates = {};
            if (!hasDeviceInfo) updates.device_info = '{}';
            if (!hasPasswordHash) updates.password_hash = null;
            if (!hasRole) updates.role = 'user';
            if (!hasStatus) updates.status = 'active';

            logger.info('Mise à jour avec les valeurs:', updates);

            const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);

            if (updateError) {
                logger.error('Erreur lors de la mise à jour de la table users:', {
                    error: updateError,
                    code: updateError.code,
                    message: updateError.message,
                    details: updateError.details,
                    updates
                });
                throw updateError;
            }

            logger.info('Mise à jour de la table users réussie');
        } else {
            logger.info('Toutes les colonnes requises sont présentes');
        }

        return true;
    } catch (error) {
        logger.error('Erreur détaillée lors de la vérification de la table users:', {
            name: error.name,
            message: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack
        });
        throw error;
    }
}

// Fonction pour vérifier et mettre à jour la table sessions
export async function checkAndUpdateSessionsTable() {
    try {
        const { data: columns, error } = await supabase
            .from('sessions')
            .select('*')
            .limit(1);

        if (error) {
            throw error;
        }

        // Vérifier si la colonne device_info existe
        const hasDeviceInfo = 'device_info' in columns[0];

        // Ajouter la colonne si nécessaire
        if (!hasDeviceInfo) {
            const { error: updateError } = await supabase
                .from('sessions')
                .update({ device_info: '{}' })
                .eq('id', columns[0].id);

            if (updateError) {
                throw updateError;
            }
        }

        return true;
    } catch (error) {
        logger.error('Erreur lors de la vérification de la table sessions:', error);
        throw error;
    }
}

// Fonction pour initialiser toutes les tables
export async function initializeTables() {
    try {
        await executeMigrations();
        await checkAndUpdateUsersTable();
        await checkAndUpdateSessionsTable();
        logger.info('Toutes les tables ont été initialisées avec succès');
        return true;
    } catch (error) {
        logger.error('Erreur lors de l\'initialisation des tables:', error);
        throw error;
    }
}

// Exécuter les migrations si le script est appelé directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv[2] === 'create' && process.argv[3]) {
        createMigration(process.argv[3]);
    } else {
        runMigrations()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    }
}

export default {
    runMigrations,
    createMigration
}; 