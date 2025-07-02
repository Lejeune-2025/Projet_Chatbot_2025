import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';
import { validateEmail, validatePassword } from '@/lib/validation/auth';
import { rateLimit } from '@/lib/middleware/rateLimit';
import { sendVerificationEmail } from '@/lib/email/sender';

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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization, X-Platform, X-App-Version, X-Nonce',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
    logger.info('Headers CORS générés:', headers);
    return headers;
};

export async function OPTIONS(request) {
    const origin = request.headers.get('origin');
    logger.info('=== OPTIONS Request ===');
    logger.info('Origin reçue:', origin);
    logger.info('Tous les headers reçus:', Object.fromEntries(request.headers.entries()));
    
    const headers = getCorsHeaders(origin);
    logger.info('Réponse OPTIONS avec headers:', headers);
    
    return new NextResponse(null, {
        status: 204,
        headers
    });
}

export async function POST(request) {
    const requestId = Math.random().toString(36).substring(7);
    const origin = request.headers.get('origin');
    logger.info(`[${requestId}] === Nouvelle requête d'inscription ===`);
    logger.info(`[${requestId}] Origin: ${origin}`);
    logger.info(`[${requestId}] Tous les headers:`, Object.fromEntries(request.headers.entries()));

    try {
        const body = await request.json();
        logger.info(`[${requestId}] Body reçu:`, body);

        // Validation des données
        if (!body.email || !body.password) {
            logger.warn(`[${requestId}] Données manquantes`);
            return NextResponse.json(
                { error: "Email et mot de passe requis" },
                { status: 400, headers: getCorsHeaders(origin) }
            );
        }

        // Vérification si l'utilisateur existe déjà
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, email_verified')
            .eq('email', body.email)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            logger.error(`[${requestId}] Erreur lors de la vérification de l'utilisateur:`, checkError);
            throw checkError;
        }

        if (existingUser) {
            if (!existingUser.email_verified) {
                // Si l'email n'est pas vérifié, on peut renvoyer l'email de vérification
                const verificationToken = sign(
                    { email: body.email },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                await sendVerificationEmail(body.email, verificationToken);
                
                return NextResponse.json(
                    { 
                        message: "Un nouvel email de vérification a été envoyé",
                        needsVerification: true
                    },
                    { status: 200, headers: getCorsHeaders(origin) }
                );
            }

            return NextResponse.json(
                { error: "Cet email est déjà utilisé" },
                { status: 409, headers: getCorsHeaders(origin) }
            );
        }

        // Hashage du mot de passe
        const hashedPassword = await hash(body.password, 10);

        // Génération du token de vérification
        const verificationToken = sign(
            { email: body.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Création de l'utilisateur
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
                {
                    email: body.email,
                    password_hash: hashedPassword,
                    device_info: body.deviceInfo || {},
                    email_verified: false,
                    verification_token: verificationToken
                }
            ])
            .select('id, email')
            .single();

        if (createError) {
            logger.error(`[${requestId}] Erreur lors de la création de l'utilisateur:`, createError);
            throw createError;
        }

        // Envoi de l'email de vérification
        try {
            logger.info(`[${requestId}] Tentative d'envoi d'email de vérification à ${body.email}`);
            await sendVerificationEmail(body.email, verificationToken);
            logger.info(`[${requestId}] Email de vérification envoyé à ${body.email}`);
        } catch (emailError) {
            logger.error(`[${requestId}] Erreur lors de l'envoi de l'email de vérification:`, emailError);
            logger.error(`[${requestId}] Détails supplémentaires:`, {
                errorName: emailError.name,
                errorMessage: emailError.message,
                stack: emailError.stack,
                email: body.email
            });
            
            // Même si l'envoi d'email échoue, on continue car l'utilisateur pourra demander un nouvel email
            // Mais on ajoute l'erreur dans la réponse pour informer l'utilisateur
            return NextResponse.json(
                { 
                    message: "Inscription réussie mais l'email de vérification n'a pas pu être envoyé. Veuillez utiliser la fonction 'Renvoyer l'email' sur l'écran de connexion.",
                    user: {
                        id: newUser.id,
                        email: newUser.email
                    },
                    needsVerification: true,
                    emailError: true
                },
                { 
                    status: 201,
                    headers: getCorsHeaders(origin)
                }
        );
        }

        logger.info(`[${requestId}] Utilisateur créé avec succès:`, newUser);

        return NextResponse.json(
            { 
                message: "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
                user: {
                    id: newUser.id,
                    email: newUser.email
                },
                needsVerification: true
            },
            { 
                status: 201,
                headers: getCorsHeaders(origin)
            }
        );
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de l'inscription:`, error);
        return NextResponse.json(
            { error: "Erreur lors de l'inscription" },
            { status: 500, headers: getCorsHeaders(origin) }
        );
    }
} 