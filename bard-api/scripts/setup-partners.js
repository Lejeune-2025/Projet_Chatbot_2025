import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function setupPartnersTable() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'chatbot_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    });

    try {
        console.log('Connexion à la base de données...');
        await client.connect();
        
        console.log('Lecture du fichier SQL...');
        const sqlPath = join(__dirname, 'database', 'create_partners_table.sql');
        const sqlContent = readFileSync(sqlPath, 'utf8');
        
        console.log('Exécution du script SQL...');
        await client.query(sqlContent);
        
        console.log('✅ Table partners créée avec succès!');
        console.log('✅ Données d\'exemple insérées!');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la table:', error.message);
        
        // Si la table existe déjà, on continue
        if (error.message.includes('already exists')) {
            console.log('ℹ️ La table partners existe déjà.');
        } else {
            throw error;
        }
    } finally {
        await client.end();
        console.log('Connexion fermée.');
    }
}

// Exécuter le script
setupPartnersTable()
    .then(() => {
        console.log('🎉 Configuration terminée!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Erreur fatale:', error);
        process.exit(1);
    });