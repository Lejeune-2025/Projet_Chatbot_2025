import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { sign } from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';
import { sendVerificationEmail } from '@/lib/email/sender';

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
    logger.info(`[${requestId}] === Nouvelle requête de renvoi d'email de vérification ===`);

    try {
        const body = await request.json();
        logger.info(`[${requestId}] Email reçu: ${body.email}`);

        if (!body.email) {
            logger.warn(`[${requestId}] Email manquant`);
            return NextResponse.json(
                { error: "Email requis" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Vérification de l'existence de l'utilisateur
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, email_verified')
            .eq('email', body.email)
            .single();

        if (userError) {
            logger.error(`[${requestId}] Erreur lors de la recherche de l'utilisateur:`, userError);
            throw userError;
        }

        if (!user) {
            logger.warn(`[${requestId}] Utilisateur non trouvé: ${body.email}`);
            return NextResponse.json(
                { error: "Utilisateur non trouvé" },
                { status: 404, headers: getCorsHeaders(origin) }
            );
        }

        if (user.email_verified) {
            logger.warn(`[${requestId}] Email déjà vérifié: ${body.email}`);
            return NextResponse.json(
                { error: "Cet email est déjà vérifié" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Génération d'un nouveau token
        const verificationToken = sign(
            { email: body.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Mise à jour du token dans la base de données
        const { error: updateError } = await supabase
            .from('users')
            .update({ verification_token: verificationToken })
            .eq('id', user.id);

        if (updateError) {
            logger.error(`[${requestId}] Erreur lors de la mise à jour du token:`, updateError);
            throw updateError;
        }

        // Envoi du nouvel email de vérification
        try {
            await sendVerificationEmail(body.email, verificationToken);
            logger.info(`[${requestId}] Nouvel email de vérification envoyé à ${body.email}`);
        } catch (emailError) {
            logger.error(`[${requestId}] Erreur lors de l'envoi de l'email:`, emailError);
            throw new Error('Échec de l\'envoi de l\'email de vérification');
        }

        return NextResponse.json(
            { 
                message: "Un nouvel email de vérification a été envoyé",
                user: {
                    id: user.id,
                    email: user.email
                }
            },
            { status: 200, headers: getCorsHeaders(origin) }
        );
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors du renvoi de l'email de vérification:`, error);
        return NextResponse.json(
            { error: "Erreur lors du renvoi de l'email de vérification" },
            { status: 500, headers: getCorsHeaders(origin) }
        );
    }
} 