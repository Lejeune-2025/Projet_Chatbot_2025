import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Image,
    ScrollView,
    Linking
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import GlobalApiAuth from '../Services/GlobalApiAuth';
import { logger } from '../Services/logger';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const VerifyEmailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resendCount, setResendCount] = useState(0);
    const email = route.params?.email;
    const [showSpamTip, setShowSpamTip] = useState(false);

    useEffect(() => {
        const token = route.params?.token;
        if (token) {
            verifyEmail(token);
        }
        
        // Afficher l'astuce pour vérifier les spams après 5 secondes
        const timer = setTimeout(() => {
            setShowSpamTip(true);
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [route.params?.token]);

    const verifyEmail = async (token) => {
        setIsLoading(true);
        try {
            const response = await GlobalApiAuth.verifyEmail(token);
            
            if (response.success) {
                Alert.alert(
                    'Email vérifié',
                    response.message || 'Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter.',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.replace('Auth', { screen: 'Login' })
                        }
                    ]
                );
            } else {
                throw new Error(response.error || 'Une erreur est survenue lors de la vérification');
            }
        } catch (error) {
            logger.error('[VerifyEmailScreen] Erreur de vérification:', error);
            Alert.alert(
                'Erreur',
                error.message || 'Une erreur est survenue lors de la vérification de votre email',
                [{ text: 'OK' }]
            );
            setError(error.message || 'Une erreur est survenue lors de la vérification de votre email');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await GlobalApiAuth.resendVerificationEmail(email);
            setResendCount(prev => prev + 1);
            
            if (response.success) {
                Alert.alert(
                    'Email envoyé',
                    'Un nouvel email de vérification a été envoyé à votre adresse. Veuillez vérifier votre boîte mail, y compris les dossiers spam/indésirables.',
                    [{ text: 'OK' }]
                );
                setShowSpamTip(true);
            } else {
                throw new Error(response.message || 'Une erreur est survenue lors de l\'envoi de l\'email de vérification');
            }
        } catch (error) {
            logger.error('[VerifyEmailScreen] Erreur lors du renvoi de l\'email:', error);
            const errorMessage = error.message || 'Une erreur est survenue lors de l\'envoi de l\'email de vérification';
            setError(errorMessage);
            Alert.alert(
                'Erreur',
                errorMessage,
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        setIsLoading(true);
        setError(null);
        if (route.params?.token) {
            verifyEmail(route.params.token);
        }
    };
    
    const openEmailApp = () => {
        // Tentative d'ouverture d'une application email
        Linking.openURL('mailto:').catch(err => {
            Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application email');
        });
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.message}>Vérification de votre email en cours...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.scrollView}>
            <View style={styles.container}>
                <Image
                    source={require('../../assets/favicon.jpg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                
                <View style={styles.contentContainer}>
                    <Ionicons name="mail-outline" size={64} color="#4CAF50" style={styles.icon} />
                    
                    <Text style={styles.title}>Vérification de votre email</Text>
                    
                    <Text style={styles.message}>
                        Un email de vérification a été envoyé à {email}. 
                        Veuillez cliquer sur le lien dans l'email pour activer votre compte.
                    </Text>

                    {error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}
                    
                    {showSpamTip && (
                        <View style={styles.tipContainer}>
                            <MaterialIcons name="info-outline" size={24} color="#FF9800" />
                            <Text style={styles.tipText}>
                                N'oubliez pas de vérifier vos dossiers spam/indésirables. Les emails de vérification y sont souvent filtrés.
                            </Text>
                        </View>
                    )}
                    
                    {resendCount >= 2 && (
                        <View style={styles.troubleshootContainer}>
                            <Text style={styles.troubleshootTitle}>Problèmes de réception ?</Text>
                            <Text style={styles.troubleshootText}>
                                1. Vérifiez vos dossiers spam/indésirables{'\n'}
                                2. Assurez-vous que l'adresse email est correcte{'\n'}
                                3. Essayez avec une adresse email différente{'\n'}
                                4. Contactez le support si le problème persiste
                            </Text>
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={handleResendEmail}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>Renvoyer l'email</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.button, styles.secondaryButton]} 
                            onPress={openEmailApp}
                        >
                            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Ouvrir l'application email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.button, styles.secondaryButton]} 
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Retour à la connexion</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        padding: 20
    },
    logo: {
        width: 150,
        height: 150,
        marginTop: 40,
        marginBottom: 20
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20
    },
    icon: {
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center'
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20
    },
    tipContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF8E1',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800'
    },
    tipText: {
        flex: 1,
        marginLeft: 10,
        color: '#795548',
        fontSize: 14,
        lineHeight: 20
    },
    troubleshootContainer: {
        backgroundColor: '#F5F5F5',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        width: '100%'
    },
    troubleshootTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
        color: '#333'
    },
    troubleshootText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#555'
    },
    buttonContainer: {
        width: '100%',
        gap: 10
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%'
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#4CAF50'
    },
    secondaryButtonText: {
        color: '#4CAF50'
    }
});

export default VerifyEmailScreen; 