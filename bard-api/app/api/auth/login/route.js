import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';
import { rateLimit } from '@/lib/middleware/rateLimit';

// Configuration CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request) {
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`[${requestId}] Nouvelle requête de connexion`);

    try {
        // Vérification du rate limiting
        const rateLimitResult = await rateLimit(request);
        if (!rateLimitResult.success) {
            logger.warn(`[${requestId}] Rate limit dépassé`);
            return NextResponse.json(
                { error: "Trop de tentatives, veuillez réessayer plus tard" },
                { status: 429, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const { email, password } = body;

        // Validation des entrées
        if (!email || !password) {
            logger.warn(`[${requestId}] Données manquantes`);
            return NextResponse.json(
                { error: "Email et mot de passe requis" },
                { status: 400, headers: corsHeaders }
            );
        }

        // Récupération de l'utilisateur
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, password_hash, role, status, email_verified')
            .eq('email', email)
            .single();

        if (userError || !user) {
            logger.warn(`[${requestId}] Utilisateur non trouvé`);
            return NextResponse.json(
                { error: "Identifiants invalides" },
                { status: 401, headers: corsHeaders }
            );
        }

        if (!user.email_verified) {
            logger.warn(`[${requestId}] Email non vérifié`);
            return NextResponse.json(
                { 
                    error: "Email non vérifié",
                    needsVerification: true,
                    message: "Veuillez vérifier votre email avant de vous connecter"
                },
                { status: 403, headers: corsHeaders }
            );
        }

        // Vérification du statut de l'utilisateur
        if (user.status !== 'active') {
            logger.warn(`[${requestId}] Compte inactif ou bloqué`);
            return NextResponse.json(
                { error: "Ce compte est inactif ou bloqué" },
                { status: 403, headers: corsHeaders }
            );
        }

        // Vérification du mot de passe
        const isValidPassword = await compare(password, user.password_hash);
        if (!isValidPassword) {
            logger.warn(`[${requestId}] Mot de passe incorrect`);
            return NextResponse.json(
                { error: "Email ou mot de passe incorrect" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Génération du token JWT
        const token = sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Mise à jour de la dernière connexion
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        logger.info(`[${requestId}] Connexion réussie pour l'utilisateur: ${user.id}`);

        return NextResponse.json(
            {
                message: "Connexion réussie",
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                token
            },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la connexion:`, error);
        return NextResponse.json(
            { error: "Erreur lors de la connexion" },
            { status: 500, headers: corsHeaders }
        );
    }
} 