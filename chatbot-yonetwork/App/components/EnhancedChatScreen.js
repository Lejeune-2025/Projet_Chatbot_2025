import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import ChatScreen from '../pages/ChatScreen';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';

const EnhancedChatScreen = (props) => {
  const { theme } = useTheme();
  const { showNotification } = useNotification();
  const firstRender = useRef(true);

  // Afficher une notification de bienvenue au premier rendu
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setTimeout(() => {
        showNotification(
          'Bienvenue dans la nouvelle interface améliorée!',
          'info',
          5000
        );
      }, 1000);
    }
  }, [showNotification]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ChatScreen {...props} />
      <ThemeToggle />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default EnhancedChatScreen;