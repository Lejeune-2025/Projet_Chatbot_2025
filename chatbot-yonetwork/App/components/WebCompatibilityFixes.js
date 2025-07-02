import React, { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Composant pour corriger les problèmes de compatibilité web avec React Native Web
 * Ce composant doit être importé dans le fichier App.js
 */
const WebCompatibilityFixes = () => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Supprimer les avertissements de dépréciation pour améliorer l'expérience utilisateur
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        // Filtrer les avertissements de dépréciation spécifiques
        const warningString = args.join(' ');
        if (
          warningString.includes('style.resizeMode is deprecated') ||
          warningString.includes('TouchableWithoutFeedback is deprecated') ||
          warningString.includes('props.pointerEvents is deprecated') ||
          warningString.includes('Unexpected text node')
        ) {
          return; // Ignorer ces avertissements
        }
        originalConsoleWarn(...args);
      };

      // Restaurer la fonction originale lors du démontage du composant
      return () => {
        console.warn = originalConsoleWarn;
      };
    }
  }, []);

  return null; // Ce composant ne rend rien
};

export default WebCompatibilityFixes; 