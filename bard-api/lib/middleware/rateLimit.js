import { supabase } from '../db/index.js';
import { logger } from '../utils/logger.js';

const WINDOW_SIZE = 60; // 1 minute
const MAX_REQUESTS = 60; // 60 requêtes par minute

/**
 * Middleware de rate limiting
 * @param {Request} request - La requête HTTP
 * @returns {Promise<{success: boolean, message?: string}>} - Résultat du rate limiting
 */
export const rateLimit = async (request) => {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
        const key = `ratelimit:${ip}`;
        
        // Vérifier les tentatives existantes dans la table rate_limits
        const { data: existingLimit, error: checkError } = await supabase
            .from('rate_limits')
            .select('*')
            .eq('ip', ip)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        const now = new Date();
        let current = 0;

        if (existingLimit) {
            // Vérifier si la fenêtre de temps est expirée
            const lastReset = new Date(existingLimit.last_reset);
            if (now - lastReset > WINDOW_SIZE * 1000) {
                // Réinitialiser le compteur si la fenêtre est expirée
                current = 1;
                await supabase
                    .from('rate_limits')
                    .update({
                        count: 1,
                        last_reset: now.toISOString()
                    })
                    .eq('ip', ip);
            } else {
                current = existingLimit.count + 1;
                // Mettre à jour le compteur
                await supabase
                    .from('rate_limits')
                    .update({
                        count: current,
                        last_reset: now.toISOString()
                    })
                    .eq('ip', ip);
            }
        } else {
            // Créer une nouvelle entrée
            current = 1;
            await supabase
                .from('rate_limits')
                .insert([
                    {
                        ip,
                        count: 1,
                        last_reset: now.toISOString()
                    }
                ]);
        }

        if (current > MAX_REQUESTS) {
            logger.warn(`Rate limit exceeded for IP: ${ip}`);
            return {
                success: false,
                message: 'Too many requests, please try again later'
            };
        }

        return { success: true };
    } catch (error) {
        logger.error('Error in rate limiting:', error);
        // En cas d'erreur, on autorise la requête pour ne pas bloquer le service
        return { success: true };
    }
}; 