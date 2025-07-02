import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verify } from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';

// Configuration CORS
const getCorsHeaders = (origin) => {
    const allowedOrigins = [
        'http://localhost:8081',
        'http://localhost:3000',
        'https://yonetwork.com',
        'https://app.yonetwork.com'
    ];

    const isAllowedOrigin = allowedOrigins.includes(origin) || 
        (process.env.NODE_ENV === 'development' && origin);

    return {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
};

export async function OPTIONS(request) {
    const origin = request.headers.get('origin');
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin)
    });
}

export async function POST(request) {
    const requestId = Math.random().toString(36).substring(7);
    const origin = request.headers.get('origin');
    logger.info(`[${requestId}] === Nouvelle requête de vérification d'email ===`);

    try {
        const body = await request.json();
        logger.info(`[${requestId}] Token reçu`);

        if (!body.token) {
            logger.warn(`[${requestId}] Token manquant`);
            return NextResponse.json(
                { error: "Token de vérification requis" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Vérification du token
        let decoded;
        try {
            decoded = verify(body.token, process.env.JWT_SECRET);
            logger.info(`[${requestId}] Token décodé avec succès pour l'email: ${decoded.email}`);
        } catch (error) {
            logger.error(`[${requestId}] Erreur de vérification du token:`, error);
            return NextResponse.json(
                { error: "Token invalide ou expiré" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Mise à jour du statut de vérification
        const { data: user, error: updateError } = await supabase
            .from('users')
            .update({ 
                email_verified: true,
                verification_token: null // On supprime le token après vérification
            })
            .eq('email', decoded.email)
            .select('id, email')
            .single();

        if (updateError) {
            logger.error(`[${requestId}] Erreur lors de la mise à jour du statut:`, updateError);
            throw updateError;
        }

        if (!user) {
            logger.warn(`[${requestId}] Utilisateur non trouvé: ${decoded.email}`);
            return NextResponse.json(
                { error: "Utilisateur non trouvé" },
                { status: 404, headers: getCorsHeaders(origin) }
            );
        }

        logger.info(`[${requestId}] Email vérifié avec succès pour l'utilisateur: ${user.id}`);

        return NextResponse.json({
            success: true,
            message: "Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter à votre compte.",
            user: {
                id: "***",
                email: user.email.replace(/(?<=.{3}).(?=.*@)/g, '*')
            }
        }, { 
            status: 200, 
            headers: getCorsHeaders(origin) 
        });
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la vérification de l'email:`, error);
        return NextResponse.json(
            { error: "Erreur lors de la vérification de l'email" },
            { status: 500, headers: getCorsHeaders(origin) }
        );
    }
}

export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    const origin = request.headers.get('origin');
    logger.info(`[${requestId}] === Nouvelle requête GET de vérification d'email ===`);

    try {
        // Récupération du token depuis l'URL
        const url = new URL(request.url);
        const token = url.searchParams.get('token');

        if (!token) {
            logger.warn(`[${requestId}] Token manquant dans l'URL`);
            return NextResponse.json(
                { error: "Token de vérification manquant" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Vérification du token
        let decoded;
        try {
            decoded = verify(token, process.env.JWT_SECRET);
            logger.info(`[${requestId}] Token décodé avec succès pour l'email: ${decoded.email}`);
        } catch (error) {
            logger.error(`[${requestId}] Erreur de vérification du token:`, error);
            return NextResponse.json(
                { error: "Token invalide ou expiré" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Mise à jour du statut de vérification
        const { data: user, error: updateError } = await supabase
            .from('users')
            .update({ 
                email_verified: true,
                verification_token: null
            })
            .eq('email', decoded.email)
            .select('id, email')
            .single();

        if (updateError) {
            logger.error(`[${requestId}] Erreur lors de la mise à jour du statut:`, updateError);
            return NextResponse.json(
                { error: "Erreur lors de la mise à jour du statut" },
                { status: 500, headers: getCorsHeaders(origin) }
            );
        }

        if (!user) {
            logger.warn(`[${requestId}] Utilisateur non trouvé: ${decoded.email}`);
            return NextResponse.json(
                { error: "Utilisateur non trouvé" },
                { status: 404, headers: getCorsHeaders(origin) }
            );
        }

        logger.info(`[${requestId}] Email vérifié avec succès pour l'utilisateur: ${user.id}`);

        return NextResponse.json({
            success: true,
            message: "Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter à votre compte.",
            user: {
                id: "***",
                email: user.email.replace(/(?<=.{3}).(?=.*@)/g, '*')
            }
        }, { 
            status: 200, 
            headers: getCorsHeaders(origin) 
        });
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la vérification de l'email:`, error);
        return NextResponse.json(
            { error: "Erreur lors de la vérification de l'email" },
            { status: 500, headers: getCorsHeaders(origin) }
        );
    }
} 