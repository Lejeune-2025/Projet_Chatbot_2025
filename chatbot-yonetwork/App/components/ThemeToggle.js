import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AnimationService from '../Services/AnimationService';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    AnimationService.buttonPress(scaleAnim, () => {
      // Animation de rotation lors du changement de thème
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        rotateAnim.setValue(0);
        toggleTheme();
      });
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: spin },
            ],
          },
        ]}
      >
        <Ionicons
          name={theme.name === 'dark' ? 'sunny' : 'moon'}
          size={24}
          color={theme.name === 'dark' ? theme.colors.warning : theme.colors.primary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    position: 'absolute',
    top: 20,           // Modifié: position en haut au lieu du bas
    right: 20,         // Maintenu à droite
    zIndex: 100,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ThemeToggle;