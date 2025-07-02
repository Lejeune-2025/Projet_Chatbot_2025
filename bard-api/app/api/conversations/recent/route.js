import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import { validateId } from '@/lib/db/validation';

// Configuration CORS
const getCorsHeaders = (origin) => {
    const allowedOrigins = [
        'http://localhost:8081',  // Développement local
        'http://localhost:3000',  // Next.js local
        'https://yonetwork.com',  // Production
        'https://app.yonetwork.com' // App mobile en production
    ];

    const isAllowedOrigin = allowedOrigins.includes(origin) || 
        (process.env.NODE_ENV === 'development' && origin);

    return {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
    };
};

export async function OPTIONS(request) {
    const origin = request.headers.get('origin');
    return NextResponse.json({}, { headers: getCorsHeaders(origin) });
}

export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    const origin = request.headers.get('origin');
    
    logger.info(`[${requestId}] === Nouvelle requête GET /api/conversations/recent ===`);
    
    try {
        // Récupérer les paramètres de requête
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Validation des paramètres
        if (!userId) {
            logger.warn(`[${requestId}] userId manquant`);
            return NextResponse.json(
                { error: "userId est requis" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 50) {
            logger.warn(`[${requestId}] Paramètres de pagination invalides`);
            return NextResponse.json(
                { error: "Paramètres de pagination invalides" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Récupérer les conversations récentes avec le dernier message
        const { data: conversations, error: conversationsError, count } = await supabase
            .from('conversations')
            .select(`
                id,
                created_at,
                status,
                messages:messages(
                    id,
                    content,
                    sender_type,
                    created_at
                )
            `, { count: 'exact' })
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (conversationsError) {
            logger.error(`[${requestId}] Erreur lors de la récupération des conversations:`, conversationsError);
            throw conversationsError;
        }

        // Transformer les données pour le format de réponse
        const formattedConversations = conversations.map(conv => {
            // Trier les messages par date pour obtenir le dernier
            const messages = conv.messages || [];
            
            // Trier les messages par date (du plus ancien au plus récent)
            const sortedMessages = messages.sort((a, b) => 
                new Date(a.created_at) - new Date(b.created_at)
            );
            
            const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : null;
            
            // Générer un titre à partir du premier message de l'utilisateur dans la conversation
            let title = "Nouvelle conversation";
            if (sortedMessages.length > 0) {
                // Chercher le premier message envoyé par l'utilisateur
                const firstUserMessage = sortedMessages.find(msg => msg.sender_type === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    // Utiliser les premiers 30 caractères comme titre
                    title = firstUserMessage.content.length > 30 
                        ? firstUserMessage.content.substring(0, 30) + '...' 
                        : firstUserMessage.content;
                }
            }

            return {
                id: conv.id,
                createdAt: conv.created_at,
                status: conv.status,
                title: title,
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    senderType: lastMessage.sender_type,
                    createdAt: lastMessage.created_at
                } : null
            };
        });

        logger.info(`[${requestId}] Conversations récupérées avec succès:`, {
            count: formattedConversations.length,
            total: count,
            page,
            limit
        });

        return NextResponse.json({
            conversations: formattedConversations,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        }, { headers: getCorsHeaders(origin) });

    } catch (error) {
        logger.error(`[${requestId}] Erreur lors du traitement de la requête:`, {
            error: error.message,
            stack: error.stack,
            code: error.code
        });

        return NextResponse.json(
            { 
                error: "Erreur lors de la récupération des conversations",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500, headers: getCorsHeaders(origin) }
        );
    }
} 