import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement avec priorité
const envFiles = [
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../.env.development'),
    path.join(__dirname, '../../.env.production')
];

// Fonction pour vérifier si un fichier existe
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

// Fonction pour lire le contenu d'un fichier
function readEnvFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        logger.warn(`Could not read file: ${filePath}`, error);
        return null;
    }
}

// Fonction pour parser les variables d'environnement
function parseEnvFile(content) {
    if (!content) return {};
    
    const env = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
        // Ignorer les commentaires et les lignes vides
        if (line.startsWith('#') || !line.trim()) continue;
        
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            
            // Supprimer les guillemets si présents
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            
            env[key] = value;
        }
    }
    
    return env;
}

// Charger chaque fichier .env dans l'ordre
let envLoaded = false;
let envVars = {};

envFiles.forEach(envFile => {
    if (fileExists(envFile)) {
        const content = readEnvFile(envFile);
        if (content) {
            const parsedEnv = parseEnvFile(content);
            envVars = { ...envVars, ...parsedEnv };
            logger.info(`Loaded environment from: ${envFile}`);
            envLoaded = true;
        }
    } else {
        logger.warn(`Environment file not found: ${envFile}`);
    }
});

if (!envLoaded) {
    logger.error('No environment files were loaded successfully');
    process.exit(1);
}

// Appliquer les variables d'environnement
Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
});

// Configuration Supabase avec validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Log des variables d'environnement (masquées pour la sécurité)
logger.info('Environment variables status:', {
    SUPABASE_URL: supabaseUrl ? '✓ Set' : '✗ Missing',
    SUPABASE_ANON_KEY: supabaseAnonKey ? '✓ Set' : '✗ Missing',
    SUPABASE_SERVICE_KEY: supabaseServiceKey ? '✓ Set' : '✗ Missing'
});

// Fonction de validation des variables d'environnement
function validateEnvVariables() {
    const requiredVars = {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey,
        SUPABASE_SERVICE_KEY: supabaseServiceKey
    };

    const missingVars = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingVars.length > 0) {
        const error = new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        logger.error('Environment validation failed:', error);
        throw error;
    }

    // Validation du format de l'URL Supabase
    try {
        new URL(supabaseUrl);
    } catch (error) {
        const err = new Error('Invalid SUPABASE_URL format');
        logger.error('URL validation failed:', err);
        throw err;
    }

    // Validation de la clé Supabase
    if (!supabaseAnonKey.startsWith('eyJ')) {
        const err = new Error('Invalid SUPABASE_ANON_KEY format');
        logger.error('Key validation failed:', err);
        throw err;
    }

    logger.info('Environment variables validated successfully');
}

// Créer le client Supabase avec gestion d'erreur
let supabase;
try {
    validateEnvVariables();
    const key = supabaseServiceKey || supabaseAnonKey;
    supabase = createClient(supabaseUrl, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        },
        global: {
            headers: {
                'x-application-name': 'bard-api'
            }
        }
    });
    logger.info('Supabase client initialized successfully');
} catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    process.exit(1);
}

// Fonction pour créer la table health_check
async function createHealthCheckTable() {
    try {
        // Vérifier si la table existe déjà
        const { data: existingTable, error: checkError } = await supabase
            .from('health_check')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === '42P01') {
            // La table n'existe pas, la créer
            const { error: createError } = await supabase
                .from('health_check')
                .insert([
                    {
                        status: 'ok',
                        last_check: new Date().toISOString()
                    }
                ]);

            if (createError) {
                // Si l'insertion échoue, essayer de créer la table
                const { error: tableError } = await supabase
                    .from('health_check')
                    .select('*')
                    .limit(1);

                if (tableError) {
                    throw tableError;
                }
            }
        }

        logger.info('Health check table verified successfully');
        return true;
    } catch (error) {
        logger.error('Failed to create/verify health check table:', error);
        return false;
    }
}

// Fonction de vérification de santé avec retry
async function checkHealth(retries = 3, delay = 1000) {
    // D'abord, créer la table health_check si elle n'existe pas
    await createHealthCheckTable();
    
    for (let i = 0; i < retries; i++) {
        try {
            const { data, error } = await supabase.from('health_check').select('*').limit(1);
            if (error) throw error;
            logger.info('Database health check successful');
            return true;
        } catch (error) {
            logger.error(`Health check attempt ${i + 1} failed:`, error);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    logger.error('All health check attempts failed');
    return false;
}

// Test de la connexion avec retry et backoff exponentiel
async function connectWithRetry(maxRetries = 5, initialDelay = 1000) {
    // D'abord, créer la table health_check si elle n'existe pas
    await createHealthCheckTable();
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const { data, error } = await supabase.from('health_check').select('*').limit(1);
            if (error) throw error;
            logger.info('Database connection successful');
            return true;
        } catch (error) {
            const delay = initialDelay * Math.pow(2, i);
            logger.error(`Connection attempt ${i + 1} failed:`, error);
            if (i < maxRetries - 1) {
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    logger.error('All connection attempts failed');
    process.exit(1);
}

// Initialisation de la connexion
connectWithRetry().catch(error => {
    logger.error('Failed to initialize database connection:', error);
    process.exit(1);
});

// Fonction pour vérifier la connexion à la base de données
export const checkDatabaseConnection = async () => {
    try {
        // Tester la connexion en faisant une requête simple
        const { data, error } = await supabase
            .from('health_check')
            .select('id')
            .limit(1);

        if (error) {
            logger.error('Database connection error:', error);
            return false;
        }

        logger.info('Health check table verified successfully');
        return true;
    } catch (error) {
        logger.error('Database connection check failed:', error);
        return false;
    }
};

// Exporter une fonction pour obtenir une connexion à la base de données
export const getDatabase = async () => {
    try {
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }
        logger.info('Database connection successful');
        return supabase;
    } catch (error) {
        logger.error('Failed to get database connection:', error);
        throw error;
    }
};

// Export des fonctionnalités
export { supabase, checkHealth, connectWithRetry };
export default {
    checkHealth,
    connectWithRetry
}; 