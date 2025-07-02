import sgMail from '@sendgrid/mail';
import sgClient from '@sendgrid/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    console.log(`Chargement des variables d'environnement depuis ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.error(`Le fichier ${envPath} n'existe pas`);
    process.exit(1);
}

// Vérifier les variables d'environnement nécessaires
const requiredVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    process.exit(1);
}

// Configurer SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

// Fonction pour vérifier et améliorer la configuration de l'expéditeur
async function checkSenderConfiguration() {
    try {
        console.log('Vérification de la configuration de l\'expéditeur...');
        
        // 1. Vérifier si l'email est vérifié
        const request = {
            url: '/v3/verified_senders',
            method: 'GET'
        };
        
        const [response] = await sgClient.request(request);
        
        if (response.statusCode !== 200) {
            throw new Error(`Erreur lors de la vérification des expéditeurs: ${response.statusCode}`);
        }
        
        const verifiedSenders = response.body.results || [];
        const fromEmail = process.env.SENDGRID_FROM_EMAIL;
        
        const isVerified = verifiedSenders.some(sender => 
            sender.from_email === fromEmail || 
            (sender.from_email_domain && fromEmail.endsWith('@' + sender.from_email_domain))
        );
        
        if (!isVerified) {
            console.warn(`ATTENTION: L'adresse ${fromEmail} n'est pas vérifiée dans SendGrid.`);
            console.log('Recommandation: Vérifiez votre adresse email dans le tableau de bord SendGrid.');
        } else {
            console.log(`✓ L'adresse ${fromEmail} est vérifiée.`);
        }
        
        // 2. Recommandations pour améliorer la délivrabilité
        console.log('\nRecommandations pour améliorer la délivrabilité des emails:');
        console.log('1. Configurez les enregistrements SPF, DKIM et DMARC pour votre domaine');
        console.log('2. Utilisez un domaine personnalisé au lieu d\'une adresse Gmail');
        console.log('3. Ajoutez un logo et une signature d\'entreprise cohérents');
        console.log('4. Évitez les mots-clés spammeux dans l\'objet et le contenu');
        console.log('5. Assurez-vous que le lien de désinscription fonctionne correctement');
        console.log('6. Testez vos emails avec des outils comme mail-tester.com');
        
        // 3. Vérifier si le compte est en mode sandbox
        try {
            const accessRequest = {
                url: '/v3/access_settings/activity',
                method: 'GET'
            };
            
            const [accessResponse] = await sgClient.request(accessRequest);
            
            if (accessResponse.statusCode === 403) {
                console.warn('\nATTENTION: Votre compte SendGrid semble être en mode sandbox ou limité.');
                console.log('Dans ce mode, vous ne pouvez envoyer des emails qu\'aux adresses vérifiées.');
                console.log('Pour sortir du mode sandbox, contactez le support SendGrid ou vérifiez votre tableau de bord.');
            }
        } catch (error) {
            // Cette erreur peut être normale si l'API key n'a pas les permissions nécessaires
            if (error.response && error.response.statusCode === 403) {
                console.warn('\nVotre compte SendGrid est peut-être en mode sandbox ou limité.');
                console.log('Vérifiez votre tableau de bord SendGrid pour plus d\'informations.');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification de la configuration:', error);
        if (error.response) {
            console.error('Détails de l\'erreur SendGrid:', {
                body: error.response.body,
                statusCode: error.response.statusCode
            });
        }
        return false;
    }
}

// Fonction pour envoyer un email de test avec des en-têtes anti-spam améliorés
async function sendImprovedTestEmail(testEmail) {
    if (!testEmail) {
        console.error('Veuillez fournir une adresse email de test en argument');
        process.exit(1);
    }

    console.log(`\nEnvoi d'un email de test amélioré à ${testEmail}...`);

    // Générer un ID unique pour cet email
    const messageId = `${Date.now()}.${Math.random().toString(36).substring(2)}@yonetwork.com`;

    const msg = {
        to: testEmail,
        from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'Yonetwork'
        },
        subject: 'Test de délivrabilité - Yonetwork',
        text: 'Ceci est un email de test pour vérifier la délivrabilité des emails de Yonetwork.',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${process.env.API_URL}/public/newlogo.png" alt="Yonetwork Logo" style="max-width: 200px;">
                </div>
                <h1 style="color: #4CAF50;">Test de délivrabilité - Yonetwork</h1>
                <p>Ceci est un email de test pour vérifier la délivrabilité des emails de Yonetwork.</p>
                <p>Si vous recevez cet email dans votre boîte de réception principale (et non dans les spams), cela signifie que notre configuration fonctionne correctement.</p>
                <p>Date et heure du test: ${new Date().toLocaleString()}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    Cet email a été envoyé automatiquement, merci de ne pas y répondre.<br>
                    © ${new Date().getFullYear()} Yonetwork. Tous droits réservés.
                </p>
            </div>
        `,
        // En-têtes améliorés pour réduire les chances d'être classé comme spam
        headers: {
            'X-Entity-Ref-ID': messageId,
            'List-Unsubscribe': `<mailto:unsubscribe@${process.env.DOMAIN || 'example.com'}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'Precedence': 'bulk',
            'X-Message-ID': messageId,
            'X-Mailer': 'Yonetwork-Mailer/1.0',
        },
        // Catégories pour le suivi dans SendGrid
        categories: ['test', 'deliverability'],
        // Tracking settings
        tracking_settings: {
            subscription_tracking: {
                enable: true,
                substitution_tag: '%unsubscribe%'
            },
            open_tracking: {
                enable: true
            },
            click_tracking: {
                enable: true,
                enable_text: false
            }
        },
        // Personnalisation pour les tests
        custom_args: {
            test_type: 'deliverability',
            test_date: new Date().toISOString()
        }
    };

    try {
        const response = await sgMail.send(msg);
        
        console.log('Email de test amélioré envoyé avec succès!');
        console.log('Réponse:', {
            statusCode: response[0].statusCode,
            headers: response[0].headers
        });
        
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de test amélioré:', error.message);
        
        if (error.response) {
            console.error('Détails de l\'erreur SendGrid:', {
                body: error.response.body,
                statusCode: error.response.statusCode
            });
        }
        
        return false;
    }
}

// Exécuter les fonctions
async function main() {
    try {
        // Vérifier la configuration
        await checkSenderConfiguration();
        
        // Demander si l'utilisateur veut envoyer un email de test
        const testEmail = process.argv[2];
        if (testEmail) {
            await sendImprovedTestEmail(testEmail);
        } else {
            console.log('\nPour envoyer un email de test amélioré, exécutez:');
            console.log('node improve-email-deliverability.js votre@email.com');
        }
    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

main(); 