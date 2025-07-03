import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    Alert, 
    Platform,
    Animated,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getBard } from '../Services/GlobalApi';
import { conversationHistory as globalConversationHistory } from '../Services/ConversationHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Imports pour l'assistant vocal - avec gestion d'erreurs
let VoiceAssistantService, VoiceCommandProcessor, VoiceSettings, VoiceFlowService;
try {
    VoiceAssistantService = require('../Services/Voice/VoiceAssistantService').default;
    VoiceCommandProcessor = require('../Services/Voice/VoiceCommandProcessor').default;
    VoiceSettings = require('../components/Voice/VoiceSettings').default;
    VoiceFlowService = require('../Services/VoiceFlowService').default;
} catch (error) {
    console.warn('Erreur lors du chargement des services vocaux:', error);
    // Fallback - composants/services vides
    VoiceAssistantService = {
        initialize: () => Promise.resolve(),
        setCallbacks: () => {},
        speak: () => {},
        startListening: () => Promise.resolve(),
        stopListening: () => Promise.resolve(),
        setConversationMode: () => {},
        cleanup: () => {}
    };
    VoiceCommandProcessor = {
        processText: () => null
    };
    VoiceSettings = ({ visible, onClose }) => null;
    VoiceFlowService = {
        initialize: () => Promise.resolve(),
        startConversation: () => {},
        processUserInput: () => null,
        processBotResponse: () => null,
        cleanup: () => {}
    };
}

const { width, height } = Dimensions.get('window');

