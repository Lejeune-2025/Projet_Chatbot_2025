import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AuthStorage from '../Services/AuthStorage';
import HistoryFavorites from './HistoryFavorites';

const Sidebar = ({ isVisible, onClose }) => {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        if (isVisible) {
            loadUserData();
        }
    }, [isVisible]);

    const loadUserData = async () => {
        try {
            const userData = await AuthStorage.getUser();
            console.log("Données utilisateur chargées:", userData);
            setUser(userData);
        } catch (error) {
            console.error('Erreur lors du chargement des données utilisateur:', error);
        }
    };

    // Fonction qui effectue réellement la déconnexion
    const performLogout = async () => {
        try {
            console.log("Déconnexion en cours...");
            setIsLoggingOut(true);
            setShowLogoutConfirm(false);
            
            // Fermer la barre latérale
            if (onClose) {
                console.log("Fermeture de la barre latérale");
                onClose();
            }
            
            // Utiliser la méthode logout d'AuthStorage qui gère la déconnexion côté serveur et client
            await AuthStorage.logout();
            console.log("Déconnexion réussie");
            
            // Redirection vers l'écran de connexion
            console.log("Redirection vers l'écran d'accueil");
            
            // Attendre un court instant pour montrer l'animation de chargement
            setTimeout(() => {
                try {
                    // Naviguer vers Home avec reset pour éviter le retour en arrière
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                } catch (error) {
                    console.error("Erreur lors de la navigation:", error);
                    Alert.alert(
                        "Erreur",
                        "Une erreur est survenue lors de la navigation. Veuillez redémarrer l'application."
                    );
                }
            }, 800); // Délai pour montrer l'animation de chargement
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            Alert.alert(
                "Erreur",
                "Une erreur est survenue lors de la déconnexion. Veuillez réessayer."
            );
            setIsLoggingOut(false);
        }
    };

    const handleLogoutPress = () => {
        setShowLogoutConfirm(true);
    };

    const cancelLogout = () => {
        console.log("Déconnexion annulée");
        setShowLogoutConfirm(false);
    };

    // Si la sidebar n'est pas visible, ne rien rendre
    if (!isVisible) {
        return null;
    }

    return (
        // Conteneur principal de l'écran
        <View style={styles.container}>

            {/* Conteneur interne avec style de contenu */}
            <View style={styles.contentContainer}>

                {/* ScrollView permet le défilement vertical du contenu */}
                <ScrollView style={styles.scrollView}>

                    {/* Section du profil utilisateur */}
                    <View style={styles.profileSection}>
                        {/* Affiche l'avatar de l'utilisateur ou une image par défaut */}
                        <Image
                            source={user?.avatar ? { uri: user.avatar } : require('../../assets/favicon.jpg')}
                            style={styles.avatar}
                        />
                        {/* Nom de l'utilisateur ou texte par défaut */}
                        <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
                        {/* Email de l'utilisateur */}
                        <Text style={styles.userEmail}>{user?.email || ''}</Text>
                    </View>

                    {/* Section de navigation */}
                    <View style={styles.navigationSection}>

                        {/* Bouton vers l'écran d'accueil */}
                        <TouchableOpacity 
                            style={styles.navItem}
                            onPress={() => {
                                navigation.navigate('Home'); // Navigue vers l'accueil
                                onClose(); // Ferme le menu ou le drawer
                            }}
                        >
                            <MaterialIcons name="home" size={24} color="#ffffff" />
                            <Text style={styles.navText}>Accueil</Text>
                        </TouchableOpacity>

                        {/* Bouton pour démarrer une nouvelle conversation avec un bot */}
                        <TouchableOpacity 
                            style={styles.navItem}
                            onPress={() => {
                                navigation.navigate('Chat', { 
                                    selectedFace: {
                                        id: 1,
                                        name: "Souk Bot",
                                        image: "https://img.freepik.com/premium-vector/mascot-robot-pack_844941-9.jpg?ga=GA1.1.2115268387.1745576145&semt=ais_hybrid&w=740"
                                    },
                                    resetConversation: true
                                });
                                onClose(); // Ferme le menu ou le drawer
                            }}
                        >
                            <MaterialIcons name="chat" size={24} color="#ffffff" />
                            <Text style={styles.navText}>Nouvelle conversation</Text>
                        </TouchableOpacity>

                        {/* Section affichant l'historique et les réseaux sociaux */}
                        <View style={styles.historySection}>
                            <Text style={styles.sectionTitle}>Historique & Réseaux Sociaux</Text>
                            {/* Composant personnalisé pour afficher l'historique ou favoris */}
                            <HistoryFavorites />
                        </View>
                    </View>

                    {/* Fenêtre de confirmation avant la déconnexion */}
                    {showLogoutConfirm && (
                        <View style={styles.confirmContainer}>
                            <View style={styles.confirmBox}>
                                <Text style={styles.confirmTitle}>Déconnexion</Text>
                                <Text style={styles.confirmText}>Êtes-vous sûr de vouloir vous déconnecter ?</Text>

                                {/* Boutons d'action pour confirmer ou annuler */}
                                <View style={styles.confirmButtons}>
                                    <TouchableOpacity 
                                        style={[styles.confirmButton, styles.cancelButton]}
                                        onPress={cancelLogout} // Annule la déconnexion
                                    >
                                        <Text style={styles.cancelButtonText}>Annuler</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.confirmButton, styles.confirmLogoutButton]}
                                        onPress={performLogout} // Exécute la déconnexion
                                    >
                                        <Text style={styles.confirmLogoutText}>Déconnecter</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Bouton de déconnexion avec indicateur de chargement si actif */}
                    <View style={styles.footerContainer}>
                        <TouchableOpacity 
                            style={[
                                styles.logoutButton,
                                isLoggingOut && styles.logoutButtonDisabled // Style désactivé si déjà en cours
                            ]}
                            onPress={handleLogoutPress}
                            disabled={isLoggingOut} // Désactive le bouton pendant la déconnexion
                        >
                            {isLoggingOut ? (
                                <>
                                    {/* Affiche un loader pendant le processus de déconnexion */}
                                    <ActivityIndicator size="small" color="#ffffff" />
                                    <Text style={styles.logoutText}>Déconnexion en cours...</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="log-out-outline" size={24} color="#ffffff" />
                                    <Text style={styles.logoutText}>Déconnexion</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Conteneur principal de l'application
    container: {
        flex: 1,
        backgroundColor: '#0A1E3F'
    },
    // Conteneur pour le contenu intérieur
    contentContainer: {
        flex: 1,
        paddingTop: 40, // Ajoute un espace en haut pour éviter le chevauchement avec le haut de l'écran
        backgroundColor: '#0A1E3F'
    },

    // ScrollView pour le contenu déroulant
    scrollView: {
        flex: 1,
    },

    // Section contenant l'image et les infos utilisateur
    profileSection: {
        alignItems: 'center', // Centre les éléments horizontalement
        paddingVertical: 20, // Espace haut/bas
        backgroundColor: '#0A1E3F',
        marginHorizontal: 10,
        marginTop: 10,
        borderRadius: 10, // Coins arrondis
    },

    // Avatar de l'utilisateur
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40, // Cercle parfait
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
    },

    // Nom d'utilisateur
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8f9fa',
        marginBottom: 5,
    },

    // Email de l'utilisateur
    userEmail: {
        fontSize: 14,
        color: '#666',
    },

    // Section de navigation
    navigationSection: {
        padding: 15,
        flex: 1,
    },

    // Élément de navigation (ex : Accueil, Chat)
    navItem: {
        flexDirection: 'row', // Affiche l'icône et le texte côte à côte
        alignItems: 'center',
        padding: 15,
        borderRadius: 8,
        marginBottom: 5,
    },

    // Texte à côté de l'icône de navigation
    navText: {
        marginLeft: 15,
        fontSize: 16,
        color: '#ffffff',
    },

    // Section d'historique et de réseaux sociaux
    historySection: {
        marginTop: 20,
        marginBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 15,
    },

    // Titre de la section
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8f9fa',
        marginBottom: 15,
        paddingHorizontal: 15,
    },

    // Conteneur en bas avec le bouton de déconnexion
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginTop: 'auto' // Push en bas de l'écran
    },

    // Style du bouton de déconnexion
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF5252',
        borderRadius: 10,
        padding: 15,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5, // Effet d'ombre pour Android
    },

    // Style lorsque le bouton est désactivé
    logoutButtonDisabled: {
        backgroundColor: '#FF8A80',
        opacity: 0.7,
    },

    // Texte à l'intérieur du bouton de déconnexion
    logoutText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '600',
    },

    // ✅ Styles pour la boîte de confirmation de déconnexion

    // Conteneur semi-transparent plein écran
    confirmContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', // Fond assombri
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000, // Très au-dessus
    },

    // Boîte blanche au centre avec contenu de confirmation
    confirmBox: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },

    // Titre de la boîte de confirmation
    confirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },

    // Texte d'information de la boîte de confirmation
    confirmText: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
    },

    // Conteneur pour les boutons "Annuler" et "Déconnecter"
    confirmButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },

    // Style de base pour les deux boutons
    confirmButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },

    // Bouton "Annuler"
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },

    // Bouton "Déconnecter"
    confirmLogoutButton: {
        backgroundColor: '#FF5252',
    },

    // Texte du bouton "Annuler"
    cancelButtonText: {
        color: '#333',
    },

    // Texte du bouton "Déconnecter"
    confirmLogoutText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default Sidebar; 