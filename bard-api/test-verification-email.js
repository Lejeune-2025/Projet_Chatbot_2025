import { sendVerificationEmail } from './lib/email/sender.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { sign } from 'jsonwebtoken';

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
const requiredVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'JWT_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    process.exit(1);
}

async function testVerificationEmail() {
    try {
        const testEmail = process.argv[2];
        
        if (!testEmail) {
            console.error('Veuillez fournir une adresse email en argument');
            console.log('Exemple: node test-verification-email.js votre@email.com');
            process.exit(1);
        }
        
        console.log(`Envoi d'un email de vérification à ${testEmail}...`);
        
        // Générer un token de vérification
        const verificationToken = sign(
            { email: testEmail },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Définir l'URL de base de l'API si elle n'est pas définie
        if (!process.env.API_BASE_URL) {
            process.env.API_BASE_URL = 'http://localhost:3000/api';
            console.log('API_BASE_URL non définie, utilisation de la valeur par défaut:', process.env.API_BASE_URL);
        }
        
        if (!process.env.API_URL) {
            process.env.API_URL = 'http://localhost:3000';
            console.log('API_URL non définie, utilisation de la valeur par défaut:', process.env.API_URL);
        }
        
        // Envoyer l'email de vérification
        await sendVerificationEmail(testEmail, verificationToken);
        
        console.log('Email de vérification envoyé avec succès!');
        console.log('Token de vérification:', verificationToken);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de vérification:', error);
        if (error.response) {
            console.error('Détails de l\'erreur SendGrid:', {
                body: error.response.body,
                statusCode: error.response.statusCode
            });
        }
        process.exit(1);
    }
}

testVerificationEmail(); 