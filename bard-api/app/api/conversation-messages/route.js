import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { logger } from '@/lib/utils/logger';

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
    
    // Récupérer l'ID de conversation depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    
    logger.info(`[${requestId}] === Nouvelle requête GET /api/conversation-messages?id=${conversationId} ===`);
    
    try {
        // Validation de l'ID de conversation
        if (!conversationId) {
            logger.warn(`[${requestId}] ID de conversation manquant`);
            return NextResponse.json(
                { error: "ID de conversation requis" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Récupérer les messages de la conversation
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id, content, sender_type, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (messagesError) {
            logger.error(`[${requestId}] Erreur lors de la récupération des messages:`, messagesError);
            throw messagesError;
        }

        // Récupérer les informations de la conversation
        const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .select('id, user_id, status, created_at')
            .eq('id', conversationId)
            .single();

        if (conversationError) {
            logger.error(`[${requestId}] Erreur lors de la récupération de la conversation:`, conversationError);
            throw conversationError;
        }

        logger.info(`[${requestId}] Messages récupérés avec succès:`, {
            conversationId,
            messageCount: messages.length
        });

        return NextResponse.json({
            conversation: {
                id: conversation.id,
                userId: conversation.user_id,
                status: conversation.status,
                createdAt: conversation.created_at
            },
            messages: messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                sender_type: msg.sender_type,
                timestamp: msg.created_at
            }))
        }, { headers: getCorsHeaders(origin) });

    } catch (error) {
        logger.error(`[${requestId}] Erreur lors du traitement de la requête:`, {
            error: error.message,
            stack: error.stack,
            code: error.code
        });

        return NextResponse.json(
            { 
                error: "Erreur lors de la récupération des messages",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500, headers: getCorsHeaders(origin) }
        );
    }
} 