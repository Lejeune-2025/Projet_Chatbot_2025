import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Linking, Alert, Platform, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AuthStorage from '../Services/AuthStorage';
import { API_CONFIG } from '../Services/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCIAL_MEDIA = [
    {
        id: '1',
        name: 'Facebook',
        icon: 'logo-facebook',
        color: '#3b5998',
        url: 'https://www.facebook.com/yonetwork'
    },
    {
        id: '3',
        name: 'Instagram',
        icon: 'logo-instagram',
        color: '#e1306c',
        url: 'https://www.instagram.com/yonetwork'
    },
    {
        id: '4',
        name: 'LinkedIn',
        icon: 'logo-linkedin',
        color: '#0077b5',
        url: 'https://www.linkedin.com/company/yonetwork'
    }
];

// Définir les périodes pour regrouper les conversations
const TIME_PERIODS = {
    TODAY: 'Aujourd\'hui',
    YESTERDAY: 'Hier',
    THIS_WEEK: 'Cette semaine',
    THIS_MONTH: 'Ce mois-ci',
    OLDER: 'Plus ancien'
};

const HistoryFavorites = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('recent'); // 'recent', 'social', 'search'
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState([]);
    const [groupedConversations, setGroupedConversations] = useState({});
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [currentConversationId, setCurrentConversationId] = useState(null);

    // Charger les données de l'utilisateur au montage du composant
    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AuthStorage.getUser();
                console.log("Données utilisateur chargées dans HistoryFavorites:", userData);
                setUser(userData);
            } catch (error) {
                console.error('Erreur lors du chargement des données utilisateur:', error);
            }
        };

        loadUser();
    }, []);

    // Récupérer l'ID de conversation actuel depuis AsyncStorage
    useEffect(() => {
        const getCurrentConversationId = async () => {
            try {
                const convId = await AsyncStorage.getItem('conversationSessionId');
                if (convId) {
                    setCurrentConversationId(convId);
                    console.log("Conversation actuelle:", convId);
                }
            } catch (error) {
                console.error('Erreur lors de la récupération de l\'ID de conversation:', error);
            }
        };

        getCurrentConversationId();
    }, []);

    // Charger les conversations récentes lorsque l'onglet "recent" est actif
    useEffect(() => {
        if (activeTab === 'recent') {
            loadData();
        }
    }, [activeTab, user]);

    // Grouper les conversations par période
    useEffect(() => {
        if (conversations.length > 0) {
            const grouped = groupConversationsByDate(conversations);
            setGroupedConversations(grouped);
            console.log("Conversations groupées:", grouped);
        }
    }, [conversations]);

    // Fonction pour déterminer la période d'une date
    const getTimePeriod = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Réinitialiser les heures pour comparer uniquement les dates
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        
        // Début de la semaine (lundi)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        
        // Début du mois
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        if (date.getTime() === today.getTime()) {
            return TIME_PERIODS.TODAY;
        } else if (date.getTime() === yesterday.getTime()) {
            return TIME_PERIODS.YESTERDAY;
        } else if (date >= startOfWeek) {
            return TIME_PERIODS.THIS_WEEK;
        } else if (date >= startOfMonth) {
            return TIME_PERIODS.THIS_MONTH;
        } else {
            return TIME_PERIODS.OLDER;
        }
    };

    // Fonction pour grouper les conversations par date
    const groupConversationsByDate = (convs) => {
        const grouped = {};
        
        // Initialiser toutes les périodes avec un tableau vide
        Object.values(TIME_PERIODS).forEach(period => {
            grouped[period] = [];
        });
        
        // Grouper les conversations par période
        convs.forEach(conv => {
            const period = getTimePeriod(conv.timestamp);
            if (!grouped[period]) {
                grouped[period] = [];
            }
            grouped[period].push(conv);
        });
        
        // Filtrer les périodes vides
        return Object.fromEntries(
            Object.entries(grouped).filter(([_, convs]) => convs.length > 0)
        );
    };

    const loadData = async () => {
        console.log("Début de loadData, activeTab:", activeTab);
        if (activeTab !== 'recent') return;

        setIsLoading(true);
        setError(null);
        
        try {
            // Vérifier l'authentification
            const isAuthenticated = await AuthStorage.isAuthenticated();
            
            if (!isAuthenticated) {
                console.warn('Utilisateur non authentifié');
                setError('Veuillez vous connecter pour accéder à votre historique');
                setIsLoading(false);
                return;
            }

            // Récupérer le token (qui est maintenant validé)
            const token = await AuthStorage.getToken();
            const user = await AuthStorage.getUser();
            
            if (!token || !user) {
                console.warn('Token d\'authentification manquant');
                setError('Session expirée, veuillez vous reconnecter');
                setIsLoading(false);
                return;
            }

            // URL de l'API pour récupérer les conversations récentes
            const apiUrl = `${API_CONFIG.CONVERSATIONS_URL}/recent?userId=${user.id}`;
            console.log(`Appel API vers ${apiUrl}`);
            
            // Appel à l'API avec un timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes de timeout
            
            try {
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                // Vérifier la réponse
                console.log("Statut de la réponse API:", response.status);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("Erreur API:", errorData);
                    throw new Error(errorData.error || 'Erreur lors du chargement des conversations');
                }

                // Traiter les données
                const data = await response.json();
                console.log("Données reçues de l'API:", data);
                
                if (data && Array.isArray(data.conversations)) {
                    // Transformer les données de l'API au format attendu par le composant
                    const formattedConversations = data.conversations.map(conv => {
                        // Utiliser le titre fourni par l'API
                        return {
                            id: conv.id,
                            title: conv.title || "Nouvelle conversation",
                            lastMessage: conv.lastMessage ? conv.lastMessage.content : "Pas de message",
                            status: conv.status || 'active',
                            timestamp: conv.createdAt || conv.lastMessage?.createdAt || new Date().toISOString()
                        };
                    });
                    
                    console.log("Conversations formatées:", formattedConversations);
                    setConversations(formattedConversations);
                } else {
                    // Si l'API ne renvoie pas de conversations dans le format attendu
                    console.warn("Format de réponse inattendu:", data);
                    setError('Aucune conversation trouvée');
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('La requête a pris trop de temps. Veuillez vérifier votre connexion.');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error("Erreur lors du chargement des conversations:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        // Recherche locale dans les conversations existantes
        const results = conversations.filter(
            conversation => 
                conversation.title.toLowerCase().includes(query.toLowerCase()) ||
                conversation.lastMessage.toLowerCase().includes(query.toLowerCase())
        );
        
        setSearchResults(results);
    };

    const handleSocialMediaPress = async (url) => {
        console.log(`Tentative d'ouverture de l'URL: ${url}`);
        
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert(
                    "Erreur",
                    "Impossible d'ouvrir ce lien",
                    [{ text: "OK" }]
                );
            }
        } catch (error) {
            console.error("Erreur lors de l'ouverture du lien:", error);
            Alert.alert(
                "Erreur",
                `Impossible d'ouvrir ce lien: ${error.message}`,
                [{ text: "OK" }]
            );
        }
    };

    // Fonction de rendu pour un élément de conversation
const renderConversationItem = ({ item }) => (
    <TouchableOpacity 
        style={[
            styles.conversationItem,
            // Applique un style spécial si c'est la conversation actuellement ouverte
            currentConversationId === item.id && styles.currentConversationItem
        ]}
        onPress={() => {
            // Navigation vers l'écran "Chat" avec l'ID de la conversation sélectionnée
            navigation.navigate('Chat', { conversationId: item.id });
        }}
    >
        <View style={styles.conversationInfo}>
            {/* Titre de la conversation, limité à une ligne */}
            <Text style={styles.conversationTitle} numberOfLines={1}>
                {item.title}
            </Text>

            {/* Dernier message échangé, limité à deux lignes */}
            <Text style={styles.conversationMessage} numberOfLines={2}>
                {item.lastMessage}
            </Text>

            {/* Date du dernier message */}
            <View style={styles.conversationMeta}>
                <Text style={styles.conversationTime}>
                    {new Date(item.timestamp).toLocaleDateString()}
                </Text>
            </View>
        </View>

        {/* Indicateur visuel si cette conversation est la conversation en cours */}
        {currentConversationId === item.id && (
            <View style={styles.currentIndicator} />
        )}
    </TouchableOpacity>
);

// Fonction de rendu pour un en-tête de section (ex: pour regrouper par jour, semaine, etc.)
const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
        {/* Titre de la section (ex: "Aujourd'hui", "Semaine dernière") */}
        <Text style={styles.sectionHeaderText}>{section.title}</Text>

        {/* Ligne séparatrice décorative */}
        <View style={styles.sectionDivider} />
    </View>
);

