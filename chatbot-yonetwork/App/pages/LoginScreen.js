// Importation des hooks et composants nécessaires
import React, { useState, useEffect } from 'react';
import { Pressable } from 'react-native';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Importation des services API et stockage
import GlobalApiAuth from '../Services/GlobalApiAuth';
import ChatFaceData from '../Services/ChatFaceData';
import AuthStorage from '../Services/AuthStorage';


// Définition du composant LoginScreen
const LoginScreen = ({ navigation, route }) => {
    // États pour gérer les données du formulaire, erreurs, chargement, mot de passe visible, etc.
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showResend, setShowResend] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState(null);

    // Décrémentation automatique du délai pour le renvoi d'email
    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Fonction de validation du formulaire
    const validateForm = () => {
        const newErrors = {};

        // Vérification de l'email
        if (!formData.email) {
            newErrors.email = 'Veuillez entrer votre adresse email';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Veuillez entrer une adresse email valide (exemple: soukbot@gmail.com)';
        }

        // Vérification du mot de passe
        if (!formData.password) {
            newErrors.password = 'Veuillez entrer votre mot de passe';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Fonction de renvoi de l'email de vérification
    const handleResendVerification = async () => {
        setLoading(true);
        try {
            const response = await GlobalApiAuth.resendVerificationEmail(formData.email);
            setResendCooldown(60); // Bloquer pendant 60s
            Alert.alert('Email envoyé', 'Un nouvel email de vérification a été envoyé.', [{ text: 'OK' }]);
        } catch (error) {
            let errorMessage = error.message || 'Erreur lors du renvoi de l\'email';
            if (errorMessage.includes('attendre')) {
                // Récupérer le nombre de secondes depuis le message d’erreur
                const seconds = parseInt(errorMessage.match(/\d+/)?.[0] || '60', 10);
                setResendCooldown(seconds);
            }
            Alert.alert('Erreur', errorMessage, [{ text: 'OK' }]);
        } finally {
            setLoading(false);
        }
    };

    // Fonction de connexion
    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setError(null);

        try {
            // Appel à l’API d’authentification
            const response = await GlobalApiAuth.login(formData.email, formData.password);
            console.log('Réponse de connexion:', response);

            if (response.token) {
                // Enregistrement des informations d’authentification localement
                await AuthStorage.createAuthSession(
                    response.token,
                    response.user,
                    response.refreshToken,
                    86400 // Durée de session : 24h
                );

                // Création d'une session serveur avec infos du device
                const deviceInfo = {
                    platform: Platform.OS,
                    version: Platform.Version,
                    appVersion: '1.0.0'
                };

                const sessionId = await AuthStorage.createServerSession(
                    response.user.id,
                    deviceInfo
                );

                if (!sessionId) {
                    console.warn('Impossible de créer une session serveur, mais la connexion est réussie');
                }

                // Redirection vers l'écran du chatbot
                navigation.replace('Chat', {
                    selectedFace: route.params?.selectedFace || {
                        id: 1,
                        name: "Chatbot Yonetwork",
                        image: "https://img.freepik.com/premium-vector/mascot-robot-pack_844941-9.jpg?ga=GA1.1.2115268387.1745576145&semt=ais_hybrid&w=740",
                        primary: "#00FF00",
                        secondary: " "
                    }
                });
            } else {
                setError('Erreur de connexion. Veuillez réessayer.');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            if (error.message && error.message.includes('compte non vérifié')) {
                setError('Votre compte n\'est pas encore vérifié. Veuillez vérifier votre email.');
                setShowResend(true);
            } else {
                setError(error.message || 'Une erreur est survenue lors de la connexion');
            }
        } finally {
            setLoading(false);
        }
    };

    // Interface utilisateur
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#OA1E3F', '#F55F55', '#ffffff']}
                style={styles.gradient}
            >
                {/* Bouton de retour */}
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Home')}
                    disabled={loading}
                >
                <Ionicons name="arrow-back" size={24} color="#OA1E3F" />
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.formContainer}>
                        {/* Logo de l'application */}
                        <Image
                            source={require('../../assets/favicon.jpg')}
                            style={styles.logo}
                            resizeMode="cover"
                        />

                        {/* Champ Email */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={24} color="#OA1E3F" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email"
                                    value={formData.email}
                                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        {/* Champ Mot de passe */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={24} color="#OA1E3F" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mot de passe"
                                    value={formData.password}
                                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                                    secureTextEntry={!showPassword}
                                />
                                {/* Afficher/masquer le mot de passe */}
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off' : 'eye'}
                                        size={24}
                                        color="#OA1E3F"
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                        </View>

                        {/* Message d’erreur global */}
                        {error && <Text style={styles.errorText}>{error}</Text>}

                        {/* Bouton de renvoi de l’email de vérification */}
                        {showResend && (
                            <TouchableOpacity
                                style={[styles.loginButton, resendCooldown > 0 && { backgroundColor: '#ccc' }]}
                                onPress={handleResendVerification}
                                disabled={loading || resendCooldown > 0}
                            >
                                <Text style={styles.loginButtonText}>
                                    {resendCooldown > 0
                                        ? `Renvoyer dans ${resendCooldown}s`
                                        : "Renvoyer l'email de vérification"}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Bouton de connexion */}
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.loginButtonText}>Se connecter</Text>
                            )}
                        </TouchableOpacity>

                        {/* Lien vers l’inscription */}
                        <TouchableOpacity
                            style={styles.registerLink}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.registerLinkText}>
                                Pas encore de compte ? S'inscrire
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

// Styles de l’écran
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 75,
    overflow: 'hidden'
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#0A1E3F',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    inputIcon: {
        padding: 10,
    },
    input: {
        flex: 1,
        height: 50,
        paddingHorizontal: 10,
        fontSize: 16,
    },
    eyeIcon: {
        padding: 10,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 5,
    },
    loginButton: {
        backgroundColor: '#0A1E3F',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    
    loginButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    registerLink: {
        marginTop: 15,
        alignItems: 'center',
    },
    registerLinkText: {
        color: '#0A1E3F',
        fontSize: 16,
    },
});

export default LoginScreen;
