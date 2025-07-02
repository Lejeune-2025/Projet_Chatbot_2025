import db from '../lib/db/index';
import { logger } from '../lib/utils/logger';

class User {
    static async create({ email, name, role = 'user' }) {
        try {
            return await db.one(
                `INSERT INTO users (email, name, role)
                 VALUES ($1, $2, $3)
                 RETURNING id, email, name, role, created_at`,
                [email, name, role]
            );
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            return await db.oneOrNone(
                `SELECT id, email, name, role, created_at
                 FROM users
                 WHERE email = $1`,
                [email]
            );
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            return await db.oneOrNone(
                `SELECT id, email, name, role, created_at
                 FROM users
                 WHERE id = $1`,
                [id]
            );
        } catch (error) {
            logger.error('Error finding user by id:', error);
            throw error;
        }
    }

    static async update(id, { name, role }) {
        try {
            return await db.one(
                `UPDATE users
                 SET name = COALESCE($1, name),
                     role = COALESCE($2, role)
                 WHERE id = $3
                 RETURNING id, email, name, role, updated_at`,
                [name, role, id]
            );
        } catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            return await db.result(
                `DELETE FROM users
                 WHERE id = $1`,
                [id]
            );
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }
}

export default User; 