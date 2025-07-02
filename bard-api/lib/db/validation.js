import { logger } from '../utils/logger.js';

// Validation des entrées pour les messages
export const validateMessage = (content, senderType) => {
    // Vérification de la longueur
    if (!content || content.length > 4000) {
        throw new Error('Le message doit contenir entre 1 et 4000 caractères');
    }

    // Vérification du type d'expéditeur
    if (!['user', 'assistant'].includes(senderType)) {
        throw new Error('Type d\'expéditeur invalide');
    }

    // Nettoyage du contenu
    const cleanContent = content
        .trim()
        .replace(/<[^>]*>/g, '') // Supprime les balises HTML
        .replace(/\s+/g, ' ');   // Normalise les espaces

    return cleanContent;
};

// Validation des requêtes de recherche
export const validateSearchQuery = (query) => {
    if (!query || query.length > 200) {
        throw new Error('La requête de recherche doit contenir entre 1 et 200 caractères');
    }

    // Nettoyage de la requête
    return query
        .trim()
        .replace(/[<>]/g, '') // Supprime les caractères potentiellement dangereux
        .replace(/\s+/g, ' ');
};

// Validation des IDs
export const validateId = (id) => {
    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
        throw new Error('ID invalide');
    }
    return Number(id);
};

// Validation des dates
export const validateDate = (date) => {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new Error('Date invalide');
    }
    return parsedDate;
}; 