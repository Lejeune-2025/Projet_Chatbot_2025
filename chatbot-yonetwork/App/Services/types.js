/**
 * @typedef {Object} Message
 * @property {string} text - Le contenu du message
 * @property {'user' | 'assistant'} role - Le rôle de l'émetteur
 * @property {Date} timestamp - La date d'envoi du message
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} reply - La réponse du chatbot
 * @property {string} [error] - Message d'erreur optionnel
 */

/**
 * @typedef {Object} ApiError
 * @property {string} message - Le message d'erreur
 * @property {number} status - Le code d'erreur HTTP
 * @property {any} [details] - Détails supplémentaires optionnels
 */

/**
 * @typedef {Object} ChatConfig
 * @property {number} maxMessageLength - Longueur maximale du message
 * @property {number} minMessageLength - Longueur minimale du message
 * @property {RegExp} messageValidationRegex - Regex de validation
 */

/**
 * @typedef {Object} User
 * @property {string} id - Identifiant de l'utilisateur
 * @property {string} name - Nom de l'utilisateur
 * @property {string} [avatar] - Avatar de l'utilisateur (optionnel)
 */

export const types = {
    Message: /** @type {Message} */ ({}),
    ChatResponse: /** @type {ChatResponse} */ ({}),
    ApiError: /** @type {ApiError} */ ({}),
    ChatConfig: /** @type {ChatConfig} */ ({}),
    User: /** @type {User} */ ({})
}; 