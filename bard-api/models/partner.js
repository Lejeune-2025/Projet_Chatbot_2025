import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../lib/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

let db = null;

function getDatabase() {
    if (!db) {
        db = new Database(dbPath);
    }
    return db;
}

class Partner {
    static create({ name, website, city, country, latitude, longitude, productTypes, priceRangeMin, priceRangeMax, description }) {
        try {
            const database = getDatabase();
            const stmt = database.prepare(`
                INSERT INTO partners (name, website, city, country, latitude, longitude, product_types, price_range_min, price_range_max, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                name,
                website,
                city,
                country,
                latitude,
                longitude,
                JSON.stringify(productTypes),
                priceRangeMin,
                priceRangeMax,
                description
            );

            // Récupérer l'enregistrement créé
            const selectStmt = database.prepare('SELECT * FROM partners WHERE id = ?');
            return selectStmt.get(result.lastInsertRowid);
        } catch (error) {
            logger.error('Error creating partner:', error);
            throw error;
        }
    }

    static findAll() {
        try {
            const database = getDatabase();
            const stmt = database.prepare(
                `SELECT id, name, website, city, country, latitude, longitude, product_types, price_range_min, price_range_max, description
                 FROM partners
                 ORDER BY name`
            );
            return stmt.all();
        } catch (error) {
            logger.error('Error finding all partners:', error);
            throw error;
        }
    }

    static searchPartners({ productType, budgetMin, budgetMax, city, country }) {
        try {
            let query = `
                SELECT id, name, website, city, country, latitude, longitude, product_types, price_range_min, price_range_max, description
                FROM partners
                WHERE 1=1
            `;
            const params = [];

            // Filtrer par type de produit
            if (productType) {
                query += ` AND product_types LIKE ?`;
                params.push(`%"${productType.toLowerCase()}"%`);
            }

            // Filtrer par budget (chevauchement des fourchettes)
            if (budgetMin !== undefined && budgetMax !== undefined) {
                query += ` AND NOT (price_range_max < ? OR price_range_min > ?)`;
                params.push(budgetMin, budgetMax);
            }

            // Filtrer par ville
            if (city) {
                query += ` AND LOWER(city) = LOWER(?)`;
                params.push(city);
            }

            // Filtrer par pays
            if (country) {
                query += ` AND LOWER(country) = LOWER(?)`;
                params.push(country);
            }

            query += ` ORDER BY name`;

            const database = getDatabase();
            const stmt = database.prepare(query);
            return stmt.all(...params);
        } catch (error) {
            logger.error('Error searching partners:', error);
            throw error;
        }
    }

    static findById(id) {
        try {
            const database = getDatabase();
            const stmt = database.prepare(
                `SELECT id, name, website, city, country, latitude, longitude, product_types, price_range_min, price_range_max, description
                 FROM partners
                 WHERE id = ?`
            );
            return stmt.get(id) || null;
        } catch (error) {
            logger.error('Error finding partner by id:', error);
            throw error;
        }
    }

    static updatePartner(id, { name, website, city, country, latitude, longitude, productTypes, priceRangeMin, priceRangeMax, description }) {
        try {
            const database = getDatabase();
            const stmt = database.prepare(
                `UPDATE partners
                 SET name = COALESCE(?, name),
                     website = COALESCE(?, website),
                     city = COALESCE(?, city),
                     country = COALESCE(?, country),
                     latitude = COALESCE(?, latitude),
                     longitude = COALESCE(?, longitude),
                     product_types = COALESCE(?, product_types),
                     price_range_min = COALESCE(?, price_range_min),
                     price_range_max = COALESCE(?, price_range_max),
                     description = COALESCE(?, description),
                     updated_at = datetime('now')
                 WHERE id = ?`
            );

            const productTypesJson = productTypes ? JSON.stringify(productTypes) : null;
            stmt.run(name, website, city, country, latitude, longitude, productTypesJson, priceRangeMin, priceRangeMax, description, id);

            // Récupérer l'enregistrement mis à jour
            const selectStmt = database.prepare('SELECT * FROM partners WHERE id = ?');
            return selectStmt.get(id);
        } catch (error) {
            logger.error('Error updating partner:', error);
            throw error;
        }
    }

    static deletePartner(id) {
        try {
            const database = getDatabase();
            
            // Récupérer l'enregistrement avant suppression
            const selectStmt = database.prepare('SELECT * FROM partners WHERE id = ?');
            const partner = selectStmt.get(id);
            
            if (partner) {
                const deleteStmt = database.prepare('DELETE FROM partners WHERE id = ?');
                deleteStmt.run(id);
            }
            
            return partner || null;
        } catch (error) {
            logger.error('Error deleting partner:', error);
            throw error;
        }
    }

    static getProductTypes() {
        try {
            const database = getDatabase();
            const stmt = database.prepare('SELECT DISTINCT product_types FROM partners');
            const rows = stmt.all();
            
            const productTypes = new Set();
            rows.forEach(row => {
                try {
                    const types = JSON.parse(row.product_types);
                    types.forEach(type => productTypes.add(type));
                } catch (e) {
                    logger.warn('Invalid JSON in product_types:', row.product_types);
                }
            });
            
            return Array.from(productTypes).sort();
        } catch (error) {
            logger.error('Error getting product types:', error);
            throw error;
        }
    }

    static getCities() {
        try {
            const database = getDatabase();
            const stmt = database.prepare(
                `SELECT DISTINCT city, country
                 FROM partners
                 ORDER BY country, city`
            );
            return stmt.all();
        } catch (error) {
            logger.error('Error getting cities:', error);
            throw error;
        }
    }
}

export default Partner;