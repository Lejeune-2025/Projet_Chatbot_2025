import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Alert, ActivityIndicator, TouchableOpacity, Text, Animated, ScrollView, Dimensions, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { GiftedChat, Bubble, Send, InputToolbar, Composer } from 'react-native-gifted-chat';
import { getBard } from '../Services/GlobalApi';
import { API_CONFIG } from '../Services/constants';
import { conversationHistory } from '../Services/ConversationHistory';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import ChatFaceData from '../Services/ChatFaceData';
import Sidebar from '../components/Sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, MediaType } from 'react-native-image-picker';





// Questions rapides prédéfinies
const QUICK_QUESTIONS = [
    { id: 1, text: '📍 Où nous trouver ?', icon: 'location-on' },
    { id: 2, text: '⏰ Horaires d\'ouverture', icon: 'access-time' },
    { id: 3, text: '📞 Nous contacter', icon: 'phone' },
    { id: 4, text: '💼 Nos services', icon: 'business' }
];

const SIDEBAR_WIDTH = 280;
const SCREEN_WIDTH = Dimensions.get('window').width;

const ChatScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [selectedFace, setSelectedFace] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [showWelcome, setShowWelcome] = useState(true);
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [isRequestInProgress, setIsRequestInProgress] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const abortControllerRef = useRef(null);
    const contentWidth = useRef(new Animated.Value(SCREEN_WIDTH - (isSidebarVisible ? SIDEBAR_WIDTH : 50))).current;
    const [menuButtonOpacity] = useState(new Animated.Value(1));
    const fadeAnim = new Animated.Value(0);
    


    // S'assurer que l'indicateur de frappe est désactivé au démarrage
    useEffect(() => {
        setIsTyping(false);
    }, []);



    // 🔧 Fonction pour nettoyer le Markdown
    const cleanMarkdown = (text) => {
    return text
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // gras
        .replace(/(\*|_)(.*?)\1/g, '$2')   // italique
        .replace(/#+\s?/g, '')             // titres
        .replace(/`+/g, '')                // code inline
        .replace(/!\[.*?\]\(.*?\)/g, '')   // images markdown
        .replace(/\[.*?\]\(.*?\)/g, '')    // liens
        .trim();
};
    

    // Gérer l'affichage/masquage de la sidebar avec animation
    const toggleSidebar = (visible) => {
        setIsSidebarVisible(visible);
        Animated.timing(contentWidth, {
            toValue: visible ? SCREEN_WIDTH - SIDEBAR_WIDTH : SCREEN_WIDTH,
            duration: 300,
            useNativeDriver: false,
        }).start();
        
        // Animer l'opacité du bouton
        Animated.timing(menuButtonOpacity, {
            toValue: visible ? 0 : 1,
            duration: 200,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    };

    // Vérification des paramètres de route et initialisation
    useEffect(() => {
        const initializeChat = async () => {
            try {
                setIsTyping(false); // S'assurer que l'indicateur de frappe est désactivé au démarrage
                
                // Vérifier si on a un ID de conversation dans les paramètres
                if (route.params?.conversationId) {
                    setConversationId(route.params.conversationId);
                    setShowWelcome(false); // Ne pas afficher le message de bienvenue pour une conversation existante
                    
                    // Charger l'historique de la conversation
                    await loadConversationHistory(route.params.conversationId);
                }
                
                if (route.params?.selectedFace) {
                    setSelectedFace(route.params.selectedFace);
                } else {
                    const defaultFace = ChatFaceData[0];
                    setSelectedFace(defaultFace);
                    console.log('Utilisation du chatbot par défaut:', defaultFace);
                }
            } catch (error) {
                console.error('Erreur lors de l\'initialisation du chat:', error);
                Alert.alert(
                    'Erreur',
                    'Impossible de charger le chat. Retour à l\'écran d\'accueil.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
                );
            }
        };

        initializeChat();
    }, [route.params, navigation]);

    // Vérification de la connexion internet
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            if (!state.isConnected) {
                showConnectionAlert();
            }
        });

        return () => unsubscribe();
    }, []);

    // Animation pour l'indicateur de connexion
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isConnected ? 0 : 1,
            duration: 500,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    }, [isConnected, fadeAnim]);

    // Fonction pour charger les nouveaux messages depuis l'historique global
    const loadNewMessagesFromHistory = useCallback(async () => {
        try {
            console.log('🔄 Vérification des nouveaux messages dans l\'historique global...');
            
            // Récupérer l'historique global complet
            const globalHistory = await conversationHistory.getFullHistory();
            
            if (globalHistory.length === 0) {
                console.log('📭 Aucun message dans l\'historique global');
                return;
            }

            // Récupérer l'ID de conversation actuel
            const currentConvId = await conversationHistory.getConversationId();
            console.log('🆔 ID de conversation actuel:', currentConvId);

            // Mettre à jour l'ID de conversation si nécessaire
            if (currentConvId && currentConvId !== conversationId) {
                setConversationId(currentConvId);
                console.log('🔄 ID de conversation mis à jour:', currentConvId);
            }

            // Comparer avec les messages actuellement affichés
            const currentMessageTexts = messages.map(msg => msg.text);
            
            // Identifier les nouveaux messages qui ne sont pas encore affichés
            const newMessages = globalHistory.filter(historyMsg => {
                // Vérifier si ce message n'est pas déjà affiché
                return !currentMessageTexts.includes(historyMsg.content);
            });

            if (newMessages.length > 0) {
                console.log(`📥 ${newMessages.length} nouveaux messages trouvés dans l'historique`);
                
                // Convertir les nouveaux messages au format GiftedChat
                const formattedNewMessages = newMessages.map((msg, index) => ({
                    _id: `history_${Date.now()}_${index}`,
                    text: msg.content,
                    createdAt: new Date(msg.timestamp || Date.now()),
                    user: {
                        _id: msg.role === 'assistant' ? 2 : 1,
                        name: msg.role === 'assistant' ? (selectedFace?.name || 'Assistant') : 'Vous',
                        avatar: msg.role === 'assistant' ? selectedFace?.image : undefined
                    },
                    // Marquer comme message vocal pour le distinguer
                    isVoiceMessage: true
                }));

                // Ajouter les nouveaux messages à l'affichage
                setMessages(previousMessages => {
                    // Trier tous les messages par date pour un affichage chronologique correct
                    const allMessages = [...previousMessages, ...formattedNewMessages];
                    const sortedMessages = allMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    
                    console.log('💬 Messages mis à jour avec l\'historique vocal');
                    return sortedMessages;
                });

                // Masquer l'écran de bienvenue s'il y a de nouveaux messages
                if (showWelcome) {
                    setShowWelcome(false);
                }

                // Afficher une notification discrète à l'utilisateur
                console.log('✅ Conversation vocale intégrée au chat principal');
            } else {
                console.log('✅ Historique déjà à jour');
            }

        } catch (error) {
            console.error('❌ Erreur lors du chargement des nouveaux messages:', error);
        }
    }, [messages, conversationId, selectedFace, showWelcome]);

    // Vérifier les nouveaux messages quand l'écran devient actif
    useFocusEffect(
        useCallback(() => {
            // Délai pour laisser le temps aux autres écrans de sauvegarder
            const timeoutId = setTimeout(() => {
                loadNewMessagesFromHistory();
            }, 500);

            return () => clearTimeout(timeoutId);
        }, [loadNewMessagesFromHistory])
    );

    // Vérification de la configuration
    useEffect(() => {
        console.log('=== Configuration Check ===');
        console.log('Environment API URL:', process.env.EXPO_PUBLIC_API_URL);
        console.log('API_CONFIG:', API_CONFIG);
        console.log('Selected Face:', selectedFace);
        
        const handleConversationReset = async () => {
            // Vérifier si on doit créer une nouvelle conversation
            if (route.params?.resetConversation) {
                console.log('Création d\'une nouvelle conversation demandée');
                
                // Sauvegarder l'historique actuel avant de le réinitialiser
                // Cette étape est optionnelle mais permet de conserver l'historique pour référence future
                if (conversationId) {
                    try {
                        // Ici, on pourrait sauvegarder l'historique actuel dans une autre structure
                        console.log('Sauvegarde de l\'historique de la conversation précédente:', conversationId);
                    } catch (error) {
                        console.error('Erreur lors de la sauvegarde de l\'historique:', error);
                    }
                }
                
                // Réinitialiser l'ID de conversation et l'historique
                await conversationHistory.clear();
                setConversationId(null);
                setMessages([]); // Effacer les messages affichés
                setShowWelcome(true); // Afficher le message de bienvenue
                
                // Pas de message initial automatique, garder seulement le conteneur de bienvenue
                setMessages([]);
                
                console.log('Nouvelle conversation initialisée avec succès');
            }
            // Si on a un ID de conversation spécifique, charger cette conversation
            else if (route.params?.conversationId) {
                console.log('Chargement d\'une conversation existante:', route.params.conversationId);
                // Ne pas effacer l'historique, car on va charger une conversation spécifique
            }
            // Si on n'a ni resetConversation ni conversationId, c'est une nouvelle session
            else if (!route.params?.conversationId) {
                console.log('Nouvelle session, réinitialisation de l\'historique');
                await conversationHistory.clear();
            }
        };
        
        handleConversationReset();
    }, [selectedFace, route.params, setMessages, setShowWelcome]);

    // Initialisation du message de bienvenue
    useEffect(() => {
        // Ne pas afficher le message de bienvenue si on a déjà chargé une conversation
        // sauf si on a explicitement demandé une nouvelle conversation
        const shouldShowWelcome = 
            (selectedFace && !route.params?.conversationId && messages.length === 0) ||
            route.params?.resetConversation;
            
        if (shouldShowWelcome && messages.length === 0) {
            console.log('Écran de discussion monté avec selectedFace :', selectedFace);
            // Pas de message initial automatique, garder seulement le conteneur de bienvenue
            setMessages([]);
        }
    }, [selectedFace, route.params, messages.length]);

    const showConnectionAlert = useCallback(() => {
        Alert.alert(
            'Connexion perdue',
            'Veuillez vérifier votre connexion internet',
            [{ text: 'OK' }]
        );
    }, []);

    // Fonction pour sélectionner une image
    const selectImage = () => {
        const options = {
            mediaType: 'photo',
            includeBase64: false,
            maxHeight: 3000,
            maxWidth: 3000,
            quality: 1.0,
            selectionLimit: 1,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('Sélection d\'image annulée');
                return;
            }

            if (response.errorMessage) {
                console.error('Erreur ImagePicker:', response.errorMessage);
                Alert.alert(
                    'Erreur',
                    'Impossible de sélectionner l\'image. Veuillez réessayer.',
                    [{ text: 'OK' }]
                );
                return;
            }

            if (response.assets && response.assets.length > 0) {
                 const imageUri = response.assets[0].uri;
                 
                 // Stocker l'image sélectionnée pour permettre à l'utilisateur d'ajouter du texte
                 setSelectedImage({
                     uri: imageUri,
                     fileName: response.assets[0].fileName || 'image.jpg',
                     type: response.assets[0].type || 'image/jpeg'
                 });
                 
                 console.log('Image sélectionnée:', imageUri);
             }
        });
    };

    // Fonction pour charger l'historique d'une conversation
    const loadConversationHistory = async (convId) => {
        try {
            setIsLoading(true);
            setIsTyping(false); // S'assurer que l'indicateur de frappe est désactivé pendant le chargement
            console.log(`Chargement de l'historique pour la conversation: ${convId}`);
            
            // Utiliser l'ID de conversation pour ConversationHistory
            // Ne pas effacer l'historique, juste définir l'ID de conversation
            await conversationHistory.setConversationId(convId); // Définir l'ID de conversation
            
            // Appel API pour récupérer les messages de la conversation
            // Utiliser la nouvelle route avec paramètre de requête au lieu de paramètre de chemin
            const apiUrl = `${API_CONFIG.BASE_URL.replace('/api/bard', '/api')}/conversation-messages?id=${convId}`;
            const token = await AsyncStorage.getItem('@auth_token');
            
            if (!token) {
                console.warn('Token manquant pour charger l\'historique');
                return;
            }
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement de l'historique: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Historique chargé:', data);
            
            if (data && Array.isArray(data.messages) && data.messages.length > 0) {
                // Convertir les messages au format GiftedChat
                const formattedMessages = data.messages.map(msg => ({
                    _id: msg.id || Math.random().toString(36).substring(7),
                    text: msg.content,
                    createdAt: new Date(msg.timestamp || msg.created_at),
                    user: {
                        _id: msg.sender_type === 'bot' ? 2 : 1,
                        name: msg.sender_type === 'bot' ? selectedFace?.name || 'Assistant' : 'Vous',
                        avatar: msg.sender_type === 'bot' ? selectedFace?.image : undefined
                    }
                })).reverse(); // GiftedChat affiche les messages du plus récent au plus ancien
                
                setMessages(formattedMessages);
                
                // Reconstruire l'historique pour la continuité de la conversation
                await conversationHistory.clearHistoryOnly(); // Effacer l'historique actuel mais garder l'ID
                for (const msg of data.messages) {
                    await conversationHistory.addMessage(
                        msg.sender_type === 'bot' ? 'assistant' : 'user',
                        msg.content
                    );
                }
            } else {
                // Si pas de messages ou format incorrect, pas de message automatique
                // Garder seulement le conteneur de bienvenue
                setMessages([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'historique:', error);
            Alert.alert('Erreur', 'Impossible de charger l\'historique de la conversation');
        } finally {
            setIsLoading(false);
            setIsTyping(false); // S'assurer que l'indicateur de frappe est désactivé après le chargement
        }
    };

    const onSend = useCallback(async (messages = []) => {
        if (!isConnected) {
            showConnectionAlert();
            return;
        }

        // Si une requête est déjà en cours et qu'on a un contrôleur d'abandon, annuler la requête
        if (isRequestInProgress && abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsRequestInProgress(false);
            setIsLoading(false);
            setIsTyping(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setIsTyping(true); // Activer l'indicateur de frappe
        setShowWelcome(false); // Masquer le message de bienvenue lors de l'envoi d'un message
        setIsRequestInProgress(true);
        
        // Créer un nouveau contrôleur d'abandon
        abortControllerRef.current = new AbortController();
        
        try {
            console.log('=== Début de l\'envoi du message ===');
            console.log('Message à envoyer:', messages[0]?.text || '');
            
            // Si une image est sélectionnée, l'ajouter au message
            let messageToSend = messages[0] || { _id: Math.random().toString(36).substring(7), text: '', createdAt: new Date(), user: { _id: 1 } };
            
            // Vérifier si une image est sélectionnée
            if (selectedImage) {
                console.log('Image sélectionnée:', selectedImage.uri);
                
                // Créer une copie du message avec l'image
                messageToSend = {
                    ...messageToSend,
                    image: selectedImage.uri
                };
                
                // Réinitialiser l'image sélectionnée AVANT d'ajouter le message à l'affichage
                setSelectedImage(null);
            }

            // Ajouter le message à l'interface utilisateur
            setMessages(previousMessages => {
                const newMessages = GiftedChat.append(previousMessages, [messageToSend]);
                console.log('Messages after sending:', newMessages.length);
                return newMessages;
            });
            
            // Extraire uniquement le texte du message pour l'envoyer au serveur
            // Ne pas inclure l'image dans la requête API
            const userMessage = messageToSend.text;
            console.log('Appel de getBard avec le message:', userMessage);
            
            // Si on a un ID de conversation, l'utiliser
            const response = await getBard(userMessage, conversationId, abortControllerRef.current.signal);
            console.log('Réponse reçue de getBard:', response);
            
            // Si la réponse contient un ID de conversation, le sauvegarder
            if (response && response.conversationId) {
                // Si on a un nouvel ID ou pas d'ID précédent, mettre à jour
                if (!conversationId || response.conversationId !== conversationId) {
                    setConversationId(response.conversationId);
                    console.log('ID de conversation mis à jour:', response.conversationId);
                }
            }
            
            if (response && response.reply) {
                // Vérifier si c'est une réponse de fallback
                const isFallback = response.isFallback === true;
                
                const botMessage = {
                    _id: Math.random().toString(36).substring(7),
                    text: response.reply,
                    createdAt: new Date(),
                    user: {
                        _id: 2,
                        name: selectedFace.name,
                        avatar: selectedFace.image,
                    },
                    // Ajouter des métadonnées pour identifier les réponses de fallback
                    isFallback: isFallback,
                    errorType: response.errorType
                };
                
                console.log('Message du bot créé:', botMessage);
                setMessages(previousMessages => GiftedChat.append(previousMessages, [botMessage]));
                
                // Si c'est une réponse de fallback due à un timeout, proposer de réessayer après un délai
                if (isFallback && (response.errorType === 'TimeoutError' || response.errorType === 'timeout')) {
                    // Attendre 5 secondes avant de proposer de réessayer
                    setTimeout(() => {
                        const retryMessage = {
                            _id: Math.random().toString(36).substring(7),
                            text: "Voulez-vous que je réessaie de répondre à votre question de manière plus concise?",
                            createdAt: new Date(),
                            user: {
                                _id: 2,
                                name: selectedFace.name,
                                avatar: selectedFace.image,
                            },
                            quickReplies: {
                                type: 'radio',
                                keepIt: true,
                                values: [
                                    {
                                        title: 'Oui, réessayez',
                                        value: 'retry',
                                    },
                                    {
                                        title: 'Non merci',
                                        value: 'cancel',
                                    }
                                ],
                            }
                        };
                        setMessages(previousMessages => GiftedChat.append(previousMessages, [retryMessage]));
                    }, 5000);
                }
            } else {
                console.error('Réponse invalide de getBard:', response);
                throw new Error('Réponse invalide du serveur');
            }
        } catch (error) {
            // Ne pas afficher d'erreur si la requête a été annulée volontairement
            if (error.name === 'AbortError') {
                console.log('Requête annulée par l\'utilisateur');
                return;
            }
            
            console.error('Erreur dans onSend:', error);
            setError(error.message);
            Alert.alert(
                'Erreur',
                `Impossible d'obtenir une réponse: ${error.message}`,
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
            setIsTyping(false); // Désactiver l'indicateur de frappe
            setIsRequestInProgress(false);
            abortControllerRef.current = null;
        }
    }, [selectedFace, isConnected, conversationId, isRequestInProgress, selectedImage]);

    // Gestionnaire pour les questions rapides
    const handleQuickQuestion = async (question) => {
        setShowWelcome(false);
        await onSend([{
            _id: Math.random().toString(36).substring(7),
            text: question.text,
            createdAt: new Date(),
            user: { _id: 1 }
        }]);
    };

    // Gestionnaire pour les réponses rapides
    const onQuickReply = useCallback((replies) => {
        const reply = replies[0];
        if (reply.value === 'retry') {
            // Récupérer le dernier message de l'utilisateur
            const userMessages = messages.filter(m => m.user._id === 1);
            if (userMessages.length > 0) {
                const lastUserMessage = userMessages[userMessages.length - 1];
                // Reformuler la question pour être plus concise
                const shortenedMessage = `${lastUserMessage.text.substring(0, 100)}${lastUserMessage.text.length > 100 ? '...' : ''}`;
                onSend([{
                    _id: Math.random().toString(36).substring(7),
                    text: shortenedMessage,
                    createdAt: new Date(),
                    user: { _id: 1 }
                }]);
            }
        }
    }, [messages, onSend]);

    // Composant de message de bienvenue
    const WelcomeMessage = () => {
        const [isDropdownOpen, setIsDropdownOpen] = useState(false);
        
        return (
            <View style={styles.welcomeContainer}>
                <View style={styles.welcomeMessage}>
                    <TouchableOpacity 
                        style={styles.dropdownHeader}
                        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <View style={styles.dropdownHeaderContent}>
                            <Text style={styles.welcomeTitle}>👋 Bonjour !</Text>
                            <Text style={styles.welcomeSubtitle}>Posez-moi vos questions sur notre entreprise</Text>
                        </View>
                        <MaterialIcons 
                            name={isDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                            size={24} 
                            color="#0A1E3F" 
                        />
                    </TouchableOpacity>
                    
                    {isDropdownOpen && (
                        <ScrollView style={styles.quickQuestionsContainer}>
                            {QUICK_QUESTIONS.map(question => (
                                <TouchableOpacity
                                    key={question.id}
                                    style={styles.quickQuestionButton}
                                    onPress={() => {
                                        handleQuickQuestion(question);
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    <MaterialIcons name={question.icon} size={20} color="#0A1E3F" />
                                    <Text style={styles.quickQuestionText}>{question.text}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>
        );
    };

// Composant MessageBubble extrait pour une meilleure organisation du code et une meilleure maintenabilité
const MessageBubble = (props) => {
    const { currentMessage } = props;
    const isUser = currentMessage.user._id === 1;

    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
            tension: 100,
            friction: 8,
        }).start();
    }, []);

    return (
        <Animated.View 
            style={[
                {
                    transform: [{ scale: scaleAnim }],
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    marginHorizontal: 10,
                }
            ]}
        >
            <Bubble
                {...props}
                wrapperStyle={{
                    left: {
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#e1e8ed',
                        borderRadius: 20,
                        borderBottomLeftRadius: 5,
                        marginVertical: 4,
                        marginHorizontal: 0,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                    },
                    right: {
                        backgroundColor: 'transparent',
                        marginVertical: 4,
                        marginHorizontal: 0,
                    }
                }}
                renderMessageText={() => {
                    const cleanText = cleanMarkdown(currentMessage.text || '');
                    const lines = cleanText.split('\n').filter(line => line.trim() !== '');

                    return (
                        <LinearGradient
                            colors={isUser ? ['#667eea', '#764ba2'] : ['#ffffff', '#ffffff']}
                            style={{
                                borderRadius: 20,
                                borderBottomRightRadius: isUser ? 5 : 20,
                                borderBottomLeftRadius: isUser ? 20 : 5,
                                padding: 12,
                                maxWidth: '100%',
                            }}
                        >
                            {/* Image */}
                            {currentMessage.image && (
                                <View style={styles.messageImageContainer}>
                                    <Image 
                                        source={{ uri: currentMessage.image }} 
                                        style={styles.messageImage}
                                        resizeMode="contain"
                                    />
                                    <TouchableOpacity 
                                        style={styles.expandImageButton}
                                        onPress={() => setFullScreenImage(currentMessage.image)}
                                    >
                                        <Ionicons name="expand-outline" size={20} color="#555" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Texte structuré ligne par ligne */}
                            {lines.length > 0 ? (
                                lines.map((line, index) => (
                                    <Text
                                        key={index}
                                        style={{
                                            color: isUser ? '#ffffff' : '#333333',
                                            fontSize: 16,
                                            lineHeight: 22,
                                            marginTop: index === 0 ? 0 : 6,
                                        }}
                                    >
                                         {line.trim()}
                                    </Text>
                                ))
                            ) : (
                                <Text style={{ height: 0, width: 0, opacity: 0 }}>{" "}</Text>
                            )}
                        </LinearGradient>
                    );
                }}
            />

            {/* Footer */}
            <View style={[
                styles.messageFooter,
                { alignItems: isUser ? 'flex-end' : 'flex-start' }
            ]}>
                <Text style={styles.messageTime}>
                    {new Date(currentMessage.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </Text>
                <View style={styles.messageReactions}>
                    <TouchableOpacity style={styles.reactionButton}>
                        <Text style={styles.reactionEmoji}>👍</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reactionButton}>
                        <Text style={styles.reactionEmoji}>❤️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reactionButton}>
                        <Text style={styles.reactionEmoji}>😊</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};






const renderBubble = (props) => {
    // Ajouter un indicateur visuel pour les messages vocaux
    const isVoiceMessage = props.currentMessage?.isVoiceMessage;
    
    return (
        <View>
            {isVoiceMessage && (
                <View style={styles.voiceIndicator}>
                    <Ionicons name="mic" size={12} color="#667eea" />
                    <Text style={styles.voiceIndicatorText}>Message vocal</Text>
                </View>
            )}
            <MessageBubble {...props} />
        </View>
    );
};

    const renderSend = (props) => {
        // Si une requête est en cours, afficher le bouton d'annulation
        if (isRequestInProgress) {
            return (
                <Send
                    {...props}
                    containerStyle={styles.sendButtonContainer}
                    alwaysShowSend={true}
                >
                    <TouchableOpacity 
                        style={[styles.sendButton, styles.cancelButton]}
                        onPress={() => onSend([])}
                    >
                        <MaterialIcons name="close" size={24} color="#ffffff" />
                    </TouchableOpacity>
                </Send>
            );
        }
        
        // Sinon, afficher le bouton d'envoi normal
        return (
            <Send
                {...props}
                containerStyle={styles.sendButtonContainer}
                alwaysShowSend={true}
            >
                <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.sendButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialIcons name="send" size={24} color="#ffffff" />
                </LinearGradient>
            </Send>
        );
    };

    // Fonction personnalisée pour afficher la barre d'entrée de texte (input)
// Extracted InputToolbarWithImage component for better code organization and maintainability
const InputToolbarWithImage = (props) => {
    return (
        <View style={styles.inputToolbarWrapper}>
            <View style={styles.inputContainer}>
                <View style={styles.inputWithImageContainer}>
                    {/* Preview of selected image at top left of input bar */}
                    {selectedImage && (
                        <View style={styles.inputImagePreview}>
                            <Image source={{ uri: selectedImage.uri }} style={styles.inputImageThumbnail} />
                            <TouchableOpacity 
                                style={styles.removeInputImageButton} 
                                onPress={() => setSelectedImage(null)}
                            >
                                <Ionicons name="close-circle" size={16} color="#ff6b6b" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={[styles.inputToolbarInner, selectedImage && styles.inputToolbarWithImage]}>
                        <InputToolbar
                            {...props}
                            containerStyle={styles.inputToolbarContainer}
                            primaryStyle={styles.inputToolbarPrimary}
                        />
                    </View>
                </View>
            </View>
            <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.addButton} onPress={selectImage}>
                    <Ionicons name="image" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('VoiceAssistant')}>
                    <Ionicons name="mic" size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const renderInputToolbar = (props) => {
    return <InputToolbarWithImage {...props} />;
};

// Fonction personnalisée pour le champ de texte où l'utilisateur écrit son message
const renderComposer = (props) => {
    return (
        <Composer
            {...props}
            textInputStyle={styles.composerInput}
            placeholderTextColor="#888888"
            placeholder="Poser une question"
            multiline={true}
        />
    );
};

// Fonction pour afficher un indicateur de saisie animé pendant que le bot "écrit"
const renderFooter = () => {
    if (isTyping) {
        return (
            <View style={styles.typingContainer}>
                <TypingIndicator /> {/* Composant animé avec des points animés */}
                <Text style={styles.typingText}>
                    {selectedFace.name} écrit... {/* Affiche le nom de l'avatar ou personne qui écrit */}
                </Text>
            </View>
        );
    }
    return null; // Si personne n'écrit, on ne retourne rien
};

// Fonction pour afficher un message animé si l'utilisateur perd sa connexion Internet
const renderConnectionStatus = () => {
    if (!isConnected) {
        return (
            <Animated.View style={[styles.connectionStatus, { opacity: fadeAnim }]}>
                <Ionicons name="wifi-off" size={20} color="white" /> {/* Icône de WiFi désactivé */}
                <Text style={styles.connectionText}>Pas de connexion internet</Text> {/* Message texte */}
            </Animated.View>
        );
    }
    return null; // Si connecté, aucun message n'est affiché
};


    // Conditional rendering after all hooks
    if (!selectedFace) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Chargement du chat...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Layout fixe contenant à la fois le sidebar et le contenu principal */}
            <View style={styles.layoutContainer}>
                {/* Sidebar avec position absolute */}
                <Animated.View 
                    style={[
                        styles.sidebarContainer,
                        { 
                            transform: [{ 
                                translateX: isSidebarVisible ? 0 : -SIDEBAR_WIDTH 
                            }]
                        }
                    ]}
                >
                    {/* Bouton de fermeture dans la sidebar */}
                    <TouchableOpacity 
                        style={styles.sidebarToggleButton}
                        onPress={() => toggleSidebar(false)}
                    >
                        <Feather name="sidebar" size={24} color="#0A1E3F" />
                    </TouchableOpacity>
                    
                    <Sidebar 
                        isVisible={isSidebarVisible} 
                        onClose={() => toggleSidebar(false)} 
                    />
                </Animated.View>

                {/* Barre d'icônes quand la sidebar est fermée */}
                {!isSidebarVisible && (
                    <View style={styles.collapsedSidebar}>
                        {/* Logo du site */}
                        <View style={styles.collapsedLogo}>
                            <Image 
                                source={require('../../assets/favicon.jpg')}
                                style={styles.collapsedLogoImage}
                                resizeMode="cover"
                            />
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.collapsedIconButton}
                            onPress={() => toggleSidebar(true)}
                        >
                            <Ionicons name="menu" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.collapsedIconButton}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <Ionicons name="home-outline" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.collapsedIconButton}
                            onPress={() => {
                                // Logique pour nouvelle conversation
                                navigation.navigate('Chat', { resetConversation: true });
                            }}
                        >
                            <Ionicons name="add-outline" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Contenu principal qui se redimensionne */}
                <Animated.View 
                    style={[
                        styles.mainContent,
                        { 
                            width: contentWidth,
                            marginLeft: isSidebarVisible ? SIDEBAR_WIDTH : 50
                        }
                    ]}
                >
                 {renderConnectionStatus()}
                    <LinearGradient
                        colors={['#1a1a1a', '#2d2d2d']}
                        style={styles.header}
                    >
                        {/* Bouton d'ouverture de la sidebar dans le header - seulement si sidebar ouverte */}
                        {isSidebarVisible && (
                            <Animated.View style={{ opacity: menuButtonOpacity }}>
                                <TouchableOpacity 
                                    style={styles.menuButton}
                                    onPress={() => toggleSidebar(true)}
                                >
                                    <Ionicons name="menu" size={24} color="#ffffff" />
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                        
                <Image
                    source={{ uri: selectedFace.image }}
                    style={styles.avatar}
                        />
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle}>{selectedFace.name}</Text>
                            <Text style={styles.headerSubtitle}>Informations & Support</Text>
                        </View>
                        <View style={styles.logoContainer}>
                            <Image 
                                source={require('../../assets/favicon.jpg')}
                                style={styles.logo}
                                resizeMode="cover"
                            />        
                        </View>
                    </LinearGradient>
                    
                    {showWelcome && <WelcomeMessage />}
                    

                    
            <GiftedChat
                messages={messages}
                onSend={messages => onSend(messages)}
                user={{ _id: 1 }}
                renderBubble={renderBubble}
                renderSend={renderSend}
                renderInputToolbar={renderInputToolbar}
                renderComposer={renderComposer}
                alwaysShowSend={true}
                scrollToBottom={true}
                scrollToBottomComponent={() => null}
                renderAvatarOnTop={true}
                showUserAvatar={false}
                renderUsernameOnMessage={true}
                inverted={true}
                timeTextStyle={{
                    left: { color: '#fff' },
                    right: { color: 'gray' },
                }}
                renderFooter={renderFooter}
                listViewProps={{
                    style: styles.chatList,
                    contentContainerStyle: styles.chatListContent,
                }}
                onQuickReply={onQuickReply}
                renderMessageImage={() => null}
            />
                </Animated.View>
            </View>
            
            {/* Modal pour afficher l'image en plein écran */}
            <Modal
                visible={fullScreenImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setFullScreenImage(null)}
            >
                <TouchableOpacity 
                    style={styles.fullScreenModalContainer}
                    activeOpacity={1}
                    onPress={() => setFullScreenImage(null)}
                >
                    <TouchableOpacity 
                        style={styles.fullScreenCloseButton}
                        onPress={() => setFullScreenImage(null)}
                    >
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    
                    {fullScreenImage && (
                        <TouchableOpacity 
                            style={styles.fullScreenImageWrapper}
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <Image 
                                source={{ uri: fullScreenImage }} 
                                style={styles.fullScreenImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </Modal>
            

        </View>
    );
};

const styles = StyleSheet.create({
    // Conteneur principal de l'application
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },

    // Conteneur pour la disposition générale en ligne
    layoutContainer: {
        flex: 1,
        flexDirection: 'row',
    },

    // Style de la barre latérale
    sidebarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        zIndex: 1000,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },

    // Bouton pour ouvrir ou fermer la sidebar
    sidebarToggleButton: {
        position: 'absolute',
        top: 20,
        right: 15,
        width: 35,
        height: 35,
        borderRadius: 17.5,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1001,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },

    // Barre d'icônes quand la sidebar est fermée
    collapsedSidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 50,
        backgroundColor: '#1a1a1a',
        zIndex: 900,
        paddingTop: 20,
        alignItems: 'center',
    },
    
    // Conteneur du logo dans la sidebar fermée
    collapsedLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    
    // Image du logo dans la sidebar fermée
    collapsedLogoImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    
    // Bouton d'icône dans la sidebar fermée
    collapsedIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    
    // Conteneur du contenu principal
    mainContent: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },

    // En-tête de l'application
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingTop: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    // Contenu de l'en-tête
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    // Bouton menu dans le header
    menuButton: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        backgroundColor: '#A1E3F',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },

    // Avatar utilisateur
    avatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // Informations utilisateur dans le header
    headerInfo: {
        flex: 1,
        marginLeft: 10,
    },

    // Nom de l'utilisateur
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '400',
        textAlign: 'left',
        flex: 1,
    },

    // Sous-titre (ex: statut) de l'utilisateur
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        marginTop: 2,
        textAlign: 'left',
    },

    // Conteneur du logo
    logoContainer: {
        backgroundColor: '#OA1E3F',
        padding: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        width: 60,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    },

    // Style de l'image du logo
    logo: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        overflow: 'hidden'
    },

    // Conteneur du message de bienvenue
    welcomeContainer: {
        padding: 28,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },

    // Carte contenant le message de bienvenue
    welcomeMessage: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        width: '80%',
        maxWidth: 350,
    },

    // Titre du message de bienvenue
    welcomeTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 6,
        textAlign: 'center',
    },

    // Sous-titre du message de bienvenue
    welcomeSubtitle: {
        fontSize: 13,
        color: '#0A1E3F',
        marginBottom: 12,
        textAlign: 'center',
    },

    // Header du dropdown
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    
    // Contenu du header du dropdown
    dropdownHeaderContent: {
        flex: 1,
    },
    
    // Conteneur des questions rapides
    quickQuestionsContainer: {
        maxHeight: 180,
        marginTop: 10,
    },

    // Boutons pour les questions rapides
    quickQuestionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 20,
        marginBottom: 2,
        borderWidth: 1,
        borderColor: '#0A1E3F'
    },

    // Texte des boutons de questions rapides
    quickQuestionText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#141414'
    },

    // Conteneur de la barre d'entrée du message
    inputToolbarContainer: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        padding: 0,
        margin: 0,
    },

    // Élément principal de la barre d'entrée
    inputToolbarPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#404040',
        borderRadius: 20,
        paddingHorizontal: 15,
        minHeight: 40,
    },

    // Champ de saisie du message
    composerInput: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 0,
        paddingVertical: 10,
        fontSize: 16,
        color: '#ffffff',
        maxHeight: 120,
        minHeight: 40,
        lineHeight: 20,
        flex: 1,
    },

    // Conteneur du bouton d'envoi
    sendButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        marginBottom: 5,
    },

    // Bouton pour envoyer un message
    sendButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },

    // Style pour le bouton d'annulation
    cancelButton: {
        backgroundColor: '#ff6b6b',
        shadowColor: '#ff6b6b',
    },

    // Wrapper pour la barre d'entrée avec boutons d'action
    inputToolbarWrapper: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#2d2d2d',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 25,
        marginHorizontal: 40,
        marginBottom: 30,
        maxWidth: 800,
        alignSelf: 'center',
        width: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },

    // Bouton d'ajout (+)
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#404040',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Bouton Outils
    toolsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#404040',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        minWidth: 80,
    },

    // Texte du bouton Outils
    toolsText: {
        color: '#ffffff',
        fontSize: 14,
        marginLeft: 6,
        fontWeight: '500',
    },

    // Conteneur du champ de saisie
    inputContainer: {
        width: '100%',
        marginBottom: 15,
    },
    
    // Rangée de boutons sous le champ de saisie
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
    },





    // Conteneur de l'aperçu d'image
    imagePreviewContainer: {
        position: 'relative',
        alignItems: 'center',
        marginVertical: 10,
        backgroundColor: '#3a3a3a',
        borderRadius: 15,
        padding: 10,
    },

    // Aperçu de l'image sélectionnée
    imagePreview: {
        width: 120,
        height: 120,
        borderRadius: 10,
        resizeMode: 'cover',
    },

    // Bouton pour supprimer l'image
    removeImageButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 12,
    },

    // Texte de l'aperçu d'image
    imagePreviewText: {
        color: '#ffffff',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Bouton de profil
    profileButton: {
        padding: 4,
    },

    // Avatar de profil
    profileAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#404040',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Initiale du profil
    profileInitial: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Conteneur du message avec animations
    messageContainer: {
        marginVertical: 2,
    },

    // Footer du message avec heure et réactions
    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 4,
    },

    // Style de l'heure du message
    messageTime: {
        fontSize: 12,
        color: '#8e8e93',
        fontWeight: '400',
    },

    // Conteneur des réactions
    messageReactions: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // Bouton de réaction
    reactionButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },

    // Emoji de réaction
    reactionEmoji: {
        fontSize: 14,
    },

    // Conteneur de l'indicateur de frappe
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#f1f3f4',
        borderRadius: 18,
        marginHorizontal: 15,
        marginBottom: 10,
        alignSelf: 'flex-start',
    },

    // Groupe des points de frappe
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // Point de frappe 1
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#9e9e9e',
        marginHorizontal: 2,
    },

    // Point 2 : plus petit
    typingDot2: {
        opacity: 0.7,
        transform: [{ scale: 0.8 }]
    },

    // Point 3 : encore plus petit
    typingDot3: {
        opacity: 0.4,
        transform: [{ scale: 0.6 }]
    },

    // Texte indiquant "Utilisateur est en train d'écrire..."
    typingText: {
        marginLeft: 8,
        fontSize: 13,
        color: '#666',
    },

    // Liste des messages du chat
    chatList: {
        flex: 1,
        width: '100%',
    },

    // Contenu de la liste des messages
    chatListContent: {
        paddingHorizontal: 5,
        paddingBottom: 10,
        alignItems: 'stretch',
    },

    // Bandeau indiquant l'état de connexion
    connectionStatus: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0A1E3F',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        marginTop: 60,
        borderRadius: 8,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },

    // Texte de l'état de connexion
    connectionText: {
        color: 'white',
        marginLeft: 8,
        fontSize: 14,
    },

    // Conteneur de l'écran de chargement
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },

    // Texte affiché pendant le chargement
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },

    // Conteneur pour la barre de saisie avec image
    inputWithImageContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
    },

    // Aperçu de l'image dans la barre de saisie
    inputImagePreview: {
        position: 'relative',
        marginBottom: 8,
        marginLeft: 5,
        alignSelf: 'flex-start',
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },

    // Miniature de l'image dans la barre de saisie
    inputImageThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        resizeMode: 'cover',
        borderWidth: 1,
        borderColor: '#667eea',
    },

    // Bouton pour supprimer l'image dans la barre de saisie
    removeInputImageButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Conteneur de la barre de saisie interne
    inputToolbarInner: {
        flex: 1,
        width: '100%',
    },

    // Style quand une image est présente
    inputToolbarWithImage: {
        marginTop: 0,
        width: '100%',
    },

    // Conteneur de l'image dans le message
    messageImageContainer: {
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 8,
        marginTop: 4,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        backgroundColor: '#f0f0f0',
    },

    // Image dans le message
    messageImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        alignSelf: 'center',
        resizeMode: 'cover',
        aspectRatio: 16/9,
    },

    // Bouton pour agrandir l'image
    expandImageButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
        zIndex: 10,
    },

    // Conteneur du modal pour afficher l'image en plein écran
    fullScreenModalContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Bouton pour fermer le modal
    fullScreenCloseButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },

    // Conteneur de l'image en plein écran
    fullScreenImageWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Image en plein écran
    fullScreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },

    // Styles pour l'indicateur de message vocal
    voiceIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginBottom: 4,
        alignSelf: 'center',
    },
    voiceIndicatorText: {
        fontSize: 10,
        color: '#667eea',
        marginLeft: 4,
        fontWeight: '500',
    },



});


