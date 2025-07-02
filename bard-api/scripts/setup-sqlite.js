import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupSQLiteDatabase() {
    try {
        console.log('Création de la base de données SQLite...');
        
        // Créer la base de données SQLite
        const dbPath = join(__dirname, '..', 'database.sqlite');
        const db = new Database(dbPath);
        
        console.log('Création des tables...');
        
        // Créer la table partners
        const createPartnersTable = `
            CREATE TABLE IF NOT EXISTS partners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                website TEXT NOT NULL,
                city TEXT NOT NULL,
                country TEXT NOT NULL DEFAULT 'Maroc',
                latitude REAL,
                longitude REAL,
                product_types TEXT NOT NULL, -- JSON array as text
                price_range_min INTEGER NOT NULL DEFAULT 0,
                price_range_max INTEGER NOT NULL DEFAULT 999999,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        db.exec(createPartnersTable);
        
        // Créer les index
        const createIndexes = `
            CREATE INDEX IF NOT EXISTS idx_partners_city ON partners(city);
            CREATE INDEX IF NOT EXISTS idx_partners_price_range ON partners(price_range_min, price_range_max);
            CREATE INDEX IF NOT EXISTS idx_partners_country ON partners(country);
        `;
        
        db.exec(createIndexes);
        
        // Insérer des données d'exemple
        console.log('Insertion des données d\'exemple...');
        
        const insertPartner = db.prepare(`
            INSERT OR REPLACE INTO partners (
                name, website, city, country, latitude, longitude, 
                product_types, price_range_min, price_range_max, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const partners = [
            {
                name: 'Electroplanet',
                website: 'https://www.electroplanet.ma',
                city: 'Meknès',
                country: 'Maroc',
                latitude: 33.855043,
                longitude: -5.580378,
                product_types: JSON.stringify([
                    'gros électroménager',
                    'image et son',
                    'petit électroménager',
                    'multimédia',
                    'confort de la maison',
                    'accessoires'
                ]),
                price_range_min: 99,
                price_range_max: 14499,
                description: 'Boutique d’électroménager et électronique grand public, filiale de Marjane à Meknès'
            },
            {
                name: 'Intervalle Déco',
                website: 'https://intervalledeco.ma',
                city: 'Casablanca',
                country: 'Maroc',
                latitude: 33.589886,
                longitude: -7.603869,
                product_types: JSON.stringify([
                    'artisanat',
                    'vaisselle traditionnelle',
                    'verrerie Beldi',
                    'luminaires',
                    'ustensiles en bois',
                    'cuivre martelé'
                ]),
                price_range_min: 85,
                price_range_max: 169,
                description: 'Artisanat marocain fait main pour la maison et la cuisine'
            },
            {
                name: 'RAZANA',
                website: 'https://razana.com',
                city: 'Casablanca',
                country: 'Maroc',
                latitude: 33.5852893,
                longitude: -7.6334633,
                product_types: JSON.stringify([
                    'robes',
                    'chemises',
                    'pantalons',
                    'ensembles',
                    'manteaux'
                ]),
                price_range_min: 199,
                price_range_max: 728,
                description: 'Marque marocaine de prêt‑à‑porter féminin avant‑gardiste'
            },
            {
                name: 'MYKONOS',
                website: 'https://mykonos.ma',
                city: 'Casablanca',
                country: 'Maroc',
                latitude: 33.587000,
                longitude: -7.617000,
                product_types: JSON.stringify([
                    'Greek Kebabs',
                    'salades',
                    'mezze',
                    'wraps'
                ]),
                price_range_min: 24,
                price_range_max: 249,
                description: 'Restaurant grec à Casablanca avec commande en ligne et livraison'
            },
            {
                name: 'Arwa Shop',
                website: 'https://arwa-shop.com',
                city: 'Casablanca',
                country: 'Maroc',
                latitude: 33.582514,
                longitude: -7.637822,
                product_types: JSON.stringify([
                    'robes',
                    'chemises',
                    'blouses',
                    'accessoires'
                ]),
                price_range_min: 169,
                price_range_max: 319,
                description: 'Boutique de mode féminine en ligne à Casablanca'
            },
            {
                name: 'Mojaa',
                website: 'https://ma.mojaa.com',
                city: 'Casablanca',
                country: 'Maroc',
                latitude: 33.583460,
                longitude: -7.633600,
                product_types: JSON.stringify([
                    'T-shirts',
                    'polos',
                    'chemises',
                    'sweats',
                    'vestes',
                    'pantalons',
                    'chaussures',
                    'accessoires'
                ]),
                price_range_min: 500,
                price_range_max: 2600,
                description: 'Plateforme multimarque mode & sport (hommes et femmes), livraison gratuite dès 499 MAD'
            },
            {
                name: 'STREETAN®',
                website: 'https://streetan.co',
                city: 'Casablanca',
                country: 'Maroc',
                latitude: 33.606990,
                longitude: -7.620640,
                product_types: JSON.stringify([
                    'hoodies',
                    't-shirts oversize',
                    'chemises',
                    'vestes',
                    'denim',
                    'accessoires'
                ]),
                price_range_min: 299,
                price_range_max: 1499,
                description: 'Marque marocaine de streetwear minimaliste et durable en éditions limitées'
            }
        ];
        
        for (const partner of partners) {
            insertPartner.run(
                partner.name,
                partner.website,
                partner.city,
                partner.country,
                partner.latitude,
                partner.longitude,
                partner.product_types,
                partner.price_range_min,
                partner.price_range_max,
                partner.description
            );
        }
        
        // Créer la table conversations si elle n'existe pas
        const createConversationsTable = `
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        db.exec(createConversationsTable);
        
        // Créer la table messages si elle n'existe pas
        const createMessagesTable = `
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            );
        `;
        
        db.exec(createMessagesTable);
        
        db.close();
        
        console.log('✅ Base de données SQLite créée avec succès!');
        console.log('✅ Tables partners, conversations et messages créées!');
        console.log(`✅ ${partners.length} partenaires d'exemple insérés!`);
        console.log(`📁 Base de données: ${dbPath}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la base de données:', error.message);
        throw error;
    }
}

// Exécuter le script
setupSQLiteDatabase()
    .then(() => {
        console.log('🎉 Configuration SQLite terminée!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Erreur fatale:', error);
        process.exit(1);
    });