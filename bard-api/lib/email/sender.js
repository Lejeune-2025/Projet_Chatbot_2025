import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

// Configuration de SendGrid
if (!process.env.SENDGRID_API_KEY) {
    logger.error('SENDGRID_API_KEY non configuré');
    throw new Error('Configuration SendGrid manquante');
}

if (!process.env.SENDGRID_FROM_EMAIL) {
    logger.error('SENDGRID_FROM_EMAIL non configuré');
    throw new Error('Email expéditeur non configuré');
}

// Log des informations de configuration SendGrid (masquées pour la sécurité)
logger.info('Configuration SendGrid:', {
    apiKey: `${process.env.SENDGRID_API_KEY.substring(0, 4)}...${process.env.SENDGRID_API_KEY.substring(process.env.SENDGRID_API_KEY.length - 4)}`,
    fromEmail: process.env.SENDGRID_FROM_EMAIL,
    domain: process.env.DOMAIN || 'Non configuré'
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendVerificationEmail(email, token) {
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`[${requestId}] Préparation de l'envoi d'email de vérification à ${email}`);

    try {
        // Vérification des variables d'environnement
        if (!process.env.API_BASE_URL) {
            throw new Error('API_BASE_URL is not configured');
        }

        // Construction de l'URL de vérification
        const verificationUrl = `${process.env.API_BASE_URL}/auth/verify-email?token=${token}`;
        logger.info(`[${requestId}] URL de vérification générée: ${verificationUrl}`);

        // Préparation du message
        const msg = {
            to: email,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: 'Yonetwork'
            },
            subject: 'Vérification de votre compte Yonetwork',
            headers: {
                'X-Entity-Ref-ID': requestId,
                'List-Unsubscribe': `<mailto:unsubscribe@${process.env.DOMAIN || 'example.com'}?subject=unsubscribe>`,
                'Precedence': 'bulk'
            },
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Vérification de votre compte Yonetwork</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="${process.env.API_URL}/public/newlogo.png" alt="Yonetwork Logo" style="max-width: 200px;">
                    </div>
                    <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">Bienvenue sur Yonetwork !</h1>
                    <p style="margin-bottom: 20px;">Merci de vous être inscrit. Pour activer votre compte et commencer à utiliser Yonetwork, veuillez cliquer sur le bouton ci-dessous :</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Vérifier mon email
                        </a>
                    </div>
                    <p style="margin-bottom: 20px;">Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
                    <p style="word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 30px;">${verificationUrl}</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-top: 30px;">
                        <p style="margin: 0; font-size: 14px; color: #666;">
                            <strong>Note importante :</strong> Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
                        </p>
                    </div>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px; text-align: center;">
                        Cet email a été envoyé automatiquement, merci de ne pas y répondre.<br>
                        © ${new Date().getFullYear()} Yonetwork. Tous droits réservés.
                    </p>
                </body>
                </html>
            `,
            text: `Bienvenue sur Yonetwork !

Merci de vous être inscrit. Pour activer votre compte, veuillez cliquer sur le lien suivant :
${verificationUrl}

Ce lien expirera dans 24 heures.

Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.

© ${new Date().getFullYear()} Yonetwork. Tous droits réservés.`
        };

        // Log détaillé de la configuration du message
        logger.info(`[${requestId}] Configuration du message:`, {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: msg.subject,
            headers: msg.headers
        });

        logger.info(`[${requestId}] Tentative d'envoi d'email à ${email}`);
        
        // Envoi de l'email
        const response = await sgMail.send(msg);
        
        // Log détaillé de la réponse
        logger.info(`[${requestId}] Réponse complète de SendGrid:`, {
            statusCode: response[0].statusCode,
            headers: response[0].headers ? Object.fromEntries(Object.entries(response[0].headers)) : {},
            body: response[0].body
        });
        
        if (response[0].statusCode >= 200 && response[0].statusCode < 300) {
            logger.info(`[${requestId}] Email envoyé avec succès. Status: ${response[0].statusCode}`);
            return true;
        } else {
            throw new Error(`Erreur d'envoi d'email: ${response[0].statusCode}`);
        }
    } catch (error) {
        logger.error(`[${requestId}] Erreur lors de l'envoi de l'email:`, error);
        
        // Log détaillé des erreurs SendGrid
        if (error.response) {
            logger.error(`[${requestId}] Détails de l'erreur SendGrid:`, {
                body: error.response.body,
                headers: error.response.headers ? Object.fromEntries(Object.entries(error.response.headers)) : {},
                statusCode: error.response.statusCode
            });
        }
        
        // Log des informations de débogage supplémentaires
        logger.error(`[${requestId}] Informations de débogage:`, {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            code: error.code
        });
        
        throw new Error('Échec de l\'envoi de l\'email de vérification');
    }
} 