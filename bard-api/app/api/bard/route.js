import OpenAI from "openai";
import { NextResponse } from "next/server";
import { LRUCache } from 'lru-cache';
import { supabase } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/security/encryption';
import { createSession, validateSession } from '@/lib/auth/session';
import { logger } from '@/lib/utils/logger';

// Configuration du cache
const cache = new LRUCache({
    max: 100, // Nombre maximum d'entrées dans le cache
    ttl: 1000 * 60 * 5, // Durée de vie de 5 minutes
});

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_API_URL,
});

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

    logger.info('CORS Headers générés pour l\'origine:', origin);
    const headers = {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
    };
    logger.info('Headers CORS générés:', headers);
    return headers;
};

// Messages système pour guider le comportement du bot
const SYSTEM_MESSAGES = {
    default: "Tu es un assistant spécialisé dans l'entreprise. Réponds de manière professionnelle et précise.",
    error: "Une erreur est survenue. Veuillez réessayer plus tard.",
    timeout: "Le temps de réponse est trop long. Veuillez réessayer.",
};

// Configuration des timeouts
const TIMEOUTS = {
    MODEL: 30000,    // 30 secondes pour le modèle
    REQUEST: 10000,  // 10 secondes pour la requête
    CACHE: 5000      // 5 secondes pour le cache
};

// Messages d'erreur plus détaillés
const ERROR_MESSAGES = {
    MODEL_TIMEOUT: "Le modèle d'IA met trop de temps à répondre",
    MODEL_ERROR: "Erreur de communication avec le modèle d'IA",
    REQUEST_ERROR: "Erreur lors du traitement de la requête",
    CACHE_ERROR: "Erreur lors de l'accès au cache",
    VALIDATION_ERROR: "Erreur de validation des données",
    DATABASE_ERROR: "Erreur de base de données",
    UNKNOWN_ERROR: "Une erreur inattendue s'est produite"
};

// Transformer le format de requête pour OpenRouter
function transformRequestForOpenRouter(body) {
    const messages = [
        {
            role: "system",
            content: SYSTEM_MESSAGES.default
        }
    ];

    // Ajouter l'historique s'il existe
    if (body.history && Array.isArray(body.history)) {
        messages.push(...body.history);
    }

    // Ajouter le message actuel
    messages.push({
        role: "user",
        content: body.message
    });

    // Limiter la taille de l'historique pour éviter les dépassements
    if (messages.length > 300) {
        messages.splice(1, messages.length - 300); // Garde le premier système + 299 derniers
        logger.warn('Historique tronqué à 300 messages');
    }

    return {
        model: process.env.MODEL_NAME || "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 1000
    };
}

export async function OPTIONS(request) {
    const origin = request.headers.get('origin');
    logger.info('=== OPTIONS Request ===');
    logger.info('Origin reçue:', origin);
    logger.info('Tous les headers reçus:', Object.fromEntries(request.headers.entries()));
    
    const headers = getCorsHeaders(origin);
    logger.info('Réponse OPTIONS avec headers:', headers);
    
    return NextResponse.json({}, { headers });
}

