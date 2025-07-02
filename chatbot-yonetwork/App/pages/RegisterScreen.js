import React, { useState } from 'react';
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
    ActivityIndicator,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GlobalApiAuth from '../Services/GlobalApiAuth';

// Composant d'inscription
const RegisterScreen = ({ navigation }) => {
    // États pour les données du formulaire
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });

    // États pour gérer les erreurs de validation
    const [errors, setErrors] = useState({});

    // État pour indiquer le chargement lors de la soumission
    const [loading, setLoading] = useState(false);

    // États pour afficher/masquer le mot de passe
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Fonction de validation du formulaire
    const validateForm = () => {
        const newErrors = {};

        // Vérifie que l'email est valide
        if (!formData.email) {
            newErrors.email = 'Veuillez entrer votre adresse email';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Veuillez entrer une adresse email valide (exemple: nom@domaine.com)';
        }

        // Vérifie que le mot de passe respecte les règles
        if (!formData.password) {
            newErrors.password = 'Veuillez entrer un mot de passe';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
        }

        // Vérifie la confirmation du mot de passe
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Veuillez confirmer votre mot de passe';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }

        // Enregistre les erreurs et retourne un booléen si le formulaire est valide
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Fonction déclenchée lors de la soumission du formulaire
    const handleSubmit = async () => {
        // Si le formulaire est invalide, affiche une alerte
        if (!validateForm()) {
            Alert.alert(
                'Formulaire incomplet',
                'Veuillez remplir correctement tous les champs du formulaire.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Active le chargement
        setLoading(true);
        try {
            // Appelle l'API d'enregistrement
            const response = await GlobalApiAuth.register(formData.email, formData.password);
            console.log('Réponse d\'inscription:', response);

            // Si une vérification d'email est nécessaire
            if (response.needsVerification) {
                Alert.alert(
                    'Inscription réussie',
                    'Un email de vérification a été envoyé à votre adresse.',
                    [{ text: 'OK' }]
                );
                navigation.navigate('VerifyEmail', { email: formData.email });
            } else {
                // Sinon, redirige vers la connexion
                Alert.alert(
                    'Inscription réussie',
                    'Votre compte a été créé avec succès.',
                    [{ text: 'OK' }]
                );
                navigation.navigate('Login');
            }
        } catch (error) {
            console.error('Erreur d\'inscription:', error);

            // Affiche l’erreur retournée par l’API
            Alert.alert(
                'Erreur d\'inscription',
                error.message || 'Une erreur est survenue lors de l\'inscription',
                [{ text: 'OK' }]
            );
            setErrors({ submit: error.message });
        } finally {
            // Désactive le chargement
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
                        {/* Logo */}
                        <Image
                            source={require('../../assets/favicon.jpg')}
                            style={styles.logo}
                            resizeMode="cover"
                        />

                        {/* Champ email */}
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

                        {/* Champ mot de passe */}
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
                                {/* Icône pour afficher/masquer le mot de passe */}
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

                        {/* Champ confirmation mot de passe */}
                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={24} color="#OA1E3F" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirmer le mot de passe"
                                    value={formData.confirmPassword}
                                    onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                                        size={24}
                                        color="#OA1E3F"
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                        </View>

                        {/* Affiche une erreur de soumission s’il y en a une */}
                        {errors.submit && <Text style={styles.errorText}>{errors.submit}</Text>}

                        {/* Bouton pour s’inscrire */}
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.registerButtonText}>S'inscrire</Text>
                            )}
                        </TouchableOpacity>

                        {/* Lien pour aller à la page de connexion */}
                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.loginLinkText}>
                                Déjà un compte ? Se connecter
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

// Styles de la page
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
        borderColor: '#OA1E3F',
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
    registerButton: {
        backgroundColor: '#0A1E3F',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginLink: {
        marginTop: 15,
        alignItems: 'center',
    },
    loginLinkText: {
        color: '#OA1E3F',
        fontSize: 16,
    },
});

// Export du composant
export default RegisterScreen;
