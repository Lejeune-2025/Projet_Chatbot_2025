import { createSession, validateSession, deleteSession } from '../../../../lib/auth/session';
import { logger } from '../../../../lib/utils/logger';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth/jwt';

// Configuration CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Créer une nouvelle session
export async function POST(request) {
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`[${requestId}] Création d'une nouvelle session`);

    try {
        const body = await request.json();
        const { userId, deviceInfo } = body;
        
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID est requis' },
                { status: 400, headers: corsHeaders }
            );
        }
        
        // Créer une nouvelle session
        const sessionId = await createSession(userId);
        
        logger.info(`[${requestId}] Session créée avec succès`, { sessionId, userId });
        
        return NextResponse.json(
            { 
                success: true, 
                sessionId,
                message: 'Session créée avec succès'
            },
            { status: 201, headers: corsHeaders }
        );
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la création de session`, { error: error.message });
        return NextResponse.json(
            { error: 'Erreur lors de la création de session' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Vérifier une session
export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`[${requestId}] Vérification de session`);
    
    try {
        // Extraire le token d'authentification
        const headersList = await headers();
        const authHeader = headersList.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Token d\'authentification manquant' },
                { status: 401, headers: corsHeaders }
            );
        }
        
        const token = authHeader.split(' ')[1];
        
        // Vérifier le token JWT
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json(
                { error: 'Token invalide' },
                { status: 401, headers: corsHeaders }
            );
        }
        
        // Extraire le sessionId de l'URL
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('id');
        
        if (!sessionId) {
            return NextResponse.json(
                { error: 'ID de session manquant' },
                { status: 400, headers: corsHeaders }
            );
        }
        
        // Vérifier la session dans la base de données
        const session = await validateSession(sessionId);
        
        if (!session) {
            return NextResponse.json(
                { valid: false, message: 'Session expirée ou invalide' },
                { status: 401, headers: corsHeaders }
            );
        }
        
        logger.info(`[${requestId}] Session valide`, { sessionId });
        
        return NextResponse.json(
            { 
                valid: true, 
                session: {
                    id: session.id,
                    userId: session.user_id,
                    expiresAt: session.expires_at
                }
            },
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la vérification de session`, { error: error.message });
        return NextResponse.json(
            { error: 'Erreur lors de la vérification de session' },
                { status: 500, headers: corsHeaders }
            );
        }
}

// Supprimer une session (déconnexion)
export async function DELETE(request) {
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`[${requestId}] Suppression de session (déconnexion)`);
    
    try {
        // Extraire le token d'authentification
        const headersList = await headers();
        const authHeader = headersList.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Token d\'authentification manquant' },
                { status: 401, headers: corsHeaders }
            );
        }
        
        const token = authHeader.split(' ')[1];
        
        // Vérifier le token JWT
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json(
                { error: 'Token invalide' },
                { status: 401, headers: corsHeaders }
            );
        }
        
        // Extraire le sessionId de l'URL
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('id');
        
        if (!sessionId) {
            return NextResponse.json(
                { error: 'ID de session manquant' },
                { status: 400, headers: corsHeaders }
            );
        }
        
        // Supprimer la session
        await deleteSession(sessionId);
        
        logger.info(`[${requestId}] Session supprimée avec succès`, { sessionId });
        
        return NextResponse.json(
            { 
                success: true, 
                message: 'Déconnexion réussie' 
            },
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la suppression de session`, { error: error.message });
        return NextResponse.json(
            { error: 'Erreur lors de la déconnexion' },
            { status: 500, headers: corsHeaders }
        );
    }
}