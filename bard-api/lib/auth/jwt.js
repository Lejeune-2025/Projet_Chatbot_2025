import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Récupérer la clé secrète depuis les variables d'environnement
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-in-production';

/**
 * Génère un token JWT
 * @param {Object} payload - Les données à inclure dans le token
 * @param {Object} options - Options pour la génération du token
 * @returns {string} - Le token JWT généré
 */
export const generateToken = (payload, options = {}) => {
  try {
    const defaultOptions = {
      expiresIn: '24h' // Expiration par défaut: 24 heures
    };
    
    const tokenOptions = { ...defaultOptions, ...options };
    return jwt.sign(payload, JWT_SECRET, tokenOptions);
  } catch (error) {
    logger.error('Erreur lors de la génération du token JWT:', error);
    throw new Error('Erreur lors de la génération du token');
  }
};

/**
 * Vérifie un token JWT
 * @param {string} token - Le token JWT à vérifier
 * @returns {Object|null} - Le payload décodé ou null si le token est invalide
 */
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token JWT expiré');
      return null;
    }
    
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Token JWT invalide:', error.message);
      return null;
    }
    
    logger.error('Erreur lors de la vérification du token JWT:', error);
    return null;
  }
};

/**
 * Décode un token JWT sans vérifier sa signature
 * @param {string} token - Le token JWT à décoder
 * @returns {Object|null} - Le payload décodé ou null si le token est invalide
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Erreur lors du décodage du token JWT:', error);
    return null;
  }
};

/**
 * Vérifie si un token JWT est expiré
 * @param {string} token - Le token JWT à vérifier
 * @returns {boolean} - True si le token est expiré, false sinon
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    // exp est en secondes, Date.now() est en millisecondes
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    logger.error('Erreur lors de la vérification de l\'expiration du token JWT:', error);
    return true; // Par sécurité, considérer le token comme expiré en cas d'erreur
  }
}; 