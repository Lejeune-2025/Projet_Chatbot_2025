/**
 * Valide le format d'un email
 * @param {string} email - L'email à valider
 * @returns {boolean} - True si l'email est valide
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Valide un mot de passe selon des critères de sécurité
 * @param {string} password - Le mot de passe à valider
 * @returns {{isValid: boolean, message: string}} - Résultat de la validation
 */
export const validatePassword = (password) => {
    if (!password) {
        return {
            isValid: false,
            message: "Le mot de passe est requis"
        };
    }

    if (password.length < 8) {
        return {
            isValid: false,
            message: "Le mot de passe doit contenir au moins 8 caractères"
        };
    }

    if (!/[A-Z]/.test(password)) {
        return {
            isValid: false,
            message: "Le mot de passe doit contenir au moins une majuscule"
        };
    }

    if (!/[a-z]/.test(password)) {
        return {
            isValid: false,
            message: "Le mot de passe doit contenir au moins une minuscule"
        };
    }

    if (!/[0-9]/.test(password)) {
        return {
            isValid: false,
            message: "Le mot de passe doit contenir au moins un chiffre"
        };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return {
            isValid: false,
            message: "Le mot de passe doit contenir au moins un caractère spécial"
        };
    }

    return {
        isValid: true,
        message: "Mot de passe valide"
    };
}; 