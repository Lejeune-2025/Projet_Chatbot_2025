import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
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
        if (line.startsWith('#') || !line.trim()) continue;
        
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            
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

// Charger les variables d'environnement
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

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Log des variables d'environnement
logger.info('Environment variables status:', {
    SUPABASE_URL: supabaseUrl ? '✓ Set' : '✗ Missing',
    SUPABASE_ANON_KEY: supabaseKey ? '✓ Set' : '✗ Missing'
});

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    },
    db: {
        schema: 'public'
    }
});

// Structure de la base de données
const tables = [
    {
        name: 'sessions',
        sql: `
            -- Supprimer les politiques existantes
            drop policy if exists "Sessions are viewable by the user who created them" on sessions;
            drop policy if exists "Anyone can create anonymous sessions" on sessions;
            drop policy if exists "Users can create their own sessions" on sessions;
            drop policy if exists "Users can update their own sessions" on sessions;
            drop policy if exists "Users can delete their own sessions" on sessions;

            create table if not exists sessions (
                id uuid primary key,
                user_id text not null,
                expires_at timestamp with time zone not null,
                created_at timestamp with time zone default now(),
                updated_at timestamp with time zone default now()
            );
            
            -- Activer RLS
            alter table sessions enable row level security;
            
            -- Politiques RLS
            create policy "Sessions are viewable by the user who created them"
                on sessions for select
                using (auth.uid()::text = user_id or user_id = 'anonymous');
            
            create policy "Anyone can create anonymous sessions"
                on sessions for insert
                with check (user_id = 'anonymous');
            
            create policy "Users can create their own sessions"
                on sessions for insert
                with check (auth.uid()::text = user_id);
            
            create policy "Users can update their own sessions"
                on sessions for update
                using (auth.uid()::text = user_id or user_id = 'anonymous');
            
            create policy "Users can delete their own sessions"
                on sessions for delete
                using (auth.uid()::text = user_id or user_id = 'anonymous');
            
            -- Index
            create index if not exists idx_sessions_user_id on sessions(user_id);
            create index if not exists idx_sessions_expires_at on sessions(expires_at);
        `
    },
    {
        name: 'conversations',
        sql: `
            create table if not exists conversations (
                id uuid default gen_random_uuid() primary key,
                user_id text not null,
                status text not null default 'active',
                start_time timestamp with time zone default now(),
                end_time timestamp with time zone,
                created_at timestamp with time zone default now(),
                updated_at timestamp with time zone default now()
            );
            
            create index if not exists idx_conversations_user_id on conversations(user_id);
            create index if not exists idx_conversations_status on conversations(status);
            create index if not exists idx_conversations_start_time on conversations(start_time);
        `
    },
    {
        name: 'messages',
        sql: `
            create table if not exists messages (
                id uuid default gen_random_uuid() primary key,
                conversation_id uuid references conversations(id) on delete cascade,
                content text not null,
                sender_type text not null,
                timestamp timestamp with time zone default now(),
                created_at timestamp with time zone default now(),
                updated_at timestamp with time zone default now()
            );
            
            create index if not exists idx_messages_conversation_id on messages(conversation_id);
            create index if not exists idx_messages_timestamp on messages(timestamp);
        `
    },
    {
        name: 'knowledge_articles',
        sql: `
            create table if not exists knowledge_articles (
                id uuid default gen_random_uuid() primary key,
                title text not null,
                content text not null,
                category_id uuid,
                tags text[] default '{}',
                created_at timestamp with time zone default now(),
                updated_at timestamp with time zone default now()
            );
            
            create index if not exists idx_knowledge_articles_title_content on knowledge_articles using gin(to_tsvector('french', title || ' ' || content));
            create index if not exists idx_knowledge_articles_tags on knowledge_articles using gin(tags);
        `
    },
    {
        name: 'usage_stats',
        sql: `
            create table if not exists usage_stats (
                id uuid default gen_random_uuid() primary key,
                date date not null,
                total_conversations integer default 0,
                total_messages integer default 0,
                unique_users integer default 0,
                created_at timestamp with time zone default now(),
                updated_at timestamp with time zone default now(),
                unique(date)
            );
            
            create index if not exists idx_usage_stats_date on usage_stats(date);
        `
    }
];

// Fonction pour créer une table
async function createTable(table) {
    try {
        // Exécuter la requête SQL via RPC
        const { error } = await supabase.rpc('exec_sql', { query: table.sql });
        
        if (error) {
            logger.error(`Error creating table ${table.name}:`, {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return false;
        }

        // Vérifier que la table a été créée
        const { data, error: checkError } = await supabase
            .from(table.name)
            .select('id')
            .limit(1);

        if (checkError && checkError.code === '42P01') {
            logger.error(`Table ${table.name} was not created successfully:`, {
                message: checkError.message,
                details: checkError.details,
                hint: checkError.hint,
                code: checkError.code
            });
            return false;
        }

        logger.info(`Table ${table.name} created successfully`);
        return true;
    } catch (error) {
        logger.error(`Failed to create table ${table.name}:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return false;
    }
}

// Fonction d'initialisation
export async function initializeDatabase() {
    try {
        logger.info('Starting database initialization...');

        // Créer chaque table
        for (const table of tables) {
            logger.info(`Creating table: ${table.name}`);
            const success = await createTable(table);
            if (!success) {
                throw new Error(`Failed to create table ${table.name}`);
            }
        }

        logger.info('Database initialization completed successfully');
    } catch (error) {
        logger.error('Database initialization failed:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw error;
    }
}

// Exécuter l'initialisation si le fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeDatabase()
        .then(() => {
            logger.info('Database initialization completed');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Database initialization failed:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            process.exit(1);
        });
} 