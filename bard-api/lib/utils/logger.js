/**
 * Module de journalisation pour le chatbot
 */

// Niveaux de journalisation
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Niveau de journalisation actuel (peut être configuré via les variables d'environnement)
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL ? 
    LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] : 
    LOG_LEVELS.INFO;

/**
 * Formatte un message de journal
 * @param {string} level - Niveau de journalisation
 * @param {string} message - Message à journaliser
 * @param {Object} data - Données supplémentaires à journaliser
 * @returns {string} - Message formatté
 */
function formatLogMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
        try {
            // Limiter la taille des données pour éviter des logs trop volumineux
            const stringifiedData = JSON.stringify(data, (key, value) => {
                // Tronquer les chaînes longues
                if (typeof value === 'string' && value.length > 500) {
                    return value.substring(0, 500) + '... (truncated)';
                }
                return value;
            }, 2);
            logMessage += `\n${stringifiedData}`;
        } catch (error) {
            logMessage += `\n[Error stringifying data: ${error.message}]`;
        }
    }
    
    return logMessage;
}

/**
 * Journalise un message si le niveau est suffisant
 * @param {string} level - Niveau de journalisation
 * @param {number} levelValue - Valeur numérique du niveau
 * @param {string} message - Message à journaliser
 * @param {Object} data - Données supplémentaires à journaliser
 */
function log(level, levelValue, message, data) {
    if (levelValue >= CURRENT_LOG_LEVEL) {
        const formattedMessage = formatLogMessage(level, message, data);
        
        switch (levelValue) {
            case LOG_LEVELS.ERROR:
                console.error(formattedMessage);
                break;
            case LOG_LEVELS.WARN:
                console.warn(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }
}

/**
 * Module de journalisation exporté
 */
const logger = {
    debug: (message, data) => log('DEBUG', LOG_LEVELS.DEBUG, message, data),
    info: (message, data) => log('INFO', LOG_LEVELS.INFO, message, data),
    warn: (message, data) => log('WARN', LOG_LEVELS.WARN, message, data),
    error: (message, data) => log('ERROR', LOG_LEVELS.ERROR, message, data)
};

// Utiliser uniquement l'exportation ESM pour la compatibilité avec "type": "module"
export { logger, LOG_LEVELS }; 