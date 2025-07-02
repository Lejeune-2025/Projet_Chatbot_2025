import React, { useState, useEffect } from 'react';
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
import GlobalApiAuth from '../Services/GlobalApiAuth';
import { logger } from '../Services/logger';

const AuthScreen = ({ navigation, route }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        general: '',
        showResendButton: false
    });
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState(null);

    // Timer pour le cooldown du renvoi d'email
    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const validateForm = () => {
        const newErrors = {
            email: '',
            password: '',
            confirmPassword: '',
            general: '',
            showResendButton: false
        };

        if (!email) {
            newErrors.email = 'L\'email est requis';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Format d\'email invalide';
        }

        if (!password) {
            newErrors.password = 'Le mot de passe est requis';
        } else if (password.length < 8) {
            newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
        }

        if (!isLogin && password !== confirmPassword) {
            newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== '');
    };

    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            setErrors({});

            // Validation du formulaire
            const validationErrors = validateForm();
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                setIsLoading(false);
                return;
            }

            if (isLogin) {
                const response = await GlobalApiAuth.login({ email, password });
                if (response.needsVerification) {
                    setErrors({
                        general: response.message,
                        showResendButton: true
                    });
                    return;
                }
                if (response.token) {
                    logger.info('[AuthScreen] Connexion réussie, navigation vers Chat');
                    navigation.replace('Chat', {
                        selectedFace: route.params?.selectedFace
                    });
                }
            } else {
                const response = await GlobalApiAuth.register({ email, password });
                if (response.needsVerification) {
                    setErrors({
                        general: response.message,
                        showResendButton: true
                    });
                    return;
                }
                if (response.error) {
                    setErrors(prev => ({ ...prev, general: response.message }));
                    return;
                            }
            }
        } catch (error) {
            logger.error('[AuthScreen] Erreur d\'authentification:', error);
            setErrors(prev => ({ ...prev, general: error.message || 'Une erreur est survenue lors de l\'authentification' }));
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction améliorée pour le renvoi d'email
    const handleResendVerification = async () => {
        try {
            setLoading(true);
            setError(null);
            setVerificationStatus('sending');

            const response = await GlobalApiAuth.resendVerificationEmail(email);
            
            setVerificationStatus('sent');
            setResendCooldown(60); // 60 secondes de cooldown

            Alert.alert(
                'Email envoyé',
                'Un nouvel email de vérification a été envoyé à votre adresse.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            setError(error.message);
            setVerificationStatus('error');
            
            // Gestion spécifique des erreurs
            if (error.message.includes('attendre')) {
                const seconds = parseInt(error.message.match(/\d+/)[0]);
                setResendCooldown(seconds);
            }
            
                Alert.alert(
                    'Erreur',
                error.message,
                    [{ text: 'OK' }]
                );
        } finally {
            setLoading(false);
        }
    };

    // Composant de bouton de renvoi amélioré
    const ResendButton = () => {
        if (loading) {
            return (
                <View style={styles.resendButtonContainer}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.resendButtonText}>Envoi en cours...</Text>
                </View>
            );
        }

        if (resendCooldown > 0) {
            return (
                <TouchableOpacity 
                    style={[styles.resendButton, styles.resendButtonDisabled]}
                    disabled={true}
                >
                    <Text style={styles.resendButtonText}>
                        Réessayer dans {resendCooldown}s
                    </Text>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity 
                style={styles.resendButton}
                onPress={handleResendVerification}
            >
                <Text style={styles.resendButtonText}>Renvoyer l'email</Text>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#ffffff', '#f5f5f5']}
                style={styles.gradient}
            >
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    disabled={isLoading}
                >
                    <Ionicons name="arrow-back" size={24} color="#4CAF50" />
                </TouchableOpacity>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/favicon.jpg')}
                            style={styles.logo}
                            resizeMode="contain"
                            onError={(e) => console.log('Erreur de chargement de l\'image:', e.nativeEvent.error)}
                        />
                        <Text style={styles.title}>
                            {isLogin ? 'Connexion' : 'Inscription'}
                        </Text>
                    </View>

                    {errors.general && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errors.general}</Text>
                            {errors.showResendButton && (
                                <ResendButton />
                            )}
                        </View>
                    )}

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={24} color="#4CAF50" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, errors.email ? styles.inputError : null]}
                                placeholder="Email"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setErrors(prev => ({ ...prev, email: null }));
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!isLoading}
                            />
                        </View>
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={24} color="#4CAF50" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, errors.password ? styles.inputError : null]}
                                placeholder="Mot de passe"
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setErrors(prev => ({ ...prev, password: null }));
                                }}
                                secureTextEntry={!showPassword}
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                                disabled={isLoading}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={24}
                                    color="#4CAF50"
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                        {!isLogin && (
                            <>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={24} color="#4CAF50" style={styles.inputIcon} />
                                <TextInput
                                        style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                                    placeholder="Confirmer le mot de passe"
                                    value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            setErrors(prev => ({ ...prev, confirmPassword: null }));
                                        }}
                                    secureTextEntry={!showPassword}
                                    editable={!isLoading}
                                />
                            </View>
                                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {isLogin ? 'Se connecter' : 'S\'inscrire'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.switchButton}
                            onPress={() => {
                                setIsLogin(!isLogin);
                                setErrors({
                                    email: '',
                                    password: '',
                                    confirmPassword: '',
                                    general: '',
                                    showResendButton: false
                                });
                            }}
                            disabled={isLoading}
                        >
                            <Text style={styles.switchButtonText}>
                                {isLogin
                                    ? 'Pas encore de compte ? S\'inscrire'
                                    : 'Déjà un compte ? Se connecter'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 220,
        height: 200,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 10,
    },
    formContainer: {
        backgroundColor: '#4CAF50',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        width: '85%',
        alignSelf: 'center',
        maxWidth: 400,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        height: 45,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 45,
        fontSize: 15,
    },
    eyeIcon: {
        padding: 8,
    },
    submitButton: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: 'bold',
    },
    switchButton: {
        marginTop: 15,
        alignItems: 'center',
    },
    switchButtonText: {
        color: 'white',
        fontSize: 14,
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
        padding: 10,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ffcdd2'
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10
    },
    inputError: {
        borderColor: '#d32f2f',
        borderWidth: 1
    },
    resendButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    resendButton: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    resendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    resendButtonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 14,
    },
    statusText: {
        textAlign: 'center',
        marginTop: 10,
        color: '#4CAF50',
    }
});

export default AuthScreen; 