const VoiceAssistantScreen = () => {
    const navigation = useNavigation();
    
    // États pour l'assistant vocal
    const [isVoiceListening, setIsVoiceListening] = useState(false);
    const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
    const [voiceError, setVoiceError] = useState(null);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [showWelcome, setShowWelcome] = useState(true);
    const [conversationId, setConversationId] = useState(null);
    const [voiceFlow, setVoiceFlow] = useState(null);
    const [currentRequestController, setCurrentRequestController] = useState(null);
    
    // Refs pour animations
    const scrollViewRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const typingAnim = useRef(new Animated.Value(0)).current;

    // Animation pour les ondes sonores
    const [waveAnimation] = useState(new Animated.Value(0));

    // Initialiser l'assistant vocal
    useEffect(() => {
        const initVoiceAssistant = async () => {
            try {
                console.log('Initialisation de l\'assistant vocal...');
                
                // Essayer d'initialiser les vrais services vocaux
                if (VoiceAssistantService && VoiceAssistantService.initialize) {
                    await VoiceAssistantService.initialize();
                    
                    // Initialiser le service de fluidité
                    if (VoiceFlowService) {
                        const flowService = new VoiceFlowService();
                        await flowService.initialize();
                        setVoiceFlow(flowService);
                        
                        // Démarrer la conversation
                        flowService.startConversation();
                        
                        // Configurer les callbacks du service de fluidité
                        flowService.setCallbacks({
                            onConversationStart: () => {
                                console.log('🎯 Conversation fluide démarrée');
                            },
                            onConversationEnd: () => {
                                console.log('🎯 Conversation fluide terminée');
                            },
                            onSilenceDetected: () => {
                                console.log('🔇 Silence détecté - pause conversation');
                                // Optionnel : arrêter l'écoute après silence prolongé
                                if (VoiceAssistantService && VoiceAssistantService.stopListening) {
                                    VoiceAssistantService.stopListening();
                                }
                            }
                        });
                    }
                    
                    // Configurer les callbacks pour une conversation fluide
                    VoiceAssistantService.setCallbacks({
                        onSpeechStart: () => {
                            console.log('🎤 Début d\'écoute');
                            setIsVoiceListening(true);
                            setVoiceError(null);
                            setCurrentTranscript('');
                            setShowWelcome(false);
                            startWaveAnimation();
                            startPulseAnimation();
                        },
                        onSpeechEnd: () => {
                            console.log('🎤 Fin d\'écoute');
                            setIsVoiceListening(false);
                            setIsProcessing(true);
                            stopWaveAnimation();
                            pulseAnim.setValue(1);
                        },
                        onSpeechResults: async (e) => {
                            const transcript = e.value?.[0] || '';
                            const confidence = e.confidence || 1.0;
                            console.log('🎤 Transcription reçue:', transcript);
                            setCurrentTranscript('');
                            setIsProcessing(false);
                            
                            // Utiliser le service de fluidité pour traiter l'input
                            if (voiceFlow) {
                                try {
                                    const processedTranscript = await voiceFlow.processUserInput(transcript, confidence);
                                    
                                    if (processedTranscript === null) {
                                        // Commande d'arrêt détectée
                                        console.log('🛑 Commande d\'arrêt détectée');
                                        return;
                                    }
                                    
                                    if (processedTranscript && processedTranscript.trim()) {
                                        addToHistory('user', processedTranscript);
                                        setIsProcessing(true);
                                        startTypingAnimation();
                                        handleVoiceCommand(processedTranscript);
                                    }
                                } catch (error) {
                                    console.error('❌ Erreur lors du traitement de fluidité:', error);
                                    // Fallback au traitement classique
                                    if (transcript.trim() && transcript.length > 2) {
                                        addToHistory('user', transcript);
                                        setIsProcessing(true);
                                        startTypingAnimation();
                                        handleVoiceCommand(transcript);
                                    }
                                }
                            } else {
                                // Traitement classique si pas de service de fluidité
                                if (transcript.trim() && transcript.length > 2) {
                                    addToHistory('user', transcript);
                                    setIsProcessing(true);
                                    startTypingAnimation();
                                    handleVoiceCommand(transcript);
                                } else if (transcript.trim().length <= 2) {
                                    console.log('🎤 Transcription trop courte, ignorée');
                                    setIsProcessing(false);
                                }
                            }
                        },
                        onSpeechPartialResults: (e) => {
                            const partialTranscript = e.value?.[0] || '';
                            setCurrentTranscript(partialTranscript);
                        },
                        onSpeechError: (e) => {
                            console.error('🎤 Erreur vocale:', e);
                            let errorMessage = 'Erreur de reconnaissance vocale';
                            
                            // Messages d'erreur plus spécifiques
                            if (e.error?.message?.includes('not-allowed')) {
                                errorMessage = 'Veuillez autoriser l\'accès au microphone';
                            } else if (e.error?.message?.includes('network')) {
                                errorMessage = 'Problème de connexion réseau';
                            } else if (e.error?.message?.includes('no-speech')) {
                                errorMessage = 'Aucune parole détectée';
                            }
                            
                            setVoiceError(errorMessage);
                            setIsVoiceListening(false);
                            setIsProcessing(false);
                            setCurrentTranscript('');
                            stopWaveAnimation();
                            pulseAnim.setValue(1);
                        },
                        onSpeakStart: () => {
                            console.log('🔊 Début de synthèse');
                            setIsVoiceSpeaking(true);
                            setIsProcessing(false);
                            stopTypingAnimation();
                        },
                        onSpeakDone: () => {
                            console.log('🔊 Fin de synthèse');
                            setIsVoiceSpeaking(false);
                            
                            // Auto-redémarrage de l'écoute pour une conversation fluide
                            if (Platform.OS === 'web') {
                                setTimeout(() => {
                                    if (!isVoiceListening && !isVoiceSpeaking) {
                                        console.log('🔄 Redémarrage automatique de l\'écoute');
                                        toggleVoiceListening();
                                    }
                                }, 1000);
                            }
                        },
                        onSpeakError: (error) => {
                            console.error('🔊 Erreur de synthèse vocale:', error);
                            setIsVoiceSpeaking(false);
                            setIsProcessing(false);
                        }
                    });
                    
                    setIsInitialized(true);
                    
                    // Démarrer les animations de base
                    startWaveAnimation();
                    startPulseAnimation();
                    
                } else {
                    // Fallback mode - mais toujours connecté à l'IA
                    console.warn('Services vocaux non disponibles, mode texte activé');
                    setIsInitialized(true);
                    try {
                        const welcomeResponse = await getChatbotResponse("Bonjour, l'assistant vocal est en mode texte");
                        addToHistory('assistant', welcomeResponse.text);
                    } catch (error) {
                        addToHistory('assistant', "Bonjour ! Je suis votre assistant vocal connecté à l'IA. La synthèse vocale n'est pas disponible mais je peux répondre par écrit. Comment puis-je vous aider ?");
                    }
                }
                
            } catch (error) {
                console.error('Erreur lors de l\'initialisation de l\'assistant vocal:', error);
                setVoiceError('Fonctionnalités vocales limitées sur cette plateforme');
                setIsInitialized(true);
                
                // Même en cas d'erreur, essayer de se connecter à l'IA
                try {
                    const errorResponse = await getChatbotResponse("L'assistant vocal a des problèmes techniques mais je peux répondre");
                    addToHistory('assistant', errorResponse.text);
                } catch (aiError) {
                    addToHistory('assistant', "Assistant vocal connecté à l'IA mais avec fonctionnalités limitées. Je peux répondre par écrit. Comment puis-je vous aider ?");
                }
            }
        };

        initVoiceAssistant();

        // Cleanup
        return () => {
            if (VoiceAssistantService && VoiceAssistantService.cleanup) {
                VoiceAssistantService.cleanup();
            }
            if (voiceFlow && voiceFlow.cleanup) {
                voiceFlow.cleanup();
            }
        };
    }, []);

    // Animation fluide continue pour l'orbe central
    const startWaveAnimation = () => {
        Animated.loop(
            Animated.timing(waveAnimation, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();
    };

    const stopWaveAnimation = () => {
        waveAnimation.stopAnimation();
        waveAnimation.setValue(0);
    };

    // Animation de pulsation douce pour l'orbe
    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    // Animation de frappe comme ChatGPT
    const startTypingAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(typingAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(typingAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const stopTypingAnimation = () => {
        typingAnim.stopAnimation();
        typingAnim.setValue(0);
    };

    // Ajouter un message à l'historique
    const addToHistory = (sender, text) => {
        const newMessage = {
            id: Date.now(),
            sender,
            text,
            timestamp: new Date().toLocaleTimeString()
        };
        setConversationHistory(prev => {
            const newHistory = [...prev, newMessage];
            // Auto-scroll vers le bas après un court délai
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return newHistory;
        });
    };

    // Obtenir une réponse du chatbot IA connecté à la base de données
    const getChatbotResponse = async (transcript) => {
        // Créer un AbortController pour pouvoir annuler la requête
        const controller = new AbortController();
        setCurrentRequestController(controller);

        try {
            console.log('🤖 Envoi de la question au chatbot :', transcript);
            
            // Utiliser la même API que le chatbot principal avec AbortSignal
            const response = await getBard(transcript, conversationId, controller.signal);
            
            // Vérifier si la requête n'a pas été annulée
            if (controller.signal.aborted) {
                console.log('🚫 Requête annulée par l\'utilisateur');
                return null;
            }
            
            if (response && response.reply) {
                // Mettre à jour l'ID de conversation si fourni
                if (response.conversationId && response.conversationId !== conversationId) {
                    setConversationId(response.conversationId);
                    console.log('🆔 ID de conversation mis à jour:', response.conversationId);
                }
                
                // Nettoyer la réponse des balises markdown pour la synthèse vocale
                const cleanResponse = cleanTextForSpeech(response.reply);
                console.log('✅ Réponse reçue du chatbot');
                
                // Effacer le controller puisque la requête est terminée
                setCurrentRequestController(null);
                
                return {
                    text: response.reply, // Texte complet pour l'affichage
                    speech: cleanResponse, // Texte nettoyé pour la synthèse vocale
                    isSuccess: true
                };
            } else {
                throw new Error('Réponse vide du serveur');
            }
        } catch (error) {
            // Effacer le controller
            setCurrentRequestController(null);
            
            // Si c'est une erreur d'annulation, ne pas afficher d'erreur
            if (error.name === 'AbortError' || controller.signal.aborted) {
                console.log('🚫 Requête annulée');
                return null;
            }
            
            console.error('❌ Erreur lors de l\'appel à l\'IA:', error);
            
            // Réponse de fallback en cas d'erreur
            return {
                text: `Désolé, je n'ai pas pu traiter votre demande "${transcript}". Pouvez-vous reformuler ou réessayer ?`,
                speech: `Désolé, je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ou réessayer ?`,
                isSuccess: false
            };
        }
    };

    // Nettoyer le texte pour la synthèse vocale (comme dans ChatScreen)
    const cleanTextForSpeech = (text) => {
        return text
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // gras
            .replace(/(\*|_)(.*?)\1/g, '$2')   // italique
            .replace(/#+\s?/g, '')             // titres
            .replace(/`+/g, '')                // code inline
            .replace(/!\[.*?\]\(.*?\)/g, '')   // images markdown
            .replace(/\[.*?\]\(.*?\)/g, '')    // liens
            .trim();
    };

    // Gérer les commandes vocales et les questions du chatbot
    const handleVoiceCommand = async (transcript) => {
        try {
            // D'abord vérifier si c'est une commande système
            if (VoiceCommandProcessor && VoiceCommandProcessor.processText) {
                const result = VoiceCommandProcessor.processText(transcript);
                
                if (result) {
                    // Exécuter l'action de la commande système
                    switch (result.action) {
                        case 'stopListening':
                            if (VoiceAssistantService && VoiceAssistantService.stopListening) {
                                await VoiceAssistantService.stopListening();
                            }
                            return;
                            
                        case 'clearChat':
                            setConversationHistory([]);
                            setConversationId(null);
                            // Effacer aussi l'historique du service de conversation
                            await conversationHistory.clear();
                            const clearMessage = "Historique effacé. Comment puis-je vous aider ?";
                            addToHistory('assistant', clearMessage);
                            if (VoiceAssistantService && VoiceAssistantService.speak) {
                                VoiceAssistantService.speak(clearMessage);
                            }
                            return;
                            
                        case 'navigateBack':
                            const exitMessage = "Je ferme l'assistant vocal. Au revoir !";
                            if (VoiceAssistantService && VoiceAssistantService.speak) {
                                VoiceAssistantService.speak(exitMessage);
                            }
                            setTimeout(() => navigation.goBack(), 2000);
                            return;
                            
                        default:
                            if (result.message) {
                                addToHistory('assistant', result.message);
                                if (VoiceAssistantService && VoiceAssistantService.speak) {
                                    VoiceAssistantService.speak(result.message);
                                }
                                return;
                            }
                    }
                }
            }
            
            // Si ce n'est pas une commande système, utiliser l'IA du chatbot
            console.log('🧠 Traitement de la question avec l\'IA du chatbot...');
            
            // Obtenir la réponse du chatbot connecté à la base de données
            const response = await getChatbotResponse(transcript);
            
            // Vérifier si la requête n'a pas été annulée
            if (response === null) {
                console.log('🚫 Requête annulée, arrêt du traitement');
                setIsProcessing(false);
                stopTypingAnimation();
                return;
            }
            
            if (response.isSuccess) {
                // Traiter la réponse avec le service de fluidité
                let optimizedResponse = response.text;
                let speechText = response.speech;
                
                if (voiceFlow) {
                    try {
                        optimizedResponse = await voiceFlow.processBotResponse(response.text);
                        speechText = optimizedResponse;
                        console.log('🎯 Réponse optimisée pour la fluidité');
                    } catch (error) {
                        console.error('❌ Erreur lors de l\'optimisation de la réponse:', error);
                        // Utiliser la réponse originale en cas d'erreur
                        optimizedResponse = response.text;
                        speechText = response.speech;
                    }
                }
                
                // Ajouter le message à l'historique local pour affichage
                addToHistory('assistant', optimizedResponse);
                
                // IMPORTANT: Les messages sont automatiquement sauvés dans l'historique global
                // via getBard() -> conversationHistory.addMessage()
                // Vérifier que l'historique a bien été sauvé
                setTimeout(async () => {
                    try {
                        const fullHistory = await globalConversationHistory.getFullHistory();
                        console.log('💾 Historique global vérifié:', {
                            totalMessages: fullHistory.length,
                            dernierMessage: fullHistory[fullHistory.length - 1]
                        });
                    } catch (error) {
                        console.error('❌ Erreur lors de la vérification de l\'historique:', error);
                    }
                }, 500);
                
                // Parler avec le texte optimisé
                if (VoiceAssistantService && VoiceAssistantService.speak) {
                    VoiceAssistantService.speak(speechText);
                }
                
            } else {
                // En cas d'erreur, traiter quand même avec le service de fluidité
                let errorMessage = response.text;
                let errorSpeech = response.speech;
                
                if (voiceFlow) {
                    try {
                        errorMessage = await voiceFlow.processBotResponse(response.text);
                        errorSpeech = errorMessage;
                    } catch (error) {
                        console.error('❌ Erreur lors de l\'optimisation du message d\'erreur:', error);
                    }
                }
                
                addToHistory('assistant', errorMessage);
                if (VoiceAssistantService && VoiceAssistantService.speak) {
                    VoiceAssistantService.speak(errorSpeech);
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du traitement de la commande vocale:', error);
            setIsProcessing(false);
            stopTypingAnimation();
            
            const errorResponse = "Désolé, j'ai rencontré un problème technique. Pouvez-vous répéter votre question s'il vous plaît ?";
            addToHistory('assistant', errorResponse);
            if (VoiceAssistantService && VoiceAssistantService.speak) {
                VoiceAssistantService.speak(errorResponse);
            }
        }
    };

    // Basculer l'écoute vocale
    const toggleVoiceListening = async () => {
        if (!isInitialized) {
            Alert.alert('Assistant vocal', 'L\'assistant vocal n\'est pas encore initialisé. Veuillez patienter.');
            return;
        }

        try {
            if (isVoiceListening) {
                // Arrêter l'écoute
                console.log('🎤 Arrêt de l\'écoute demandé');
                if (VoiceAssistantService && VoiceAssistantService.stopListening) {
                    await VoiceAssistantService.stopListening();
                } else {
                    // Fallback mode
                    setIsVoiceListening(false);
                    stopWaveAnimation();
                }
            } else {
                // Démarrer l'écoute
                console.log('🎤 Démarrage de l\'écoute');
                setVoiceError(null);
                
                if (VoiceAssistantService && VoiceAssistantService.startListening) {
                    await VoiceAssistantService.startListening();
                } else {
                    // Mode fallback - simulation pour les plateformes non supportées
                    console.warn('Service vocal non disponible, mode simulation');
                    setIsVoiceListening(true);
                    startWaveAnimation();
                    
                    // Simulation automatique après 3 secondes
                    setTimeout(() => {
                        setIsVoiceListening(false);
                        stopWaveAnimation();
                        
                        const simulatedTranscript = "Mode démonstration activé";
                        addToHistory('user', simulatedTranscript);
                        
                        setTimeout(() => {
                            const response = "Je fonctionne en mode démonstration. La reconnaissance vocale n'est pas disponible sur cette plateforme.";
                            addToHistory('assistant', response);
                        }, 1000);
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('Erreur lors du basculement de l\'écoute:', error);
            setVoiceError(error.message || 'Impossible d\'activer le microphone');
            setIsVoiceListening(false);
            stopWaveAnimation();
            
            let errorMessage = 'Impossible d\'activer le microphone';
            let instructions = 'Veuillez vérifier vos permissions microphone';
            
            if (Platform.OS === 'web') {
                errorMessage = 'Reconnaissance vocale non disponible';
                instructions = 'Assurez-vous d\'utiliser un navigateur compatible (Chrome, Edge) et d\'autoriser l\'accès au microphone';
            }
            
            Alert.alert(
                'Reconnaissance vocale',
                `${errorMessage}. ${instructions}`,
                [{ text: 'OK' }]
            );
        }
    };

    // Arrêter complètement toutes les opérations
    const stopAllOperations = async () => {
        try {
            console.log('🛑 Arrêt complet de toutes les opérations');

            // Annuler la requête en cours si elle existe
            if (currentRequestController) {
                currentRequestController.abort();
                setCurrentRequestController(null);
                console.log('❌ Requête API annulée');
            }

            // Arrêter la synthèse vocale IMMÉDIATEMENT
            if (VoiceAssistantService && VoiceAssistantService.stopSpeaking) {
                await VoiceAssistantService.stopSpeaking();
                console.log('🔊 Synthèse vocale arrêtée');
            }

            // Pour web, arrêter aussi directement la synthèse native
            if (Platform.OS === 'web' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                console.log('🔊 Synthèse vocale native arrêtée');
            }

            // Arrêter l'écoute si elle est en cours
            if (VoiceAssistantService && VoiceAssistantService.stopListening && isVoiceListening) {
                await VoiceAssistantService.stopListening();
                console.log('🎤 Écoute arrêtée');
            }

            // Réinitialiser tous les états IMMÉDIATEMENT
            setIsVoiceSpeaking(false);
            setIsVoiceListening(false);
            setIsProcessing(false);
            setCurrentTranscript('');
            setVoiceError(null);

            // Arrêter les animations
            stopWaveAnimation();
            stopTypingAnimation();
            pulseAnim.setValue(1);

        } catch (error) {
            console.error('❌ Erreur lors de l\'arrêt complet:', error);
            // Forcer la réinitialisation même en cas d'erreur
            setIsVoiceSpeaking(false);
            setIsVoiceListening(false);
            setIsProcessing(false);
            setCurrentTranscript('');
            setVoiceError(null);
        }
    };

    // Vérifier et afficher le statut de sauvegarde
    const checkHistorySaved = async () => {
        try {
            const fullHistory = await globalConversationHistory.getFullHistory();
            const voiceMessages = fullHistory.filter(msg => 
                msg.timestamp && new Date(msg.timestamp) > new Date(Date.now() - 5 * 60 * 1000) // dernières 5 minutes
            );
            
            if (voiceMessages.length > 0) {
                Alert.alert(
                    '✅ Conversation sauvegardée',
                    `Votre conversation vocale (${voiceMessages.length} messages) a été sauvegardée dans l'historique principal du chat.`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification de l\'historique:', error);
        }
    };

    // Fonction pour fermer l'assistant avec vérification
    const closeAssistant = async () => {
        // Arrêter toutes les opérations en cours
        await stopAllOperations();
        
        // Vérifier que l'historique a été sauvé
        await checkHistorySaved();
        
        // Fermer l'assistant
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            {/* Header minimaliste */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={closeAssistant}
                >
                    <Ionicons name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.settingsButton} 
                    onPress={() => setShowVoiceSettings(true)}
                >
                    <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Zone centrale avec animation dynamique comme ChatGPT */}
            <View style={styles.centerArea}>
                {/* Animation centrale dynamique */}
                <View style={styles.centralAnimation}>
                    <Animated.View style={[
                        styles.mainOrb,
                        {
                            transform: [
                                { scale: pulseAnim },
                                {
                                    rotate: waveAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '360deg']
                                    })
                                }
                            ]
                        }
                    ]}>
                        {/* Gradient central animé */}
                        <LinearGradient
                            colors={
                                isVoiceListening ? ['#10b981', '#34d399', '#6ee7b7'] :
                                isVoiceSpeaking ? ['#3b82f6', '#60a5fa', '#93c5fd'] :
                                isProcessing ? ['#f59e0b', '#fbbf24', '#fcd34d'] :
                                ['#8b5cf6', '#a78bfa', '#c4b5fd']
                            }
                            style={styles.orbGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {/* Ondes internes animées */}
                            {(isVoiceListening || isVoiceSpeaking) && (
                                <View style={styles.innerWaves}>
                                    {[...Array(3)].map((_, i) => (
                                        <Animated.View
                                            key={i}
                                            style={[
                                                styles.innerWave,
                                                {
                                                    opacity: waveAnimation.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.3, 0.8]
                                                    }),
                                                    transform: [{
                                                        scale: waveAnimation.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.8 + i * 0.1, 1.2 + i * 0.1]
                                                        })
                                                    }]
                                                }
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                        </LinearGradient>
                    </Animated.View>

                    {/* Particules flottantes */}
                    {isVoiceSpeaking && (
                        <View style={styles.particles}>
                            {[...Array(6)].map((_, i) => (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.particle,
                                        {
                                            opacity: waveAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.2, 0.6]
                                            }),
                                            transform: [
                                                {
                                                    translateX: waveAnimation.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, (Math.cos(i * 60 * Math.PI / 180) * 40)]
                                                    })
                                                },
                                                {
                                                    translateY: waveAnimation.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, (Math.sin(i * 60 * Math.PI / 180) * 40)]
                                                    })
                                                }
                                            ]
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Texte d'état subtil */}
                <Text style={styles.statusText}>
                    {isVoiceListening ? 'Listening...' : 
                     isVoiceSpeaking ? 'Speaking...' : 
                     isProcessing ? 'Thinking...' : 
                     'Tap to start'}
                </Text>

                {/* Indication que l'opération peut être arrêtée */}
                {(isVoiceSpeaking || isProcessing) && (
                    <Text style={styles.stopHint}>
                        Tap ⏹ to stop
                    </Text>
                )}

                {/* Transcription en temps réel */}
                {currentTranscript && (
                    <Text style={styles.liveTranscript}>
                        "{currentTranscript}"
                    </Text>
                )}
            </View>

            {/* Contrôles minimalistes en bas */}
            <View style={styles.bottomControls}>
                {/* Bouton microphone principal */}
                <TouchableOpacity
                    style={[
                        styles.mainButton,
                        !isInitialized && styles.mainButtonDisabled
                    ]}
                    onPress={toggleVoiceListening}
                    disabled={!isInitialized}
                >
                    {!isInitialized ? (
                        <ActivityIndicator size="small" color="#666" />
                    ) : (
                        <Ionicons 
                            name="mic" 
                            size={24} 
                            color="#666" 
                        />
                    )}
                </TouchableOpacity>

                {/* Bouton d'arrêt/fermeture */}
                <TouchableOpacity
                    style={styles.mainButton}
                    onPress={(isVoiceSpeaking || isProcessing) ? stopAllOperations : closeAssistant}
                >
                    <Ionicons 
                        name={(isVoiceSpeaking || isProcessing) ? "stop" : "close"} 
                        size={24} 
                        color="#666" 
                    />
                </TouchableOpacity>
            </View>

            {/* Modal des paramètres vocaux */}
            {VoiceSettings && (
                <VoiceSettings
                    visible={showVoiceSettings}
                    onClose={() => setShowVoiceSettings(false)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    
    // Header minimaliste
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 20,
        backgroundColor: '#f8f9fa',
    },
    backButton: {
        padding: 12,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    settingsButton: {
        padding: 12,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    
    // Zone centrale comme ChatGPT
    centerArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    
    // Animation centrale dynamique
    centralAnimation: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    mainOrb: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    orbGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    
    // Ondes internes
    innerWaves: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerWave: {
        position: 'absolute',
        width: '70%',
        height: '70%',
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    
    // Particules flottantes
    particles: {
        position: 'absolute',
        width: 300,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    particle: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
    },
    
    // Texte d'état
    statusText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#374151',
        textAlign: 'center',
        marginBottom: 20,
    },
    
    // Indication d'arrêt
    stopHint: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 10,
        fontStyle: 'italic',
    },
    
    // Transcription en temps réel
    liveTranscript: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        fontStyle: 'italic',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    
    // Contrôles en bas
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
        paddingTop: 20,
        gap: 60,
    },
    
    // Boutons principaux
    mainButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    mainButtonDisabled: {
        backgroundColor: 'rgba(107, 114, 128, 0.3)',
    },
});

export default VoiceAssistantScreen; 