// Ajouter une animation pour les points de typing
// Déclaration d'un composant fonctionnel React Native appelé TypingIndicator
const TypingIndicator = () => {
    // Création des états pour contrôler l'opacité de chaque point animé
    const [dot1Opacity] = useState(new Animated.Value(1));    // Point 1 : commence avec une opacité maximale
    const [dot2Opacity] = useState(new Animated.Value(0.7));  // Point 2 : opacité moyenne
    const [dot3Opacity] = useState(new Animated.Value(0.4));  // Point 3 : opacité minimale

    // Hook useEffect lancé au montage du composant
    useEffect(() => {
        // Fonction récursive qui gère l'animation en boucle
        const animate = () => {
            Animated.sequence([ // Exécute les animations dans un ordre séquentiel
                Animated.parallel([ // Premier groupe d'animations en parallèle
                    Animated.timing(dot1Opacity, {
                        toValue: 0.4, // Point 1 devient plus transparent
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    }),
                    Animated.timing(dot2Opacity, {
                        toValue: 1, // Point 2 devient complètement opaque
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    }),
                    Animated.timing(dot3Opacity, {
                        toValue: 0.7, // Point 3 devient moyennement opaque
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    })
                ]),
                Animated.parallel([ // Deuxième groupe
                    Animated.timing(dot1Opacity, {
                        toValue: 0.7,
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    }),
                    Animated.timing(dot2Opacity, {
                        toValue: 0.4,
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    }),
                    Animated.timing(dot3Opacity, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    })
                ]),
                Animated.parallel([ // Troisième groupe
                    Animated.timing(dot1Opacity, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    }),
                    Animated.timing(dot2Opacity, {
                        toValue: 0.7,
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    }),
                    Animated.timing(dot3Opacity, {
                        toValue: 0.4,
                        duration: 400,
                        useNativeDriver: Platform.OS !== 'web'
                    })
                ])
            ]).start(() => animate()); // Relance l'animation une fois terminée (boucle infinie)
        };

        animate(); // Démarre l'animation au montage du composant
    }, []);

    // Rendu visuel : 3 cercles animés représentant l'indicateur de saisie
    return (
        <View style={styles.typingIndicator}>
            <Animated.View style={[styles.typingDot, { opacity: dot1Opacity }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot2Opacity }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot3Opacity }]} />
        </View>
    );
};


export default ChatScreen;
