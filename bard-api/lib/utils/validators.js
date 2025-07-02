import { logger } from './logger.js';

// Validation des données utilisateur
export const validateUser = (userData) => {
    const errors = [];

    if (!userData.email) {
        errors.push('Email is required');
    } else if (!isValidEmail(userData.email)) {
        errors.push('Invalid email format');
    }

    if (!userData.name) {
        errors.push('Name is required');
    } else if (userData.name.length < 2) {
        errors.push('Name must be at least 2 characters long');
    }

    if (userData.role && !['user', 'admin'].includes(userData.role)) {
        errors.push('Invalid role');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validation des données de conversation
export const validateConversation = (conversationData) => {
    const errors = [];

    if (!conversationData.userId) {
        errors.push('User ID is required');
    }

    if (conversationData.status && !['active', 'closed'].includes(conversationData.status)) {
        errors.push('Invalid conversation status');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validation des messages
export const validateMessage = (messageData) => {
    const errors = [];

    if (!messageData.content) {
        errors.push('Message content is required');
    } else if (messageData.content.length > 1000) {
        errors.push('Message content must not exceed 1000 characters');
    }

    if (!messageData.senderType || !['user', 'bot'].includes(messageData.senderType)) {
        errors.push('Invalid sender type');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validation des articles de la base de connaissances
export const validateKnowledgeArticle = (articleData) => {
    const errors = [];

    if (!articleData.title) {
        errors.push('Title is required');
    } else if (articleData.title.length > 255) {
        errors.push('Title must not exceed 255 characters');
    }

    if (!articleData.content) {
        errors.push('Content is required');
    }

    if (articleData.categoryId && !Number.isInteger(Number(articleData.categoryId))) {
        errors.push('Invalid category ID');
    }

    if (articleData.tags && !Array.isArray(articleData.tags)) {
        errors.push('Tags must be an array');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validation des catégories de la base de connaissances
export const validateKnowledgeCategory = (categoryData) => {
    const errors = [];

    if (!categoryData.name) {
        errors.push('Category name is required');
    } else if (categoryData.name.length > 255) {
        errors.push('Category name must not exceed 255 characters');
    }

    if (categoryData.parentId && !Number.isInteger(Number(categoryData.parentId))) {
        errors.push('Invalid parent category ID');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validation d'email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Middleware de validation
export const validateRequest = (validator) => {
    return (req, res, next) => {
        const validation = validator(req.body);
        if (!validation.isValid) {
            logger.warn('Validation failed:', { errors: validation.errors });
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }
        next();
    };
}; 