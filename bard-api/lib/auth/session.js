import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db';
import { logger } from '../utils/logger';

// Fonction pour créer la table sessions si elle n'existe pas
async function ensureSessionsTable() {
    try {
        // Vérifier si la table existe déjà
        const { data: existingTable, error: checkError } = await supabase
            .from('sessions')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === '42P01') {
            // La table n'existe pas, la créer
            const { error: createError } = await supabase.rpc('create_sessions_table');
            
            if (createError) {
                logger.error('Error creating sessions table:', createError);
                throw createError;
            }
            
            logger.info('Sessions table created successfully');
        }
    } catch (error) {
        logger.error('Failed to ensure sessions table:', error);
        throw error;
    }
}

export const createSession = async (userId = 'anonymous') => {
    try {
        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

        // Utiliser une fonction RPC pour contourner la RLS
        const { data, error } = await supabase.rpc('create_session', {
            session_id: sessionId,
                    user_id: userId,
                    expires_at: expiresAt.toISOString()
        });

        if (error) {
            logger.error('Error creating session:', error);
            throw error;
        }

        logger.info('Session created successfully:', { sessionId, userId });
        return sessionId;
    } catch (error) {
        logger.error('Failed to create session:', error);
        throw error;
    }
};

export const validateSession = async (sessionId) => {
    try {
        // Utiliser une fonction RPC pour contourner la RLS
        const { data, error } = await supabase.rpc('validate_session', {
            session_id: sessionId
        });

        if (error) {
            logger.error('Error validating session:', error);
            return null;
        }

        return data;
    } catch (error) {
        logger.error('Failed to validate session:', error);
        return null;
    }
};

export const deleteSession = async (sessionId) => {
    try {
        // Utiliser une fonction RPC pour contourner la RLS
        const { error } = await supabase.rpc('delete_session', {
            session_id: sessionId
        });

        if (error) {
            logger.error('Error deleting session:', error);
            throw error;
        }
        
        logger.info('Session deleted successfully:', { sessionId });
    } catch (error) {
        logger.error('Failed to delete session:', error);
        throw error;
    }
}; 