import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import EcommerceService from '@/services/ecommerce';
import { validateSession } from '@/lib/auth/session';

const ecommerceService = new EcommerceService();

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin'
    };
};

// Gestion des requêtes OPTIONS (preflight CORS)
export async function OPTIONS(request) {
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders
    });
}

// Analyser une image uploadée
export async function POST(request) {
    const requestId = Math.random().toString(36).substring(7);
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    try {
        logger.info(`[${requestId}] === Nouvelle requête POST /api/image-analysis ===`);
        
        // Validation de session
        const sessionResult = await validateSession(request);
        if (!sessionResult.valid) {
            logger.warn(`[${requestId}] Session invalide`);
            return NextResponse.json(
                { 
                    status: 'error', 
                    message: 'Session invalide',
                    code: 'INVALID_SESSION'
                },
                { 
                    status: 401,
                    headers: corsHeaders
                }
            );
        }

        const userId = sessionResult.userId;
        logger.info(`[${requestId}] Utilisateur authentifié: ${userId}`);

        // Récupérer les données du formulaire
        const formData = await request.formData();
        const imageFile = formData.get('image');
        const conversationId = formData.get('conversationId');

        if (!imageFile) {
            logger.warn(`[${requestId}] Aucune image fournie`);
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Aucune image fournie',
                    code: 'NO_IMAGE'
                },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        // Vérifier le type de fichier
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(imageFile.type)) {
            logger.warn(`[${requestId}] Type de fichier non supporté: ${imageFile.type}`);
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.',
                    code: 'INVALID_FILE_TYPE'
                },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        // Vérifier la taille du fichier (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (imageFile.size > maxSize) {
            logger.warn(`[${requestId}] Fichier trop volumineux: ${imageFile.size} bytes`);
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Fichier trop volumineux. Taille maximale: 10MB.',
                    code: 'FILE_TOO_LARGE'
                },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        logger.info(`[${requestId}] Image reçue: ${imageFile.name}, taille: ${imageFile.size} bytes, type: ${imageFile.type}`);

        // Convertir l'image en buffer
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        
        // Analyser l'image
        logger.info(`[${requestId}] Début de l'analyse d'image`);
        const analysisResult = await ecommerceService.analyzeProductImage(imageBuffer);
        
        if (!analysisResult.success) {
            logger.error(`[${requestId}] Échec de l'analyse d'image:`, analysisResult.error);
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Impossible d\'analyser l\'image',
                    error: analysisResult.error,
                    code: 'ANALYSIS_FAILED'
                },
                {
                    status: 500,
                    headers: corsHeaders
                }
            );
        }

        logger.info(`[${requestId}] Analyse réussie:`, {
            productType: analysisResult.productType,
            confidence: analysisResult.confidence,
            method: analysisResult.method
        });

        // Retourner le résultat
        return NextResponse.json(
            {
                status: 'success',
                data: {
                    productType: analysisResult.productType,
                    confidence: Math.round(analysisResult.confidence * 100),
                    detectedObjects: analysisResult.detectedObjects,
                    method: analysisResult.method,
                    conversationId: conversationId
                },
                message: `Produit détecté: ${analysisResult.productType} (${Math.round(analysisResult.confidence * 100)}% de confiance)`
            },
            {
                status: 200,
                headers: corsHeaders
            }
        );

    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de l'analyse d'image:`, {
            error: error.message,
            stack: error.stack
        });
        
        return NextResponse.json(
            {
                status: 'error',
                message: 'Erreur interne du serveur',
                code: 'INTERNAL_ERROR'
            },
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
}

// Méthode GET pour obtenir les types de produits supportés
export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    try {
        logger.info(`[${requestId}] === Nouvelle requête GET /api/image-analysis ===`);
        
        const productTypes = [
            'vêtements', 'électronique', 'électroménager', 'accessoires', 'chaussures',
            'informatique', 'smartphones', 'sport', 'loisirs', 'fitness', 'maison',
            'jardin', 'décoration', 'bijoux', 'montres', 'automobile', 'pièces détachées',
            'livres', 'culture', 'multimédia', 'cosmétiques', 'beauté', 'parfums',
            'jouets', 'enfants', 'puériculture'
        ];
        
        return NextResponse.json(
            {
                status: 'success',
                data: {
                    supportedTypes: productTypes,
                    maxFileSize: '10MB',
                    supportedFormats: ['JPEG', 'PNG', 'WebP'],
                    hasGoogleVision: !!process.env.GOOGLE_VISION_API_KEY
                }
            },
            {
                status: 200,
                headers: corsHeaders
            }
        );
        
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la récupération des informations:`, error);
        
        return NextResponse.json(
            {
                status: 'error',
                message: 'Erreur interne du serveur'
            },
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
}