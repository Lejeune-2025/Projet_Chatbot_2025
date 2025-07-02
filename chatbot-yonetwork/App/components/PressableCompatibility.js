import React from 'react';
import { Platform, Pressable, TouchableWithoutFeedback } from 'react-native';

/**
 * Composant qui utilise Pressable sur le web et TouchableWithoutFeedback sur mobile
 * Permet de résoudre les avertissements de dépréciation sur le web tout en maintenant
 * la compatibilité avec les anciennes versions de React Native sur mobile
 */
const PressableCompatibility = (props) => {
  // Utiliser Pressable sur le web et TouchableWithoutFeedback sur mobile
  const Component = Platform.OS === 'web' ? Pressable : TouchableWithoutFeedback;
  
  // Convertir pointerEvents en style.pointerEvents si nécessaire
  const { pointerEvents, style, ...otherProps } = props;
  const updatedStyle = pointerEvents && Platform.OS === 'web' 
    ? { ...style, pointerEvents } 
    : style;
  
  // Passer pointerEvents en prop uniquement sur mobile
  const pointerEventsProps = Platform.OS !== 'web' && pointerEvents 
    ? { pointerEvents } 
    : {};
  
  return (
    <Component
      {...otherProps}
      {...pointerEventsProps}
      style={updatedStyle}
    />
  );
};

export default PressableCompatibility; 