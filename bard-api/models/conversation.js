
import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../lib/utils/logger';
import { compressMessage, decompressMessage } from '../lib/utils/compression';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

class Conversation {
    static create(userId) {
        try {
            const stmt = db.prepare(`
                INSERT INTO conversations (user_id, status, start_time)
                VALUES (?, 'active', datetime('now'))
            `);
            const result = stmt.run(userId);
            
            // Récupérer la conversation créée
            const getStmt = db.prepare(`
                SELECT id, user_id, status, start_time
                FROM conversations
                WHERE id = ?
            `);
            return getStmt.get(result.lastInsertRowid);
        } catch (error) {
            logger.error('Error creating conversation:', error);
            throw error;
        }
    }

    static findById(id) {
        try {
            const stmt = db.prepare(`
                SELECT id, user_id, status, start_time, end_time, metadata
                FROM conversations
                WHERE id = ?
            `);
            return stmt.get(id);
        } catch (error) {
            logger.error('Error finding conversation:', error);
            throw error;
        }
    }

    static findByUserId(userId) {
        try {
            const stmt = db.prepare(`
                SELECT c.id, c.status, c.start_time, c.end_time,
                       COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                WHERE c.user_id = ?
                GROUP BY c.id
                ORDER BY c.start_time DESC
            `);
            return stmt.all(userId);
        } catch (error) {
            logger.error('Error finding user conversations:', error);
            throw error;
        }
    }

    static updateStatus(id, status) {
        try {
            const stmt = db.prepare(`
                UPDATE conversations
                SET status = ?,
                    end_time = CASE WHEN ? = 'closed' THEN datetime('now') ELSE end_time END
                WHERE id = ?
            `);
            stmt.run(status, status, id);
            
            // Récupérer la conversation mise à jour
            const getStmt = db.prepare(`
                SELECT id, status, end_time
                FROM conversations
                WHERE id = ?
            `);
            return getStmt.get(id);
        } catch (error) {
            logger.error('Error updating conversation status:', error);
            throw error;
        }
    }

    static async addMessage(conversationId, content, senderType) {
        try {
            // Compresser le message avant de le stocker
            const compressedContent = await compressMessage(content);
            
            const stmt = db.prepare(`
                INSERT INTO messages (conversation_id, content, sender_type, timestamp)
                VALUES (?, ?, ?, datetime('now'))
            `);
            const result = stmt.run(conversationId, compressedContent, senderType);
            
            // Récupérer le message créé
            const getStmt = db.prepare(`
                SELECT id, content, sender_type, timestamp
                FROM messages
                WHERE id = ?
            `);
            return getStmt.get(result.lastInsertRowid);
        } catch (error) {
            logger.error('Error adding message:', error);
            throw error;
        }
    }

    static async getMessages(conversationId, page = 1, limit = 50) {
        try {
            const offset = (page - 1) * limit;
            
            const countStmt = db.prepare(`
                SELECT COUNT(*) as total
                FROM messages
                WHERE conversation_id = ?
            `);
            const totalCount = countStmt.get(conversationId);

            const messagesStmt = db.prepare(`
                SELECT id, content, sender_type, timestamp
                FROM messages
                WHERE conversation_id = ?
                ORDER BY timestamp ASC
                LIMIT ? OFFSET ?
            `);
            const messages = messagesStmt.all(conversationId, limit, offset);

            // Décompresser les messages
            const decompressedMessages = await Promise.all(
                messages.map(async (message) => ({
                    ...message,
                    content: await decompressMessage(message.content)
                }))
            );

            return {
                messages: decompressedMessages,
                pagination: {
                    total: parseInt(totalCount.total),
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount.total / limit)
                }
            };
        } catch (error) {
            logger.error('Error getting conversation messages:', error);
            throw error;
        }
    }

    static getActiveConversations() {
        try {
            const stmt = db.prepare(`
                SELECT c.id, c.user_id, c.start_time,
                       COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                WHERE c.status = 'active'
                GROUP BY c.id
                ORDER BY c.start_time DESC
            `);
            return stmt.all();
        } catch (error) {
            logger.error('Error getting active conversations:', error);
            throw error;
        }
    }
}

export default Conversation;