// Fonction de rendu pour un élément de réseau social (ex: Facebook, Twitter...)
const renderSocialMediaItem = ({ item }) => (
    <TouchableOpacity 
        // Affiche une bordure colorée à gauche basée sur la couleur du réseau
        style={[styles.socialMediaItem, { borderLeftColor: item.color }]}
        onPress={() => handleSocialMediaPress(item.url)} // Ouvre le lien du réseau social
    >
        {/* Icône du réseau social */}
        <FontAwesome5 
            name={item.icon} 
            size={20} 
            color={item.color} 
            style={styles.socialIcon} 
        />

        {/* Nom du réseau social (ex: Facebook, Twitter) */}
        <Text style={styles.socialName}>{item.name}</Text>

        {/* Icône "ouvrir" pour indiquer que cela mène à un lien externe */}
        <Ionicons 
            name="open-outline" 
            size={18} 
            color="#0A1E3F" 
            style={styles.openIcon} 
        />
    </TouchableOpacity>
);


    // Fonction qui retourne dynamiquement le contenu selon l'onglet actif
const renderTabContent = () => {
    console.log("Rendu du contenu de l'onglet:", activeTab);

    switch (activeTab) {
        case 'recent': // ✅ Onglet des conversations récentes
            return (
                <View style={styles.tabContent}>
                    {isLoading ? (
                        // Affiche un loader pendant le chargement
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0A1E3F" />
                            <Text style={styles.loadingText}>Chargement...</Text>
                        </View>
                    ) : error ? (
                        // Affiche un message d'erreur avec un bouton "Réessayer"
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity 
                                style={styles.retryButton}
                                onPress={loadData}
                            >
                                <Text style={styles.retryText}>Réessayer</Text>
                            </TouchableOpacity>
                        </View>
                    ) : conversations.length > 0 ? (
                        // Si des conversations existent, les affiche groupées par période
                        <ScrollView style={styles.scrollableContainer}>
                            {Object.entries(groupedConversations).map(([period, convs]) => (
                                <View key={period}>
                                    {/* En-tête de période (ex: "Aujourd’hui", "Hier") */}
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionHeaderText}>{period}</Text>
                                        <View style={styles.sectionDivider} />
                                    </View>

                                    {/* Liste des conversations pour cette période */}
                                    {convs.map(conversation => (
                                        <TouchableOpacity 
                                            key={conversation.id}
                                            style={[
                                                styles.conversationItem,
                                                // Style spécial si cette conversation est active
                                                currentConversationId === conversation.id && styles.currentConversationItem
                                            ]}
                                            onPress={() => {
                                                // Ouvre la conversation dans l'écran "Chat"
                                                navigation.navigate('Chat', { conversationId: conversation.id });
                                            }}
                                        >
                                            <View style={styles.conversationInfo}>
                                                <Text style={styles.conversationTitle} numberOfLines={1}>
                                                    {conversation.title}
                                                </Text>
                                                <Text style={styles.conversationMessage} numberOfLines={2}>
                                                    {conversation.lastMessage}
                                                </Text>
                                                <View style={styles.conversationMeta}>
                                                    <Text style={styles.conversationTime}>
                                                        {/* Format de l’heure du dernier message */}
                                                        {new Date(conversation.timestamp).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Indicateur visuel si la conversation est active */}
                                            {currentConversationId === conversation.id && (
                                                <View style={styles.currentIndicator} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        // Aucun historique à afficher
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Aucune conversation récente</Text>
                        </View>
                    )}
                </View>
            );

        case 'social': // ✅ Onglet des réseaux sociaux
            return (
                <View style={styles.tabContent}>
                    <FlatList
                        data={SOCIAL_MEDIA} // Données des réseaux sociaux
                        renderItem={renderSocialMediaItem} // Fonction pour afficher chaque réseau
                        keyExtractor={item => item.id} // Clé unique
                        contentContainerStyle={styles.listContent}
                    />
                </View>
            );

        case 'search': // ✅ Onglet de recherche
            return (
                <View style={styles.tabContent}>
                    {/* Champ de recherche avec icône de loupe */}
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher dans l'historique..."
                            value={searchQuery}
                            onChangeText={handleSearch} // Gère la saisie utilisateur
                            autoCapitalize="none"
                        />

                        {/* Bouton pour vider la recherche */}
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                            >
                                <Ionicons name="close-circle" size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Résultats de recherche */}
                    {searchQuery.length > 0 ? (
                        searchResults && searchResults.length > 0 ? (
                            <FlatList
                                data={searchResults}
                                renderItem={renderConversationItem}
                                keyExtractor={item => item.id.toString()}
                                contentContainerStyle={styles.listContent}
                            />
                        ) : (
                            // Aucun résultat trouvé
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
                            </View>
                        )
                    ) : (
                        // L'utilisateur n'a rien encore saisi
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Entrez un terme de recherche</Text>
                        </View>
                    )}
                </View>
            );

        default:
            return null; // Pour tout autre onglet non reconnu
    }
};


    return (
        <View style={styles.container}>
    
    {/* --- Barre d'onglets supérieure --- */}
    <View style={styles.tabsContainer}>

        {/* --- Onglet "Récent" --- */}
        <TouchableOpacity
            style={[styles.tab, activeTab === 'recent' && styles.activeTab]} // Style actif si onglet sélectionné
            onPress={() => {
                console.log("Onglet recent pressé");
                setActiveTab('recent'); // Active l'onglet "recent"
            }}
        >
            {/* Icône horloge pour "Historique" */}
            <MaterialIcons
                name="history"
                size={24}
                color={activeTab === 'recent' ? '#0A1E3F' : '#999'} // Couleur différente si actif
            />
            {/* Libellé de l'onglet */}
            <Text style={[styles.tabLabel, activeTab === 'recent' && styles.activeTabLabel]}>
                Récent
            </Text>
        </TouchableOpacity>

        {/* --- Onglet "Réseaux" --- */}
        <TouchableOpacity
            style={[styles.tab, activeTab === 'social' && styles.activeTab]}
            onPress={() => {
                console.log("Onglet social pressé");
                setActiveTab('social'); // Active l'onglet "social"
            }}
        >
            {/* Icône utilisateurs */}
            <MaterialIcons
                name="people"
                size={24}
                color={activeTab === 'social' ? '#0A1E3F' : '#999'}
            />
            {/* Libellé de l'onglet */}
            <Text style={[styles.tabLabel, activeTab === 'social' && styles.activeTabLabel]}>
                Réseaux
            </Text>
        </TouchableOpacity>

        {/* --- Onglet "Recherche" --- */}
        <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => {
                console.log("Onglet search pressé");
                setActiveTab('search'); // Active l'onglet "search"
            }}
        >
            {/* Icône loupe */}
            <MaterialIcons
                name="search"
                size={24}
                color={activeTab === 'search' ? '#0A1E3F' : '#999'}
            />
            {/* Libellé de l'onglet */}
            <Text style={[styles.tabLabel, activeTab === 'search' && styles.activeTabLabel]}>
                Recherche
            </Text>
        </TouchableOpacity>
    </View>

    {/* --- Affiche le contenu en fonction de l’onglet actif --- */}
    {renderTabContent()}
</View>

    );
};

const styles = StyleSheet.create({
    // Conteneur principal de la vue
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5', // fond gris clair
        borderRadius: 10, // coins arrondis
        overflow: 'hidden', // évite que les enfants dépassent
        marginTop: 10
    },

    // Conteneur des onglets (barre en haut)
    tabsContainer: {
        flexDirection: 'row', // affichage horizontal
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },

    // Style général d’un onglet
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        flexDirection: 'row', // icône + texte côte à côte
        justifyContent: 'center',
    },

    // Style appliqué à l’onglet actif
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#4CAF50', // vert clair
    },

    // Texte des onglets
    tabLabel: {
        fontSize: 12,
        color: '#0A1E3F',
        marginLeft: 4
    },

    // Style du texte d’un onglet actif
    activeTabLabel: {
        color: '#4CAF50',
        fontWeight: 'bold'
    },

    // Conteneur du contenu affiché dans chaque onglet
    tabContent: {
        flex: 1,
        padding: 10
    },

    // Padding pour le contenu scrollable
    listContent: {
        paddingBottom: 10
    },

    // Élément de conversation
    conversationItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
        position: 'relative'
    },

    // Style spécial pour la conversation sélectionnée
    currentConversationItem: {
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        backgroundColor: '#f0f9f0'
    },

    // Petit indicateur visuel sur la droite pour la conversation active
    currentIndicator: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#4CAF50',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8
    },

    // Conteneur texte + infos de la conversation
    conversationInfo: {
        flex: 1
    },

    conversationTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#333'
    },

    conversationMessage: {
        fontSize: 12,
        color: '#666',
        marginTop: 4
    },

    conversationMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6
    },

    conversationTime: {
        fontSize: 10,
        color: '#999'
    },

    // En-tête de section (ex: Aujourd’hui, Hier…)
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 4
    },

    sectionHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginRight: 8
    },

    sectionDivider: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0'
    },

    // Conteneur d'attente (chargement)
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },

    loadingText: {
        marginTop: 10,
        color: '#666'
    },

    // Conteneur en cas d'erreur
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },

    errorText: {
        color: '#d32f2f',
        textAlign: 'center',
        marginBottom: 10
    },

    retryButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4
    },

    retryText: {
        color: '#fff',
        fontWeight: 'bold'
    },

    // Conteneur en cas de données vides
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },

    emptyText: {
        color: '#999',
        textAlign: 'center'
    },

    // Barre de recherche
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        height: 40
    },

    searchIcon: {
        marginRight: 8
    },

    searchInput: {
        flex: 1,
        height: 40
    },

    // Élément de réseau social
    socialMediaItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
        borderLeftWidth: 4 // couleur dynamique selon la plateforme (Facebook, Twitter…)
    },

    socialIcon: {
        marginRight: 12
    },

    socialName: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 14,
        color: '#333'
    },

    openIcon: {
        marginLeft: 8
    },

    // Limite la hauteur des scrollView dans certaines vues
    scrollableContainer: {
        flex: 1,
        width: '100%',
        maxHeight: 300,
    },
});

export default HistoryFavorites; 