export async function POST(request) {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    // Extraction des informations de base de la requête
    const method = request.method;
    const url = request.url;
    const origin = request.headers.get('origin');
    
    logger.info(`[${requestId}] === Nouvelle requête POST ===`);
    logger.info(`[${requestId}] Méthode: ${method}`);
    logger.info(`[${requestId}] URL: ${url}`);
    logger.info(`[${requestId}] Origin: ${origin}`);
    logger.info(`[${requestId}] Tous les headers:`, Object.fromEntries(request.headers.entries()));
    
    const headers = {
        contentType: request.headers.get('content-type'),
        userAgent: request.headers.get('user-agent'),
        accept: request.headers.get('accept'),
        origin: origin
    };
    
    logger.info(`[${requestId}] Headers extraits:`, headers);
    
    try {
        // Lecture unique du body avec timeout
        const bodyPromise = request.json();
        const bodyTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout reading request body')), TIMEOUTS.REQUEST)
        );
        
        const body = await Promise.race([bodyPromise, bodyTimeout]);
        
        // Logging sécurisé du body
        const safeBody = {
            message: body.message,
            hasHistory: Boolean(body.history?.length),
            userId: body.userId || 'anonymous',
            conversationId: body.conversationId || 'new'
        };
        logger.info(`[${requestId}] Body:`, safeBody);
        
        // Extraction des métadonnées pour le logging
        const requestMetadata = {
            messageLength: body.message?.length || 0,
            hasHistory: Boolean(body.history?.length),
            userId: body.userId || 'anonymous',
            conversationId: body.conversationId || 'new',
            processingTime: Date.now() - startTime
        };
        
        // Logging des métadonnées
        logger.info(`[${requestId}] Requête reçue:`, requestMetadata);

        // Vérification de l'entrée
        if (!body.message || typeof body.message !== "string" || body.message.trim() === "") {
            logger.warn(`[${requestId}] Message invalide`);
            return NextResponse.json(
                { error: "Message invalide." }, 
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        const userMessage = body.message.trim();
        const history = body.history || [];
        const userId = body.userId || 'anonymous';

        logger.info(`[${requestId}] Traitement du message pour l'utilisateur: ${userId}`);

        // Créer une nouvelle conversation si nécessaire
        let conversationId = body.conversationId;
        if (!conversationId) {
            logger.info(`[${requestId}] Création d'une nouvelle conversation pour l'utilisateur: ${userId}`);
            const { data: conversationData, error: conversationError } = await supabase
                .from('conversations')
                .insert([
                    { user_id: userId, status: 'active' }
                ])
                .select('id')
                .single();

            if (conversationError) {
                logger.error(`[${requestId}] Erreur création conversation:`, {
                    error: conversationError,
                    userId,
                    timestamp: new Date().toISOString()
                });
                throw conversationError;
            }

            conversationId = conversationData.id;
            logger.info(`[${requestId}] Nouvelle conversation créée:`, {
                conversationId,
                userId,
                timestamp: new Date().toISOString()
            });
        } else {
            // Vérifier si la conversation existe
            logger.info(`[${requestId}] Vérification de l'existence de la conversation: ${conversationId}`);
            const { data: existingConversation, error: checkError } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', conversationId)
                .single();

            if (checkError || !existingConversation) {
                logger.error(`[${requestId}] Conversation non trouvée:`, {
                    conversationId,
                    error: checkError,
                    timestamp: new Date().toISOString()
                });
                
                // MODIFICATION: Au lieu de créer une nouvelle conversation, utiliser l'ID fourni par le client
                // lorsque possible pour maintenir la continuité de l'historique côté client
                
                try {
                    // Tenter d'insérer une nouvelle conversation avec l'ID fourni par le client
                    const { data: upsertConversation, error: upsertError } = await supabase
                        .from('conversations')
                        .insert([
                            { id: conversationId, user_id: userId, status: 'active' }
                        ])
                        .select('id')
                        .single();
                    
                    if (!upsertError && upsertConversation) {
                        logger.info(`[${requestId}] Conversation créée avec l'ID fourni par le client:`, {
                            conversationId,
                            userId,
                            timestamp: new Date().toISOString()
                        });
                        // On conserve l'ID fourni par le client
                    } else {
                        throw upsertError || new Error('Échec de création avec ID client');
                    }
                } catch (clientIdError) {
                    // Si l'insertion avec l'ID client échoue (contrainte d'unicité, etc.), créer avec un nouvel ID
                    logger.warn(`[${requestId}] Impossible d'utiliser l'ID client, création d'une nouvelle conversation:`, {
                        originalId: conversationId,
                        error: clientIdError,
                        timestamp: new Date().toISOString()
                    });
                    
                const { data: newConversation, error: createError } = await supabase
                    .from('conversations')
                    .insert([
                        { user_id: userId, status: 'active' }
                    ])
                    .select('id')
                    .single();

                if (createError) {
                    logger.error(`[${requestId}] Erreur création nouvelle conversation:`, {
                        error: createError,
                        userId,
                        timestamp: new Date().toISOString()
                    });
                    throw createError;
                }

                conversationId = newConversation.id;
                    logger.info(`[${requestId}] Nouvelle conversation créée avec nouvel ID:`, {
                    oldConversationId: body.conversationId,
                    newConversationId: conversationId,
                        userId,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                logger.info(`[${requestId}] Conversation existante trouvée, utilisation de l'ID:`, {
                    conversationId,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Sauvegarder le message utilisateur
        logger.info(`[${requestId}] Sauvegarde du message utilisateur:`, {
            conversationId,
            messageLength: userMessage.length,
            timestamp: new Date().toISOString()
        });

        const { error: messageError } = await supabase
            .from('messages')
            .insert([
                {
                    conversation_id: conversationId,
                    content: userMessage,
                    sender_type: 'user'
                }
            ]);

        if (messageError) {
            logger.error(`[${requestId}] Erreur sauvegarde message:`, {
                error: messageError,
                conversationId,
                timestamp: new Date().toISOString()
            });
            throw messageError;
        }

        logger.info(`[${requestId}] Message utilisateur sauvegardé avec succès`);

        // Vérification du cache
        const cacheKey = JSON.stringify({ message: userMessage, history });
        const cachedResponse = cache.get(cacheKey);
        if (cachedResponse) {
            logger.info(`[${requestId}] Cache hit`);
            await supabase
                .from('messages')
                .insert([
                    {
                        conversation_id: conversationId,
                        content: cachedResponse,
                        sender_type: 'bot'
                    }
                ]);

            return NextResponse.json(
                { reply: cachedResponse, conversationId },
                { headers: getCorsHeaders(origin) }
            );
        }

        // Transformer la requête pour OpenRouter
        const openRouterRequest = transformRequestForOpenRouter(body);
        logger.info(`[${requestId}] Requête transformée pour OpenRouter`);

        // Configuration du timeout pour le modèle
        const modelController = new AbortController();
        const modelTimeout = setTimeout(() => {
            modelController.abort();
            logger.error(`[${requestId}] Timeout du modèle après ${TIMEOUTS.MODEL}ms`);
        }, TIMEOUTS.MODEL);

        try {
            // Appel à OpenRouter avec timeout
            const completion = await Promise.race([
                openai.chat.completions.create({
                    ...openRouterRequest,
                    signal: modelController.signal
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(ERROR_MESSAGES.MODEL_TIMEOUT)), TIMEOUTS.MODEL)
                )
            ]);

            clearTimeout(modelTimeout);

        const reply = completion.choices?.[0]?.message?.content;
            logger.info(`[${requestId}] Réponse OpenRouter reçue après ${Date.now() - startTime}ms`);

            if (!reply || reply.trim() === "") {
                throw new Error("Réponse vide du modèle");
            }

            // Mise en cache de la réponse
            cache.set(cacheKey, reply);

            // Sauvegarder la réponse du bot
            const { error: botMessageError } = await supabase
                .from('messages')
                .insert([
                    {
                        conversation_id: conversationId,
                        content: reply,
                        sender_type: 'bot'
                    }
                ]);

            if (botMessageError) {
                logger.error(`[${requestId}] Erreur sauvegarde réponse bot:`, botMessageError);
                throw botMessageError;
            }

            logger.info(`[${requestId}] Message traité avec succès`);

            return NextResponse.json(
                { reply, conversationId },
                { headers: getCorsHeaders(origin) }
            );
        } catch (modelError) {
            clearTimeout(modelTimeout);
            logger.error(`[${requestId}] Erreur modèle:`, {
                error: modelError,
                processingTime: Date.now() - startTime,
                model: openRouterRequest.model,
                messageLength: openRouterRequest.messages.length
            });
            throw modelError;
        }
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        // Logging détaillé de l'erreur
        logger.error(`[${requestId}] Erreur détaillée:`, {
            name: error.name,
            message: error.message,
            code: error.code,
            type: error.constructor.name,
            processingTime,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            cause: error.cause ? {
                name: error.cause.name,
                message: error.cause.message,
                stack: process.env.NODE_ENV === 'development' ? error.cause.stack : undefined
            } : undefined,
            details: {
                headers: headers,
                method: method,
                url: url,
                timestamp: new Date().toISOString()
            }
        });

        // Déterminer le type d'erreur et le message approprié
        let status = 500;
        let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
        let errorDetails = {};

        if (error.name === 'AbortError') {
            status = 504;
            errorMessage = ERROR_MESSAGES.MODEL_TIMEOUT;
            errorDetails = { 
                type: 'timeout',
                duration: `${processingTime}ms`,
                limit: TIMEOUTS.MODEL
            };
        } else if (error.message?.includes("Timeout reading request body")) {
            status = 408;
            errorMessage = ERROR_MESSAGES.REQUEST_ERROR;
            errorDetails = { 
                type: 'request_timeout',
                duration: `${processingTime}ms`,
                limit: TIMEOUTS.REQUEST
            };
        } else if (error.name === 'TypeError' && error.message.includes('body')) {
            status = 400;
            errorMessage = ERROR_MESSAGES.REQUEST_ERROR;
            errorDetails = { 
                type: 'request_format',
                message: error.message
            };
        } else if (error.name === 'OpenAIError') {
            status = 502;
            errorMessage = ERROR_MESSAGES.MODEL_ERROR;
            errorDetails = { 
                type: 'ai_service',
                code: error.code,
                processingTime
            };
        }

        return NextResponse.json(
            { 
                error: errorMessage,
                requestId,
                details: process.env.NODE_ENV === 'development' ? {
                    message: error.message,
                    type: error.name,
                    processingTime,
                    ...errorDetails
                } : undefined
            }, 
            { status, headers: getCorsHeaders(origin) }
        );
    }
}
