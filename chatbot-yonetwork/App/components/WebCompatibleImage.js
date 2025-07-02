import React from 'react';
import { Image, Platform, StyleSheet } from 'react-native';

/**
 * Composant Image compatible avec le web qui gère correctement resizeMode
 * Résout les avertissements de dépréciation sur le web tout en maintenant
 * la compatibilité avec les anciennes versions de React Native sur mobile
 */
const WebCompatibleImage = (props) => {
  const { style, resizeMode, ...otherProps } = props;
  
  // Extraire resizeMode du style si présent
  let styleResizeMode;
  let updatedStyle = style;
  
  if (style && Platform.OS === 'web') {
    if (Array.isArray(style)) {
      // Pour un tableau de styles, vérifier chaque objet
      const flattenedStyle = StyleSheet.flatten(style);
      styleResizeMode = flattenedStyle.resizeMode;
      
      // Créer un nouveau style sans resizeMode
      if (styleResizeMode) {
        const { resizeMode: _, ...restStyle } = flattenedStyle;
        updatedStyle = restStyle;
      }
    } else if (style.resizeMode) {
      // Pour un objet de style simple
      styleResizeMode = style.resizeMode;
      const { resizeMode: _, ...restStyle } = style;
      updatedStyle = restStyle;
    }
  }
  
  // Utiliser resizeMode de props ou du style
  const finalResizeMode = resizeMode || styleResizeMode;
  
  return (
    <Image
      {...otherProps}
      style={updatedStyle}
      resizeMode={finalResizeMode}
    />
  );
};

export default WebCompatibleImage; 