import { CHAT_CONFIG, ERROR_MESSAGES } from './constants';
import { logger } from './logger';

/**
 * Valide un message avant l'envoi
 * @param {string} message - Le message à valider
 * @returns {boolean} - True si le message est valide
 */
export const validateMessage = (message) => {
    if (typeof message !== 'string') {
        logger.error('Message invalide: type incorrect', { message });
        throw new Error(ERROR_MESSAGES.INVALID_TYPE);
    }

    if (message.length < CHAT_CONFIG.MIN_MESSAGE_LENGTH) {
        logger.error('Message trop court', { message });
        throw new Error(ERROR_MESSAGES.MESSAGE_TOO_SHORT);
    }

    if (message.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
        logger.error('Message trop long', { message });
        throw new Error(ERROR_MESSAGES.MESSAGE_TOO_LONG);
    }

    if (!CHAT_CONFIG.MESSAGE_VALIDATION_REGEX.test(message)) {
        logger.error('Message invalide selon la regex', { message });
        throw new Error(ERROR_MESSAGES.INVALID_MESSAGE);
    }

    return true;
}; 