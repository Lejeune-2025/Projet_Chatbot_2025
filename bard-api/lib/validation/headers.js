/**
 * Valide les headers de la requête
 * @param {Headers} headers - Les headers de la requête
 * @returns {{isValid: boolean, message: string}} - Résultat de la validation
 */
export const validateHeaders = (headers) => {
    // Vérification des headers requis
    const requiredHeaders = ['x-platform', 'x-app-version', 'x-nonce'];
    const missingHeaders = requiredHeaders.filter(header => !headers.get(header));

    if (missingHeaders.length > 0) {
        return {
            isValid: false,
            message: `Headers manquants: ${missingHeaders.join(', ')}`
        };
    }

    // Validation de la version de l'application
    const appVersion = headers.get('x-app-version');
    if (!/^\d+\.\d+\.\d+$/.test(appVersion)) {
        return {
            isValid: false,
            message: 'Version de l\'application invalide'
        };
    }

    // Validation de la plateforme
    const platform = headers.get('x-platform');
    const validPlatforms = ['android', 'ios', 'web'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
        return {
            isValid: false,
            message: 'Plateforme non supportée'
        };
    }

    // Validation du nonce
    const nonce = headers.get('x-nonce');
    if (!/^[a-zA-Z0-9-]{36}$/.test(nonce)) {
        return {
            isValid: false,
            message: 'Nonce invalide'
        };
    }

    return {
        isValid: true,
        message: 'Headers valides'
    };
}; 