import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggleButton from './ThemeToggleButton';

const withTheme = (WrappedComponent) => {
  return (props) => {
    const { theme } = useTheme();
    
    // Vérifier si le composant est ChatScreen pour ne pas afficher le bouton ThemeToggle
    const isChatScreen = WrappedComponent.name === 'ChatScreen';

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <WrappedComponent {...props} theme={theme} />
        {!isChatScreen && <ThemeToggleButton style={styles.themeToggle} />}
      </View>
    );
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
  },
});

export default withTheme;