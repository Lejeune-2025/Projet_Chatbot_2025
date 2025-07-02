const FALLBACK_RESPONSES = {
    default: "Je suis désolé, je ne peux pas répondre pour le moment. Veuillez réessayer plus tard.",
    greeting: "Bonjour ! Je suis temporairement indisponible. Comment puis-je vous aider ?",
    error: "Une erreur est survenue. Je vais essayer de vous aider du mieux possible.",
    timeout: "Le serveur met un peu plus de temps que prévu à répondre. Pourriez-vous reformuler votre question de manière plus concise ou réessayer dans quelques instants ?",
    TimeoutError: "Le serveur met un peu plus de temps que prévu à répondre. Pourriez-vous reformuler votre question de manière plus concise ou réessayer dans quelques instants ?",
    NetworkError: "Il semble y avoir un problème de connexion. Veuillez vérifier votre connexion internet et réessayer.",
    ServerError: "Le serveur rencontre actuellement des difficultés. Notre équipe technique a été informée et travaille à résoudre ce problème."
};

export const FallbackService = {
    async getResponse(message, errorType = 'default') {
        // Analyse simple du message pour choisir la réponse appropriée
        const lowerMessage = message.toLowerCase();
        
        // Priorité à l'erreur spécifique si elle existe dans nos réponses
        if (errorType && FALLBACK_RESPONSES[errorType]) {
            return {
                reply: FALLBACK_RESPONSES[errorType],
                isFallback: true,
                errorType
            };
        }
        
        // Sinon, analyse du message pour une réponse contextuelle
        let responseType = 'default';

        if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut')) {
            responseType = 'greeting';
        }

        return {
            reply: FALLBACK_RESPONSES[responseType],
            isFallback: true,
            errorType
        };
    }
}; 