// Importation des composants nécessaires depuis React Native et des librairies utilisées
import { View, Text, FlatList, TouchableOpacity, Dimensions, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import ChatFaceData from "../Services/ChatFaceData"; // Données statiques des avatars de chat
import { Image } from "react-native";
import { useNavigation } from "@react-navigation/native"; // Pour naviguer entre les écrans
import { createNewSession } from "../Services/GlobalApi"; // API pour créer une session de conversation
import { logger } from "../Services/logger"; // Outil de log personnalisé
import AsyncStorage from '@react-native-async-storage/async-storage'; // Stockage local
import AuthStorage from "../Services/AuthStorage"; // Service de gestion d’authentification

// Définition des styles pour la page
const styles = {
  // Conteneur principal qui occupe tout l'écran
  container: {
    flex: 1,
    // Pour un dégradé, il faut utiliser le composant <LinearGradient /> avec la prop `colors`.
    backgroundColor: ['#0A1E3F', '#F55F55', '#ffffff']
  },
  // Contenu scrollable avec alignement centré et marges haut/bas
  scrollContent: {
    flexGrow: 1,              
    alignItems: "center",     
    paddingTop: 40,
    paddingBottom: 40
  },

  // Titre principal
  title: {
    color: '#0A1E3F',         
    fontSize: 30              
  },

  // Variante du titre en gras
  titleBold: {
    color: '#0A1E3F',
    fontSize: 30,
    fontWeight: 'bold'
  },

  // Image de profil ou personnage
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 50,         
    marginTop: 20
  },

  // Sous-titre ou titre de section
  subtitle: {
    fontSize: 25,
    marginTop: 30,
    fontWeight: 'bold'
  },

  // Conteneur pour le visage/personnage de chat
  chatFaceContainer: {
    marginTop: 20,
    backgroundColor: ['#F55F55', '#ffffff'], 
    alignItems: "center",
    height: 110,
    padding: 10,
    borderRadius: 20,
    width: '90%'            
  },

  // Texte sous l'image/personnage de chat
  chatFaceText: {
    fontSize: 17,
    marginTop: 5,
    color: "#B0B0B0"          
  },

  // Bouton principal pour démarrer une conversation
  chatButton: {
    marginTop: 30,
    backgroundColor: '#0A1E3F', 
    width: Dimensions.get('window').width * 0.8, 
    alignItems: "center",
    padding: 17,
    borderRadius: 100,        
    elevation: 3,            

    // Ombres sur iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  // Texte à l’intérieur du bouton
  chatButtonText: {
    fontSize: 16,
    color: "#FFFFFF",         
    fontWeight: 'bold'
  }
};


// Composant principal : écran d’accueil
export default function HomeScreen() {
  // États pour gérer les données des avatars et la sélection actuelle
  const [chatFaceData, setChatFaceData] = useState([]);
  const [selectedChatFaceData, setSelectedChatFaceData] = useState(null);
  const navigation = useNavigation(); // Hook pour gérer la navigation

  useEffect(() => {
    // Initialisation au démarrage de l’écran
    const initializeApp = async () => {
      try {
        // Vérifie si l'utilisateur est connecté
        const isAuthenticated = await AuthStorage.isAuthenticated();

        if (isAuthenticated) {
          // Vérifie s’il existe déjà une session de chat
          const existingSession = await AsyncStorage.getItem('conversationSessionId');
          
          if (!existingSession) {
            logger.info('[HomeScreen] Utilisateur authentifié, création d\'une nouvelle session de conversation');
            const newSessionId = await createNewSession(); // Appel API pour créer une nouvelle session

            if (newSessionId) {
              logger.info('[HomeScreen] Nouvelle session créée avec succès');
            } else {
              logger.error('[HomeScreen] Échec de la création de session');
            }
          } else {
            logger.info('[HomeScreen] Session de conversation existante trouvée');
          }
        } else {
          // Si utilisateur non connecté, suppression de la session existante
          logger.info('[HomeScreen] Utilisateur non authentifié, pas de création de session');
          await AsyncStorage.removeItem('conversationSessionId');
        }
      } catch (error) {
        logger.error('[HomeScreen] Erreur lors de l\'initialisation:', error);
      }
    };

    // Exécution des fonctions d'initialisation
    initializeApp();

    // Chargement des données de chat et sélection du premier par défaut
    setChatFaceData(ChatFaceData);
    setSelectedChatFaceData(ChatFaceData[0]);
  }, []);

  // Fonction appelée lorsqu’on sélectionne un autre avatar
  const onChatFacePress = (id) => {
    const selectedChatFace = chatFaceData.find((item) => item.id === id);
    setSelectedChatFaceData(selectedChatFace);
  }

  // Si les données ne sont pas prêtes
  if (!selectedChatFaceData) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  // Rendu principal de l’écran
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Texte d'accueil */}
      <Text style={styles.titleBold}>Salut, c'est moi {selectedChatFaceData.name}</Text>
      <Text style={styles.title}>Dis-moi ce que tu veux, je m'occupe du reste.</Text>
      {/* Image de l'avatar sélectionné */}
      <Image
        source={{ uri: selectedChatFaceData.image }}
        style={styles.avatar}
      />
      <Text style={styles.chatFaceText}>Choisissez votre SoukBuddy préféré</Text>
      

      {/* Conteneur pour changer d'avatar */}
      <View style={styles.chatFaceContainer}> 
        <FlatList
          data={chatFaceData}
          horizontal={true}
          renderItem={({ item }) =>
            selectedChatFaceData.id !== item.id && (
              <TouchableOpacity 
                style={{ margin: 15 }} 
                onPress={() => onChatFacePress(item.id)}
              >
                <Image 
                  source={{ uri: item.image }} 
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              </TouchableOpacity>
            )
          }
        />
        
      </View>
      <Text style={styles.subtitle}>Explorez, discuter, acheter</Text>
      {/* Bouton pour commencer une conversation */}
      <TouchableOpacity 
        onPress={() => {
          logger.info('[HomeScreen] Navigation vers Login avec le chat face sélectionné:', selectedChatFaceData);
          navigation.navigate('Login', {
            selectedFace: selectedChatFaceData,
            fromScreen: 'Home'
          });
        }}
        style={styles.chatButton}
      >
        <Text style={styles.chatButtonText}>👇 Clique et parle-lui !</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
