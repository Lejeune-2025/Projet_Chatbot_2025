/**
 * Classes d'erreur personnalisées pour l'application
 */

export class APIError extends Error {
    constructor(message, status, details = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

export class NetworkError extends Error {
    constructor(message = 'Erreur de réseau', details = {}) {
        super(message);
        this.name = 'NetworkError';
        this.details = details;
    }
}

export class ValidationError extends Error {
    constructor(message = 'Erreur de validation', details = {}) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

export class TimeoutError extends Error {
    constructor(message = 'La requête a expiré', details = {}) {
        super(message);
        this.name = 'TimeoutError';
        this.details = details;
    }
}

export class ServerError extends Error {
    constructor(message = 'Erreur serveur', status, details = {}) {
        super(message);
        this.name = 'ServerError';
        this.status = status;
        this.details = details;
    }
} 