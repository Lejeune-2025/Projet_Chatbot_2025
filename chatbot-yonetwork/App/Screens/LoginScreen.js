const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
        const response = await authService.login(email, password);
        console.log('Réponse de connexion:', response);

        if (response.token) {
            await authService.setToken(response.token);
            await authService.setUser(response.user);
            navigation.replace('Chat');
        } else {
            setError('Erreur de connexion. Veuillez réessayer.');
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
        setError(error.message || 'Une erreur est survenue lors de la connexion');
    } finally {
        setLoading(false);
    }
}; 