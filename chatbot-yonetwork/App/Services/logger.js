const logLevels = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

const LOG_LEVEL = process.env.EXPO_PUBLIC_LOG_LEVEL || 'INFO';

const shouldLog = (level) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    return levels.indexOf(level) >= levels.indexOf(LOG_LEVEL);
};

const log = (level, message, data = {}) => {
    if (!shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (data && Object.keys(data).length > 0) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
};

export const logger = {
    debug: (message, data) => log(logLevels.DEBUG, message, data),
    info: (message, data) => log(logLevels.INFO, message, data),
    warn: (message, data) => log(logLevels.WARN, message, data),
    error: (message, data) => log(logLevels.ERROR, message, data),
    log: (message, data) => log(logLevels.INFO, message, data) // Alias pour compatibilité
}; 