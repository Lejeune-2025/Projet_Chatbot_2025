import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import HomeScreenNavigation from './App/navigation/HomeScreenNavigation';
import { logger } from './App/Services/logger';
import AuthStorage from './App/Services/AuthStorage';
import { ThemeProvider, useTheme } from './App/contexts/ThemeContext';
import { NotificationProvider } from './App/contexts/NotificationContext';
import WebCompatibilityFixes from './App/components/WebCompatibilityFixes';

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Vérifier la session au démarrage de l'application
    const checkSession = async () => {
      try {
        logger.info('Vérification de la session au démarrage...');
        
        // Vérifier si l'utilisateur est authentifié localement
        const isAuthenticated = await AuthStorage.isAuthenticated();
        
        if (isAuthenticated) {
          logger.info('Utilisateur authentifié localement, vérification de la session serveur');
          
          // Vérifier la session serveur
          const isServerSessionValid = await AuthStorage.validateServerSession();
          
          if (!isServerSessionValid) {
            logger.warn('Session serveur invalide ou expirée, effacement des données d\'authentification');
            await AuthStorage.clearAuthData();
            setIsSessionValid(false);
          } else {
            logger.info('Session serveur valide');
            setIsSessionValid(true);
          }
        } else {
          logger.info('Utilisateur non authentifié');
          setIsSessionValid(false);
        }
      } catch (error) {
        logger.error('Erreur lors de la vérification de la session:', error);
        setIsSessionValid(false);
      } finally {
        setIsReady(true);
      }
    };

    checkSession();
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={{
      dark: theme.name === 'dark',
      colors: {
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.card,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.notification,
      },
    }}>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <HomeScreenNavigation initialAuthenticated={isSessionValid} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <WebCompatibilityFixes />
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});